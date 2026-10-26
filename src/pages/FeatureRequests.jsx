// src/pages/FeatureRequests.jsx — admin utama menyetujui / menolak pengajuan fitur
import { useState, useEffect } from 'react';
import { Card, Btn } from '../components/UI.jsx';
import { getAllFeatureRequests, resolveFeatureRequest } from '../lib/firebase.js';
import { featureById, withRequires } from '../lib/features.js';

const when = iso => { try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso || '-'; } };

export default function FeatureRequests({ onChanged }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(null);
  const [pick, setPick]       = useState({});

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const l = await getAllFeatureRequests();
      setList(l);
      setPick(p => { const n = { ...p }; l.forEach(r => { if (!n[r.id]) n[r.id] = [...(r.features || [])]; }); return n; });
    } catch (e) { setErr('Gagal memuat pengajuan: ' + e.message + ' — pastikan Firestore Rules sudah diperbarui (lihat README).'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = (rid, fid) => setPick(p => ({ ...p, [rid]: (p[rid] || []).includes(fid) ? p[rid].filter(x => x !== fid) : [...(p[rid] || []), fid] }));

  const decide = async (req, approve) => {
    const granted = pick[req.id] || [];
    if (approve && granted.length === 0) return alert('Centang minimal satu fitur untuk disetujui.');
    setBusy(req.id);
    try { await resolveFeatureRequest(req, { approve, granted }); await load(); onChanged?.(); }
    catch (e) { alert('Gagal memproses: ' + e.message); }
    setBusy(null);
  };

  const pending = list.filter(r => r.status === 'pending');
  const history = list.filter(r => r.status !== 'pending');

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Pengajuan Fitur</h1>
          <p className="text-slate-400 text-sm">{pending.length} menunggu keputusan Anda</p>
        </div>
        <Btn variant="ghost" onClick={load}>🔄 Muat Ulang</Btn>
      </div>
      {err && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{err}</p>}
      {loading && <div className="p-10 text-center text-slate-400 text-sm">Memuat...</div>}
      {!loading && pending.length === 0 && (
        <Card className="p-10 text-center text-slate-400 text-sm"><div className="text-4xl mb-2">📭</div>Tidak ada pengajuan yang menunggu.</Card>
      )}
      {pending.map(r => (
        <Card key={r.id} className="p-5 border-2 border-amber-200 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-black text-[#0f2544]">{r.displayName || r.email}</div>
              <div className="text-xs text-slate-400">{r.email} · {when(r.createdAt)}</div>
            </div>
            <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full">MENUNGGU</span>
          </div>
          {r.note && <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">💬 {r.note}</div>}
          <div className="space-y-1.5">
            {(r.features || []).map(fid => {
              const f = featureById(fid);
              const extra = withRequires([fid]).filter(x => x !== fid);
              return (
                <label key={fid} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={(pick[r.id] || []).includes(fid)} onChange={() => toggle(r.id, fid)} />
                  <span><strong>{f?.emoji} {f?.name || fid}</strong>
                    {extra.length > 0 && <span className="text-xs text-slate-400"> (ikut membuka: {extra.map(x => featureById(x)?.name).join(', ')})</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Btn variant="green" disabled={busy === r.id} onClick={() => decide(r, true)}>✅ Setujui</Btn>
            <Btn variant="ghost" disabled={busy === r.id} onClick={() => decide(r, false)} className="text-red-500">Tolak</Btn>
          </div>
        </Card>
      ))}
      {history.length > 0 && (
        <Card>
          <div className="p-4 border-b border-slate-100 font-bold text-[#0f2544] text-sm">Riwayat</div>
          <div className="divide-y divide-slate-50">
            {history.slice(0, 40).map(r => (
              <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-bold text-[#0f2544]">{r.displayName || r.email}</span>
                  <span className="text-slate-400"> · {(r.features || []).map(x => featureById(x)?.name || x).join(', ')}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  {when(r.resolvedAt || r.createdAt)}
                  <span className={`font-black px-2 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {r.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
