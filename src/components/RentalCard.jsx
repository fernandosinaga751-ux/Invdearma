// src/components/RentalCard.jsx — "Detail Sewa" di form invoice (fitur Booking & Sewa Otomatis)
import { Card, Input, Select, Btn } from './UI.jsx';
import { fmt, uid } from '../lib/utils.js';
import { calcRental, rentalItems, findConflicts, fmtDT, EXTRA_PRESETS } from '../lib/rental.js';

export const EMPTY_RENTAL = {
  vehicleId: '', vehicleName: '', plate: '', pickupAt: '', returnAt: '', rate: 0, overtimeRate: 0,
  withDriver: false, driverId: '', driverName: '', destination: '',
};

export default function RentalCard({ rental, setRental, vehicles, drivers, invoices, bookings, editingInvoiceId, ignoreBookingId, graceHours, items, setItems }) {
  const set = (k, v) => setRental(r => ({ ...r, [k]: v }));
  const calc = calcRental({ pickupAt: rental.pickupAt, returnAt: rental.returnAt, rate: rental.rate, overtimeRate: rental.overtimeRate, graceHours });
  const veh  = vehicles.find(v => v.id === rental.vehicleId);
  const conflicts = findConflicts({
    vehicleId: rental.vehicleId, pickupAt: rental.pickupAt, returnAt: rental.returnAt,
    invoices, bookings, ignoreInvoiceId: editingInvoiceId, ignoreBookingId,
  });

  const pickVehicle = id => {
    const v = vehicles.find(x => x.id === id);
    setRental(r => ({ ...r, vehicleId: id, vehicleName: v?.name || '', plate: v?.plate || '', rate: v?.rate || 0, overtimeRate: v?.overtimeRate || 0 }));
  };
  const pickDriver = id => {
    const d = drivers.find(x => x.id === id);
    setRental(r => ({ ...r, driverId: id, driverName: d?.name || '', withDriver: id ? true : r.withDriver }));
  };

  // Rincian otomatis: gantikan baris hasil otomatis sebelumnya, pertahankan baris manual
  const fillItems = () => {
    if (!rental.vehicleId) return alert('Pilih mobil terlebih dahulu.');
    if (!calc.valid) return alert('Isi tanggal ambil & kembali dengan benar (kembali harus setelah ambil).');
    const auto = rentalItems(rental, calc).map(i => ({ ...i, id: uid() }));
    const manual = items.filter(i => !i.auto && (i.description || '').trim());
    setItems([...auto, ...manual]);
  };
  const addExtra = name => setItems([...items.filter(i => (i.description || '').trim() || i.auto), { id: uid(), description: name, qty: 1, price: 0 }]);

  return (
    <Card className="p-5 border-2 border-blue-100">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-[#0f2544]">🚗 Detail Sewa Mobil</h3>
        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">FITUR BOOKING</span>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada mobil. Tambahkan dulu di menu <strong>Armada & Sopir</strong>.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Mobil" value={rental.vehicleId} onChange={e => pickVehicle(e.target.value)}>
            <option value="">— tidak ada / bukan sewa mobil —</option>
            {vehicles.filter(v => v.status !== 'nonaktif').map(v => <option key={v.id} value={v.id}>{v.name} — {v.plate}{v.status === 'bengkel' ? ' (bengkel)' : ''}</option>)}
          </Select>
          <Input label="Tarif / Hari (Rp)" type="number" min="0" value={rental.rate} onChange={e => set('rate', e.target.value)} />
          <Input label="Ambil (tanggal & jam)" type="datetime-local" value={rental.pickupAt} onChange={e => set('pickupAt', e.target.value)} />
          <Input label="Kembali (tanggal & jam)" type="datetime-local" value={rental.returnAt} onChange={e => set('returnAt', e.target.value)} />
          <Select label="Sopir (opsional)" value={rental.driverId} onChange={e => pickDriver(e.target.value)}>
            <option value="">— tanpa sopir / lepas kunci —</option>
            {drivers.filter(d => d.status === 'aktif').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Tujuan / Keperluan" value={rental.destination} onChange={e => set('destination', e.target.value)} placeholder="mis. Medan – Berastagi" />
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2 cursor-pointer">
            <input type="checkbox" checked={!!rental.withDriver} onChange={e => set('withDriver', e.target.checked)} />
            Sewa dengan sopir (dicantumkan di rincian)
          </label>
        </div>
      )}

      {rental.vehicleId && (
        <div className="mt-4 space-y-3">
          {calc.valid ? (
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-black text-[#0f2544]">{calc.days} hari × Rp {fmt(rental.rate)} = Rp {fmt(calc.days * (Number(rental.rate) || 0))}</div>
                {calc.overtimeHours > 0 && (
                  <div className="text-xs text-amber-700">+ Overtime {calc.overtimeHours} jam (Rp {fmt(calc.otRate)}/jam) = Rp {fmt(calc.overtimeCharge)}</div>
                )}
                <div className="text-[11px] text-slate-400">{fmtDT(rental.pickupAt)} → {fmtDT(rental.returnAt)}</div>
              </div>
              <Btn onClick={fillItems} className="text-xs px-4 py-2">⚡ Isi Rincian Otomatis</Btn>
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">Isi tanggal ambil & kembali untuk menghitung jumlah hari dan total sewa.</div>
          )}

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tambahan cepat</div>
            <div className="flex flex-wrap gap-1.5">
              {EXTRA_PRESETS.map(p => (
                <button key={p} onClick={() => addExtra(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 text-slate-600 hover:border-[#0f2544] hover:text-[#0f2544] transition">+ {p}</button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Baris tambahan masuk ke Rincian Keterangan — isi harganya di sana.</p>
          </div>

          {veh?.status === 'bengkel' && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">🔧 Mobil ini sedang berstatus <strong>di bengkel</strong>.</div>}
          {conflicts.length > 0 && (
            <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2">
              ⚠️ <strong>Jadwal bentrok</strong> dengan: {conflicts.map(c => `${c.label} (${fmtDT(c.start)} – ${fmtDT(c.end)})`).join('; ')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
