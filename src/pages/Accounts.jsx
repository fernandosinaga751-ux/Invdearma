// src/pages/Accounts.jsx
import { useState, useEffect } from 'react';
import { Card, Btn, Badge, Icons } from '../components/UI.jsx';
import { getAllAccounts, approveAccount, setAccountStatus, deleteAccountCompletely } from '../lib/firebase.js';

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function StatusBadge({ status, dataWiped }) {
  if (status === 'pending')  return <Badge color="amber">Menunggu Persetujuan</Badge>;
  if (status === 'disabled') return (
    <div className="space-y-1">
      <Badge color="red">Nonaktif</Badge>
      {dataWiped && <div className="text-[10px] text-red-400">Data sudah dihapus</div>}
    </div>
  );
  return <Badge color="green">Aktif</Badge>;
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

  const pendingCount = accounts.filter(a => a.status === 'pending').length;

  const handleApprove = async (acc) => {
    setBusyId(acc.id);
    try {
      await approveAccount(acc.id);
      setAccounts(list => list.map(a => a.id === acc.id ? { ...a, status: 'active' } : a));
    } catch (e) {
      alert('Gagal menyetujui akun: ' + e.message);
    }
    setBusyId(null);
  };

  const handleToggle = async (acc) => {
    const next = acc.status === 'disabled' ? 'active' : 'disabled';
    setBusyId(acc.id);
    try {
      await setAccountStatus(acc.id, next);
      setAccounts(list => list.map(a => a.id === acc.id ? { ...a, status: next } : a));
    } catch (e) {
      alert('Gagal mengubah status akun: ' + e.message);
    }
    setBusyId(null);
  };

  const handleDelete = async (acc) => {
    const ok = confirm(
      `Hapus akun "${acc.email}" beserta SELURUH datanya (customer & invoice)?\n\n` +
      `Tindakan ini tidak bisa dibatalkan. Akun akan langsung terkunci permanen dan datanya dihapus.\n\n` +
      `Catatan: akun ini masih akan tercatat di Firebase Authentication (login-nya diblokir dari sisi aplikasi). ` +
      `Untuk menghapusnya total dari Firebase Authentication, lakukan manual lewat Firebase Console.`
    );
    if (!ok) return;
    setBusyId(acc.id);
    try {
      const res = await deleteAccountCompletely(acc.id);
      setAccounts(list => list.map(a => a.id === acc.id ? { ...a, status: 'disabled', dataWiped: true } : a));
      if (!res?.authUserDeleted) {
        alert(
          'Data akun sudah dihapus & akun terkunci permanen.\n\n' +
          'Akun ini masih tercatat di Firebase Authentication (belum ada Cloud Function ' +
          'untuk menghapusnya otomatis — lihat README bagian "Cloud Function: Hapus Akun ' +
          'Permanen"). Kalau mau, hapus manual lewat Firebase Console → Authentication → Users.'
        );
      }
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
            {accounts.length} akun terdaftar
            {pendingCount > 0 && <span className="text-amber-600 font-bold"> &middot; {pendingCount} menunggu persetujuan</span>}
          </p>
        </div>
        <Btn variant="ghost" onClick={load}>🔄 Muat Ulang</Btn>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3">
        ℹ️ Akun yang baru daftar berstatus <strong>Menunggu Persetujuan</strong> dan tidak bisa login
        sampai Anda klik <strong>Setujui</strong>. <strong>Nonaktifkan sementara</strong> memblokir akun
        aktif agar tidak bisa login tanpa menghapus datanya. <strong>Hapus</strong> mengunci akun secara
        permanen dan menghapus seluruh datanya.
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
                    <td className="px-5 py-3"><StatusBadge status={acc.status} dataWiped={acc.dataWiped} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {acc.status === 'pending' && (
                          <Btn
                            variant="green"
                            className="text-xs px-3 py-1.5"
                            disabled={busyId === acc.id}
                            onClick={() => handleApprove(acc)}
                          >
                            ✅ Setujui
                          </Btn>
                        )}
                        {acc.status !== 'pending' && (
                          <Btn
                            variant={acc.status === 'disabled' ? 'green' : 'amber'}
                            className="text-xs px-3 py-1.5"
                            disabled={busyId === acc.id}
                            onClick={() => handleToggle(acc)}
                          >
                            {acc.status === 'disabled' ? '✅ Aktifkan' : '⏸️ Nonaktifkan'}
                          </Btn>
                        )}
                        {!acc.dataWiped && (
                          <Btn
                            variant="danger"
                            className="text-xs px-3 py-1.5"
                            disabled={busyId === acc.id}
                            onClick={() => handleDelete(acc)}
                          >
                            {Icons.trash} Hapus
                          </Btn>
                        )}
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
