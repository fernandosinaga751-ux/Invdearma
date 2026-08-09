// src/pages/Login.jsx
import { useState } from 'react';
import { Btn, Input } from '../components/UI.jsx';
import { loginAccount, registerAccount, loginMaster } from '../lib/firebase.js';

function friendlyError(code) {
  const map = {
    'auth/invalid-email':        'Format email tidak valid.',
    'auth/user-not-found':       'Akun dengan email ini tidak ditemukan. Silakan daftar dulu.',
    'auth/wrong-password':       'Password salah.',
    'auth/invalid-credential':   'Email atau password salah.',
    'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk (tab Masuk).',
    'auth/weak-password':        'Password minimal 6 karakter.',
    'auth/too-many-requests':    'Terlalu banyak percobaan gagal. Coba lagi beberapa saat lagi.',
    'auth/network-request-failed': 'Koneksi internet bermasalah.',
  };
  return map[code] || 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function Login({ settings, onMasterLogin }) {
  const [mode, setMode]       = useState('master'); // 'master' | 'login' | 'register'
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [pw2, setPw2]         = useState('');
  const [masterPw, setMasterPw] = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = m => { setMode(m); setErr(''); };

  const handleMaster = async () => {
    setErr('');
    if (!masterPw) { setErr('❌ Password wajib diisi!'); return; }
    setLoading(true);
    try {
      await loginMaster(masterPw);
      onMasterLogin?.();
    } catch (e) {
      setErr(e.message === 'WRONG_PASSWORD' ? '❌ Password salah!' : '❌ ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handle = async () => {
    setErr('');
    if (!email.trim() || !pw) { setErr('❌ Email dan password wajib diisi!'); return; }

    if (mode === 'register') {
      if (!name.trim())      { setErr('❌ Nama usaha / pemilik wajib diisi!'); return; }
      if (pw.length < 6)     { setErr('❌ Password minimal 6 karakter!'); return; }
      if (pw !== pw2)        { setErr('❌ Konfirmasi password tidak cocok!'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginAccount(email, pw);
      } else {
        await registerAccount(email, pw, name);
      }
      // Setelah berhasil, App.jsx otomatis mendeteksi perubahan status
      // login (onAuthStateChanged) dan memuat data khusus akun ini.
    } catch (e) {
      if (e.message === 'ACCOUNT_DISABLED') {
        setErr('❌ Akun ini telah dinonaktifkan sementara. Hubungi admin.');
      } else {
        setErr('❌ ' + friendlyError(e.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#0f2544 0%,#1e4080 55%,#2d5fa8 100%)' }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-md">
        <div className="text-center mb-6">
          {settings?.logo ? (
            <img src={settings.logo} className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto mb-4 rounded-2xl" alt="Logo" />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-black text-2xl"
              style={{ background: 'linear-gradient(135deg,#0f2544,#1e4080)', color: '#d4a017', fontFamily: 'Georgia,serif' }}
            >DRM</div>
          )}
          <h1
            className="text-xl sm:text-2xl font-black text-[#0f2544] tracking-tight"
            style={{ fontFamily: 'Playfair Display,Georgia,serif' }}
          >
            {settings?.companyName || 'Dearma Rental Mobil Medan'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Invoice & Kwitansi</p>
        </div>

        {/* Tab: Login Utama / Masuk / Daftar */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6 text-[11px] sm:text-sm">
          <button
            onClick={() => switchMode('master')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all
              ${mode === 'master' ? 'bg-white shadow text-[#0f2544]' : 'text-slate-400'}`}
          >
            Login Utama
          </button>
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all
              ${mode === 'login' ? 'bg-white shadow text-[#0f2544]' : 'text-slate-400'}`}
          >
            Masuk
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all
              ${mode === 'register' ? 'bg-white shadow text-[#0f2544]' : 'text-slate-400'}`}
          >
            Daftar
          </button>
        </div>

        {mode === 'master' && (
          <div className="space-y-4">
            <Input
              label="Password Login Utama"
              type="password"
              value={masterPw}
              onChange={e => setMasterPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMaster()}
              placeholder="••••••••"
            />
            {err && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{err}</p>}
            <Btn onClick={handleMaster} disabled={loading} className="w-full justify-center py-3 text-base">
              {loading ? '⏳ Memeriksa...' : '🔐 Masuk sebagai Admin'}
            </Btn>
            <p className="text-center text-xs text-slate-400">
              Untuk akses database utama (data lama) &amp; kelola akun terdaftar.
            </p>
          </div>
        )}

        {mode !== 'master' && (
          <div className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Nama Usaha / Pemilik"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="mis. Dearma Rental Mobil Medan"
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && handle()}
              placeholder="email@usaha-anda.com"
            />
            <Input
              label="Password"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && handle()}
              placeholder="••••••••"
            />
            {mode === 'register' && (
              <Input
                label="Konfirmasi Password"
                type="password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="••••••••"
              />
            )}
            {err && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{err}</p>
            )}
            <Btn onClick={handle} disabled={loading} className="w-full justify-center py-3 text-base">
              {loading
                ? '⏳ Memproses...'
                : (mode === 'login' ? '🔐 Masuk ke Sistem' : '✨ Buat Akun Baru')}
            </Btn>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-6">
          Setiap akun memiliki data invoice, customer &amp; pengaturan sendiri-sendiri.
        </p>
        <p className="text-center text-xs text-slate-300 mt-1">
          © {new Date().getFullYear()} {settings?.companyName || 'Dearma Rental Mobil Medan'}
        </p>
      </div>
    </div>
  );
}
