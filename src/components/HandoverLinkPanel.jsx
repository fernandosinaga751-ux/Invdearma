// src/components/HandoverLinkPanel.jsx
// Panel di detail invoice: petugas serah terima, link yang dikirim ke petugas, status isian,
// dan tombol WhatsApp (template dari Pengaturan). Juga mengekspor HandoverWaModal untuk daftar invoice.
import { useEffect, useRef, useState } from 'react';
import { Card, Btn } from './UI.jsx';
import { normalizeWaNumber } from '../lib/utils.js';
import { buildHandoverWaText } from '../lib/rental.js';
import { downloadHandoverPdf } from '../lib/handoverPdf.js';
import {
  ensureHandoverLink, removeHandoverLink, getHandoverLink, handoverUrl, updateInvoice,
} from '../lib/firebase.js';

const fmtWhen = iso => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '');

// ─── Modal kirim link ke petugas lewat WhatsApp ──────────────────────────────
export function HandoverWaModal({ invoice, settings, onTokenChange, onClose }) {
  const staff = invoice.handoverStaff || {};
  const number = normalizeWaNumber(staff.phone);
  const numberOk = number.length >= 9;
  const [token, setToken]       = useState(invoice.handoverToken || '');
  const [linkState, setLinkState] = useState('making'); // making | ok | fail
  const [text, setText]         = useState(() => buildHandoverWaText(invoice, settings, invoice.handoverToken ? handoverUrl(invoice.handoverToken) : ''));
  const editedRef  = useRef(false);
  const startedRef = useRef(false);

  // Pastikan link ada & salinannya mutakhir sebelum dikirim
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const t = await ensureHandoverLink(invoice, settings);
        setToken(t); setLinkState('ok');
        if (t !== invoice.handoverToken) onTokenChange?.(t);
        const url = handoverUrl(t);
        setText(prev => (editedRef.current ? (prev.includes(url) ? prev : prev + `\n\n${url}`) : buildHandoverWaText(invoice, settings, url)));
      } catch (e) { console.error(e); setLinkState('fail'); }
    })();
  }, []);

  const send = () => {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,68,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">💬</div>
          <div>
            <h2 className="font-black text-[#0f2544] text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Kirim Link ke Petugas</h2>
            <p className="text-xs text-slate-400 font-mono">{invoice.invoiceNo}</p>
          </div>
        </div>

        <div className="px-6 pb-2 space-y-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
            <div className="text-xs text-slate-400">Petugas serah terima</div>
            <div className="font-bold text-[#0f2544]">{staff.name || '-'}</div>
            <div className={`text-xs ${numberOk ? 'text-slate-500' : 'text-red-500'}`}>
              {numberOk ? `Akan dikirim ke +${number}` : 'Nomor HP petugas belum diisi / tidak valid. Perbaiki lewat Edit Invoice.'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Isi pesan (bisa diedit)</label>
              {linkState === 'making' && <span className="text-xs text-slate-400">⏳ Menyiapkan link...</span>}
            </div>
            {linkState === 'fail' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
                Link gagal dibuat, jadi belum bisa dikirim. Pastikan Firestore Rules terbaru sudah dipublikasikan (lihat README).
              </p>
            )}
            <textarea value={text} onChange={e => { editedRef.current = true; setText(e.target.value); }} rows={11}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]" />
            <p className="text-[11px] text-slate-400 mt-1">Template pesan bisa diubah di Pengaturan → Pesan WhatsApp Serah Terima.</p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 flex gap-3">
          <Btn variant="green" onClick={send} disabled={!numberOk || linkState !== 'ok' || !token} className="flex-1 justify-center py-3">💬 Buka WhatsApp & Kirim</Btn>
          <Btn variant="ghost" onClick={onClose} className="px-5">Tutup</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Panel di halaman detail invoice ─────────────────────────────────────────
