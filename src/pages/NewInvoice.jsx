// src/pages/NewInvoice.jsx
import { useState } from 'react';
import { Card, Input, Btn, Icons } from '../components/UI.jsx';
import { fmt, uid, todayStr, genInvNo, normalizeWaNumber } from '../lib/utils.js';
import { addInvoice, updateInvoice, syncShare, updateIn, ensureHandoverLink, removeHandoverLink } from '../lib/firebase.js';
import RentalCard, { EMPTY_RENTAL } from '../components/RentalCard.jsx';
import { LockedTeaser } from '../components/FeatureGate.jsx';
import { calcRental, findConflicts, fmtDT } from '../lib/rental.js';

export default function NewInvoice({
  invoices, customers, setInvoices, setPage, setViewingId, editingInvoice, setEditingInvoice, settings,
  can = () => false, vehicles = [], drivers = [], bookings = [], setBookings, bookingDraft = null, setBookingDraft,
}) {
  const today = todayStr();
  const draft = !editingInvoice ? bookingDraft : null; // booking yang sedang dijadikan invoice
  const [date, setDate]       = useState(editingInvoice?.date || today);
  const draftCust = draft ? (customers.find(c => c.id === draft.customerId) || { id: draft.customerId || '', name: draft.customerName, phone: draft.phone || '', address: '' }) : null;
  const [custQuery, setCustQuery] = useState(editingInvoice?.customerName || draft?.customerName || '');
  const [selCust, setSelCust] = useState(editingInvoice
    ? { id: editingInvoice.customerId, name: editingInvoice.customerName, phone: editingInvoice.customerPhone, address: editingInvoice.customerAddress,
        flagged: customers.find(c => c.id === editingInvoice.customerId)?.flagged, flagReason: customers.find(c => c.id === editingInvoice.customerId)?.flagReason }
    : draftCust);
  const [rental, setRental] = useState(() => {
    if (editingInvoice?.rental) return { ...EMPTY_RENTAL, ...editingInvoice.rental };
    if (draft) {
      const v = vehicles.find(x => x.id === draft.vehicleId);
      return { ...EMPTY_RENTAL, vehicleId: draft.vehicleId, vehicleName: v?.name || draft.vehicleName || '', plate: v?.plate || draft.plate || '',
        rate: v?.rate || 0, overtimeRate: v?.overtimeRate || 0, pickupAt: draft.pickupAt, returnAt: draft.returnAt, destination: draft.destination || '' };
    }
    return { ...EMPTY_RENTAL };
  });
  const [showDrop, setShowDrop] = useState(false);
  const [items, setItems]     = useState(editingInvoice?.items || [{ id: uid(), description: '', qty: 1, price: 0 }]);
  const [ppnPct, setPpnPct]   = useState(editingInvoice?.ppn || 0);
  const [pajakManual, setPajakManual] = useState(editingInvoice?.ppnManual ? String(editingInvoice.ppnAmount || '') : '');
  const [dueDate, setDueDate] = useState(editingInvoice?.dueDate || '');
  const [notes, setNotes]     = useState(editingInvoice?.notes || '');
  const [diskon, setDiskon]   = useState(editingInvoice?.diskon || 0);
  const [panjar, setPanjar]   = useState(editingInvoice?.panjar || 0);
  const [saving, setSaving]   = useState(false);
  // Petugas serah terima mobil (fitur Perjanjian & Serah Terima)
  const [staffName, setStaffName]   = useState(editingInvoice?.handoverStaff?.name || '');
  const [staffPhone, setStaffPhone] = useState(editingInvoice?.handoverStaff?.phone || '');

  const filtCust = customers.filter(c =>
    c.name.toLowerCase().includes(custQuery.toLowerCase())
  );
  const subtotal       = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const diskonAmt      = Math.min(Number(diskon) || 0, subtotal);
  const subtotalAfter  = subtotal - diskonAmt;
  const isManualTax    = pajakManual !== '';
  const ppnAmt         = isManualTax ? Math.min(Math.max(0, Math.round(Number(pajakManual) || 0)), subtotalAfter) : Math.round(subtotalAfter * ppnPct / 100);
  const total          = subtotalAfter - ppnAmt; // pajak = pengurang
  const panjarAmt      = Math.min(Number(panjar) || 0, total);
  const sisa           = total - panjarAmt;
  const previewNo = editingInvoice?.invoiceNo || genInvNo(invoices, date);
  const graceHours = settings?.graceHours ?? 1;

  const addItem    = () => setItems([...items, { id: uid(), description: '', qty: 1, price: 0 }]);
  const removeItem = id => items.length > 1 && setItems(items.filter(i => i.id !== id));
  const updItem    = (id, f, v) => setItems(items.map(i => i.id === id ? { ...i, [f]: v } : i));

  // Ada nama petugas → buat/perbarui link serah terima. Nama dikosongkan → link dimatikan.
  const linkAfterSave = async inv => {
    if (!can('handover')) return inv;
    try {
      if (inv.handoverStaff?.name) {
        const token = await ensureHandoverLink(inv, settings);
        return { ...inv, handoverToken: token };
      }
      if (inv.handoverToken) {
        const rescued = await removeHandoverLink(inv);
        await updateInvoice(inv.id, { handoverToken: null });
        return { ...inv, handoverToken: null, ...(rescued ? { handover: rescued } : {}) };
      }
    } catch (e) {
      console.error(e);
      alert('Invoice sudah tersimpan, tetapi link serah terima belum bisa dibuat: ' + e.message + '\n\nPastikan Firestore Rules terbaru sudah dipublikasikan (lihat README). Anda bisa membuatnya lagi dari detail invoice.');
    }
    return inv;
  };

  const handleSave = async () => {
    if (!selCust)                            return alert('Pilih customer terlebih dahulu!');
    if (items.some(i => !i.description.trim())) return alert('Keterangan item tidak boleh kosong!');
    if (can('handover') && staffPhone.trim() && normalizeWaNumber(staffPhone).length < 9) return alert('Nomor HP petugas serah terima tidak valid. Contoh: 08123456789');
    // Cek jadwal bentrok bila ada data sewa
    const hasRental = can('booking') && rental.vehicleId;
    if (hasRental) {
      const cf = findConflicts({ vehicleId: rental.vehicleId, pickupAt: rental.pickupAt, returnAt: rental.returnAt, invoices, bookings,
        ignoreInvoiceId: editingInvoice?.id, ignoreBookingId: draft?.id });
      if (cf.length && !confirm('Mobil ini sudah terjadwal pada waktu tersebut (' + cf.map(c => `${c.label}: ${fmtDT(c.start)} – ${fmtDT(c.end)}`).join('; ') + ').\n\nTetap simpan invoice?')) return;
    }
    setSaving(true);
    try {
      const invNo = editingInvoice?.invoiceNo
        || genInvNo(invoices.filter(i => i.id !== editingInvoice?.id), date);

      const payload = {
        invoiceNo: invNo,
        customerId: selCust.id, customerName: selCust.name,
        customerPhone: selCust.phone || '', customerAddress: selCust.address || '',
        date, dueDate,
        items: items.map(i => ({ ...i, qty: Number(i.qty) || 1, price: Number(i.price) || 0 })),
        subtotal, diskon: diskonAmt, ppn: isManualTax ? 0 : ppnPct, ppnAmount: ppnAmt, ppnManual: isManualTax, taxMinus: true, total,
        panjar: panjarAmt, sisa,
        notes,
      };
      if (can('handover')) {
        payload.handoverStaff = staffName.trim() ? { name: staffName.trim(), phone: staffPhone.trim() } : null;
      }
      if (can('booking')) {
        if (rental.vehicleId) {
          const c = calcRental({ pickupAt: rental.pickupAt, returnAt: rental.returnAt, rate: rental.rate, overtimeRate: rental.overtimeRate, graceHours });
          payload.rental = { ...rental, rate: Number(rental.rate) || 0, overtimeRate: Number(rental.overtimeRate) || 0,
            days: c.valid ? c.days : 0, overtimeHours: c.overtimeHours || 0, overtimeCharge: c.overtimeCharge || 0 };
        } else if (editingInvoice?.rental) payload.rental = null; // data sewa dihapus
      }

      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, payload);
        syncShare({ ...editingInvoice, ...payload }, settings); // perbarui link customer bila ada
        const merged = await linkAfterSave({ ...editingInvoice, ...payload });
        const updated = invoices.map(i => i.id === editingInvoice.id ? { ...i, ...merged } : i);
        setInvoices(updated);
        setEditingInvoice(null);
        setViewingId(editingInvoice.id);
      } else {
        const added = await addInvoice(payload);
        const full = await linkAfterSave({ ...payload, id: added.id, createdAt: new Date().toISOString() });
        setInvoices([full, ...invoices]);
        setViewingId(added.id);
        // Booking yang dikonversi → tautkan ke invoice supaya tidak tampil ganda di kalender
        if (draft) {
          try {
            await updateIn('bookings', draft.id, { invoiceId: added.id });
            setBookings?.(bookings.map(b => b.id === draft.id ? { ...b, invoiceId: added.id } : b));
          } catch (e) { console.warn('Tautan booking gagal:', e.message); }
          setBookingDraft?.(null);
        }
      }
      setPage('invoices');
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
          </h1>
          <p className="text-slate-400 text-sm font-mono mt-0.5">{previewNo}</p>
        </div>
        <Btn variant="ghost" onClick={() => setPage('invoices')}>{Icons.back} Kembali</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer */}
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-3 flex items-center gap-2">{Icons.users} Customer</h3>
          <div className="relative">
            <Input
              label="Nama Customer *"
              value={custQuery}
              onChange={e => { setCustQuery(e.target.value); setSelCust(null); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder="Cari atau pilih customer..."
            />
            {showDrop && custQuery && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                {filtCust.length > 0 ? filtCust.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => { setSelCust(c); setCustQuery(c.name); setShowDrop(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-slate-50 last:border-0"
                  >
                    <div className="font-bold text-sm text-[#0f2544]">{c.flagged ? '⚠️ ' : ''}{c.name}</div>
                    {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                  </button>
                )) : (
                  <div className="p-3 text-sm text-slate-400">
                    Customer tidak ditemukan.{' '}
                    <button onClick={() => setPage('customers')} className="text-[#0f2544] font-bold hover:underline">Tambah baru?</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {selCust?.flagged && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ <strong>Customer ditandai bermasalah</strong>{selCust.flagReason ? `: ${selCust.flagReason}` : '.'}
            </div>
          )}
          {selCust && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
              <div className="font-bold text-[#0f2544]">{selCust.name}</div>
              {selCust.phone   && <div className="text-slate-500 text-xs mt-0.5">📞 {selCust.phone}</div>}
              {selCust.address && <div className="text-slate-500 text-xs">📍 {selCust.address}</div>}
            </div>
          )}
        </Card>

        {/* Detail */}
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-3">Detail Invoice</h3>
          <div className="space-y-3">
            <Input label="Tanggal Invoice" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Due Date / Jatuh Tempo (Opsional)" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pajak (%) — dikurangkan dari total</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 2, 5, 10, 11, 12].map(p => (
                  <button
                    key={p}
                    onClick={() => { setPpnPct(p); setPajakManual(''); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition
                      ${!isManualTax && ppnPct === p ? 'bg-[#0f2544] text-white border-[#0f2544]' : 'border-slate-200 text-slate-600 hover:border-[#0f2544]'}`}
                  >
                    {p === 0 ? 'Tanpa Pajak' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  🧾 Nilai Pajak (Rp) — isi manual (mengurangi total)
                </label>
                <input
                  type="number" min="0"
                  value={pajakManual}
                  onChange={e => { setPajakManual(e.target.value); if (e.target.value !== '') setPpnPct(0); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                  placeholder="Kosongkan jika pakai persen di atas"
                />
              </div>
            </div>
            <Input label="Catatan (Opsional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
            
            {/* Diskon */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                🏷️ Diskon (Rp)
              </label>
              <input
                type="number" min="0"
                value={diskon}
                onChange={e => setDiskon(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder="0"
              />
            </div>

            {/* Panjar */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                💰 Panjar / Uang Muka (Rp)
              </label>
              <input
                type="number" min="0"
                value={panjar}
                onChange={e => setPanjar(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder="0"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Petugas serah terima mobil (fitur Perjanjian & Serah Terima) */}
      {can('handover') && (
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-1 flex items-center gap-2">📝 Petugas Serah Terima Mobil <span className="text-xs font-normal text-slate-400">(opsional)</span></h3>
          <p className="text-xs text-slate-400 mb-3">
            Isi nama petugas yang menyerahkan mobil ke penyewa. Setelah invoice disimpan, <strong>link serah terima otomatis dibuat</strong> — petugas mencatat mobil &
            kondisinya, meminta tanda tangan penyewa, lalu mengunduh PDF perjanjian untuk diberikan ke penyewa. Isi nomor HP agar link bisa dikirim lewat tombol WhatsApp.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nama Petugas" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="mis. Pak Budi" />
            <Input label="No. HP / WhatsApp Petugas" type="tel" inputMode="tel" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
        </Card>
      )}

      {/* Detail sewa (fitur Booking) — terkunci untuk akun tanpa izin */}
      {can('booking')
        ? <RentalCard rental={rental} setRental={setRental} vehicles={vehicles} drivers={drivers} invoices={invoices} bookings={bookings}
            editingInvoiceId={editingInvoice?.id} ignoreBookingId={draft?.id} graceHours={graceHours} items={items} setItems={setItems} />
        : <LockedTeaser featureId="booking" setPage={setPage} />}

      {/* Items */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0f2544]">Rincian Keterangan</h3>
          <Btn variant="outline" onClick={addItem} className="text-xs px-3 py-1.5">+ Tambah Baris</Btn>
        </div>

        <div className="space-y-2">
          <div
            className="hidden md:grid text-xs font-bold text-slate-400 uppercase tracking-wider px-1 gap-2"
            style={{ gridTemplateColumns: '1fr 72px 150px 36px' }}
          >
            <span>Keterangan</span>
            <span className="text-center">Qty</span>
            <span className="text-right pr-1">Harga Satuan (Rp)</span>
            <span></span>
          </div>
          {items.map((item, idx) => (
            <div key={item.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 72px 150px 36px' }}>
              <input
                value={item.description}
                onChange={e => updItem(item.id, 'description', e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder={`Keterangan ${idx + 1}...`}
              />
              <input
                type="number" min="1"
                value={item.qty}
                onChange={e => updItem(item.id, 'qty', e.target.value)}
                className="border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
              />
              <input
                type="number" min="0"
                value={item.price}
                onChange={e => updItem(item.id, 'price', e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder="0"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition"
              >{Icons.trash}</button>
            </div>
          ))}
        </div>

        {/* Total preview */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">Rp {fmt(subtotal)}</span>
            </div>
            {diskonAmt > 0 && (
              <div className="flex justify-between text-red-500">
                <span>🏷️ Diskon</span>
                <span className="font-bold">- Rp {fmt(diskonAmt)}</span>
              </div>
            )}
            {ppnAmt > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">{isManualTax ? 'Pajak' : `Pajak ${ppnPct}%`}</span>
                <span className="font-bold text-red-500">- Rp {fmt(ppnAmt)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-[#0f2544] text-base font-black text-[#0f2544]">
              <span>TOTAL</span>
              <span>Rp {fmt(total)}</span>
            </div>
            {panjarAmt > 0 && (
              <>
                <div className="flex justify-between text-amber-600">
                  <span className="font-semibold">💰 Panjar / DP</span>
                  <span className="font-bold">- Rp {fmt(panjarAmt)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-emerald-500 text-base font-black text-emerald-600">
                  <span>SISA BAYAR</span>
                  <span>Rp {fmt(sisa)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-3 pb-6">
        <Btn onClick={handleSave} disabled={saving} className="text-base px-6 py-3">
          {Icons.save}
          {saving ? 'Menyimpan...' : (editingInvoice ? 'Simpan Perubahan' : 'Simpan Invoice')}
        </Btn>
        <Btn variant="ghost" onClick={() => setPage('invoices')}>Batal</Btn>
      </div>
    </div>
  );
}
