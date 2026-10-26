// src/pages/HandoverPublic.jsx
// Halaman publik (tanpa login) untuk PETUGAS SERAH TERIMA: mencatat mobil & kondisinya,
// meminta tanda tangan penyewa di layar, lalu mengunduh PDF perjanjian untuk diberikan ke penyewa.
import { useEffect, useRef, useState } from 'react';
import { Input, Select, Btn } from '../components/UI.jsx';
import SignaturePad from '../components/SignaturePad.jsx';
import { fmt, shrinkImage } from '../lib/utils.js';
import { fmtDT, HANDOVER_CHECKS, FUEL_LEVELS } from '../lib/rental.js';
import { CONDITIONS, initHandover } from '../lib/handoverForm.js';
import { getPublicHandover, submitHandover } from '../lib/firebase.js';
import { downloadHandoverPdf, makeHandoverPdfFile } from '../lib/handoverPdf.js';

const canShareFiles = () => {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] })); }
  catch { return false; }
};

export default function HandoverPublic({ token }) {
  const [share, setShare] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | notfound | closed | error
  const [h, setH]         = useState(null);
  const [tab, setTab]     = useState('out');
  const [pad, setPad]     = useState(null);       // { who }
  const [busy, setBusy]   = useState('');         // '' | save | pdf | share
  const [msg, setMsg]     = useState(null);       // { ok, text }
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    (async () => {
      try {
        const s = await getPublicHandover(token);
        if (!s) return setState('notfound');
        if (s.closed) return setState('closed');
        setShare(s);
        setH(initHandover(s.handover || {}, s.invoice?.rental || {}));
        document.title = `Serah Terima ${s.invoice?.customerName || ''}`.trim();
        setState('ok');
      } catch (e) { console.error(e); setState('error'); }
    })();
  }, [token]);

  // Peringatkan bila halaman ditutup padahal ada isian yang belum disimpan
  useEffect(() => {
    const f = e => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, []);

  if (state === 'loading')  return <Shell><Center emoji="⏳" text="Memuat data serah terima..." /></Shell>;
  if (state === 'notfound') return <Shell><Center emoji="🔍" text="Link serah terima tidak ditemukan atau sudah dinonaktifkan. Hubungi pihak rental untuk link terbaru." /></Shell>;
  if (state === 'closed')   return <Shell><Center emoji="🔒" text="Link ini sudah tidak berlaku." /></Shell>;
  if (state === 'error')    return <Shell><Center emoji="⚠️" text="Gagal memuat data. Periksa koneksi lalu muat ulang halaman." /></Shell>;

  const inv = share.invoice || {}, co = share.company || {}, staff = share.staff || {};
  const r = inv.rental || {};
  const side = h[tab];
  const setSide = patch => { setH(x => ({ ...x, [tab]: { ...x[tab], ...patch } })); setDirty(true); };
  const setTop  = patch => { setH(x => ({ ...x, ...patch })); setDirty(true); };
  const setCheck = (c, v) => setSide({ checks: { ...side.checks, [c]: v } });

  const saveSig = async url => {
    const small = await shrinkImage(url, 360);
    setH(x => ({ ...x, [pad.side]: { ...x[pad.side], [pad.who]: small } }));
    setDirty(true); setPad(null);
  };

  const fines = (h.back.fines || []).filter(f => f.desc);

  // Simpan ke server. Mengembalikan data bersih (denda dari admin ikut terbawa).
  const save = async () => {
    const clean = await submitHandover(token, h);
    setH(x => ({ ...x, back: { ...x.back, fines: clean.back.fines }, finesAddedAt: clean.finesAddedAt, officerName: clean.officerName, updatedAt: clean.updatedAt }));
    setDirty(false);
    return clean;
  };

  const run = async (kind, fn) => {
    setBusy(kind); setMsg(null);
    try { await fn(); }
    catch (e) {
      if (e?.name === 'AbortError') { setBusy(''); return; }
      console.error(e);
      setMsg({ ok: false, text: 'Gagal: ' + (e.message || e) });
    }
    setBusy('');
  };

  const doSave = () => run('save', async () => {
    await save();
    setMsg({ ok: true, text: '✅ Tersimpan. Pihak rental bisa langsung melihat catatan ini.' });
  });

  const confirmSigs = () => {
    if (h.out.custSig) return true;
    return confirm('Tanda tangan penyewa pada bagian Pengambilan belum ada.\n\nTetap lanjut membuat PDF?');
  };
  const pdfInvoice = clean => ({ ...inv, handover: { ...h, ...clean }, handoverStaff: staff });

  const doPdf = () => { if (!confirmSigs()) return; run('pdf', async () => {
    const clean = await save();
    await downloadHandoverPdf(pdfInvoice(clean), co);
    setMsg({ ok: true, text: '✅ PDF perjanjian sudah diunduh. Berikan file ini kepada penyewa.' });
  }); };

  const doShare = () => { if (!confirmSigs()) return; run('share', async () => {
    const clean = await save();
    const file = await makeHandoverPdfFile(pdfInvoice(clean), co);
    await navigator.share({ files: [file], title: file.name });
    setMsg({ ok: true, text: '✅ PDF dibagikan.' });
  }); };

  const SigBox = ({ who, label }) => (
    <div className="border border-slate-200 rounded-xl p-2 text-center bg-white">
      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</div>
      <div className="h-20 flex items-center justify-center bg-slate-50 rounded-lg mb-1.5">
        {side[who] ? <img src={side[who]} alt="" className="max-h-[4.5rem] max-w-full" /> : <span className="text-[11px] text-slate-300">belum ada</span>}
      </div>
      <button onClick={() => setPad({ side: tab, who })} className="text-sm font-bold text-[#0f2544] py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 w-full">
        ✍️ {side[who] ? 'Ulangi' : 'Tanda tangan'}
      </button>
    </div>
  );

  const km = Number(h.out.km) > 0 && Number(h.back.km) > 0 ? Math.max(0, Number(h.back.km) - Number(h.out.km)) : null;

  return (
    <Shell>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-24">
        {/* Kop */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          {co.logo && <img src={co.logo} alt="" className="w-12 h-12 object-contain rounded-lg" />}
          <div className="min-w-0">
            <div className="font-black text-[#0f2544] text-lg leading-tight" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>{co.companyName || 'Serah Terima Mobil'}</div>
            <div className="text-xs text-slate-400">📝 Serah Terima Mobil · {inv.invoiceNo}</div>
          </div>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-3 border-b border-slate-100">
          <div className="p-3.5 bg-blue-50 rounded-xl">
            <div className="text-xs text-slate-400 mb-0.5">Penyewa</div>
            <div className="font-bold text-[#0f2544]">{inv.customerName}</div>
            {inv.customerPhone && <div className="text-xs text-slate-500">📞 {inv.customerPhone}</div>}
            {inv.customerAddress && <div className="text-xs text-slate-500">📍 {inv.customerAddress}</div>}
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl text-sm">
            <div className="text-xs text-slate-400 mb-0.5">Mobil & jadwal sewa</div>
            <div className="font-bold text-[#0f2544]">{r.vehicleName || h.vehicleName || '-'}{(r.plate || h.plate) ? ` · ${r.plate || h.plate}` : ''}</div>
            {r.pickupAt && <div className="text-xs text-slate-500">{fmtDT(r.pickupAt)} s.d. {fmtDT(r.returnAt)}{r.days ? ` (${r.days} hari)` : ''}</div>}
            {r.destination && <div className="text-xs text-slate-500">Tujuan: {r.destination}</div>}
            {staff.name && <div className="text-xs text-emerald-700 font-bold mt-1">Petugas: {staff.name}</div>}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Kendaraan" value={h.vehicleName} onChange={e => setTop({ vehicleName: e.target.value })} />
            <Input label="Plat Nomor" value={h.plate} onChange={e => setTop({ plate: e.target.value })} />
            <Input label="No. KTP / SIM Penyewa" value={h.idNo} onChange={e => setTop({ idNo: e.target.value })} />
          </div>

          <div className="flex gap-2">
            {[['out', '1. Pengambilan'], ['back', '2. Pengembalian']].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition ${tab === id ? 'bg-[#0f2544] text-white' : 'bg-slate-100 text-slate-500'}`}>{l}</button>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input label={tab === 'out' ? 'Waktu Ambil' : 'Waktu Kembali'} type="datetime-local" value={side.at} onChange={e => setSide({ at: e.target.value })} />
            <Input label={tab === 'out' ? 'KM Awal' : 'KM Akhir'} type="number" inputMode="numeric" min="0" value={side.km} onChange={e => setSide({ km: e.target.value })} />
            <Select label="Level BBM" value={side.fuel} onChange={e => setSide({ fuel: e.target.value })}>{FUEL_LEVELS.map(f => <option key={f}>{f}</option>)}</Select>
          </div>
          {tab === 'back' && km !== null && (
            <p className="text-xs text-slate-500">Jarak tempuh: <strong>{fmt(km)} km</strong>{h.out.fuel !== side.fuel && <> · BBM awal <strong>{h.out.fuel}</strong> → akhir <strong>{side.fuel}</strong></>}</p>
          )}

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kondisi mobil</div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              {HANDOVER_CHECKS.map(c => (
                <div key={c} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600">{c}</span>
                  <select value={side.checks[c]} onChange={e => setCheck(c, e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-xs ${side.checks[c] === 'Baik' ? 'border-slate-200' : 'border-amber-400 bg-amber-50'}`}>
                    {CONDITIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <Input label="Catatan kondisi" value={side.notes} onChange={e => setSide({ notes: e.target.value })} placeholder="mis. lecet kecil di bumper depan kiri" maxLength={600} />

          <div className="grid grid-cols-2 gap-3">
            <SigBox who="custSig" label="Penyewa" />
            <SigBox who="staffSig" label={staff.name ? `Petugas: ${staff.name}` : 'Petugas'} />
          </div>

          {tab === 'back' && fines.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <div className="text-xs font-bold text-amber-700 uppercase mb-1">Denda / biaya tambahan (diatur pihak rental)</div>
              {fines.map((f, i) => <div key={i} className="flex justify-between"><span>{f.desc}</span><span className="font-bold">Rp {fmt(f.amount)}</span></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Bilah aksi (menempel di bawah layar) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-30">
        <div className="max-w-3xl mx-auto">
          {msg && <p className={`text-xs px-3 py-2 rounded-lg mb-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</p>}
          {dirty && !msg && <p className="text-xs text-amber-600 mb-2">⚠️ Ada perubahan yang belum disimpan.</p>}
          <div className="flex gap-2 flex-wrap">
            <Btn variant="outline" onClick={doSave} disabled={!!busy} className="justify-center">{busy === 'save' ? '⏳ Menyimpan...' : '💾 Simpan'}</Btn>
            <Btn onClick={doPdf} disabled={!!busy} className="flex-1 justify-center">{busy === 'pdf' ? '⏳ Menyiapkan PDF...' : '📄 Simpan & Unduh PDF Perjanjian'}</Btn>
            {canShareFiles() && <Btn variant="green" onClick={doShare} disabled={!!busy} className="justify-center">{busy === 'share' ? '⏳...' : '📤 Bagikan'}</Btn>}
          </div>
        </div>
      </div>

      {pad && <SignaturePad onClose={() => setPad(null)} onSave={saveSig} />}
    </Shell>
  );
}

const Center = ({ emoji, text }) => (
  <div className="text-center py-20 px-4"><div className="text-4xl mb-2">{emoji}</div><p className="text-slate-500 text-sm">{text}</p></div>
);

const Shell = ({ children }) => (
  <div className="min-h-screen bg-slate-100 p-3 sm:p-8" style={{ fontFamily: 'Plus Jakarta Sans,Segoe UI,system-ui,sans-serif' }}>
    <div className="max-w-3xl mx-auto">{children}</div>
  </div>
);