export default function HandoverLinkPanel({ invoice, settings, onTokenChange, onPulled }) {
  const staff = invoice.handoverStaff || {};
  const hasStaff = !!(staff.name || '').trim();
  const token = invoice.handoverToken || '';
  const link = token ? handoverUrl(token) : '';
  const numberOk = normalizeWaNumber(staff.phone).length >= 9;

  const [info, setInfo]     = useState(null);   // dokumen link terbaru
  const [busy, setBusy]     = useState('');
  const [copied, setCopied] = useState(false);
  const [showWa, setShowWa] = useState(false);
  const [err, setErr]       = useState('');

  // Ambil isian terbaru dari petugas; bila lebih baru dari invoice → tarik ke invoice
  const refresh = async (silent = false) => {
    if (!token) return;
    if (!silent) setBusy('refresh');
    try {
      const l = await getHandoverLink(token);
      setInfo(l);
      if (l?.handover?.updatedAt && l.handover.updatedAt > (invoice.handover?.updatedAt || '')) await onPulled(l.handover);
      if (!silent && !l) setErr('Link tidak ditemukan di server (mungkin sudah dihapus).');
    } catch (e) { if (!silent) setErr('Gagal memuat: ' + e.message); }
    if (!silent) setBusy('');
  };
  useEffect(() => { setInfo(null); setErr(''); refresh(true); }, [token]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { window.prompt('Salin link ini:', link); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const create = async (forceNew = false) => {
    if (forceNew && !confirm('Buat link baru? Link lama langsung mati dan tidak bisa dibuka petugas lagi.')) return;
    setBusy('create'); setErr('');
    try { onTokenChange(await ensureHandoverLink(invoice, settings, { forceNew })); }
    catch (e) { setErr('Gagal membuat link: ' + e.message + ' — pastikan Firestore Rules terbaru sudah dipublikasikan (lihat README).'); }
    setBusy('');
  };

  const disable = async () => {
    if (!confirm('Nonaktifkan link ini? Petugas tidak bisa membukanya lagi. Isian yang sudah ada tetap tersimpan di invoice.')) return;
    setBusy('disable'); setErr('');
    try {
      const rescued = await removeHandoverLink(invoice);
      if (rescued) await onPulled(rescued, { alreadySaved: true });
      await updateInvoice(invoice.id, { handoverToken: null });
      onTokenChange(null);
    } catch (e) { setErr('Gagal: ' + e.message); }
    setBusy('');
  };

  const pdf = async () => {
    setBusy('pdf'); setErr('');
    try { await downloadHandoverPdf(invoice, settings); }
    catch (e) { setErr('Gagal membuat PDF: ' + e.message); }
    setBusy('');
  };

  if (!hasStaff) {
    return (
      <Card className="p-4">
        <div className="font-bold text-[#0f2544] text-sm">👤 Petugas Serah Terima</div>
        <p className="text-xs text-slate-400 mt-0.5">
          Belum ada. Isi <strong>nama petugas</strong> (dan nomor HP) lewat tombol <strong>Edit</strong> pada invoice ini — link serah terima otomatis dibuat,
          lalu bisa dikirim ke petugas lewat WhatsApp.
        </p>
      </Card>
    );
  }

  const filledAt = info?.handover?.updatedAt || invoice.handover?.updatedAt;
  const filledBy = info?.handover?.officerName || invoice.handover?.officerName;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div>
          <div className="font-bold text-[#0f2544] text-sm">👤 Petugas Serah Terima</div>
          <div className="text-sm font-semibold">{staff.name}{staff.phone ? <span className="text-slate-400 font-normal"> · 📞 {staff.phone}</span> : null}</div>
        </div>
        <div className="flex-1" />
        {token && (
          <Btn variant="green" onClick={() => setShowWa(true)} disabled={!numberOk} className="text-xs px-3 py-2"
            title={numberOk ? '' : 'Isi nomor HP petugas di Edit Invoice'}>💬 Kirim Link via WA</Btn>
        )}
      </div>

      {!token ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-slate-400 flex-1 min-w-[12rem]">Link belum dibuat untuk invoice ini.</p>
          <Btn variant="outline" onClick={() => create(false)} disabled={busy === 'create'} className="text-xs px-3 py-1.5">{busy === 'create' ? 'Membuat...' : 'Buat Link'}</Btn>
        </div>
      ) : (
        <>
          <div className="font-mono text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 break-all">{link}</div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={copy} className="text-xs px-3 py-1.5">{copied ? '✅ Tersalin' : '📋 Salin Link'}</Btn>
            <Btn variant="outline" onClick={() => refresh(false)} disabled={busy === 'refresh'} className="text-xs px-3 py-1.5">{busy === 'refresh' ? 'Memuat...' : '🔄 Muat isian petugas'}</Btn>
            <Btn variant="outline" onClick={pdf} disabled={busy === 'pdf'} className="text-xs px-3 py-1.5">{busy === 'pdf' ? 'Menyiapkan...' : '📄 Unduh PDF'}</Btn>
            <Btn variant="ghost" onClick={() => create(true)} disabled={!!busy} className="text-xs px-3 py-1.5">Link Baru</Btn>
            <Btn variant="ghost" onClick={disable} disabled={!!busy} className="text-xs px-3 py-1.5 text-red-500">Nonaktifkan</Btn>
          </div>
          <p className="text-xs text-slate-500">
            {filledAt
              ? <>✅ Terakhir diisi{filledBy ? ` oleh ${filledBy}` : ''}: <strong>{fmtWhen(filledAt)}</strong>. Data otomatis masuk ke "Perjanjian & Serah Terima" di bawah.</>
              : '⏳ Petugas belum mengisi. Kirim link ke petugas; setelah ia menyimpan, datanya muncul di sini.'}
          </p>
        </>
      )}
      {!numberOk && token && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Nomor HP petugas belum diisi/valid — tombol WhatsApp aktif setelah nomor diisi lewat Edit Invoice.</p>}
      {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      {showWa && <HandoverWaModal invoice={invoice} settings={settings} onTokenChange={onTokenChange} onClose={() => setShowWa(false)} />}
    </Card>
  );
}
