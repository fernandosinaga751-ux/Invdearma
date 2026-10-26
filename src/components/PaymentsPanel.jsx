// src/components/PaymentsPanel.jsx — riwayat pembayaran bertahap + deposit/jaminan
import { useState } from 'react';
import { Card, Input, Select, Btn, Icons } from './UI.jsx';
import { fmt, formatDateID, todayStr, uid } from '../lib/utils.js';
import { paidTotal, outstanding, sortedPayments, paymentKwitansiInvoice } from '../lib/rental.js';
import { doPrint } from '../lib/print.js';

const METHODS = ['Tunai', 'Transfer', 'QRIS', 'Lainnya'];

export default function PaymentsPanel({ invoice, settings, onSave }) {
  const list    = sortedPayments(invoice);
  const paid    = paidTotal(invoice);
  const left    = outstanding(invoice);
  const legacyPaid = !!invoice.paidDate && !list.length;     // lunas lewat tombol lama (tanpa riwayat)
  const [form, setForm] = useState({ date: todayStr(), amount: '', method: 'Transfer', note: '' });
  const [busy, setBusy] = useState(false);
  const [dep, setDep]   = useState(invoice.deposit || null);
  const [depEdit, setDepEdit] = useState(false);

  const persist = async patch => { setBusy(true); try { await onSave(patch); } catch (e) { alert('Gagal menyimpan: ' + e.message); } setBusy(false); };

  const recompute = payments => {
    const tmp = { ...invoice, payments };
    const lunas = (invoice.total || 0) > 0 && paidTotal(tmp) >= (invoice.total || 0);
    const last = payments.reduce((m, p) => (p.date > m ? p.date : m), '');
    return { payments, paidDate: lunas ? (last || todayStr()) : '' };
  };

  const add = async () => {
    const amount = Math.round(Number(form.amount) || 0);
    if (amount <= 0) return alert('Isi jumlah pembayaran.');
    if (!form.date) return alert('Isi tanggal pembayaran.');
    if (amount > left && !confirm(`Jumlah (Rp ${fmt(amount)}) melebihi sisa tagihan (Rp ${fmt(left)}). Tetap simpan?`)) return;
    const p = { id: uid(), date: form.date, amount, method: form.method, note: form.note.trim(), createdAt: new Date().toISOString() };
    await persist(recompute([...(invoice.payments || []), p]));
    setForm({ date: todayStr(), amount: '', method: form.method, note: '' });
  };

  const remove = async p => {
    if (!confirm(`Hapus pembayaran Rp ${fmt(p.amount)} tanggal ${formatDateID(p.date)}?`)) return;
    await persist(recompute((invoice.payments || []).filter(x => x.id !== p.id)));
  };

  // ── deposit ──
  const saveDep = async () => {
    if (dep.type === 'uang' && !(Number(dep.amount) > 0)) return alert('Isi jumlah deposit.');
    if (dep.type === 'barang' && !(dep.item || '').trim()) return alert('Isi jaminan barang (mis. KTP, SIM, motor).');
    await persist({ deposit: { ...dep, amount: Number(dep.amount) || 0 } });
    setDepEdit(false);
  };
  const returnDep = async () => {
    if (!confirm('Tandai deposit/jaminan sudah dikembalikan kepada customer?')) return;
    const d = { ...invoice.deposit, status: 'dikembalikan', returnedDate: todayStr() };
    await persist({ deposit: d }); setDep(d);
  };
  const delDep = async () => { if (!confirm('Hapus catatan deposit?')) return; await persist({ deposit: null }); setDep(null); setDepEdit(false); };

  const D = invoice.deposit;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0f2544]">💳 Pembayaran & Deposit</h3>
        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">FITUR PEMBAYARAN</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Total', invoice.total, '#0f2544'], ['Diterima', paid, '#059669'], ['Sisa', left, left > 0 ? '#d97706' : '#059669']].map(([l, v, c]) => (
          <div key={l} className="bg-slate-50 rounded-xl py-2.5"><div className="text-[10px] font-bold text-slate-400 uppercase">{l}</div><div className="font-black text-sm" style={{ color: c }}>Rp {fmt(v)}</div></div>
        ))}
      </div>

      {legacyPaid && <p className="text-xs text-slate-500 bg-emerald-50 rounded-xl px-3 py-2">✅ Invoice ini dilunasi lewat tombol "Sudah Bayar" (tanpa riwayat cicilan), jadi riwayat pembayaran tidak ditampilkan.</p>}

      {!legacyPaid && (
        <>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {invoice.panjar > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm bg-amber-50/50">
                <span className="text-slate-600">Panjar / DP <span className="text-xs text-slate-400">(dari invoice)</span></span>
                <span className="font-bold text-amber-600">Rp {fmt(invoice.panjar)}</span>
              </div>
            )}
            {list.map((p, i) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold text-[#0f2544]">Pembayaran ke-{i + 1} · {formatDateID(p.date)}</div>
                  <div className="text-xs text-slate-400">{p.method}{p.note ? ` — ${p.note}` : ''}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-emerald-600">Rp {fmt(p.amount)}</span>
                  <button onClick={() => doPrint(paymentKwitansiInvoice(invoice, p), 'kwitansi', settings)} title="Cetak kwitansi pembayaran ini"
                    className="px-2 py-1 text-[10px] font-black rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">KWIT</button>
                  <button onClick={() => remove(p)} disabled={busy} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg">{Icons.trash}</button>
                </div>
              </div>
            ))}
            {!invoice.panjar && list.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">Belum ada pembayaran tercatat.</div>}
          </div>

          {left > 0 ? (
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catat Pembayaran Baru</div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Tanggal" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <Input label="Jumlah (Rp)" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder={String(left)} />
                <Select label="Metode" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{METHODS.map(m => <option key={m}>{m}</option>)}</Select>
                <Input label="Catatan" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="mis. DP, pelunasan" />
              </div>
              <div className="flex gap-2">
                <Btn onClick={add} disabled={busy} className="text-xs px-4 py-2">{busy ? 'Menyimpan...' : '+ Simpan Pembayaran'}</Btn>
                <Btn variant="ghost" onClick={() => setForm(f => ({ ...f, amount: String(left) }))} className="text-xs px-3 py-2">Isi sisa penuh</Btn>
              </div>
            </div>
          ) : <p className="text-xs text-emerald-600 font-bold">✅ Tagihan sudah lunas.</p>}
        </>
      )}

      {/* Deposit */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">🔐 Deposit / Jaminan</div>
          {!D && !depEdit && <button onClick={() => { setDep({ type: 'uang', amount: '', item: '', receivedDate: todayStr(), status: 'ditahan', note: '' }); setDepEdit(true); }} className="text-xs font-bold text-[#0f2544] hover:underline">+ Catat deposit</button>}
        </div>
        {D && !depEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2.5 text-sm">
            <div>
              <div className="font-semibold">{D.type === 'barang' ? `Barang: ${D.item}` : `Uang Rp ${fmt(D.amount)}`}</div>
              <div className="text-xs text-slate-400">Diterima {formatDateID(D.receivedDate)}{D.note ? ` · ${D.note}` : ''}{D.status === 'dikembalikan' ? ` · dikembalikan ${formatDateID(D.returnedDate)}` : ''}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${D.status === 'dikembalikan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{D.status === 'dikembalikan' ? 'DIKEMBALIKAN' : 'DITAHAN'}</span>
              {D.status !== 'dikembalikan' && <Btn variant="green" onClick={returnDep} disabled={busy} className="text-[11px] px-2.5 py-1">Tandai dikembalikan</Btn>}
              <button onClick={() => { setDep(D); setDepEdit(true); }} className="p-1.5 text-slate-400 hover:text-[#0f2544]">{Icons.edit}</button>
              <button onClick={delDep} className="p-1.5 text-slate-300 hover:text-red-500">{Icons.trash}</button>
            </div>
          </div>
        )}
        {depEdit && dep && (
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Select label="Jenis" value={dep.type} onChange={e => setDep({ ...dep, type: e.target.value })}><option value="uang">Uang</option><option value="barang">Barang</option></Select>
              {dep.type === 'uang'
                ? <Input label="Jumlah (Rp)" type="number" min="0" value={dep.amount} onChange={e => setDep({ ...dep, amount: e.target.value })} />
                : <Input label="Jaminan Barang" value={dep.item} onChange={e => setDep({ ...dep, item: e.target.value })} placeholder="KTP, SIM, motor..." />}
              <Input label="Tanggal Diterima" type="date" value={dep.receivedDate} onChange={e => setDep({ ...dep, receivedDate: e.target.value })} />
              <Input label="Catatan" value={dep.note} onChange={e => setDep({ ...dep, note: e.target.value })} />
            </div>
            <div className="flex gap-2"><Btn onClick={saveDep} disabled={busy} className="text-xs px-4 py-2">Simpan</Btn><Btn variant="ghost" onClick={() => setDepEdit(false)} className="text-xs px-3 py-2">Batal</Btn></div>
          </div>
        )}
        {!D && !depEdit && <p className="text-xs text-slate-400">Belum ada deposit/jaminan tercatat.</p>}
      </div>
    </Card>
  );
}
