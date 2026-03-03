// src/pages/Customers.jsx
import { useState } from 'react';
import { Card, Input, Btn, Icons } from '../components/UI.jsx';
import { uid } from '../lib/utils.js';
import { addCustomer, updateCustomer, deleteCustomer } from '../lib/firebase.js';

export default function Customers({ customers, setCustomers }) {
  const empty = { name: '', phone: '', address: '', email: '' };
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
      if (editing) {
        await updateCustomer(editing, form);
        setCustomers(customers.map(c => c.id === editing ? { ...c, ...form } : c));
      } else {
        const added = await addCustomer(form);
        setCustomers([...customers, { ...form, id: added.id, createdAt: new Date().toISOString() }]);
      }
      setForm(empty); setEditing(null); setShowForm(false);
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
    setSaving(false);
  };

  const handleEdit = c => {
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', email: c.email || '' });
    setEditing(c.id); setShowForm(true);
  };

  const handleDel = async id => {
    if (!confirm('Hapus customer ini?')) return;
    await deleteCustomer(id);
    setCustomers(customers.filter(c => c.id !== id));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
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
                    <td className="px-5 py-3 font-bold text-[#0f2544]">{c.name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.phone || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email || '-'}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{c.address || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
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
    </div>
  );
}
