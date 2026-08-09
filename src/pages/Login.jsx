// src/pages/Login.jsx
import { useState } from 'react';
import { Btn, Input } from '../components/UI.jsx';
import { loginAccount, registerAccount } from '../lib/firebase.js';

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

export default function Login({ settings }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [pw2, setPw2]         = useState('');
  const [err, setErr]         = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = m => { setMode(m); setErr(''); setInfo(''); };

  const handle = async () => {
    setErr(''); setInfo('');
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
        // Setelah berhasil, App.jsx otomatis mendeteksi perubahan status
        // login (onAuthStateChanged) dan memuat data khusus sesi ini.
      } else {
        const res = await registerAccount(email, pw, name);
        if (res.pending) {
          setInfo('✅ Akun berhasil didaftarkan! Silakan tunggu persetujuan dari admin sebelum bisa login.');
          setMode('login');
          setEmail(email.trim()); setPw(''); setPw2(''); setName('');
        }
        // kalau res.pending === false → ini akun admin, App.jsx otomatis lanjut
      }
    } catch (e) {
      if (e.message === 'ACCOUNT_PENDING') {
        setErr('⏳ Akun Anda masih menunggu persetujuan admin. Silakan coba lagi nanti.');
      } else if (e.message === 'ACCOUNT_DISABLED') {
        setErr('❌ Akun ini telah dinonaktifkan sementara. Hubungi admin.');
      } else if (e.message === 'TIMEOUT') {
        setErr('❌ Koneksi ke Firebase macet/timeout. Periksa koneksi internet lalu coba lagi.');
      } else {
        setErr('❌ ' + friendlyError(e.code));
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
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

        {/* Tab: Masuk / Daftar */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
              ${mode === 'login' ? 'bg-white shadow text-[#0f2544]' : 'text-slate-400'}`}
          >
            Masuk
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
              ${mode === 'register' ? 'bg-white shadow text-[#0f2544]' : 'text-slate-400'}`}
          >
            Daftar Akun
          </button>
        </div>

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
          {info && (
            <p className="text-emerald-600 text-sm bg-emerald-50 rounded-xl px-4 py-2.5">{info}</p>
          )}
          <Btn onClick={handle} disabled={loading} className="w-full justify-center py-3 text-base">
            {loading
              ? '⏳ Memproses...'
              : (mode === 'login' ? '🔐 Masuk ke Sistem' : '✨ Daftar Akun Baru')}
          </Btn>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          Akun baru perlu disetujui admin sebelum bisa login. Setiap akun punya
          data invoice, customer &amp; pengaturan sendiri-sendiri.
        </p>
        <p className="text-center text-xs text-slate-300 mt-1">
          © {new Date().getFullYear()} {settings?.companyName || 'Dearma Rental Mobil Medan'}
        </p>
      </div>
    </div>
  );
}
