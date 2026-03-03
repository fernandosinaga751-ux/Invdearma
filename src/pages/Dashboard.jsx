// src/pages/Dashboard.jsx
import { Card, Btn } from '../components/UI.jsx';
import { fmt, formatDateID, MONTHS_ID, todayStr } from '../lib/utils.js';

export default function Dashboard({ invoices, customers, setPage, setViewingId }) {
  const now = new Date();
  const thisM = now.getMonth(), thisY = now.getFullYear();
  const mInvs = invoices.filter(i => {
    const d = new Date(i.date + 'T00:00:00');
    return d.getMonth() === thisM && d.getFullYear() === thisY;
  });
  const mTotal  = mInvs.reduce((s, i) => s + (i.total || 0), 0);
  const allTotal = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const recent  = [...invoices]
    .sort((a, b) => b.date?.localeCompare(a.date) || b.createdAt?.localeCompare(a.createdAt))
    .slice(0, 8);

  const stats = [
    { label: 'Total Invoice',     val: invoices.length,          sub: 'Semua waktu',        color: '#0f2544', icon: '📋' },
    { label: 'Invoice Bulan Ini', val: mInvs.length,             sub: `Rp ${fmt(mTotal)}`,  color: '#059669', icon: '📅' },
    { label: 'Total Pendapatan',  val: `Rp ${fmt(allTotal)}`,    sub: 'Akumulasi invoice',  color: '#d4a017', icon: '💰', big: true },
    { label: 'Data Customer',     val: customers.length,         sub: 'Terdaftar',           color: '#7c3aed', icon: '👥' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{formatDateID(todayStr())}</p>
        </div>
        <Btn onClick={() => setPage('new-invoice')}>+ Buat Invoice</Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-5">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className={`${s.big ? 'text-lg' : 'text-3xl'} font-black`} style={{ color: s.color }}>
              {s.val}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Recent */}
      <Card>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-[#0f2544]">Invoice Terbaru</h2>
          <Btn variant="ghost" onClick={() => setPage('invoices')} className="text-xs px-2 py-1">
            Lihat Semua →
          </Btn>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-slate-400 text-sm">Belum ada invoice.</p>
            <button
              onClick={() => setPage('new-invoice')}
              className="mt-2 text-[#0f2544] font-bold text-sm hover:underline"
            >Buat invoice pertama →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-bold">No. Invoice</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Tanggal</th>
                  <th className="px-5 py-3 font-bold text-right">Total</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-mono text-xs text-[#0f2544] font-bold">{inv.invoiceNo}</td>
                    <td className="px-5 py-3 font-semibold">{inv.customerName}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{formatDateID(inv.date)}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">Rp {fmt(inv.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => { setViewingId(inv.id); setPage('invoices'); }}
                        className="text-[#0f2544] hover:underline text-xs font-bold"
                      >Lihat →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
