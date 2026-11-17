// src/pages/CustomReceipt.jsx
// Menu "Kwitansi Custom": pilih satu invoice → catat pembayaran bertahap (DP, termin, pelunasan)
// → setiap pembayaran punya kwitansi sendiri (cetak / PDF).
// Data memakai field `payments` milik invoice (sama dengan panel "Pembayaran & Deposit"),
// jadi riwayat, laporan piutang, dan link customer otomatis ikut sinkron.
import { useState } from 'react';
import { Card, Input, Select, Btn, Icons } from '../components/UI.jsx';
import { fmt, formatDateID, todayStr, uid, terbilang } from '../lib/utils.js';
import { paidTotal, outstanding, sortedPayments, paymentKwitansiInvoice, applyPayments } from '../lib/rental.js';
import { doPrint } from '../lib/print.js';
import { renderKwitansiCanvas, downloadKwitansiPdf } from '../lib/kwitansiPdf.js';
import { updateInvoice, syncShare } from '../lib/firebase.js';

const METHODS = ['Tunai', 'Transfer', 'QRIS', 'Lainnya'];
const MATERAI_LIMIT = 5_000_000;

const nextLabel = n => (n === 0 ? 'DP' : `Termin ${n + 1}`);
const blankForm = n => ({ label: nextLabel(n), date: todayStr(), amount: '', method: 'Transfer', note: '' });

