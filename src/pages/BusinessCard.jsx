// src/pages/BusinessCard.jsx
import { useState, useMemo } from 'react';
import { Card, Btn, Input, Textarea, Icons } from '../components/UI.jsx';
import { doPrintBusinessCard, buildSingleCardPreviewHTML, CARD_TEMPLATE_LIST } from '../lib/print.js';
import { DEF_SETTINGS } from '../lib/utils.js';

export default function BusinessCard({ settings, setPage }) {
  const [templateId, setTemplateId] = useState('navy-road');
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

  const printSide = side => doPrintBusinessCard(side, data, templateId);

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            Cetak Kartu Nama
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Pilih template, isi data, lalu cetak kartu nama 2 sisi presisi di kertas A4.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => setPage('dashboard')}>{Icons.back} Kembali</Btn>
      </div>

      {/* ── PEMILIHAN TEMPLATE ──────────────────── */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-3">Pilih Template</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CARD_TEMPLATE_LIST.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplateId(t.id)}
              className={`text-left rounded-xl border-2 p-3 transition-all duration-150
                ${templateId === t.id ? 'border-[#0f2544] bg-[#0f2544]/5 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex gap-1 mb-2 h-6 rounded-lg overflow-hidden">
                {t.swatch.map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}
              </div>
              <div className={`text-xs font-bold ${templateId === t.id ? 'text-[#0f2544]' : 'text-slate-600'}`}>{t.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

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
            <h3 className="font-bold text-[#0f2544] mb-4">Pratinjau — {CARD_TEMPLATE_LIST.find(t => t.id === templateId)?.label}</h3>
            <div className="flex flex-wrap gap-8 justify-center">
              <CardPreview side="front" data={data} templateId={templateId} />
              <CardPreview side="back" data={data} templateId={templateId} />
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

// ── Preview kartu via iframe (render HTML/CSS yang identik dengan hasil cetak) ──
function CardPreview({ side, data, templateId }) {
  const html = useMemo(() => buildSingleCardPreviewHTML(data, side, templateId), [data, side, templateId]);
  // Kartu 90x55mm -> tampilkan di kotak 270x165px (scale 3x dari mm->px referensi ~96dpi/cm disederhanakan)
  const BOX_W = 270, BOX_H = 165;
  // iframe dirender pada ukuran asli mm (dikonversi ke px css @ 3.7795 px/mm), lalu di-scale agar pas BOX
  const IFRAME_W_MM_PX = 90 * 3.7795;
  const IFRAME_H_MM_PX = 55 * 3.7795;
  const scale = BOX_W / IFRAME_W_MM_PX;

  return (
    <div style={{ width: BOX_W, height: BOX_H }} className="relative rounded-lg overflow-hidden shadow-lg bg-white">
      <iframe
        title={`preview-${side}`}
        srcDoc={html}
        style={{
          width: IFRAME_W_MM_PX,
          height: IFRAME_H_MM_PX,
          border: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
