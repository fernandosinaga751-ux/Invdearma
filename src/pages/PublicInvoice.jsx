// src/pages/PublicInvoice.jsx
// Halaman publik untuk customer: lihat invoice, ubah HANYA diskon & pajak, kirim usulan.
import { useEffect, useState } from 'react';
import { fmt, formatDateID, calcTotals } from '../lib/utils.js';
import { getPublicShare, submitProposal } from '../lib/firebase.js';

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]';

export default function PublicInvoice({ token }) {
  const [share, setShare]   = useState(null);
  const [state, setState]   = useState('loading'); // loading | ok | notfound | error
  const [diskon, setDiskon] = useState('');
  const [pajak, setPajak]   = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg]       = useState('');

  const load = async () => {
    try {
      const s = await getPublicShare(token);
      if (!s) return setState('notfound');
      if (s.closed) return setState('closed');
      setShare(s);
      const base = s.proposal && s.proposal.status === 'pending' ? { d: s.proposal.diskon, p: s.proposal.pajak }
                 : { d: s.invoice.diskon, p: s.invoice.ppnAmount };
      setDiskon(String(base.d || 0)); setPajak(String(base.p || 0));
      document.title = `Invoice ${s.invoice.invoiceNo}`;
      setState('ok');
    } catch (e) { console.error(e); setState('error'); }
  };
  useEffect(() => { load(); }, [token]);

  if (state === 'loading') return <Shell><div className="text-center text-slate-400 py-20">Memuat invoice...</div></Shell>;
  if (state === 'notfound') return <Shell><div className="text-center py-20"><div className="text-4xl mb-2">🔍</div><p className="text-slate-500">Link invoice tidak ditemukan atau sudah dihapus.</p></div></Shell>;
  if (state === 'closed') return <Shell><div className="text-center py-20 px-4"><div className="text-4xl mb-2">🔒</div><p className="font-bold text-[#0f2544] mb-1">Link ini sudah tidak berlaku</p><p className="text-slate-500 text-sm">Perubahan pada invoice sudah dikonfirmasi. Silakan hubungi kami untuk mendapatkan invoice terbaru.</p></div></Shell>;
  if (state === 'error') return <Shell><div className="text-center py-20"><div className="text-4xl mb-2">⚠️</div><p className="text-slate-500">Gagal memuat invoice. Coba muat ulang halaman.</p></div></Shell>;

  const inv = share.invoice, co = share.company || {};
  const paid = !!share.paid;
  const cur = calcTotals({ subtotal: inv.subtotal, diskon: inv.diskon, pajak: inv.ppnAmount, panjar: inv.panjar, minus: !!inv.taxMinus });
  const sim = calcTotals({ subtotal: inv.subtotal, diskon, pajak, panjar: inv.panjar });
  const diskonOver = (Number(diskon) || 0) > inv.subtotal;
  const changed = sim.diskonAmt !== cur.diskonAmt || sim.pajak !== cur.pajak;
  const pr = share.proposal;

  const send = async () => {
    if (diskonOver) return setMsg('Diskon tidak boleh melebihi subtotal.');
    if ((Number(diskon) || 0) < 0 || (Number(pajak) || 0) < 0) return setMsg('Nilai tidak boleh negatif.');
    setSending(true); setMsg('');
    try {
      await submitProposal(token, { diskon, pajak });
      await load();
      setMsg('✅ Usulan berhasil dikirim. Mohon tunggu konfirmasi dari kami.');
    } catch (e) { console.error(e); setMsg('Gagal mengirim: ' + e.message); }
    setSending(false);
  };

  return (
    <Shell>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Kop */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="font-black text-[#0f2544] text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>{co.companyName || 'Invoice'}</div>
            <div className="text-xs text-slate-400">{[co.address, co.phone].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="text-right">
            <div className="font-black text-2xl text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>INVOICE</div>
            <div className="font-mono text-xs text-slate-500">{inv.invoiceNo}</div>
            <div className="text-xs text-slate-500">{formatDateID(inv.date)}</div>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-blue-50 rounded-xl">
            <div className="text-xs text-slate-400 mb-0.5">Kepada Yth.</div>
            <div className="font-bold text-[#0f2544]">{inv.customerName}</div>
          </div>
          {inv.dueDate && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xs text-amber-600 font-bold mb-0.5">⏰ Jatuh Tempo</div>
              <div className="font-bold text-amber-700">{formatDateID(inv.dueDate)}</div>
            </div>
          )}
        </div>

        {/* Item (hanya baca) */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-y bg-slate-50/60">
                <th className="px-4 py-3 font-bold w-8">No</th>
                <th className="px-4 py-3 font-bold">Keterangan</th>
                <th className="px-4 py-3 font-bold text-center">Qty</th>
                <th className="px-4 py-3 font-bold text-right">Harga</th>
                <th className="px-4 py-3 font-bold text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3 text-center">{it.qty}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">Rp {fmt(it.price)}</td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">Rp {fmt(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {inv.notes && <div className="px-5 sm:px-6 pt-4 text-xs text-slate-500 italic">📝 {inv.notes}</div>}

        {/* Form usulan + hasil sementara */}
        <div className="p-5 sm:p-6 grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="font-bold text-[#0f2544]">{paid ? 'Invoice sudah lunas' : 'Ubah Diskon & Pajak'}</div>
            {paid ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 font-semibold">✅ Invoice ini sudah dibayar lunas.</div>
            ) : (
              <>
                <p className="text-xs text-slate-400">Hanya diskon dan pajak yang dapat diubah. Perubahan baru berlaku setelah kami setujui.</p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🏷️ Diskon (Rp)</label>
                  <input type="number" min="0" inputMode="numeric" value={diskon} onChange={e => setDiskon(e.target.value)} className={inputCls} />
                  {diskonOver && <div className="text-xs text-red-500 mt-1">Melebihi subtotal (Rp {fmt(inv.subtotal)}).</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🧾 Pajak (Rp) — mengurangi total</label>
                  <input type="number" min="0" inputMode="numeric" value={pajak} onChange={e => setPajak(e.target.value)} className={inputCls} />
                </div>
                <button onClick={send} disabled={sending || diskonOver || !changed}
                  className="w-full bg-[#0f2544] hover:bg-[#1a3a6b] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition">
                  {sending ? 'Mengirim...' : '📨 Kirim Usulan'}
                </button>
                {!changed && <div className="text-xs text-slate-400">Ubah diskon atau pajak untuk dapat mengirim.</div>}
                {msg && <div className={`text-sm font-semibold ${msg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</div>}
                {pr && (
                  <div className={`text-xs rounded-xl p-3 border ${pr.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : pr.status === 'applied' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    {pr.status === 'pending' && `⏳ Usulan terakhir (Diskon Rp ${fmt(pr.diskon)}, Pajak Rp ${fmt(pr.pajak)}) menunggu konfirmasi.`}
                    {pr.status === 'applied' && '✅ Usulan Anda sudah diterapkan pada invoice di atas.'}
                    {pr.status === 'rejected' && '❌ Usulan terakhir tidak disetujui. Anda dapat mengirim usulan baru.'}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-sm space-y-2 self-start">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{paid ? 'Rincian' : 'Hasil Sementara'}</div>
            <Row l="Subtotal" v={`Rp ${fmt(inv.subtotal)}`} />
            {(paid ? cur.diskonAmt : sim.diskonAmt) > 0 && <Row l="🏷️ Diskon" v={`- Rp ${fmt(paid ? cur.diskonAmt : sim.diskonAmt)}`} cls="text-red-500" />}
            {(paid ? cur.pajak : sim.pajak) > 0 && <Row l="Pajak" v={`- Rp ${fmt(paid ? cur.pajak : sim.pajak)}`} cls="text-red-500" />}
            <Row l="TOTAL" v={`Rp ${fmt(paid ? cur.total : sim.total)}`} cls="font-black text-[#0f2544] text-base pt-2 border-t-2 border-[#0f2544]" />
            {inv.panjar > 0 && (
              <>
                <Row l="💰 Panjar / DP" v={`- Rp ${fmt(paid ? cur.panjarAmt : sim.panjarAmt)}`} cls="text-amber-600" />
                <Row l="SISA BAYAR" v={`Rp ${fmt(paid ? cur.sisa : sim.sisa)}`} cls="font-black text-emerald-600 text-base pt-2 border-t-2 border-emerald-500" />
              </>
            )}
            {!paid && changed && <div className="text-[11px] text-slate-400 pt-1">Angka di atas masih sementara dan belum final.</div>}
          </div>
        </div>

        {(co.bankName || co.bankAccount) && (
          <div className="px-5 sm:px-6 pb-6 text-sm text-slate-600 flex flex-wrap gap-4">
            {co.bankName && <span>🏦 {co.bankName}</span>}
            {co.bankAccount && <span className="font-mono font-bold">{co.bankAccount}</span>}
            {co.ownerName && <span className="text-slate-400">a/n {co.ownerName}</span>}
          </div>
        )}
      </div>
    </Shell>
  );
}

const Row = ({ l, v, cls = '' }) => (
  <div className={`flex justify-between gap-3 ${cls}`}><span>{l}</span><span className="font-bold">{v}</span></div>
);

const Shell = ({ children }) => (
  <div className="min-h-screen bg-slate-100 p-3 sm:p-8" style={{ fontFamily: 'Plus Jakarta Sans,Segoe UI,system-ui,sans-serif' }}>
    <div className="max-w-3xl mx-auto">{children}</div>
  </div>
);
