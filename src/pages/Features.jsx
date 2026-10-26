// src/pages/Features.jsx — katalog fitur tambahan (semua akun bisa melihat)
import { Card, Btn } from '../components/UI.jsx';
import { RequestButton, requestStatus } from '../components/FeatureGate.jsx';
import { FEATURES, canUse } from '../lib/features.js';

export default function Features({ sessionKind, features, access, setPage }) {
  const isMaster = sessionKind === 'master';
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Fitur Tambahan</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {isMaster
            ? 'Anda Admin Utama — semua fitur terbuka. Atur fitur untuk tiap akun di menu Daftar Akun, dan setujui pengajuan di menu Pengajuan Fitur.'
            : 'Fitur di bawah ini dikelola Admin Utama. Akun Anda dapat melihat isinya, dan mengajukan agar dibuka.'}
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {FEATURES.map(f => {
          const on  = canUse(sessionKind, features, f.id);
          const req = requestStatus(access?.requests, f.id);
          return (
            <Card key={f.id} className={`p-5 flex flex-col ${on ? '' : 'bg-slate-50/60'}`}>
              <div className="flex items-start gap-3 mb-2">
                <div className="text-3xl">{f.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[#0f2544] leading-tight">{f.name}</div>
                  <div className="mt-1">
                    {on
                      ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ AKTIF</span>
                      : req?.status === 'pending'
                        ? <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">⏳ MENUNGGU ADMIN</span>
                        : <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">🔒 TERKUNCI</span>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-3">{f.short}</p>
              <ul className="text-xs text-slate-500 space-y-1 mb-4 flex-1">
                {f.points.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">✓</span><span>{p}</span></li>)}
              </ul>
              {on
                ? (f.page
                    ? <Btn variant="outline" onClick={() => setPage(f.page)} className="self-start text-xs px-4 py-2">Buka →</Btn>
                    : <div className="text-xs text-slate-400">Tersedia di dalam halaman Invoice{f.id === 'crm' ? ' dan Data Customer' : ''}{f.id === 'payments' ? ' & Pengaturan' : ''}.</div>)
                : <RequestButton featureId={f.id} access={access} compact />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
