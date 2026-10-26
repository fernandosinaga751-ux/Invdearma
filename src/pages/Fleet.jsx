// src/pages/Fleet.jsx — Armada (mobil), Sopir, dan pengingat dokumen
import { useState } from 'react';
import { Card, Input, Select, Btn, Modal, Icons } from '../components/UI.jsx';
import { fmt, formatDateID } from '../lib/utils.js';
import { addTo, updateIn, removeFrom } from '../lib/firebase.js';
import { docReminders, rentalEntries } from '../lib/rental.js';

const EMPTY_V = {
  name: '', plate: '', year: '', color: '', transmission: 'Manual', seats: '', rate: '', overtimeRate: '',
  status: 'tersedia', stnkExpiry: '', taxExpiry: '', kirExpiry: '', serviceNextDate: '', serviceNextKm: '', odometer: '', notes: '',
};
const EMPTY_D = { name: '', phone: '', simExpiry: '', status: 'aktif', notes: '' };
const STATUS_STYLE = {
  tersedia: 'bg-emerald-100 text-emerald-700', disewa: 'bg-blue-100 text-blue-700',
  bengkel: 'bg-amber-100 text-amber-700', nonaktif: 'bg-slate-200 text-slate-500',
};

export default function Fleet({ vehicles, setVehicles, drivers, setDrivers, invoices, bookings }) {
  const [tab, setTab]       = useState('armada');
  const [vForm, setVForm]   = useState(null);
  const [dForm, setDForm]   = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const entries = rentalEntries(invoices, bookings);
  const rentedNow = id => entries.some(e => e.vehicleId === id && new Date(e.start) <= now && now <= new Date(e.end));
  const nextUse   = id => entries.filter(e => e.vehicleId === id && new Date(e.start) > now).sort((a, b) => a.start.localeCompare(b.start))[0];
  const reminders = docReminders(vehicles);
  const statusOf  = v => (v.status === 'tersedia' && rentedNow(v.id)) ? 'disewa' : v.status;

  const saveVehicle = async () => {
    if (!vForm.name.trim() || !vForm.plate.trim()) return alert('Nama mobil dan plat wajib diisi!');
    if (!(Number(vForm.rate) > 0)) return alert('Isi tarif sewa per hari.');
    setSaving(true);
    const data = {
      ...vForm, name: vForm.name.trim(), plate: vForm.plate.trim().toUpperCase(),
      rate: Number(vForm.rate) || 0, overtimeRate: Number(vForm.overtimeRate) || 0,
      seats: Number(vForm.seats) || 0, serviceNextKm: Number(vForm.serviceNextKm) || 0, odometer: Number(vForm.odometer) || 0,
    };
    try {
      if (editId) { await updateIn('vehicles', editId, data); setVehicles(vehicles.map(v => v.id === editId ? { ...v, ...data } : v)); }
      else { const a = await addTo('vehicles', data); setVehicles([...vehicles, a]); }
      setVForm(null); setEditId(null);
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setSaving(false);
  };
  const delVehicle = async v => {
    if (!confirm(`Hapus mobil ${v.name} (${v.plate})? Invoice lama tetap menyimpan nama mobilnya.`)) return;
    try { await removeFrom('vehicles', v.id); setVehicles(vehicles.filter(x => x.id !== v.id)); }
    catch (e) { alert('Gagal menghapus: ' + e.message); }
  };
  const saveDriver = async () => {
    if (!dForm.name.trim()) return alert('Nama sopir wajib diisi!');
    setSaving(true);
    try {
      if (editId) { await updateIn('drivers', editId, dForm); setDrivers(drivers.map(d => d.id === editId ? { ...d, ...dForm } : d)); }
      else { const a = await addTo('drivers', dForm); setDrivers([...drivers, a]); }
      setDForm(null); setEditId(null);
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setSaving(false);
  };
  const delDriver = async d => {
    if (!confirm(`Hapus sopir ${d.name}?`)) return;
    try { await removeFrom('drivers', d.id); setDrivers(drivers.filter(x => x.id !== d.id)); }
    catch (e) { alert('Gagal menghapus: ' + e.message); }
  };

  const setV = (k, v) => setVForm(f => ({ ...f, [k]: v }));
  const setD = (k, v) => setDForm(f => ({ ...f, [k]: v }));
  const simSoon = d => d.simExpiry && Math.round((new Date(d.simExpiry + 'T00:00:00') - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5) <= 30;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Armada & Sopir</h1>
          <p className="text-slate-400 text-sm">{vehicles.length} mobil · {drivers.length} sopir</p>
        </div>
        <Btn onClick={() => { setEditId(null); tab === 'armada' ? setVForm({ ...EMPTY_V }) : setDForm({ ...EMPTY_D }); }}>
          {Icons.plus} {tab === 'armada' ? 'Tambah Mobil' : 'Tambah Sopir'}
        </Btn>
      </div>

      {reminders.length > 0 && (
        <Card className="p-4 border-2 border-amber-200 bg-amber-50/50">
          <div className="font-black text-amber-800 text-sm mb-2">⏰ Pengingat Dokumen & Servis ({reminders.length})</div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {reminders.map((r, i) => (
              <div key={i} className={`text-xs rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${r.level === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                <span><strong>{r.name}</strong> ({r.plate}) — {r.label}</span>
                <span className="font-black whitespace-nowrap">
                  {r.date ? (r.days < 0 ? `lewat ${-r.days} hari` : r.days === 0 ? 'hari ini' : `${r.days} hari lagi`) : (r.level === 'expired' ? 'sudah lewat KM' : 'segera')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {[['armada', `🚗 Armada (${vehicles.length})`], ['sopir', `🧑‍✈️ Sopir (${drivers.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === id ? 'bg-[#0f2544] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-[#0f2544]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'armada' && (vehicles.length === 0 ? (
        <Card className="p-12 text-center"><div className="text-4xl mb-2">🚗</div><p className="text-slate-400 text-sm">Belum ada mobil. Klik "Tambah Mobil" untuk mulai.</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(v => {
            const st = statusOf(v); const nx = nextUse(v.id);
            return (
              <Card key={v.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-[#0f2544]">{v.name}</div>
                    <div className="font-mono text-xs text-slate-500">{v.plate}{v.year ? ` · ${v.year}` : ''}{v.color ? ` · ${v.color}` : ''}</div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${STATUS_STYLE[st] || STATUS_STYLE.tersedia}`}>{st}</span>
                </div>
                <div className="text-sm"><span className="font-black text-emerald-600">Rp {fmt(v.rate)}</span><span className="text-slate-400 text-xs"> / hari</span>
                  {v.overtimeRate > 0 && <span className="text-slate-400 text-xs"> · overtime Rp {fmt(v.overtimeRate)}/jam</span>}</div>
                <div className="text-xs text-slate-500">{[v.transmission, v.seats ? `${v.seats} kursi` : '', v.odometer ? `${fmt(v.odometer)} km` : ''].filter(Boolean).join(' · ')}</div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  {v.stnkExpiry && <div>STNK: {formatDateID(v.stnkExpiry)}</div>}
                  {v.taxExpiry && <div>Pajak: {formatDateID(v.taxExpiry)}</div>}
                  {v.kirExpiry && <div>KIR: {formatDateID(v.kirExpiry)}</div>}
                  {v.serviceNextDate && <div>Servis berikut: {formatDateID(v.serviceNextDate)}{v.serviceNextKm ? ` / ${fmt(v.serviceNextKm)} km` : ''}</div>}
                </div>
                {nx && <div className="text-[11px] bg-blue-50 text-blue-700 rounded-lg px-2.5 py-1.5">Jadwal berikut: {formatDateID(nx.start.slice(0, 10))} — {nx.label}</div>}
                <div className="flex gap-1 pt-1">
                  <button onClick={() => { setEditId(v.id); setVForm({ ...EMPTY_V, ...v }); }} className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg">{Icons.edit}</button>
                  <button onClick={() => delVehicle(v)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">{Icons.trash}</button>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'sopir' && (drivers.length === 0 ? (
        <Card className="p-12 text-center"><div className="text-4xl mb-2">🧑‍✈️</div><p className="text-slate-400 text-sm">Belum ada sopir.</p></Card>
      ) : (
        <Card><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
            <th className="px-5 py-3 font-bold">Nama</th><th className="px-5 py-3 font-bold">Telepon</th>
            <th className="px-5 py-3 font-bold">SIM s.d.</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody>{drivers.map(d => (
            <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="px-5 py-3 font-bold text-[#0f2544]">{d.name}</td>
              <td className="px-5 py-3 text-slate-600">{d.phone || '-'}</td>
              <td className={`px-5 py-3 text-xs ${simSoon(d) ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{d.simExpiry ? formatDateID(d.simExpiry) : '-'}{simSoon(d) ? ' ⚠️' : ''}</td>
              <td className="px-5 py-3"><span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${d.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{d.status}</span></td>
              <td className="px-5 py-3"><div className="flex gap-1 justify-end">
                <button onClick={() => { setEditId(d.id); setDForm({ ...EMPTY_D, ...d }); }} className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg">{Icons.edit}</button>
                <button onClick={() => delDriver(d)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">{Icons.trash}</button>
              </div></td>
            </tr>))}</tbody>
        </table></div></Card>
      ))}

      {vForm && (
        <Modal wide title={editId ? 'Edit Mobil' : 'Tambah Mobil'} onClose={() => { setVForm(null); setEditId(null); }}
          footer={<><Btn onClick={saveVehicle} disabled={saving} className="flex-1 justify-center py-3">{Icons.save} {saving ? 'Menyimpan...' : 'Simpan'}</Btn><Btn variant="ghost" onClick={() => { setVForm(null); setEditId(null); }}>Batal</Btn></>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nama / Tipe Mobil *" value={vForm.name} onChange={e => setV('name', e.target.value)} placeholder="Toyota Innova Reborn" />
            <Input label="Plat Nomor *" value={vForm.plate} onChange={e => setV('plate', e.target.value)} placeholder="BK 1234 AB" />
            <Input label="Tahun" type="number" value={vForm.year} onChange={e => setV('year', e.target.value)} />
            <Input label="Warna" value={vForm.color} onChange={e => setV('color', e.target.value)} />
            <Select label="Transmisi" value={vForm.transmission} onChange={e => setV('transmission', e.target.value)}><option>Manual</option><option>Matic</option></Select>
            <Input label="Jumlah Kursi" type="number" value={vForm.seats} onChange={e => setV('seats', e.target.value)} />
            <Input label="Tarif Sewa / Hari (Rp) *" type="number" min="0" value={vForm.rate} onChange={e => setV('rate', e.target.value)} />
            <Input label="Tarif Overtime / Jam (Rp)" type="number" min="0" value={vForm.overtimeRate} onChange={e => setV('overtimeRate', e.target.value)} placeholder="kosong = 10% tarif harian" />
            <Select label="Status" value={vForm.status} onChange={e => setV('status', e.target.value)}>
              <option value="tersedia">Tersedia</option><option value="bengkel">Di bengkel</option><option value="nonaktif">Nonaktif</option>
            </Select>
            <Input label="Odometer Saat Ini (km)" type="number" value={vForm.odometer} onChange={e => setV('odometer', e.target.value)} />
            <Input label="STNK Berlaku s.d." type="date" value={vForm.stnkExpiry} onChange={e => setV('stnkExpiry', e.target.value)} />
            <Input label="Pajak Tahunan s.d." type="date" value={vForm.taxExpiry} onChange={e => setV('taxExpiry', e.target.value)} />
            <Input label="KIR Berlaku s.d." type="date" value={vForm.kirExpiry} onChange={e => setV('kirExpiry', e.target.value)} />
            <Input label="Servis Berikutnya (tanggal)" type="date" value={vForm.serviceNextDate} onChange={e => setV('serviceNextDate', e.target.value)} />
            <Input label="Servis Berikutnya (km)" type="number" value={vForm.serviceNextKm} onChange={e => setV('serviceNextKm', e.target.value)} />
            <Input label="Catatan" value={vForm.notes} onChange={e => setV('notes', e.target.value)} />
          </div>
        </Modal>
      )}

      {dForm && (
        <Modal title={editId ? 'Edit Sopir' : 'Tambah Sopir'} onClose={() => { setDForm(null); setEditId(null); }}
          footer={<><Btn onClick={saveDriver} disabled={saving} className="flex-1 justify-center py-3">{Icons.save} {saving ? 'Menyimpan...' : 'Simpan'}</Btn><Btn variant="ghost" onClick={() => { setDForm(null); setEditId(null); }}>Batal</Btn></>}>
          <div className="space-y-3">
            <Input label="Nama Sopir *" value={dForm.name} onChange={e => setD('name', e.target.value)} />
            <Input label="No. Telepon" value={dForm.phone} onChange={e => setD('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
            <Input label="SIM Berlaku s.d." type="date" value={dForm.simExpiry} onChange={e => setD('simExpiry', e.target.value)} />
            <Select label="Status" value={dForm.status} onChange={e => setD('status', e.target.value)}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></Select>
            <Input label="Catatan" value={dForm.notes} onChange={e => setD('notes', e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
