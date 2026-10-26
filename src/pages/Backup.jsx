// src/pages/Backup.jsx — backup JSON & ekspor CSV
import { useState } from 'react';
import { Card, Btn } from '../components/UI.jsx';
import { listCol } from '../lib/firebase.js';
import { todayStr } from '../lib/utils.js';
import { toCSV, downloadText, paidTotal, outstanding } from '../lib/rental.js';

export default function Backup({ settings, customers, invoices }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const backupAll = async () => {
    setBusy(true); setNote('');
    const out = { app: 'dearma-invoice', exportedAt: new Date().toISOString(), settings, customers, invoices };
    const skipped = [];
    for (const c of ['vehicles', 'drivers', 'bookings', 'expenses']) {
      try { out[c] = await listCol(c); } catch (e) { skipped.push(c); out[c] = []; }
    }
    downloadText(`Backup-Dearma-${todayStr()}.json`, JSON.stringify(out, null, 2), 'application/json');
    setNote(skipped.length ? `Backup selesai. Koleksi yang tidak bisa dibaca dilewati: ${skipped.join(', ')}.` : '✅ Backup lengkap berhasil diunduh.');
    setBusy(false);
  };

  const expCustomers = () => downloadText(`Customer-${todayStr()}.csv`, toCSV(
    ['Nama', 'Telepon', 'Email', 'Alamat', 'NIK', 'Bermasalah'],
    customers.map(c => [c.name, c.phone || '', c.email || '', c.address || '', c.nik || '', c.flagged ? (c.flagReason || 'Ya') : ''])));
  const expInvoices = () => downloadText(`Invoice-Semua-${todayStr()}.csv`, toCSV(
    ['No. Invoice', 'Tanggal', 'Customer', 'Total', 'Dibayar', 'Sisa', 'Status', 'Tgl Lunas'],
    invoices.map(i => [i.invoiceNo, i.date, i.customerName, i.total, paidTotal(i), outstanding(i), i.paidDate ? 'Lunas' : 'Belum lunas', i.paidDate || ''])));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Backup & Ekspor Data</h1>
        <p className="text-slate-400 text-sm">Simpan salinan data Anda di tempat yang aman.</p>
      </div>
      <Card className="p-5 space-y-3">
        <div className="font-bold text-[#0f2544]">💾 Backup Lengkap (JSON)</div>
        <p className="text-sm text-slate-500">Berisi pengaturan (termasuk logo, TTD, stempel), customer, invoice, armada, sopir, booking, dan pengeluaran. File ini memuat data pribadi customer — simpan dengan aman dan jangan dibagikan.</p>
        <Btn onClick={backupAll} disabled={busy}>{busy ? 'Menyiapkan...' : '⬇️ Unduh Backup Lengkap'}</Btn>
        {note && <p className="text-sm text-slate-600">{note}</p>}
      </Card>
      <Card className="p-5 space-y-3">
        <div className="font-bold text-[#0f2544]">📄 Ekspor ke Excel (CSV)</div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={expInvoices}>⬇️ Semua Invoice</Btn>
          <Btn variant="outline" onClick={expCustomers}>⬇️ Data Customer</Btn>
        </div>
        <p className="text-xs text-slate-400">File CSV bisa dibuka langsung di Excel / Google Sheets.</p>
      </Card>
      <p className="text-xs text-slate-400">Catatan: fitur pemulihan otomatis dari file backup belum tersedia. File JSON ini disimpan sebagai arsip.</p>
    </div>
  );
}