export default function CustomReceipt({ invoices, setInvoices, settings, setPage }) {
  const [selId, setSelId]       = useState(null);
  const [q, setQ]               = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [form, setForm]         = useState(blankForm(0));
  const [editId, setEditId]     = useState(null);
  const [busy, setBusy]         = useState(false);

  const inv = invoices.find(i => i.id === selId) || null;

  // ── daftar invoice yang bisa dipilih ──
  const term = q.trim().toLowerCase();
  const filtered = invoices
    .filter(i => (!onlyOpen || outstanding(i) > 0 || !i.paidDate))
    .filter(i => !term || `${i.invoiceNo} ${i.customerName}`.toLowerCase().includes(term))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const shown = filtered.slice(0, 20);

  const pick = i => { setSelId(i.id); setEditId(null); setForm(blankForm((i.payments || []).length)); };
  const back = () => { setSelId(null); setEditId(null); };

  // ── simpan ke Firestore + state + link customer ──
  const persist = async (target, patch) => {
    setBusy(true);
    try {
      await updateInvoice(target.id, patch);
      setInvoices(list => list.map(i => (i.id === target.id ? { ...i, ...patch } : i)));
      syncShare({ ...target, ...patch }, settings);
      return true;
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
      return false;
    } finally { setBusy(false); }
  };

  const submit = async (andPrint) => {
    const amount = Math.round(Number(form.amount) || 0);
    if (amount <= 0) return alert('Isi jumlah pembayaran.');
    if (!form.date)  return alert('Isi tanggal pembayaran.');
    const label = form.label.trim();

    const others = (inv.payments || []).filter(p => p.id !== editId);
    const leftBase = outstanding({ ...inv, payments: others });
    if (amount > leftBase && !confirm(`Jumlah (Rp ${fmt(amount)}) melebihi sisa tagihan (Rp ${fmt(leftBase)}). Tetap simpan?`)) return;

    const old = editId ? (inv.payments || []).find(p => p.id === editId) : null;
    const p = {
      id: editId || uid(), date: form.date, amount, method: form.method, label, note: form.note.trim(),
      createdAt: old?.createdAt || new Date().toISOString(),
    };
    const payments = editId ? (inv.payments || []).map(x => (x.id === editId ? p : x)) : [...(inv.payments || []), p];
    const patch = applyPayments(inv, payments);
    if (!(await persist(inv, patch))) return;

    setEditId(null);
    setForm(blankForm(payments.length));
    if (andPrint) doPrint(paymentKwitansiInvoice({ ...inv, ...patch }, p), 'kwitansi', settings);
  };

  const startEdit = p => {
    setEditId(p.id);
    setForm({ label: p.label || '', date: p.date, amount: String(p.amount), method: p.method || 'Transfer', note: p.note || '' });
    window.scrollTo?.({ top: 0 });
  };
  const cancelEdit = () => { setEditId(null); setForm(blankForm((inv.payments || []).length)); };

  const remove = async p => {
    if (!confirm(`Hapus pembayaran "${p.label || 'tanpa nama'}" Rp ${fmt(p.amount)} tanggal ${formatDateID(p.date)}?\nKwitansinya ikut hilang dan nomor kwitansi sesudahnya bergeser.`)) return;
    await persist(inv, applyPayments(inv, (inv.payments || []).filter(x => x.id !== p.id)));
    if (editId === p.id) cancelEdit();
  };

  // Panjar/DP yang diisi saat membuat invoice → jadikan pembayaran biasa supaya punya kwitansi sendiri
  const convertPanjar = async () => {
    if (!confirm(`Pindahkan Panjar/DP Rp ${fmt(inv.panjar)} dari invoice menjadi pembayaran "DP" (tanggal ${formatDateID(inv.date)}) agar bisa dicetak kwitansinya?`)) return;
    const p = { id: uid(), date: inv.date || todayStr(), amount: inv.panjar, method: 'Tunai', label: 'DP', note: 'Panjar dari invoice', createdAt: new Date().toISOString() };
    const payments = [...(inv.payments || []), p];
    const patch = { ...applyPayments({ ...inv, panjar: 0 }, payments), panjar: 0, sisa: inv.total };
    await persist(inv, patch);
  };

  const pdf = async (p, i) => {
    setBusy(true);
    try {
      const k = paymentKwitansiInvoice(inv, p);
      const canvas = await renderKwitansiCanvas(k, settings);
      await downloadKwitansiPdf(canvas, k, p.label || `Pembayaran ${i + 1}`);
    } catch (e) { alert('Gagal membuat PDF: ' + e.message); }
    setBusy(false);
  };

  // ════════════════ Tahap 1: pilih invoice ════════════════
  const Header = ({ title, sub, onBack }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>{title}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{sub}</p>
      </div>
      <Btn variant="ghost" onClick={onBack}>{Icons.back} Kembali</Btn>
    </div>
  );

  if (!inv) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
        <Header title="Kwitansi Custom"
          sub="Pilih invoice, catat pembayaran bertahap (DP, termin, pelunasan), lalu cetak kwitansi untuk setiap pembayaran."
          onBack={() => setPage('dashboard')} />

        <Card className="p-5 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input label="Cari invoice" value={q} onChange={e => setQ(e.target.value)} placeholder="No. invoice atau nama customer" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="w-4 h-4 rounded accent-[#0f2544]" />
              Hanya yang belum lunas
            </label>
          </div>

          {shown.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Tidak ada invoice yang cocok.</p>}

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {shown.map(i => {
              const left = outstanding(i), paid = paidTotal(i), n = (i.payments || []).length;
              return (
                <button key={i.id} onClick={() => pick(i)} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[#0f2544] text-sm truncate">{i.customerName}</div>
                    <div className="text-xs text-slate-400">{i.invoiceNo} · {formatDateID(i.date)}{n ? ` · ${n} pembayaran` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#0f2544]">Rp {fmt(i.total)}</div>
                    <div className={`text-[11px] font-bold ${left > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {left > 0 ? `Diterima Rp ${fmt(paid)} · Sisa Rp ${fmt(left)}` : 'LUNAS'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length > shown.length && <p className="text-xs text-slate-400">Menampilkan 20 dari {filtered.length} invoice — gunakan pencarian untuk mempersempit.</p>}
        </Card>

        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
          💡 Belum ada invoicenya? Buat dulu lewat
          <button onClick={() => setPage('new-invoice')} className="text-[#0f2544] font-bold hover:underline mx-1">Buat Invoice Baru</button>
          (total transaksi, misalnya Rp 500.000.000), lalu kembali ke sini untuk mencatat DP dan cicilannya.
        </div>
      </div>
    );
  }

  // ════════════════ Tahap 2: pembayaran per invoice ════════════════
  const list    = sortedPayments(inv);
  const paid    = paidTotal(inv);
  const left    = outstanding(inv);
  const pct     = inv.total > 0 ? Math.min(100, Math.round((paid / inv.total) * 100)) : 0;
  const legacyPaid = !!inv.paidDate && !list.length;
  const amountNum  = Math.round(Number(form.amount) || 0);
  const fillLeft   = editId ? outstanding({ ...inv, payments: list.filter(p => p.id !== editId) }) : left;

  let running = inv.panjar || 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <Header title={inv.customerName} sub={`${inv.invoiceNo} · ${formatDateID(inv.date)}`} onBack={back} />

      {/* Ringkasan */}
      <Card className="p-5 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Total Invoice', inv.total, '#0f2544'], ['Sudah Diterima', paid, '#059669'], ['Sisa', left, left > 0 ? '#d97706' : '#059669']].map(([l, v, c]) => (
            <div key={l} className="bg-slate-50 rounded-xl py-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase">{l}</div>
              <div className="font-black text-sm sm:text-base" style={{ color: c }}>Rp {fmt(v)}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="text-[11px] text-slate-400 mt-1 text-right">{pct}% terbayar{left <= 0 && inv.total > 0 ? ' — LUNAS' : ''}</div>
        </div>
      </Card>

      {legacyPaid ? (
        <Card className="p-5 text-sm text-slate-600">
          ✅ Invoice ini ditandai lunas lewat tombol "Sudah Bayar" tanpa riwayat cicilan, jadi hanya punya satu kwitansi pelunasan
          (cetak dari menu Invoice &amp; Kwitansi).
        </Card>
      ) : (
        <>
          {/* Daftar pembayaran + kwitansi */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-[#0f2544]">Pembayaran &amp; Kwitansi</h3>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {inv.panjar > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm bg-amber-50/60">
                  <div>
                    <div className="font-semibold text-slate-700">Panjar / DP <span className="text-xs text-slate-400">(diisi saat membuat invoice)</span></div>
                    <div className="text-xs text-amber-700">Belum punya kwitansi sendiri.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-600">Rp {fmt(inv.panjar)}</span>
                    <Btn variant="outline" onClick={convertPanjar} disabled={busy} className="text-[11px] px-2.5 py-1">Jadikan pembayaran</Btn>
                  </div>
                </div>
              )}
              {list.map((p, i) => {
                running += Number(p.amount) || 0;
                const after = Math.max(0, (inv.total || 0) - running);
                return (
                  <div key={p.id} className={`px-3 py-2.5 text-sm ${editId === p.id ? 'bg-blue-50/60' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0f2544]">
                          {i + 1}. {p.label || `Pembayaran ke-${i + 1}`}
                          <span className="ml-2 text-[10px] font-bold text-slate-400">Kwt-{i + 1}</span>
                        </div>
                        <div className="text-xs text-slate-400">{formatDateID(p.date)} · {p.method}{p.note ? ` — ${p.note}` : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-600">Rp {fmt(p.amount)}</div>
                        <div className="text-[11px] text-slate-400">{after > 0 ? `sisa Rp ${fmt(after)}` : 'lunas'}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button onClick={() => doPrint(paymentKwitansiInvoice(inv, p), 'kwitansi', settings)}
                        className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">🖨 Cetak Kwitansi</button>
                      <button onClick={() => pdf(p, i)} disabled={busy}
                        className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">⬇ PDF</button>
                      <button onClick={() => startEdit(p)} disabled={busy} className="p-1.5 text-slate-400 hover:text-[#0f2544] rounded-lg">{Icons.edit}</button>
                      <button onClick={() => remove(p)} disabled={busy} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg">{Icons.trash}</button>
                    </div>
                  </div>
                );
              })}
              {!inv.panjar && list.length === 0 && <div className="px-3 py-5 text-center text-xs text-slate-400">Belum ada pembayaran. Catat DP atau pembayaran pertama di bawah.</div>}
            </div>
          </Card>

          {/* Form pembayaran */}
          {(left > 0 || editId) ? (
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-[#0f2544]">{editId ? 'Ubah Pembayaran' : 'Catat Pembayaran Baru'}</h3>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tahap pembayaran</div>
                <div className="flex flex-wrap gap-1.5">
                  {['DP', 'Termin 2', 'Termin 3', 'Pelunasan'].map(l => (
                    <button key={l} type="button"
                      onClick={() => setForm(f => ({ ...f, label: l, ...(l === 'Pelunasan' && fillLeft > 0 ? { amount: String(fillLeft) } : {}) }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${form.label === l ? 'bg-[#0f2544] text-white border-[#0f2544]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0f2544]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Nama tahap (bebas diubah)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="mis. DP, Termin 2, Pelunasan" />
                <Input label="Tanggal" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <div>
                  <Input label="Jumlah (Rp)" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder={fillLeft > 0 ? String(fillLeft) : '0'} />
                  {amountNum > 0 && <div className="text-[11px] text-emerald-700 italic mt-1">{terbilang(amountNum)}</div>}
                </div>
                <Select label="Metode" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{METHODS.map(m => <option key={m}>{m}</option>)}</Select>
              </div>
              <Input label="Catatan (opsional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="mis. transfer BCA, diterima oleh ..." />

              {amountNum > MATERAI_LIMIT && !settings.materai && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  ⚠️ Nominal di atas Rp 5 juta — kwitansi umumnya perlu meterai. Aktifkan opsi materai di <button onClick={() => setPage('settings')} className="font-bold underline">Pengaturan</button> agar kotak "Tempel Materai" muncul di kwitansi.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => submit(true)} disabled={busy} className="text-sm px-5 py-2.5">{busy ? 'Menyimpan...' : 'Simpan & Cetak Kwitansi'}</Btn>
                <Btn variant="outline" onClick={() => submit(false)} disabled={busy} className="text-sm px-4 py-2.5">Simpan saja</Btn>
                {fillLeft > 0 && <Btn variant="ghost" onClick={() => setForm(f => ({ ...f, amount: String(fillLeft) }))} className="text-xs px-3 py-2">Isi sisa penuh (Rp {fmt(fillLeft)})</Btn>}
                {editId && <Btn variant="ghost" onClick={cancelEdit} className="text-xs px-3 py-2">Batal ubah</Btn>}
              </div>
            </Card>
          ) : (
            <p className="text-sm text-emerald-600 font-bold">✅ Tagihan sudah lunas — semua pembayaran sudah punya kwitansi di atas.</p>
          )}
        </>
      )}
    </div>
  );
}
