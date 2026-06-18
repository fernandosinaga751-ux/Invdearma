// src/pages/BusinessCard.jsx
import { useState } from 'react';
import { Card, Btn, Input, Textarea, Icons } from '../components/UI.jsx';
import { doPrintBusinessCard } from '../lib/print.js';
import { DEF_SETTINGS } from '../lib/utils.js';

export default function BusinessCard({ settings, setPage }) {
  const [data, setData] = useState({
    companyName: settings?.companyName || DEF_SETTINGS.companyName,
    logo: settings?.logo || null,
    personName: '',
    personTitle: 'Sales Executive',
    phone: settings?.phone || '',
    whatsapp: '',
    email: settings?.email || '',
    website: '',
    address: settings?.address || '',
    tagline: 'Sewa Mobil Terpercaya & Nyaman',
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const onLogo = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => set('logo', ev.target.result);
    r.readAsDataURL(f);
  };

  const printSide = side => doPrintBusinessCard(side, data);

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Cetak Kartu Nama
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Desain kartu nama 2 sisi untuk rental mobil — isi data, lalu cetak presisi di kertas A4.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => setPage('dashboard')}>{Icons.back} Kembali</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* ── FORM ───────────────────────────────── */}
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-[#0f2544]">Data Kartu Nama</h3>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Logo Perusahaan</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#0f2544] flex items-center justify-center overflow-hidden flex-shrink-0">
                {data.logo
                  ? <img src={data.logo} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-[#d4a017] font-black text-xs" style={{ fontFamily: 'Playfair Display,serif' }}>DRM</span>}
              </div>
              <input type="file" accept="image/*" onChange={onLogo}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-bold" />
            </div>
          </div>

          <Input label="Nama Perusahaan" value={data.companyName} onChange={e => set('companyName', e.target.value)} />
          <Input label="Tagline (sisi belakang)" value={data.tagline} onChange={e => set('tagline', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Karyawan" placeholder="Nama lengkap" value={data.personName} onChange={e => set('personName', e.target.value)} />
            <Input label="Jabatan" placeholder="cth. Sales Executive" value={data.personTitle} onChange={e => set('personTitle', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Telepon" placeholder="0812xxxxxxx" value={data.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="WhatsApp" placeholder="0812xxxxxxx" value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" placeholder="info@dearma.com" value={data.email} onChange={e => set('email', e.target.value)} />
            <Input label="Website" placeholder="www.dearma.com" value={data.website} onChange={e => set('website', e.target.value)} />
          </div>

          <Textarea label="Alamat" value={data.address} onChange={e => set('address', e.target.value)} />
        </Card>

        {/* ── PREVIEW + CETAK ────────────────────── */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-bold text-[#0f2544] mb-4">Pratinjau</h3>
            <div className="flex flex-wrap gap-8 justify-center">
              <CardPreview side="front" data={data} />
              <CardPreview side="back" data={data} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-[#0f2544] mb-1">Cetak 2 Sisi — Presisi di A4</h3>
            <p className="text-xs text-slate-400 mb-4">
              Ukuran kartu standar 90×55mm, 20 kartu per lembar A4 (4 kolom × 5 baris) lengkap garis potong.
            </p>

            <ol className="text-sm text-slate-600 space-y-2 mb-4 list-decimal list-inside bg-slate-50 rounded-xl p-4">
              <li>Klik <strong>Cetak Sisi Depan</strong>, cetak ke printer (gunakan kertas A4 biasa/karton tipis).</li>
              <li>Ambil kertas yang sudah dicetak, <strong>balik dari sisi panjang (long-edge)</strong> seperti membalik halaman buku — jangan dari sisi pendek.</li>
              <li>Masukkan kembali ke printer dengan sisi kosong menghadap ke arah cetak.</li>
              <li>Klik <strong>Cetak Sisi Belakang</strong>. Posisi grid sisi belakang sudah otomatis dicerminkan, sehingga akan jatuh presisi menimpa sisi depan.</li>
              <li>Setelah kering, potong mengikuti garis putus-putus pada tiap kartu.</li>
            </ol>

            <div className="grid grid-cols-2 gap-3">
              <Btn onClick={() => printSide('front')} className="w-full justify-center">
                {Icons.print} Cetak Sisi Depan
              </Btn>
              <Btn variant="outline" onClick={() => printSide('back')} className="w-full justify-center">
                {Icons.print} Cetak Sisi Belakang
              </Btn>
            </div>

            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4">
              💡 Tips presisi: cetak 1 lembar percobaan dulu (depan saja), lalu cek di cahaya/jendela apakah arah baliknya benar sebelum mencetak sisi belakang dalam jumlah banyak.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Mini preview kartu (scaled CSS, bukan untuk cetak) ──────────
function CardPreview({ side, data }) {
  const co = data.companyName || DEF_SETTINGS.companyName;
  const W = 270, H = 165; // px, rasio 90:55

  if (side === 'front') {
    return (
      <div style={{ width: W, height: H }}
        className="relative rounded-lg overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#0f2544 0%,#13294f 55%,#07172e 100%)' }} />
        <div className="absolute left-[-10%] bottom-[42px] w-[120%] h-[42px] rounded-full"
          style={{ borderTop: '1.5px solid rgba(212,160,23,.55)', transform: 'rotate(-3deg)' }} />
        <div className="absolute left-0 bottom-0 w-full h-[7px]" style={{ background: 'linear-gradient(90deg,#d4a017,#f0c040)' }} />
        <div className="absolute top-3 left-4 right-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: data.logo ? 'transparent' : 'linear-gradient(135deg,#d4a017,#f0c040)' }}>
            {data.logo
              ? <img src={data.logo} className="w-full h-full object-contain" alt="" />
              : <span className="text-[#0f2544] font-black text-[8px]" style={{ fontFamily: 'Playfair Display,serif' }}>DRM</span>}
          </div>
          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-100 leading-tight">{co}</div>
        </div>
        <div className="absolute left-4 right-4 bottom-5">
          <div className="text-white font-black text-base leading-tight" style={{ fontFamily: 'Playfair Display,serif' }}>
            {data.personName || 'Nama Anda'}
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#d4a017' }}>
            {data.personTitle || 'Jabatan'}
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    data.phone    ? { ic: '📞', v: data.phone } : null,
    data.whatsapp ? { ic: '💬', v: data.whatsapp } : null,
    data.email    ? { ic: '✉', v: data.email } : null,
    data.website  ? { ic: '🌐', v: data.website } : null,
    data.address  ? { ic: '📍', v: data.address } : null,
  ].filter(Boolean);

  return (
    <div style={{ width: W, height: H }} className="relative rounded-lg overflow-hidden shadow-lg bg-white border border-slate-100">
      <div className="absolute top-0 right-0 w-16 h-16" style={{ background: 'linear-gradient(135deg,transparent 50%,#f4f6fb 50%)' }} />
      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-tr-lg" style={{ borderTop: '1.5px solid #d4a017', borderRight: '1.5px solid #d4a017', opacity: .8 }} />
      <div className="absolute top-3 left-4 font-black text-[#0f2544] text-[11px] leading-tight max-w-[170px]" style={{ fontFamily: 'Playfair Display,serif' }}>
        {co}
      </div>
      <div className="absolute top-[34px] left-4 text-[6.5px] font-semibold uppercase tracking-wide text-slate-400 max-w-[170px]">
        {data.tagline || 'Sewa Mobil Terpercaya & Nyaman'}
      </div>
      <div className="absolute left-4 right-4 bottom-3 flex flex-col gap-1">
        {(rows.length ? rows : [{ ic: '📞', v: '0812xxxxxxx' }]).map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[7px] w-3">{r.ic}</span>
            <span className="text-[7px] font-semibold text-slate-600 truncate">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
