// src/pages/Accounts.jsx
import { useState, useEffect } from 'react';
import { Card, Btn, Badge, Icons } from '../components/UI.jsx';
import { getAllAccounts, setAccountDisabled, deleteAccountCompletely } from '../lib/firebase.js';

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [err, setErr]           = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await getAllAccounts();
      setAccounts(list);
    } catch (e) {
      setErr('Gagal memuat daftar akun: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (acc) => {
    setBusyId(acc.id);
    try {
      await setAccountDisabled(acc.id, !acc.disabled);
      setAccounts(list => list.map(a => a.id === acc.id ? { ...a, disabled: !acc.disabled } : a));
    } catch (e) {
      alert('Gagal mengubah status akun: ' + e.message);
    }
    setBusyId(null);
  };

  const handleDelete = async (acc) => {
    const ok = confirm(
      `Hapus akun "${acc.email}" beserta SELURUH datanya (customer & invoice)?\n\n` +
      `Tindakan ini tidak bisa dibatalkan. Akun akan langsung terkunci dan datanya dihapus permanen.`
    );
    if (!ok) return;
    setBusyId(acc.id);
    try {
      await deleteAccountCompletely(acc.id);
      setAccounts(list => list.filter(a => a.id !== acc.id));
    } catch (e) {
      alert('Gagal menghapus akun: ' + e.message);
    }
    setBusyId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Daftar Akun
          </h1>
          <p className="text-slate-400 text-sm">
            {accounts.length} akun terdaftar &middot; kelola akun yang mendaftar sendiri di halaman login
          </p>
        </div>
        <Btn variant="ghost" onClick={load}>🔄 Muat Ulang</Btn>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3">
        ℹ️ Setiap akun di sini punya data invoice, customer &amp; pengaturan sendiri, terpisah dari
        Login Utama. <strong>Nonaktifkan sementara</strong> memblokir akun agar tidak bisa login tanpa
        menghapus datanya. <strong>Hapus</strong> mengunci akun secara permanen dan menghapus seluruh
        datanya.
      </div>

      {err && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{err}</p>}

      <Card>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Memuat daftar akun...</div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Belum ada akun yang mendaftar sendiri lewat halaman login.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
                  <th className="px-5 py-3 font-bold">Nama / Usaha</th>
                  <th className="px-5 py-3 font-bold">Email</th>
                  <th className="px-5 py-3 font-bold">Daftar Sejak</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-bold text-[#0f2544]">{acc.displayName || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{acc.email}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(acc.createdAt)}</td>
                    <td className="px-5 py-3">
                      {acc.disabled
                        ? <Badge color="red">Nonaktif</Badge>
                        : <Badge color="green">Aktif</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <Btn
                          variant={acc.disabled ? 'green' : 'amber'}
                          className="text-xs px-3 py-1.5"
                          disabled={busyId === acc.id}
                          onClick={() => handleToggle(acc)}
                        >
                          {acc.disabled ? '✅ Aktifkan' : '⏸️ Nonaktifkan'}
                        </Btn>
                        <Btn
                          variant="danger"
                          className="text-xs px-3 py-1.5"
                          disabled={busyId === acc.id}
                          onClick={() => handleDelete(acc)}
                        >
                          {Icons.trash} Hapus
                        </Btn>
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
