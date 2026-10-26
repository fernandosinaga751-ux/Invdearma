// src/pages/Customers.jsx
import { useState } from 'react';
import { Card, Input, Btn, Icons, Modal } from '../components/UI.jsx';
import { uid, fmt, formatDateID, compressPhoto } from '../lib/utils.js';
import { LockedTeaser } from '../components/FeatureGate.jsx';
import { paidTotal, outstanding } from '../lib/rental.js';
import { addCustomer, updateCustomer, deleteCustomer } from '../lib/firebase.js';

export default function Customers({ customers, setCustomers, invoices = [], can = () => false, setPage }) {
  const crm = can('crm');
  const empty = { name: '', phone: '', address: '', email: '', nik: '', ktpImg: '', simImg: '', flagged: false, flagReason: '' };
  const [history, setHistory] = useState(null); // customer yang riwayatnya dibuka
  const [form, setForm]       = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Nama customer wajib diisi!');
    setSaving(true);
    try {
      // Tanpa fitur CRM hanya kolom dasar yang disimpan (data CRM yang sudah ada tidak tersentuh)
      const data = crm ? form : { name: form.name, phone: form.phone, address: form.address, email: form.email };
      if (editing) {
        await updateCustomer(editing, data);
        setCustomers(customers.map(c => c.id === editing ? { ...c, ...data } : c));
      } else {
        const added = await addCustomer(data);
        setCustomers([...customers, { ...data, id: added.id, createdAt: new Date().toISOString() }]);
      }
      setForm(empty); setEditing(null); setShowForm(false);
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
    setSaving(false);
  };

  const handleEdit = c => {
    setForm({ ...empty, name: c.name, phone: c.phone || '', address: c.address || '', email: c.email || '',
      ...(crm ? { nik: c.nik || '', ktpImg: c.ktpImg || '', simImg: c.simImg || '', flagged: !!c.flagged, flagReason: c.flagReason || '' } : {}) });
    setEditing(c.id); setShowForm(true);
  };

  const pickPhoto = async (key, e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const url = await compressPhoto(f); setForm(prev => ({ ...prev, [key]: url })); }
    catch (err) { alert(err.message); }
  };

  const handleDel = async id => {
    if (!confirm('Hapus customer ini?')) return;
    await deleteCustomer(id);
    setCustomers(customers.filter(c => c.id !== id));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Data Customer
          </h1>
          <p className="text-slate-400 text-sm">{customers.length} customer terdaftar</p>
        </div>
        <Btn onClick={() => { setForm(empty); setEditing(null); setShowForm(true); }}>
          {Icons.plus} Tambah Customer
        </Btn>
      </div>

      {showForm && (
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-4 text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            {editing ? 'Edit Customer' : 'Tambah Customer Baru'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nama Customer *" value={form.name}    onChange={e => setForm({ ...form, name: e.target.value })}    placeholder="Nama lengkap" />
            <Input label="No. Telepon"     value={form.phone}   onChange={e => setForm({ ...form, phone: e.target.value })}   placeholder="08xxxxxxxxxx" />
            <Input label="Email"           value={form.email}   onChange={e => setForm({ ...form, email: e.target.value })}   placeholder="email@contoh.com" />
            <Input label="Alamat"          value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
          </div>
          {crm ? (
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2"><div className="font-bold text-[#0f2544] text-sm">🪪 Data Lengkap</div><span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">FITUR CRM</span></div>
              <Input label="NIK / No. KTP" value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} placeholder="16 digit NIK" />
              <div className="grid sm:grid-cols-2 gap-4">
                {[['ktpImg', 'Foto KTP'], ['simImg', 'Foto SIM']].map(([k, l]) => (
                  <div key={k} className="border border-slate-200 rounded-2xl p-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{l}</div>
                    <div className="h-28 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden mb-2">
                      {form[k] ? <img src={form[k]} alt={l} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-300">belum ada foto</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer text-xs font-bold text-[#0f2544] hover:underline">📷 {form[k] ? 'Ganti' : 'Unggah'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(k, e)} /></label>
                      {form[k] && <button onClick={() => setForm({ ...form, [k]: '' })} className="text-xs text-red-500 hover:underline">Hapus</button>}
                    </div>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.flagged} onChange={e => setForm({ ...form, flagged: e.target.checked })} />
                <span className="font-semibold text-red-600">⚠️ Tandai customer bermasalah</span>
              </label>
              {form.flagged && <Input label="Alasan" value={form.flagReason} onChange={e => setForm({ ...form, flagReason: e.target.value })} placeholder="mis. terlambat bayar, merusak mobil" />}
              <p className="text-[11px] text-slate-400">Foto KTP/SIM bersifat sensitif: hanya tersimpan di akun Anda dan tidak ikut dikirim ke link customer.</p>
            </div>
          ) : <div className="mt-4"><LockedTeaser featureId="crm" setPage={setPage} /></div>}
          <div className="flex gap-2 mt-4">
            <Btn onClick={handleSave} disabled={saving}>
              {Icons.save} {saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Customer')}
            </Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Batal</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100">
          <Input placeholder="Cari nama atau nomor telepon..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {search ? 'Tidak ditemukan. Coba kata kunci lain.' : 'Belum ada customer. Klik "+ Tambah Customer" untuk mulai.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
                  <th className="px-5 py-3 font-bold">Nama</th>
                  <th className="px-5 py-3 font-bold">Telepon</th>
                  <th className="px-5 py-3 font-bold">Email</th>
                  <th className="px-5 py-3 font-bold">Alamat</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-bold text-[#0f2544]">{c.flagged && <span title={c.flagReason || 'Bermasalah'} className="mr-1">⚠️</span>}{c.name}{crm && c.nik ? <span className="block text-[10px] font-mono font-normal text-slate-400">NIK {c.nik}</span> : null}</td>
                    <td className="px-5 py-3 text-slate-600">{c.phone || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email || '-'}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{c.address || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {crm && <button onClick={() => setHistory(c)} className="px-2 py-1 text-[10px] font-black rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition">RIWAYAT</button>}
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">
                          {Icons.edit}
                        </button>
                        <button onClick={() => handleDel(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {history && (() => {
        const list = invoices.filter(i => i.customerId === history.id || (!i.customerId && i.customerName === history.name))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const total = list.reduce((s, i) => s + (i.total || 0), 0);
        const left = list.reduce((s, i) => s + outstanding(i), 0);
        return (
          <Modal wide title={`Riwayat Sewa — ${history.name}`} subtitle={`${list.length} invoice · total Rp ${fmt(total)} · belum dibayar Rp ${fmt(left)}`} onClose={() => setHistory(null)}>
            {history.flagged && <div className="mb-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2">⚠️ Ditandai bermasalah{history.flagReason ? `: ${history.flagReason}` : ''}</div>}
            {(history.ktpImg || history.simImg) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {history.ktpImg && <img src={history.ktpImg} alt="KTP" className="rounded-xl border border-slate-200 max-h-40 object-contain w-full bg-slate-50" />}
                {history.simImg && <img src={history.simImg} alt="SIM" className="rounded-xl border border-slate-200 max-h-40 object-contain w-full bg-slate-50" />}
              </div>
            )}
            {list.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">Belum ada invoice untuk customer ini.</p> : (
              <div className="divide-y divide-slate-100">
                {list.map(i => (
                  <div key={i.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0f2544]">{i.invoiceNo}</div>
                      <div className="text-xs text-slate-400">{formatDateID(i.date)}{i.rental?.vehicleName ? ` · ${i.rental.vehicleName}` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600">Rp {fmt(i.total)}</div>
                      <div className="text-[10px] font-bold text-slate-400">{i.paidDate ? '✅ Lunas' : `sisa Rp ${fmt(outstanding(i))}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
