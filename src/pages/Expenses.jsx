// src/pages/Expenses.jsx — pengeluaran & laba per mobil
import { useState } from 'react';
import { Card, Input, Select, Btn, Modal, Icons } from '../components/UI.jsx';
import { fmt, formatDateID, todayStr } from '../lib/utils.js';
import { addTo, updateIn, removeFrom } from '../lib/firebase.js';

export const EXPENSE_CATS = ['BBM', 'Servis / Perbaikan', 'Sparepart', 'Cuci', 'Pajak / STNK', 'Asuransi', 'Gaji Sopir', 'Parkir / Tol', 'Lainnya'];
const EMPTY = () => ({ date: todayStr(), vehicleId: '', category: 'BBM', amount: '', note: '' });

export default function Expenses({ expenses, setExpenses, vehicles, invoices, fleetOn }) {
  const [month, setMonth]   = useState(todayStr().slice(0, 7));
  const [vf, setVf]         = useState('');
  const [form, setForm]     = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const vName   = id => vehicles.find(v => v.id === id);
  const inMonth = d => (d || '').startsWith(month);
  const rows  = expenses.filter(e => inMonth(e.date) && (!vf || e.vehicleId === vf)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = rows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCat = {}; rows.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + (Number(e.amount) || 0); });

  // Laba per mobil pada bulan terpilih (pendapatan = total invoice bertanggal bulan tsb yang memuat data mobil)
  const profit = vehicles.map(v => {
    const income = invoices.filter(i => i.rental?.vehicleId === v.id && inMonth(i.date)).reduce((s, i) => s + (i.total || 0), 0);
    const cost = expenses.filter(e => e.vehicleId === v.id && inMonth(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { v, income, cost, net: income - cost };
  }).filter(r => r.income || r.cost);
  const generalCost = expenses.filter(e => !e.vehicleId && inMonth(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const save = async () => {
    if (!(Number(form.amount) > 0)) return alert('Isi jumlah pengeluaran.');
    if (!form.date) return alert('Isi tanggal.');
    setSaving(true);
    const data = { ...form, amount: Math.round(Number(form.amount)) };
    try {
      if (editId) { await updateIn('expenses', editId, data); setExpenses(expenses.map(e => e.id === editId ? { ...e, ...data } : e)); }
      else { const a = await addTo('expenses', data); setExpenses([a, ...expenses]); }
      setForm(null); setEditId(null);
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setSaving(false);
  };
  const del = async e => {
    if (!confirm('Hapus catatan pengeluaran ini?')) return;
    try { await removeFrom('expenses', e.id); setExpenses(expenses.filter(x => x.id !== e.id)); }
    catch (err) { alert('Gagal menghapus: ' + err.message); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Pengeluaran</h1>
          <p className="text-slate-400 text-sm">Total bulan ini: <span className="font-black text-red-500">Rp {fmt(total)}</span></p>
        </div>
        <Btn onClick={() => { setEditId(null); setForm(EMPTY()); }}>{Icons.plus} Catat Pengeluaran</Btn>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44"><Input label="Bulan" type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
        {fleetOn && vehicles.length > 0 && (
          <div className="w-56"><Select label="Mobil" value={vf} onChange={e => setVf(e.target.value)}>
            <option value="">Semua</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.plate}</option>)}
          </Select></div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-1">
          <div className="font-bold text-[#0f2544] mb-2 text-sm">Per Kategori</div>
          {Object.keys(byCat).length === 0 ? <p className="text-xs text-slate-400">Belum ada data.</p> : (
            <div className="space-y-1.5">{Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <div key={c} className="flex justify-between text-sm"><span className="text-slate-600">{c}</span><span className="font-bold">Rp {fmt(v)}</span></div>))}</div>
          )}
        </Card>
        <Card className="p-4 lg:col-span-2">
          <div className="font-bold text-[#0f2544] mb-2 text-sm">Laba per Mobil — {month}</div>
          {profit.length === 0 ? <p className="text-xs text-slate-400">Belum ada pendapatan/pengeluaran per mobil pada bulan ini. Pendapatan terhubung ke mobil lewat "Detail Sewa" di invoice.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b"><th className="py-2">Mobil</th><th className="text-right">Pendapatan</th><th className="text-right">Pengeluaran</th><th className="text-right">Laba</th></tr></thead>
              <tbody>{profit.map(r => (
                <tr key={r.v.id} className="border-b border-slate-50"><td className="py-2 font-semibold">{r.v.name} <span className="text-xs text-slate-400 font-mono">{r.v.plate}</span></td>
                  <td className="text-right text-emerald-600">Rp {fmt(r.income)}</td><td className="text-right text-red-500">Rp {fmt(r.cost)}</td>
                  <td className={`text-right font-black ${r.net >= 0 ? 'text-[#0f2544]' : 'text-red-600'}`}>Rp {fmt(r.net)}</td></tr>))}</tbody>
            </table></div>
          )}
          {generalCost > 0 && <div className="text-xs text-slate-400 mt-2">Pengeluaran umum (tanpa mobil): Rp {fmt(generalCost)}</div>}
        </Card>
      </div>

      <Card>
        {rows.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">Belum ada pengeluaran pada filter ini.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
              <th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Mobil</th><th className="px-5 py-3">Catatan</th><th className="px-5 py-3 text-right">Jumlah</th><th className="px-5 py-3"></th></tr></thead>
            <tbody>{rows.map(e => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3 text-xs text-slate-500">{formatDateID(e.date)}</td>
                <td className="px-5 py-3 font-semibold">{e.category}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{vName(e.vehicleId) ? `${vName(e.vehicleId).name} (${vName(e.vehicleId).plate})` : '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{e.note || ''}</td>
                <td className="px-5 py-3 text-right font-bold text-red-500">Rp {fmt(e.amount)}</td>
                <td className="px-5 py-3"><div className="flex gap-1 justify-end">
                  <button onClick={() => { setEditId(e.id); setForm({ ...EMPTY(), ...e }); }} className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg">{Icons.edit}</button>
                  <button onClick={() => del(e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">{Icons.trash}</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>

      {form && (
        <Modal title={editId ? 'Edit Pengeluaran' : 'Catat Pengeluaran'} onClose={() => { setForm(null); setEditId(null); }}
          footer={<><Btn onClick={save} disabled={saving} className="flex-1 justify-center py-3">{Icons.save} {saving ? 'Menyimpan...' : 'Simpan'}</Btn><Btn variant="ghost" onClick={() => { setForm(null); setEditId(null); }}>Batal</Btn></>}>
          <div className="space-y-3">
            <Input label="Tanggal" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Select label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</Select>
            {fleetOn && vehicles.length > 0 && (
              <Select label="Untuk Mobil (opsional)" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">— umum / tanpa mobil —</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.plate}</option>)}
              </Select>
            )}
            <Input label="Jumlah (Rp)" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <Input label="Catatan" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="mis. ganti oli + filter" />
          </div>
        </Modal>
      )}
    </div>
  );
}
