// src/pages/BlankReceipt.jsx
import { useState } from 'react';
import { Card, Btn, Icons } from '../components/UI.jsx';
import { doPrintBlankReceipt } from '../lib/print.js';

export default function BlankReceipt({ settings, setPage }) {
  const [copies, setCopies] = useState(1);

  const print = variant => doPrintBlankReceipt(variant, settings, Number(copies) || 1);

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Kwitansi Kosong
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Cetak kwitansi kosong untuk diisi manual — tanpa perlu data customer atau invoice.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => setPage('dashboard')}>{Icons.back} Kembali</Btn>
      </div>

      {/* Jumlah lembar */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-3">Jumlah Lembar</h3>
        <div className="flex items-center gap-3">
          <input
            type="number" min="1" max="20"
            value={copies}
            onChange={e => setCopies(e.target.value)}
            className="w-24 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
          />
          <span className="text-sm text-slate-500">lembar per ukuran A5 landscape (bisa dicetak sekali jalan dalam 1 file PDF/print).</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opsi 1: Bertema */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🧾</span>
            <h3 className="font-bold text-[#0f2544]">Kwitansi Bertema</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Kop perusahaan (logo, alamat, kontak), info bank, tanda tangan & stempel otomatis terisi
            dari Pengaturan. Kolom isian dibuat kosong dengan garis titik-titik untuk ditulis tangan.
          </p>
          <ul className="text-xs text-slate-400 mb-4 space-y-1">
            <li>• Logo & identitas perusahaan otomatis</li>
            <li>• Kolom: diterima dari, tanggal, untuk pembayaran, jumlah uang</li>
            <li>• Tempat tanda tangan & stempel sudah disiapkan</li>
          </ul>
          <Btn onClick={() => print('themed')} className="w-full justify-center">
            {Icons.print} Cetak Kwitansi Bertema
          </Btn>
        </Card>

        {/* Opsi 2: Polos */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📄</span>
            <h3 className="font-bold text-[#0f2544]">Kwitansi Polos</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Format kwitansi sederhana tanpa kop atau logo perusahaan. Cocok untuk diisi penuh
            dengan tulisan tangan, atau dipakai lintas keperluan di luar identitas perusahaan ini.
          </p>
          <ul className="text-xs text-slate-400 mb-4 space-y-1">
            <li>• Tanpa logo / kop perusahaan</li>
            <li>• Kolom: diterima dari, jumlah uang, untuk pembayaran</li>
            <li>• Kotak nominal Rp dan area tanda tangan polos</li>
          </ul>
          <Btn variant="outline" onClick={() => print('plain')} className="w-full justify-center">
            {Icons.print} Cetak Kwitansi Polos
          </Btn>
        </Card>
      </div>

      <div className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
        💡 Kwitansi kosong ini hanya dicetak langsung dan tidak disimpan ke histori aplikasi.
        Untuk kwitansi yang otomatis terisi dari transaksi (dan tersimpan), buat melalui menu
        <button onClick={() => setPage('new-invoice')} className="text-[#0f2544] font-bold hover:underline mx-1">
          Buat Invoice Baru
        </button>
        lalu cetak kwitansinya dari menu Invoice & Kwitansi.
      </div>
    </div>
  );
}
