// src/pages/Reports.jsx — laporan pendapatan, piutang, dan ekspor Excel (CSV)
import { useState } from 'react';
import { Card, Btn, Select } from '../components/UI.jsx';
import { fmt, formatDateID, todayStr, MONTHS_ID, normalizeWaNumber } from '../lib/utils.js';
import { paidTotal, outstanding, toCSV, downloadText, fillTemplate, DEFAULT_WA_BILL } from '../lib/rental.js';

export default function Reports({ invoices, expenses, vehicles, settings, setPage, setViewingId }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const years = [...new Set([new Date().getFullYear(), ...invoices.map(i => Number((i.date || '').slice(0, 4))).filter(Boolean)])].sort((a, b) => b - a);

  const inY = invoices.filter(i => (i.date || '').startsWith(String(year)));
  const months = Array.from({ length: 12 }, (_, m) => {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const inv = inY.filter(i => (i.date || '').startsWith(key));
    return {
      m, key, count: inv.length,
      billed: inv.reduce((s, i) => s + (i.total || 0), 0),
      received: inv.reduce((s, i) => s + paidTotal(i), 0),
      cost: expenses.filter(e => (e.date || '').startsWith(key)).reduce((s, e) => s + (Number(e.amount) || 0), 0),
    };
  });
  const maxV = Math.max(1, ...months.map(m => Math.max(m.billed, m.cost)));
  const sum = k => months.reduce((s, m) => s + m[k], 0);

  const perVehicle = {};
  inY.forEach(i => { const n = i.rental?.vehicleName ? `${i.rental.vehicleName} (${i.rental.plate || ''})` : null; if (n) { perVehicle[n] = perVehicle[n] || { c: 0, t: 0 }; perVehicle[n].c++; perVehicle[n].t += i.total || 0; } });
  const perCust = {};
  inY.forEach(i => { const n = i.customerName || '-'; perCust[n] = perCust[n] || { c: 0, t: 0 }; perCust[n].c++; perCust[n].t += i.total || 0; });
  const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1].t - a[1].t).slice(0, n);

  const t0 = new Date(todayStr() + 'T00:00:00');
  const receivables = invoices.filter(i => outstanding(i) > 0 && !i.paidDate).map(i => {
    const ref = i.dueDate || i.date;
    const late = Math.floor((t0 - new Date(ref + 'T00:00:00')) / 864e5);
    return { inv: i, left: outstanding(i), late: i.dueDate ? late : null, age: Math.max(0, Math.floor((t0 - new Date(i.date + 'T00:00:00')) / 864e5)) };
  }).sort((a, b) => (b.late ?? -999) - (a.late ?? -999));
  const totalAR = receivables.reduce((s, r) => s + r.left, 0);
  const overdue = receivables.filter(r => r.late != null && r.late > 0);

  const tagih = r => {
    const phone = normalizeWaNumber(r.inv.customerPhone);
    if (!phone) return alert('Nomor WhatsApp customer belum ada di invoice ini.');
    const text = fillTemplate(settings.waBill || DEFAULT_WA_BILL, {
      nama: r.inv.customerName, perusahaan: settings.companyName || '', no_invoice: r.inv.invoiceNo, sisa: fmt(r.left),
      jatuh_tempo: r.inv.dueDate ? ` (jatuh tempo ${formatDateID(r.inv.dueDate)})` : '',
    });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const expMonthly = () => downloadText(`Laporan-Bulanan-${year}.csv`, toCSV(
    ['Bulan', 'Jumlah Invoice', 'Total Tagihan', 'Sudah Diterima', 'Pengeluaran', 'Selisih Tagihan-Pengeluaran'],
    months.map(m => [MONTHS_ID[m.m], m.count, m.billed, m.received, m.cost, m.billed - m.cost])));
  const expAR = () => downloadText('Piutang.csv', toCSV(
    ['No. Invoice', 'Customer', 'Tanggal', 'Jatuh Tempo', 'Total', 'Sudah Dibayar', 'Sisa', 'Terlambat (hari)', 'Telepon'],
    receivables.map(r => [r.inv.invoiceNo, r.inv.customerName, r.inv.date, r.inv.dueDate || '', r.inv.total, paidTotal(r.inv), r.left, r.late != null && r.late > 0 ? r.late : '', r.inv.customerPhone || ''])));
  const expAll = () => downloadText(`Invoice-${year}.csv`, toCSV(
    ['No. Invoice', 'Tanggal', 'Customer', 'Mobil', 'Plat', 'Ambil', 'Kembali', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Dibayar', 'Sisa', 'Status'],
    inY.map(i => [i.invoiceNo, i.date, i.customerName, i.rental?.vehicleName || '', i.rental?.plate || '', i.rental?.pickupAt || '', i.rental?.returnAt || '',
      i.subtotal, i.diskon || 0, i.ppnAmount || 0, i.total, paidTotal(i), outstanding(i), i.paidDate ? 'Lunas' : 'Belum lunas'])));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Laporan & Piutang</h1>
          <p className="text-slate-400 text-sm">Ringkasan pendapatan, uang diterima, dan tagihan yang belum lunas</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-28"><Select label="Tahun" value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</Select></div>
          <Btn variant="outline" onClick={expMonthly}>⬇️ Excel Bulanan</Btn>
          <Btn variant="outline" onClick={expAll}>⬇️ Excel Invoice</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Total Tagihan', sum('billed'), '#0f2544'], ['Sudah Diterima', sum('received'), '#059669'], ['Pengeluaran', sum('cost'), '#dc2626'], ['Piutang Saat Ini', totalAR, '#d97706']].map(([l, v, c]) => (
          <Card key={l} className="p-4"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{l}</div><div className="text-xl font-black mt-1" style={{ color: c }}>Rp {fmt(v)}</div></Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="font-bold text-[#0f2544] mb-4 flex items-center justify-between">
          <span>Pendapatan per Bulan — {year}</span>
          <span className="text-[11px] font-normal text-slate-400 flex gap-3"><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#0f2544] mr-1" />Tagihan</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 mr-1" />Pengeluaran</span></span>
        </div>
        <div className="flex items-end gap-1.5 sm:gap-3 h-44">
          {months.map(m => (
            <div key={m.m} className="flex-1 flex flex-col items-center justify-end h-full" title={`${MONTHS_ID[m.m]}: tagihan Rp ${fmt(m.billed)}, pengeluaran Rp ${fmt(m.cost)}`}>
              <div className="flex items-end gap-0.5 w-full justify-center h-full">
                <div className="w-1/2 max-w-[18px] bg-[#0f2544] rounded-t" style={{ height: `${(m.billed / maxV) * 100}%`, minHeight: m.billed ? 2 : 0 }} />
                <div className="w-1/2 max-w-[18px] bg-red-400 rounded-t" style={{ height: `${(m.cost / maxV) * 100}%`, minHeight: m.cost ? 2 : 0 }} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{MONTHS_ID[m.m].slice(0, 3)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4"><div className="font-bold text-[#0f2544] mb-2 text-sm">Pendapatan per Mobil</div>
          {top(perVehicle).length === 0 ? <p className="text-xs text-slate-400">Belum ada invoice yang memuat data mobil.</p> :
            top(perVehicle).map(([n, v]) => <div key={n} className="flex justify-between text-sm py-1 border-b border-slate-50"><span>{n} <span className="text-xs text-slate-400">· {v.c} sewa</span></span><span className="font-bold">Rp {fmt(v.t)}</span></div>)}
        </Card>
        <Card className="p-4"><div className="font-bold text-[#0f2544] mb-2 text-sm">Customer Teratas</div>
          {top(perCust).length === 0 ? <p className="text-xs text-slate-400">Belum ada data.</p> :
            top(perCust).map(([n, v]) => <div key={n} className="flex justify-between text-sm py-1 border-b border-slate-50"><span>{n} <span className="text-xs text-slate-400">· {v.c} invoice</span></span><span className="font-bold">Rp {fmt(v.t)}</span></div>)}
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-[#0f2544]">Daftar Piutang</div>
            <div className="text-xs text-slate-400">{receivables.length} invoice belum lunas · {overdue.length} lewat jatuh tempo</div>
          </div>
          <Btn variant="outline" onClick={expAR} className="text-xs px-3 py-1.5">⬇️ Excel Piutang</Btn>
        </div>
        {receivables.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">🎉 Tidak ada piutang.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50/50">
              <th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Jatuh Tempo</th><th className="px-5 py-3 text-right">Sisa</th><th className="px-5 py-3 text-center">Umur</th><th className="px-5 py-3"></th></tr></thead>
            <tbody>{receivables.map(r => (
              <tr key={r.inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-bold text-[#0f2544]">{r.inv.invoiceNo}</td>
                <td className="px-5 py-3 font-semibold">{r.inv.customerName}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{r.inv.dueDate ? formatDateID(r.inv.dueDate) : '—'}</td>
                <td className="px-5 py-3 text-right font-black text-amber-600">Rp {fmt(r.left)}</td>
                <td className="px-5 py-3 text-center">{r.late != null && r.late > 0
                  ? <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">LEWAT {r.late} HARI</span>
                  : <span className="text-[10px] font-bold text-slate-400">{r.age} hari</span>}</td>
                <td className="px-5 py-3"><div className="flex gap-1.5 justify-end">
                  <button onClick={() => tagih(r)} className="px-2 py-1 text-[10px] font-black rounded-lg bg-green-100 text-green-700 hover:bg-green-200">💬 TAGIH</button>
                  <button onClick={() => { setViewingId(r.inv.id); setPage('invoices'); }} className="px-2 py-1 text-[10px] font-black rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">BUKA</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
