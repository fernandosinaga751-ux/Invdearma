// src/components/HandoverModal.jsx — perjanjian sewa & berita acara serah terima
import { useState } from 'react';
import { Modal, Input, Select, Btn } from './UI.jsx';
import SignaturePad from './SignaturePad.jsx';
import { fmt, shrinkImage } from '../lib/utils.js';
import { HANDOVER_CHECKS, FUEL_LEVELS } from '../lib/rental.js';
import { CONDITIONS, initHandover } from '../lib/handoverForm.js';
import { doPrintHandover } from '../lib/print.js';

export default function HandoverModal({ invoice, settings, onSave, onAddFines, onClose }) {
  const r = invoice.rental || {};
  const [h, setH] = useState(() => initHandover(invoice.handover || {}, r));
  const [tab, setTab]   = useState('out');
  const [pad_, setPad]  = useState(null); // { side, who }
  const [busy, setBusy] = useState(false);

  const side = h[tab];
  const setSide = patch => setH(x => ({ ...x, [tab]: { ...x[tab], ...patch } }));
  const setCheck = (c, v) => setSide({ checks: { ...side.checks, [c]: v } });

  const saveSig = async url => {
    const small = await shrinkImage(url, 360);
    setH(x => ({ ...x, [pad_.side]: { ...x[pad_.side], [pad_.who]: small } }));
    setPad(null);
  };

  const fines = h.back.fines || [];
  const setFine = (i, k, v) => setH(x => ({ ...x, back: { ...x.back, fines: x.back.fines.map((f, j) => j === i ? { ...f, [k]: v } : f) } }));
  const validFines = fines.filter(f => f.desc.trim() && Number(f.amount) > 0);

  const save = async (andPrint = false) => {
    setBusy(true);
    try {
      const data = { ...h, back: { ...h.back, fines: fines.map(f => ({ desc: f.desc, amount: Number(f.amount) || 0 })) }, updatedAt: new Date().toISOString() };
      await onSave(data);
      if (andPrint) doPrintHandover({ ...invoice, handover: data }, settings);
      else onClose();
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setBusy(false);
  };

  const addFines = async () => {
    if (!validFines.length) return alert('Isi keterangan dan jumlah denda terlebih dahulu.');
    if (!confirm(`Tambahkan ${validFines.length} baris denda (Rp ${fmt(validFines.reduce((s, f) => s + Number(f.amount), 0))}) ke invoice?`)) return;
    setBusy(true);
    try {
      const data = { ...h, finesAddedAt: new Date().toISOString(), back: { ...h.back, fines: fines.map(f => ({ desc: f.desc, amount: Number(f.amount) || 0 })) } };
      await onAddFines(validFines.map(f => ({ desc: f.desc.trim(), amount: Number(f.amount) })), data);
      setH(data);
      alert('Denda sudah ditambahkan ke rincian invoice.');
    } catch (e) { alert('Gagal: ' + e.message); }
    setBusy(false);
  };

  const SigBox = ({ who, label }) => (
    <div className="border border-slate-200 rounded-xl p-2 text-center">
      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</div>
      <div className="h-16 flex items-center justify-center bg-slate-50 rounded-lg mb-1.5">
        {side[who] ? <img src={side[who]} alt="" className="max-h-14 max-w-full" /> : <span className="text-[11px] text-slate-300">belum ada</span>}
      </div>
      <button onClick={() => setPad({ side: tab, who })} className="text-xs font-bold text-[#0f2544] hover:underline">✍️ {side[who] ? 'Ulangi' : 'Tanda tangan'}</button>
    </div>
  );

  return (
    <>
      <Modal wide title="📝 Perjanjian & Serah Terima" subtitle={`${invoice.invoiceNo} — ${invoice.customerName}`} onClose={onClose}
        footer={<>
          <Btn onClick={() => save(true)} disabled={busy} className="flex-1 justify-center py-3">💾 Simpan & Cetak</Btn>
          <Btn variant="outline" onClick={() => save(false)} disabled={busy}>Simpan</Btn>
          <Btn variant="ghost" onClick={onClose}>Tutup</Btn>
        </>}>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Input label="Kendaraan" value={h.vehicleName} onChange={e => setH({ ...h, vehicleName: e.target.value })} />
          <Input label="Plat Nomor" value={h.plate} onChange={e => setH({ ...h, plate: e.target.value })} />
          <Input label="No. KTP / SIM Penyewa" value={h.idNo} onChange={e => setH({ ...h, idNo: e.target.value })} />
        </div>

        <div className="flex gap-2 mb-4">
          {[['out', '1. Pengambilan'], ['back', '2. Pengembalian']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === id ? 'bg-[#0f2544] text-white' : 'bg-slate-100 text-slate-500'}`}>{l}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Input label={tab === 'out' ? 'Waktu Ambil' : 'Waktu Kembali'} type="datetime-local" value={side.at} onChange={e => setSide({ at: e.target.value })} />
          <Input label={tab === 'out' ? 'KM Awal' : 'KM Akhir'} type="number" min="0" value={side.km} onChange={e => setSide({ km: e.target.value })} />
          <Select label="Level BBM" value={side.fuel} onChange={e => setSide({ fuel: e.target.value })}>{FUEL_LEVELS.map(f => <option key={f}>{f}</option>)}</Select>
        </div>
        {tab === 'back' && h.out.km && side.km && (
          <p className="text-xs text-slate-500 mb-3">Jarak tempuh: <strong>{fmt(Math.max(0, Number(side.km) - Number(h.out.km)))} km</strong>
            {h.out.fuel !== side.fuel && <> · BBM awal <strong>{h.out.fuel}</strong> → akhir <strong>{side.fuel}</strong></>}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mb-4">
          {HANDOVER_CHECKS.map(c => (
            <div key={c} className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600">{c}</span>
              <select value={side.checks[c]} onChange={e => setCheck(c, e.target.value)}
                className={`border rounded-lg px-2 py-1.5 text-xs ${side.checks[c] === 'Baik' ? 'border-slate-200' : 'border-amber-400 bg-amber-50'}`}>
                {CONDITIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Input label="Catatan kondisi" value={side.notes} onChange={e => setSide({ notes: e.target.value })} placeholder="mis. lecet kecil di bumper depan kiri" />

        <div className="grid grid-cols-2 gap-3 mt-4"><SigBox who="custSig" label="Penyewa" /><SigBox who="staffSig" label={invoice.handoverStaff?.name ? `Petugas: ${invoice.handoverStaff.name}` : 'Petugas'} /></div>

        {tab === 'back' && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Denda / Biaya Tambahan</div>
              <button onClick={() => setH(x => ({ ...x, back: { ...x.back, fines: [...(x.back.fines || []), { desc: '', amount: '' }] } }))} className="text-xs font-bold text-[#0f2544] hover:underline">+ Tambah baris</button>
            </div>
            {fines.length === 0 && <p className="text-xs text-slate-400">Tidak ada denda. Klik "+ Tambah baris" untuk denda BBM, kerusakan, dll.</p>}
            {fines.map((f, i) => (
              <div key={i} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 130px 32px' }}>
                <input value={f.desc} onChange={e => setFine(i, 'desc', e.target.value)} placeholder="mis. Denda BBM kurang 1/2" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                <input type="number" min="0" value={f.amount} onChange={e => setFine(i, 'amount', e.target.value)} placeholder="Rp" className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-right" />
                <button onClick={() => setH(x => ({ ...x, back: { ...x.back, fines: x.back.fines.filter((_, j) => j !== i) } }))} className="text-red-400 hover:bg-red-50 rounded-lg">✕</button>
              </div>
            ))}
            {validFines.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Btn variant="amber" onClick={addFines} disabled={busy || !!h.finesAddedAt} className="text-xs px-4 py-2">🧾 Tambahkan denda ke invoice</Btn>
                {h.finesAddedAt && <span className="text-xs text-emerald-600 font-bold">✅ Sudah ditambahkan ke invoice</span>}
              </div>
            )}
          </div>
        )}
      </Modal>
      {pad_ && <SignaturePad onClose={() => setPad(null)} onSave={saveSig} />}
    </>
  );
}
