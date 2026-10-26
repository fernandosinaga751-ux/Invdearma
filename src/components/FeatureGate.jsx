// src/components/FeatureGate.jsx
// Tampilan fitur terkunci + tombol "Ajukan Fitur" untuk akun biasa.
import { useState } from 'react';
import { Card, Btn, Modal } from './UI.jsx';
import { featureById } from '../lib/features.js';

// Pengajuan terbaru untuk satu fitur
export function requestStatus(requests = [], featureId) {
  return requests.find(r => (r.features || []).includes(featureId)) || null; // sudah terurut terbaru dulu
}

// Tombol + dialog pengajuan. `access` = { requests, submit(featureId, note), cancel(id), refresh() }
export function RequestButton({ featureId, access, compact = false }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const f   = featureById(featureId);
  const req = requestStatus(access?.requests, featureId);

  const submit = async () => {
    setBusy(true); setErr('');
    try { await access.submit(featureId, note); setOpen(false); setNote(''); }
    catch (e) { setErr(e.message || 'Gagal mengirim pengajuan.'); }
    setBusy(false);
  };

  if (req?.status === 'pending') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-center'}`}>
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-full">
          ⏳ Pengajuan terkirim — menunggu admin
        </span>
        <button onClick={() => access.refresh()} className="text-xs font-bold text-[#0f2544] hover:underline">🔄 Cek status</button>
        <button onClick={() => confirm('Batalkan pengajuan ini?') && access.cancel(req.id)}
          className="text-xs text-slate-400 hover:text-red-500 hover:underline">Batalkan</button>
      </div>
    );
  }

  return (
    <>
      <div className={compact ? '' : 'text-center'}>
        {req?.status === 'rejected' && (
          <div className="text-xs text-red-500 mb-2">❌ Pengajuan sebelumnya tidak disetujui. Anda dapat mengajukan lagi.</div>
        )}
        <Btn variant="gold" onClick={() => setOpen(true)} className={compact ? 'text-xs px-3 py-2' : 'px-6 py-3'}>
          🔓 Ajukan Fitur
        </Btn>
      </div>

      {open && (
        <Modal title="Ajukan Fitur" subtitle={`${f?.emoji || ''} ${f?.name || featureId}`} onClose={() => setOpen(false)}
          footer={<>
            <Btn variant="gold" onClick={submit} disabled={busy} className="flex-1 justify-center py-3">
              {busy ? 'Mengirim...' : '📨 Kirim Pengajuan'}
            </Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
          </>}>
          <p className="text-sm text-slate-500 mb-3">
            Pengajuan akan dikirim ke Admin Utama. Fitur terbuka setelah admin menyetujui.
            {(f?.requires || []).length > 0 && <> Fitur ini membutuhkan <strong>{f.requires.map(r => featureById(r)?.name).join(', ')}</strong>, yang ikut dibuka bersamanya.</>}
          </p>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keperluan (opsional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500}
            placeholder="Contoh: dipakai untuk mengelola 5 mobil rental kami"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]" />
          {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
        </Modal>
      )}
    </>
  );
}

// Halaman penuh untuk fitur yang terkunci (hanya lihat deskripsi)
export function LockedFeature({ featureId, access, setPage }) {
  const f = featureById(featureId);
  if (!f) return null;
  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Card className="p-6 sm:p-8 text-center">
        <div className="text-5xl mb-3">{f.emoji}</div>
        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-black px-3 py-1 rounded-full mb-3">
          🔒 Fitur terkunci
        </div>
        <h1 className="text-2xl font-black text-[#0f2544] mb-2" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>{f.name}</h1>
        <p className="text-slate-500 text-sm mb-5">{f.short}</p>
        <ul className="text-left text-sm text-slate-600 space-y-2 bg-slate-50 rounded-2xl p-5 mb-6">
          {f.points.map((p, i) => (
            <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span><span>{p}</span></li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mb-4">
          Fitur ini dikelola oleh Admin Utama. Akun Anda hanya dapat melihat deskripsinya.
          Ajukan agar admin membukanya untuk akun Anda.
        </p>
        <RequestButton featureId={featureId} access={access} />
        {setPage && (
          <button onClick={() => setPage('features')} className="block mx-auto mt-4 text-xs font-bold text-[#0f2544] hover:underline">
            Lihat semua fitur tambahan →
          </button>
        )}
      </Card>
    </div>
  );
}

// Kartu kecil penanda fitur terkunci di dalam halaman lain (mis. form invoice)
export function LockedTeaser({ featureId, setPage, className = '' }) {
  const f = featureById(featureId);
  if (!f) return null;
  return (
    <div className={`flex items-center gap-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl px-4 py-3 ${className}`}>
      <div className="text-2xl">🔒</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-600">{f.emoji} {f.name}</div>
        <div className="text-xs text-slate-400 truncate">{f.short}</div>
      </div>
      {setPage && (
        <button onClick={() => setPage('features')} className="text-xs font-black text-[#0f2544] hover:underline whitespace-nowrap">Ajukan →</button>
      )}
    </div>
  );
}
