// src/pages/Settings.jsx
import { useState } from 'react';
import { Card, Input, Btn } from '../components/UI.jsx';
import { toB64 } from '../lib/utils.js';
import { saveSettings as fbSaveSettings, savePassword as fbSavePassword } from '../lib/firebase.js';

export default function Settings({ settings, setSettings, password, setPassword }) {
  const [form, setForm]     = useState({ ...settings });
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [saved, setSaved]   = useState(false);
  const [pwMsg, setPwMsg]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleImg = async (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Ukuran file maksimal 2MB!');
    const b64 = await toB64(file);
    setForm(f => ({ ...f, [field]: b64 }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fbSaveSettings(form);
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setSaving(false);
  };

  const handlePw = async () => {
    if (!newPw.trim())    return setPwMsg('❌ Password baru tidak boleh kosong!');
    if (newPw !== confPw) return setPwMsg('❌ Konfirmasi password tidak cocok!');
    if (newPw.length < 4) return setPwMsg('❌ Password minimal 4 karakter!');
    try {
      await fbSavePassword(newPw);
      setPassword(newPw);
      setNewPw(''); setConfPw('');
      setPwMsg('✅ Password berhasil diubah!');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (e) { setPwMsg('❌ Gagal: ' + e.message); }
  };

  const ImgUpload = ({ field, label, desc, emoji }) => (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
          {form[field]
            ? <img src={form[field]} className="w-full h-full object-contain p-1" alt={label} />
            : <span className="text-3xl">{emoji}</span>}
        </div>
        <div>
          <label className="cursor-pointer inline-block px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition">
            📤 Upload {label}
            <input type="file" accept="image/*" className="hidden" onChange={e => handleImg(field, e)} />
          </label>
          {form[field] && (
            <button onClick={() => setForm(f => ({ ...f, [field]: null }))} className="ml-2 text-xs text-red-500 hover:underline">Hapus</button>
          )}
          <p className="text-xs text-slate-400 mt-1">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-2xl pb-12">
      <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
        Pengaturan
      </h1>

      {/* Company Info */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4 text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
          Informasi Perusahaan
        </h3>
        <div className="space-y-3">
          <Input label="Nama Perusahaan" value={form.companyName || ''} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Dearma Rental Mobil Medan" />
          <Input label="Nama Pemilik / Pimpinan" value={form.ownerName || ''} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Nama yang tampil di tanda tangan" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="No. Telepon / HP" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            <Input label="Email"            value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" />
          </div>
          <Input label="Alamat Lengkap" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 1, Medan" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Nama Bank" value={form.bankName || ''} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="BCA / BNI / BRI / Mandiri..." />
            <Input label="No. Rekening" value={form.bankAccount || ''} onChange={e => setForm({ ...form, bankAccount: e.target.value })} placeholder="12345678xxxx" />
          </div>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4 text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
          Logo, Tanda Tangan & Stempel
        </h3>
        <div className="space-y-5">
          <ImgUpload field="logo"      label="Logo Perusahaan"   emoji="🏢" desc="Tampil di header invoice & halaman login. PNG/JPG, max 2MB." />
          <ImgUpload field="signature" label="Tanda Tangan"      emoji="✍️" desc="Tanda tangan pimpinan di bagian bawah invoice & kwitansi." />
          <ImgUpload field="stamp"     label="Cap / Stempel"     emoji="🔴" desc="Gunakan background transparan (PNG) untuk hasil terbaik." />
        </div>
      </Card>

      <div className="flex gap-3">
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Menyimpan...' : (saved ? '✅ Tersimpan!' : '💾 Simpan Pengaturan')}
        </Btn>
      </div>

      {/* Password */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4 text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
          Ubah Password Admin
        </h3>
        <div className="space-y-3 max-w-xs">
          <Input label="Password Baru"           type="password" value={newPw}  onChange={e => setNewPw(e.target.value)}  placeholder="••••••••" />
          <Input label="Konfirmasi Password Baru" type="password" value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="••••••••" />
          {pwMsg && (
            <p className={`text-sm px-3 py-2 rounded-xl ${pwMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {pwMsg}
            </p>
          )}
          <Btn variant="outline" onClick={handlePw}>🔐 Ubah Password</Btn>
        </div>
      </Card>
    </div>
  );
}
