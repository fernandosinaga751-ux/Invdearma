// src/pages/Invoices.jsx
import { useState } from 'react';
import { Card, Input, Btn, Badge, Icons } from '../components/UI.jsx';
import { fmt, formatDateID, todayStr } from '../lib/utils.js';
import { doPrint } from '../lib/print.js';
import { deleteInvoice, updateInvoice } from '../lib/firebase.js';

// ─── Modal "Sudah Bayar" → Konfirmasi + Cetak Kwitansi ───────────────────────
function BayarModal({ invoice, settings, onConfirm, onClose }) {
  const [paidDate, setPaidDate] = useState(todayStr());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,37,68,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">✅</div>
            <div>
              <h2 className="font-black text-[#0f2544] text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
                Konfirmasi Pembayaran
              </h2>
              <p className="text-xs text-slate-400">Invoice akan ditandai LUNAS</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-5 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Invoice</span>
              <span className="font-mono font-bold text-[#0f2544]">{invoice.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer</span>
              <span className="font-bold">{invoice.customerName}</span>
            </div>
            {invoice.panjar > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoice</span>
                  <span className="font-bold">Rp {fmt(invoice.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">💰 Panjar / DP</span>
                  <span className="font-bold text-amber-600">- Rp {fmt(invoice.panjar)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 mt-1">
              <span className="text-slate-500 font-semibold">{invoice.panjar > 0 ? 'Sisa Bayar' : 'Total Bayar'}</span>
              <span className="text-lg font-black text-emerald-600">Rp {fmt(invoice.panjar > 0 ? invoice.sisa : invoice.total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tanggal Pembayaran
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
            <div className="font-bold mb-1">🖨️ Setelah konfirmasi:</div>
            <div className="text-xs text-emerald-700 space-y-0.5">
              <div>• Kwitansi akan otomatis terbuka untuk dicetak</div>
              <div>• Invoice ditandai sebagai LUNAS</div>
              <div>• Kwitansi berisi tanda terima + watermark LUNAS</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex gap-3">
          <Btn variant="green" onClick={() => onConfirm(paidDate)} className="flex-1 justify-center py-3">
            ✅ Konfirmasi & Cetak Kwitansi
          </Btn>
          <Btn variant="ghost" onClick={onClose} className="px-5">Batal</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / View Invoice ────────────────────────────────────────────────────
function ViewInvoice({ invoice, settings, onBack, onEdit, onDelete, onBayar }) {
  if (!invoice) return (
    <div className="p-6">
      <p className="text-slate-400 mb-4">Invoice tidak ditemukan.</p>
      <Btn variant="ghost" onClick={onBack}>{Icons.back} Kembali</Btn>
    </div>
  );

  const isPaid = !!invoice.paidDate;

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="ghost" onClick={onBack}>{Icons.back} Kembali</Btn>
        <div className="flex-1" />
        {isPaid && (
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-full">
            ✅ LUNAS — {formatDateID(invoice.paidDate)}
          </span>
        )}
        <Btn variant="outline" onClick={() => onEdit(invoice)}>{Icons.edit} Edit</Btn>
        <Btn variant="primary" onClick={() => doPrint(invoice, 'invoice', settings)}>
          {Icons.print} Cetak Invoice
        </Btn>
        {isPaid && (
          <Btn variant="gold" onClick={() => doPrint(invoice, 'kwitansi', settings)}>
            {Icons.print} Cetak Kwitansi
          </Btn>
        )}
        {!isPaid && (
          <Btn variant="green" onClick={() => onBayar(invoice)}>
            💰 Sudah Bayar
          </Btn>
        )}
        <Btn variant="danger" onClick={() => onDelete(invoice.id)}>{Icons.trash}</Btn>
      </div>

      {/* Invoice card */}
      <Card>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings?.logo
                ? <img src={settings.logo} className="w-14 h-14 object-contain rounded-xl" alt="Logo"/>
                : <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-base"
                    style={{ background: 'linear-gradient(135deg,#0f2544,#1e4080)', color: '#d4a017', fontFamily: 'Georgia,serif' }}>DRM</div>
              }
              <div>
                <div className="font-black text-[#0f2544] text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
                  {settings?.companyName || 'Dearma Rental Mobil Medan'}
                </div>
                <div className="text-xs text-slate-400">{settings?.address || ''}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-3xl text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>INVOICE</div>
              <div className="font-mono text-xs text-slate-500 mt-1">{invoice.invoiceNo}</div>
              <div className="text-xs text-slate-500">{formatDateID(invoice.date)}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-blue-50 rounded-xl">
              <div className="text-xs text-slate-400 mb-0.5">Kepada Yth.</div>
              <div className="font-bold text-[#0f2544]">{invoice.customerName}</div>
              <div className="text-xs text-slate-500">
                {[invoice.customerPhone, invoice.customerAddress].filter(Boolean).join(' · ')}
              </div>
            </div>
            {invoice.dueDate && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-xs text-amber-600 font-bold mb-0.5">⏰ Due Date / Jatuh Tempo</div>
                <div className="font-bold text-amber-700">{formatDateID(invoice.dueDate)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/60">
                <th className="px-5 py-3 font-bold w-8">No</th>
                <th className="px-5 py-3 font-bold">Keterangan</th>
                <th className="px-5 py-3 font-bold text-center">Qty</th>
                <th className="px-5 py-3 font-bold text-right">Harga</th>
                <th className="px-5 py-3 font-bold text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-5 py-3 text-slate-400 text-center">{i + 1}</td>
                  <td className="px-5 py-3">{item.description}</td>
                  <td className="px-5 py-3 text-center">{item.qty}</td>
                  <td className="px-5 py-3 text-right">Rp {fmt(item.price)}</td>
                  <td className="px-5 py-3 text-right font-bold">Rp {fmt((item.qty||0) * (item.price||0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-5 flex justify-end border-t border-slate-100">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>Rp {fmt(invoice.subtotal)}</span></div>
            {invoice.diskon > 0 && (
              <div className="flex justify-between text-red-500">
                <span>🏷️ Diskon</span><span className="font-bold">- Rp {fmt(invoice.diskon)}</span>
              </div>
            )}
            {invoice.ppn > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">PPN {invoice.ppn}%</span><span>Rp {fmt(invoice.ppnAmount)}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-[#0f2544] text-base font-black text-[#0f2544]">
              <span>TOTAL</span><span>Rp {fmt(invoice.total)}</span>
            </div>
            {invoice.panjar > 0 && (
              <>
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>💰 Panjar / DP</span><span>- Rp {fmt(invoice.panjar)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-emerald-500 text-base font-black text-emerald-600">
                  <span>SISA BAYAR</span><span>Rp {fmt(invoice.sisa)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {invoice.notes && <div className="px-5 pb-4 text-xs text-slate-500 italic">📝 {invoice.notes}</div>}
      </Card>

      {/* "Sudah Bayar" CTA jika belum lunas */}
      {!isPaid && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="font-black text-emerald-700 text-base">Sudah menerima pembayaran?</div>
            <div className="text-emerald-600 text-sm mt-0.5">Klik tombol di sebelah untuk buat kwitansi tanda terima.</div>
          </div>
          <Btn variant="green" onClick={() => onBayar(invoice)} className="px-6 py-3 text-base whitespace-nowrap">
            💰 Sudah Bayar
          </Btn>
        </div>
      )}

      {/* Bank info */}
      {(settings?.bankName || settings?.bankAccount) && (
        <Card className="p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informasi Pembayaran</div>
          <div className="text-sm text-slate-700 flex flex-wrap gap-4">
            {settings.bankName    && <span>🏦 {settings.bankName}</span>}
            {settings.bankAccount && <span className="font-mono font-bold">{settings.bankAccount}</span>}
            {settings.ownerName   && <span className="text-slate-500">a/n {settings.ownerName}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Invoices List ────────────────────────────────────────────────────────────
export default function Invoices({ invoices, setInvoices, settings, setPage, viewingId, setViewingId, setEditingInvoice }) {
  const [search, setSearch]     = useState('');
  const [bayarInv, setBayarInv] = useState(null); // invoice yg sedang dikonfirmasi bayar

  const handleDelete = async id => {
    if (!confirm('Hapus invoice ini? Tidak dapat dibatalkan.')) return;
    await deleteInvoice(id);
    setInvoices(invoices.filter(i => i.id !== id));
    setViewingId(null);
  };

  const handleEdit = inv => { setEditingInvoice(inv); setPage('new-invoice'); };

  // Konfirmasi bayar → update invoice, cetak kwitansi
  const handleConfirmBayar = async (paidDate) => {
    const inv = { ...bayarInv, paidDate };
    try {
      await updateInvoice(inv.id, { paidDate });
      setInvoices(invoices.map(i => i.id === inv.id ? inv : i));
      setBayarInv(null);
      // Langsung cetak kwitansi
      doPrint(inv, 'kwitansi', settings);
      // Jika sedang di halaman view, update viewingId agar refresh
      if (viewingId === inv.id) setViewingId(inv.id);
    } catch (e) {
      alert('Gagal update: ' + e.message);
    }
  };

  // ── View detail ──────────────────────────────────────────────
  if (viewingId) {
    const inv = invoices.find(i => i.id === viewingId);
    return (
      <>
        <ViewInvoice
          invoice={inv} settings={settings}
          onBack={() => setViewingId(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBayar={inv => setBayarInv(inv)}
        />
        {bayarInv && (
          <BayarModal
            invoice={bayarInv}
            settings={settings}
            onConfirm={handleConfirmBayar}
            onClose={() => setBayarInv(null)}
          />
        )}
      </>
    );
  }

  // ── List ─────────────────────────────────────────────────────
  const filtered = [...invoices]
    .filter(i =>
      (i.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.invoiceNo || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
              Invoice & Kwitansi
            </h1>
            <p className="text-slate-400 text-sm">
              {invoices.length} total invoice &nbsp;·&nbsp;
              <span className="text-emerald-600 font-semibold">{invoices.filter(i=>i.paidDate).length} lunas</span>
              &nbsp;·&nbsp;
              <span className="text-amber-600 font-semibold">{invoices.filter(i=>!i.paidDate).length} belum bayar</span>
            </p>
          </div>
          <Btn onClick={() => setPage('new-invoice')}>{Icons.plus} Buat Invoice</Btn>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-100">
            <Input placeholder="Cari nomor invoice atau nama customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-slate-400 text-sm">
                {search ? 'Tidak ditemukan.' : 'Belum ada invoice.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
                    <th className="px-5 py-3 font-bold">No. Invoice</th>
                    <th className="px-5 py-3 font-bold">Customer</th>
                    <th className="px-5 py-3 font-bold">Tanggal</th>
                    <th className="px-5 py-3 font-bold">Due Date</th>
                    <th className="px-5 py-3 font-bold text-right">Total</th>
                    <th className="px-5 py-3 font-bold text-center">Status</th>
                    <th className="px-5 py-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const isPaid = !!inv.paidDate;
                    return (
                      <tr key={inv.id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition ${isPaid ? '' : ''}`}>
                        <td className="px-5 py-3 font-mono text-xs font-black text-[#0f2544]">{inv.invoiceNo}</td>
                        <td className="px-5 py-3 font-semibold">{inv.customerName}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{formatDateID(inv.date)}</td>
                        <td className="px-5 py-3 text-xs">
                          {inv.dueDate
                            ? <span className="text-amber-600 font-semibold">{formatDateID(inv.dueDate)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-black text-emerald-600">Rp {fmt(inv.total)}</td>
                        <td className="px-5 py-3 text-center">
                          {isPaid
                            ? <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">✅ Lunas</span>
                            : <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">⏳ Belum</span>
                          }
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => setViewingId(inv.id)} title="Detail"
                              className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.eye}</button>
                            <button onClick={() => doPrint(inv, 'invoice', settings)} title="Cetak Invoice"
                              className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.print}</button>
                            {isPaid
                              ? <button onClick={() => doPrint(inv, 'kwitansi', settings)} title="Cetak Kwitansi"
                                  className="px-2 py-1 text-[10px] font-black rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition">KWIT</button>
                              : <button onClick={() => setBayarInv(inv)} title="Sudah Bayar"
                                  className="px-2 py-1 text-[10px] font-black rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">BAYAR</button>
                            }
                            <button onClick={() => handleEdit(inv)} title="Edit"
                              className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.edit}</button>
                            <button onClick={() => handleDelete(inv.id)} title="Hapus"
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">{Icons.trash}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal bayar (dari list) */}
      {bayarInv && (
        <BayarModal
          invoice={bayarInv}
          settings={settings}
          onConfirm={handleConfirmBayar}
          onClose={() => setBayarInv(null)}
        />
      )}
    </>
  );
}
