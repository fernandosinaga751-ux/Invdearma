// src/pages/Login.jsx
import { useState } from 'react';
import { Btn, Input } from '../components/UI.jsx';

export default function Login({ onLogin, settings }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    await onLogin(pw, setErr);
    setLoading(false);
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

      <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          {settings?.logo ? (
            <img src={settings.logo} className="w-24 h-24 object-contain mx-auto mb-4 rounded-2xl" alt="Logo" />
          ) : (
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-black text-2xl"
              style={{ background: 'linear-gradient(135deg,#0f2544,#1e4080)', color: '#d4a017', fontFamily: 'Georgia,serif' }}
            >DRM</div>
          )}
          <h1
            className="text-2xl font-black text-[#0f2544] tracking-tight"
            style={{ fontFamily: 'Playfair Display,Georgia,serif' }}
          >
            {settings?.companyName || 'Dearma Rental Mobil Medan'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Invoice & Kwitansi</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Password Admin"
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            placeholder="••••••••"
          />
          {err && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{err}</p>
          )}
          <Btn onClick={handle} disabled={loading} className="w-full justify-center py-3 text-base">
            {loading ? '⏳ Memeriksa...' : '🔐 Masuk ke Sistem'}
          </Btn>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          © {new Date().getFullYear()} {settings?.companyName || 'Dearma Rental Mobil Medan'}
        </p>
      </div>
    </div>
  );
}
