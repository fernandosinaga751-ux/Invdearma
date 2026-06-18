// src/lib/print.js
import { fmt, formatDateID, terbilang } from './utils.js';

// ════════════════════════════════════════════════════════════════
// INVOICE (dengan Due Date)
// ════════════════════════════════════════════════════════════════
function buildInvoiceHTML(invoice, settings) {
  const co = settings.companyName || 'Dearma Rental Mobil Medan';
  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<title>INVOICE - ${invoice.invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:210mm;overflow-x:hidden;}
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:12px;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm;position:relative;}
  .header{display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:3px solid #0f2544;margin-bottom:18px;}
  .logo-box{width:72px;height:72px;flex-shrink:0;}
  .logo-box img{width:100%;height:100%;object-fit:contain;}
  .logo-ph{width:72px;height:72px;background:linear-gradient(135deg,#0f2544,#1e4080);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#d4a017;font-weight:900;font-size:20px;font-family:'Playfair Display',serif;}
  .co-name{font-family:'Playfair Display',serif;font-size:20px;color:#0f2544;font-weight:900;}
  .co-sub{color:#666;font-size:10.5px;margin-top:4px;line-height:1.7;}
  .badge{margin-left:auto;text-align:right;}
  .badge .title{font-family:'Playfair Display',serif;font-size:30px;color:#0f2544;font-weight:900;letter-spacing:3px;border-bottom:3px solid #d4a017;padding-bottom:3px;display:inline-block;}
  .badge .no{font-size:10px;color:#777;margin-top:5px;font-family:monospace;}
  .info-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}
  .ic{background:#f5f7ff;border-radius:10px;padding:11px 13px;border-left:4px solid #0f2544;}
  .ic.gold{border-left-color:#d4a017;}
  .lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:3px;font-weight:700;}
  .val{font-size:13px;font-weight:800;color:#0f2544;line-height:1.3;}
  .sub{font-size:10px;color:#555;margin-top:2px;}
  .due-box{background:#fff8e6;border:2px solid #d4a017;border-radius:10px;padding:11px 13px;}
  .due-box .lbl{color:#b8870f;}
  .due-box .val{color:#92620a;}
  table{width:100%;border-collapse:collapse;margin:8px 0;}
  thead tr{background:#0f2544;}
  th{color:#d4a017;padding:9px 11px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
  td{padding:9px 11px;border-bottom:1px solid #eaedf5;font-size:11px;vertical-align:top;}
  tbody tr:nth-child(even) td{background:#f9fafc;}
  .c{text-align:center;} .r{text-align:right;}
  .totals{display:flex;justify-content:flex-end;margin:6px 0 18px;}
  .totals-box{width:260px;}
  .t-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eaedf5;font-size:11.5px;}
  .t-grand{border-top:2.5px solid #0f2544;border-bottom:none;margin-top:5px;font-size:15px;font-weight:800;color:#0f2544;padding-top:8px;}
  .footer{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:16px;border-top:1px dashed #c8ccdd;}
  .pay h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#0f2544;font-weight:800;margin-bottom:8px;}
  .pay p{font-size:11px;color:#444;line-height:1.9;}
  .sig-box{text-align:center;}
  .sig-inner{display:inline-block;min-width:170px;}
  .sig-from{font-size:9px;color:#999;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .sig-imgs{height:88px;position:relative;margin-bottom:6px;display:flex;align-items:flex-end;justify-content:center;}
  .stamp-img{position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:96px;height:96px;object-fit:contain;opacity:.4;}
  .sign-img{height:60px;object-fit:contain;position:relative;z-index:1;}
  .sig-name{border-top:1.5px solid #333;padding-top:6px;font-size:12px;font-weight:800;color:#0f2544;}
  .sig-title{font-size:9px;color:#888;margin-top:1px;}
  .wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(15,37,68,.035);pointer-events:none;font-family:'Playfair Display',serif;white-space:nowrap;z-index:0;letter-spacing:8px;}
  .content{position:relative;z-index:1;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4 portrait;margin:0;}
    .page{margin:0;width:100%;max-height:297mm;overflow:hidden;}
  }
</style></head>
<body><div class="page">
  <div class="wm">INVOICE</div>
  <div class="content">
    <div class="header">
      <div class="logo-box">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo">` : `<div class="logo-ph">DRM</div>`}
      </div>
      <div>
        <div class="co-name">${co}</div>
        <div class="co-sub">
          ${settings.address ? settings.address + '<br>' : ''}
          ${[settings.phone ? '📞 ' + settings.phone : '', settings.email ? '✉ ' + settings.email : ''].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
        </div>
      </div>
      <div class="badge">
        <div class="title">INVOICE</div>
        <div class="no">${invoice.invoiceNo}</div>
      </div>
    </div>

    <div class="info-row">
      <div class="ic">
        <div class="lbl">Kepada Yth.</div>
        <div class="val">${invoice.customerName}</div>
        ${invoice.customerPhone   ? `<div class="sub">📞 ${invoice.customerPhone}</div>` : ''}
        ${invoice.customerAddress ? `<div class="sub">📍 ${invoice.customerAddress}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="ic gold">
          <div class="lbl">Tanggal Invoice</div>
          <div class="val">${formatDateID(invoice.date)}</div>
        </div>
        ${invoice.dueDate ? `
        <div class="due-box">
          <div class="lbl">⏰ Jatuh Tempo (Due Date)</div>
          <div class="val">${formatDateID(invoice.dueDate)}</div>
        </div>` : ''}
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:34px;">No</th>
        <th>Keterangan / Deskripsi</th>
        <th style="width:58px;" class="c">Qty</th>
        <th style="width:108px;" class="r">Harga Satuan</th>
        <th style="width:115px;" class="r">Jumlah</th>
      </tr></thead>
      <tbody>
        ${invoice.items.map((it,i) => `<tr>
          <td class="c">${i+1}</td><td>${it.description}</td>
          <td class="c">${it.qty}</td>
          <td class="r">Rp ${fmt(it.price)}</td>
          <td class="r">Rp ${fmt((it.qty||0)*(it.price||0))}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals"><div class="totals-box">
      <div class="t-row"><span>Subtotal</span><span>Rp ${fmt(invoice.subtotal)}</span></div>
      ${invoice.diskon > 0 ? `<div class="t-row" style="color:#dc2626;"><span>🏷️ Diskon</span><span>- Rp ${fmt(invoice.diskon)}</span></div>` : ''}
      ${invoice.ppn > 0 ? `<div class="t-row"><span>PPN ${invoice.ppn}%</span><span>Rp ${fmt(invoice.ppnAmount)}</span></div>` : ''}
      <div class="t-row t-grand"><span>TOTAL</span><span>Rp ${fmt(invoice.total)}</span></div>
      ${invoice.panjar > 0 ? `
      <div class="t-row" style="color:#d97706;font-weight:700;"><span>💰 Panjar / DP</span><span>- Rp ${fmt(invoice.panjar)}</span></div>
      <div class="t-row" style="border-top:2px solid #059669;color:#059669;font-size:14px;font-weight:800;padding-top:7px;"><span>SISA BAYAR</span><span>Rp ${fmt(invoice.sisa)}</span></div>
      ` : ''}
    </div></div>

    ${invoice.notes ? `<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:9px 13px;margin-bottom:14px;font-size:11px;"><strong style="color:#b45309;">📝 Catatan:</strong> ${invoice.notes}</div>` : ''}

    <div class="footer">
      <div class="pay">
        ${settings.bankName || settings.bankAccount ? `
        <h4>Informasi Pembayaran</h4>
        <p>
          ${settings.bankName    ? `Bank &nbsp;&nbsp;&nbsp;: ${settings.bankName}<br>` : ''}
          ${settings.bankAccount ? `No. Rek : <strong>${settings.bankAccount}</strong><br>` : ''}
          ${settings.ownerName   ? `A/N &nbsp;&nbsp;&nbsp;&nbsp;: ${settings.ownerName}` : ''}
        </p>` : ''}
      </div>
      <div class="sig-box"><div class="sig-inner">
        <div class="sig-from">Hormat Kami,</div>
        <div class="sig-imgs">
          ${settings.stamp     ? `<img src="${settings.stamp}" class="stamp-img" alt="Stempel">` : ''}
          ${settings.signature ? `<img src="${settings.signature}" class="sign-img" alt="TTD">` : '<div style="height:60px;"></div>'}
        </div>
        <div class="sig-name">${settings.ownerName || 'Pimpinan'}</div>
        <div class="sig-title">${co}</div>
      </div></div>
    </div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════
// KWITANSI (Tanda Terima Pembayaran)
// ════════════════════════════════════════════════════════════════
function buildKwitansiHTML(invoice, settings) {
  const co = settings.companyName || 'Dearma Rental Mobil Medan';
  const paidDate = invoice.paidDate || invoice.date;
  const nominal = invoice.panjar > 0 ? (invoice.sisa || invoice.total) : invoice.total;
  const terbilangStr = terbilang(nominal);

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<title>KWITANSI - ${invoice.invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:210mm;height:148mm;overflow:hidden;}
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:12px;}
  .page{width:210mm;height:148mm;margin:0 auto;padding:10mm 14mm;position:relative;overflow:hidden;}
  /* Watermark LUNAS */
  .wm-lunas{
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-30deg);
    font-size:110px;font-weight:900;
    color:rgba(5,150,105,0.12);
    pointer-events:none;
    font-family:'Playfair Display',serif;
    white-space:nowrap;letter-spacing:12px;
    z-index:0;
  }
  .content{position:relative;z-index:1;}
  .header{display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:3px solid #0f2544;margin-bottom:10px;}
  .logo-box{width:64px;height:64px;flex-shrink:0;}
  .logo-box img{width:100%;height:100%;object-fit:contain;}
  .logo-ph{width:64px;height:64px;background:linear-gradient(135deg,#0f2544,#1e4080);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#d4a017;font-weight:900;font-size:18px;font-family:'Playfair Display',serif;}
  .co-name{font-family:'Playfair Display',serif;font-size:18px;color:#0f2544;font-weight:900;}
  .co-sub{color:#666;font-size:10px;margin-top:3px;line-height:1.6;}
  .kw-title{margin-left:auto;text-align:right;}
  .kw-title .t{font-family:'Playfair Display',serif;font-size:28px;color:#059669;font-weight:900;letter-spacing:3px;border-bottom:3px solid #059669;padding-bottom:2px;display:inline-block;}
  .kw-title .no{font-size:10px;color:#777;margin-top:4px;font-family:monospace;}
  /* Body kwitansi */
  .kwbody{border:2px solid #0f2544;border-radius:12px;overflow:hidden;margin-bottom:10px;}
  .kw-row{display:grid;grid-template-columns:140px 16px 1fr;align-items:start;padding:7px 14px;border-bottom:1px solid #e5e7f0;}
  .kw-row:last-child{border-bottom:none;}
  .kw-row.highlight{background:#f0fdf4;}
  .kw-label{font-size:10.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;padding-top:1px;}
  .kw-sep{font-size:13px;color:#0f2544;font-weight:900;padding-top:0;}
  .kw-value{font-size:12px;color:#1a1a2e;font-weight:600;line-height:1.5;}
  .kw-value.big{font-size:16px;font-weight:900;color:#0f2544;}
  .kw-value.green{font-size:15px;font-weight:900;color:#059669;}
  .terbilang-box{background:#f0fdf4;border:1px dashed #059669;border-radius:8px;padding:8px 12px;margin-top:5px;}
  .terbilang-label{font-size:9px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;}
  .terbilang-val{font-size:12px;font-weight:700;color:#065f46;font-style:italic;line-height:1.4;}
  /* items mini */
  .items-mini{font-size:10.5px;color:#444;line-height:1.8;}
  /* Lunas badge */
  .lunas-badge{display:inline-flex;align-items:center;gap:5px;background:#059669;color:#fff;font-weight:800;font-size:10px;letter-spacing:1px;padding:4px 12px;border-radius:20px;text-transform:uppercase;}
  /* Footer */
  .footer{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:end;margin-top:10px;}
  .pay p{font-size:11px;color:#444;line-height:1.9;}
  .sig-box{text-align:center;}
  .sig-inner{display:inline-block;min-width:160px;}
  .sig-from{font-size:9px;color:#999;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .sig-imgs{height:80px;position:relative;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center;}
  .stamp-img{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:90px;height:90px;object-fit:contain;opacity:.4;}
  .sign-img{height:55px;object-fit:contain;position:relative;z-index:1;}
  .sig-name{border-top:1.5px solid #333;padding-top:5px;font-size:11.5px;font-weight:800;color:#0f2544;}
  .sig-title{font-size:9px;color:#888;margin-top:1px;}
  .tanggal-box{font-size:11px;color:#555;margin-bottom:6px;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A5 landscape;margin:0;}
    .page{margin:0;width:100%;height:148mm;overflow:hidden;}
  }
</style></head>
<body><div class="page">
  <div class="wm-lunas">LUNAS</div>
  <div class="content">
    <div class="header">
      <div class="logo-box">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo">` : `<div class="logo-ph">DRM</div>`}
      </div>
      <div>
        <div class="co-name">${co}</div>
        <div class="co-sub">
          ${settings.address ? settings.address + '<br>' : ''}
          ${[settings.phone ? '📞 ' + settings.phone : '', settings.email ? '✉ ' + settings.email : ''].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
        </div>
      </div>
      <div class="kw-title">
        <div class="t">KWITANSI</div>
        <div class="no">${invoice.invoiceNo}</div>
      </div>
    </div>

    <div class="kwbody">
      <div class="kw-row">
        <span class="kw-label">Telah diterima dari</span>
        <span class="kw-sep">:</span>
        <span class="kw-value big">${invoice.customerName}</span>
      </div>
      <div class="kw-row">
        <span class="kw-label">Tanggal Pembayaran</span>
        <span class="kw-sep">:</span>
        <span class="kw-value">${formatDateID(paidDate)}</span>
      </div>
      <div class="kw-row">
        <span class="kw-label">Untuk Pembayaran</span>
        <span class="kw-sep">:</span>
        <span class="kw-value">
          <div class="items-mini">
            ${invoice.items.map((it,i) => `${i+1}. ${it.description} (${it.qty} × Rp ${fmt(it.price)})`).join('<br>')}
          </div>
        </span>
      </div>
      <div class="kw-row highlight">
        <span class="kw-label">Uang Sejumlah</span>
        <span class="kw-sep">:</span>
        <div>
          <div class="kw-value green">Rp ${fmt(nominal)}</div>
          <div class="terbilang-box">
            <div class="terbilang-label">Terbilang</div>
            <div class="terbilang-val">** ${terbilangStr} **</div>
          </div>
        </div>
      </div>
      ${invoice.ppn > 0 ? `
      <div class="kw-row">
        <span class="kw-label">Rincian</span>
        <span class="kw-sep">:</span>
        <span class="kw-value" style="font-size:10.5px;color:#666;">Subtotal Rp ${fmt(invoice.subtotal)}${invoice.diskon > 0 ? ` − Diskon Rp ${fmt(invoice.diskon)}` : ''} + PPN ${invoice.ppn}% Rp ${fmt(invoice.ppnAmount)}</span>
      </div>` : (invoice.diskon > 0 ? `
      <div class="kw-row">
        <span class="kw-label">Diskon</span>
        <span class="kw-sep">:</span>
        <span class="kw-value" style="color:#dc2626;">- Rp ${fmt(invoice.diskon)}</span>
      </div>` : '')}
      ${invoice.panjar > 0 ? `
      <div class="kw-row">
        <span class="kw-label">Total Invoice</span>
        <span class="kw-sep">:</span>
        <span class="kw-value">Rp ${fmt(invoice.total)}</span>
      </div>
      <div class="kw-row">
        <span class="kw-label">Panjar / DP</span>
        <span class="kw-sep">:</span>
        <span class="kw-value" style="color:#d97706;">Rp ${fmt(invoice.panjar)} (sudah dibayar)</span>
      </div>` : ''}
    </div>

    <div class="footer">
      <div>
        ${settings.bankName || settings.bankAccount ? `
        <p>
          ${settings.bankName    ? `Bank &nbsp;&nbsp;&nbsp;: ${settings.bankName}<br>` : ''}
          ${settings.bankAccount ? `No. Rek : <strong>${settings.bankAccount}</strong><br>` : ''}
          ${settings.ownerName   ? `A/N &nbsp;&nbsp;&nbsp;&nbsp;: ${settings.ownerName}` : ''}
        </p>` : ''}
        <div style="margin-top:10px;">
          <span class="lunas-badge">✅ LUNAS — Bukti Pembayaran Sah</span>
        </div>
      </div>
      <div class="sig-box"><div class="sig-inner">
        <div class="tanggal-box">Medan, ${formatDateID(paidDate)}</div>
        <div class="sig-from">Yang Menerima,</div>
        <div class="sig-imgs">
          ${settings.stamp     ? `<img src="${settings.stamp}" class="stamp-img" alt="Stempel">` : ''}
          ${settings.signature ? `<img src="${settings.signature}" class="sign-img" alt="TTD">` : '<div style="height:55px;"></div>'}
        </div>
        <div class="sig-name">${settings.ownerName || 'Pimpinan'}</div>
        <div class="sig-title">${co}</div>
      </div></div>
    </div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════
// KWITANSI KOSONG — Bertema (kop perusahaan otomatis)
// A4 portrait, 1 lembar A4 dibagi 2 (atas-bawah) = 2 kwitansi/halaman
// ════════════════════════════════════════════════════════════════
function buildBlankReceiptThemedHTML(settings, copies) {
  const co = settings.companyName || 'Dearma Rental Mobil Medan';

  const oneSlot = () => `
    <div class="slot">
      <div class="content">
        <div class="header">
          <div class="logo-box">
            ${settings.logo ? `<img src="${settings.logo}" alt="Logo">` : `<div class="logo-ph">DRM</div>`}
          </div>
          <div>
            <div class="co-name">${co}</div>
            <div class="co-sub">
              ${settings.address ? settings.address + '<br>' : ''}
              ${[settings.phone ? '📞 ' + settings.phone : '', settings.email ? '✉ ' + settings.email : ''].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
            </div>
          </div>
          <div class="kw-title">
            <div class="t">KWITANSI</div>
            <div class="no">No. ____________________</div>
          </div>
        </div>

        <div class="kwbody">
          <div class="kw-row">
            <span class="kw-label">Telah diterima dari</span>
            <span class="kw-sep">:</span>
            <span class="kw-value fill-line">&nbsp;</span>
          </div>
          <div class="kw-row">
            <span class="kw-label">Tanggal Pembayaran</span>
            <span class="kw-sep">:</span>
            <span class="kw-value fill-line short">&nbsp;</span>
          </div>
          <div class="kw-row">
            <span class="kw-label">Untuk Pembayaran</span>
            <span class="kw-sep">:</span>
            <span class="kw-value">
              <div class="fill-block"></div>
              <div class="fill-block"></div>
            </span>
          </div>
          <div class="kw-row highlight">
            <span class="kw-label">Uang Sejumlah</span>
            <span class="kw-sep">:</span>
            <div style="width:100%;">
              <div class="kw-value fill-line">&nbsp;</div>
              <div class="terbilang-box">
                <div class="terbilang-label">Terbilang</div>
                <div class="terbilang-val fill-line">** &nbsp; **</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>
            ${settings.bankName || settings.bankAccount ? `
            <p>
              ${settings.bankName    ? `Bank &nbsp;&nbsp;&nbsp;: ${settings.bankName}<br>` : ''}
              ${settings.bankAccount ? `No. Rek : <strong>${settings.bankAccount}</strong><br>` : ''}
              ${settings.ownerName   ? `A/N &nbsp;&nbsp;&nbsp;&nbsp;: ${settings.ownerName}` : ''}
            </p>` : ''}
          </div>
          <div class="sig-box"><div class="sig-inner">
            <div class="tanggal-box">Medan, ____________________</div>
            <div class="sig-from">Yang Menerima,</div>
            <div class="sig-imgs">
              ${settings.stamp     ? `<img src="${settings.stamp}" class="stamp-img" alt="Stempel">` : ''}
              ${settings.signature ? `<img src="${settings.signature}" class="sign-img" alt="TTD">` : '<div style="height:55px;"></div>'}
            </div>
            <div class="sig-name">${settings.ownerName || 'Pimpinan'}</div>
            <div class="sig-title">${co}</div>
          </div></div>
        </div>
      </div>
    </div>`;

  // Susun slot ke dalam sheet A4 (2 slot per sheet), garis gunting di tengah
  const slots = Array.from({ length: copies }, oneSlot);
  const sheets = [];
  for (let i = 0; i < slots.length; i += 2) {
    const pair = slots.slice(i, i + 2);
    sheets.push(`
    <div class="sheet">
      ${pair[0]}
      ${pair[1] ? `<div class="cut-line"></div>${pair[1]}` : ''}
    </div>`);
  }

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<title>KWITANSI KOSONG - ${co}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:210mm;}
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:12px;}
  .sheet{width:210mm;height:297mm;margin:0 auto;position:relative;display:flex;flex-direction:column;page-break-after:always;}
  .sheet:last-child{page-break-after:auto;}
  .slot{width:100%;height:148.5mm;padding:9mm 14mm;position:relative;overflow:hidden;box-sizing:border-box;}
  .cut-line{width:100%;border-top:1px dashed #bbb;position:relative;flex:0 0 0;}
  .cut-line::after{content:'✂ potong di sini';position:absolute;left:50%;top:-7px;transform:translateX(-50%);background:#fff;padding:0 8px;font-size:8px;color:#999;letter-spacing:.5px;}
  .content{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;}
  .header{display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:3px solid #0f2544;margin-bottom:10px;}
  .logo-box{width:64px;height:64px;flex-shrink:0;}
  .logo-box img{width:100%;height:100%;object-fit:contain;}
  .logo-ph{width:64px;height:64px;background:linear-gradient(135deg,#0f2544,#1e4080);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#d4a017;font-weight:900;font-size:18px;font-family:'Playfair Display',serif;}
  .co-name{font-family:'Playfair Display',serif;font-size:18px;color:#0f2544;font-weight:900;}
  .co-sub{color:#666;font-size:10px;margin-top:3px;line-height:1.6;}
  .kw-title{margin-left:auto;text-align:right;}
  .kw-title .t{font-family:'Playfair Display',serif;font-size:28px;color:#0f2544;font-weight:900;letter-spacing:3px;border-bottom:3px solid #d4a017;padding-bottom:2px;display:inline-block;}
  .kw-title .no{font-size:10px;color:#777;margin-top:4px;font-family:monospace;}
  .kwbody{border:2px solid #0f2544;border-radius:12px;overflow:hidden;margin-bottom:10px;flex:1;}
  .kw-row{display:grid;grid-template-columns:140px 16px 1fr;align-items:start;padding:9px 14px;border-bottom:1px solid #e5e7f0;}
  .kw-row:last-child{border-bottom:none;}
  .kw-row.highlight{background:#f8fafc;}
  .kw-label{font-size:10.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;padding-top:1px;}
  .kw-sep{font-size:13px;color:#0f2544;font-weight:900;padding-top:0;}
  .kw-value{font-size:12px;color:#1a1a2e;font-weight:600;line-height:1.5;width:100%;}
  .fill-line{display:inline-block;width:100%;border-bottom:1.3px dotted #a8aec2;min-height:18px;}
  .fill-line.short{width:60%;}
  .fill-block{border-bottom:1.3px dotted #a8aec2;height:16px;margin-bottom:6px;}
  .terbilang-box{background:#f8fafc;border:1px dashed #b8bdce;border-radius:8px;padding:8px 12px;margin-top:6px;}
  .terbilang-label{font-size:9px;font-weight:800;color:#777;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;}
  .terbilang-val{font-size:12px;font-weight:700;color:#555;font-style:italic;}
  .footer{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:end;margin-top:auto;}
  .pay p{font-size:11px;color:#444;line-height:1.9;}
  .sig-box{text-align:center;}
  .sig-inner{display:inline-block;min-width:160px;}
  .sig-from{font-size:9px;color:#999;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .sig-imgs{height:80px;position:relative;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center;}
  .stamp-img{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:90px;height:90px;object-fit:contain;opacity:.4;}
  .sign-img{height:55px;object-fit:contain;position:relative;z-index:1;}
  .sig-name{border-top:1.5px solid #333;padding-top:5px;font-size:11.5px;font-weight:800;color:#0f2544;}
  .sig-title{font-size:9px;color:#888;margin-top:1px;}
  .tanggal-box{font-size:11px;color:#555;margin-bottom:6px;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4 portrait;margin:0;}
    .sheet{margin:0;width:100%;height:297mm;}
  }
</style></head>
<body>${sheets.join('')}
<script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════
// KWITANSI KOSONG — Polos (siap tulis tangan, tanpa kop)
// A4 portrait, 1 lembar A4 dibagi 2 (atas-bawah) = 2 kwitansi/halaman
// ════════════════════════════════════════════════════════════════
function buildBlankReceiptPlainHTML(copies) {
  const oneSlot = () => `
    <div class="slot">
      <div class="row1">
        <div class="title">KWITANSI</div>
        <div class="no-box">No. <span class="line short"></span></div>
      </div>

      <div class="field">
        <span class="lbl">Sudah terima dari</span>
        <span class="sep">:</span>
        <span class="line"></span>
      </div>
      <div class="field">
        <span class="lbl">Banyaknya uang</span>
        <span class="sep">:</span>
        <span class="line"></span>
      </div>
      <div class="field terbilang">
        <span class="lbl">Untuk pembayaran</span>
        <span class="sep">:</span>
        <div class="multiline">
          <span class="line"></span>
        </div>
      </div>

      <div class="bottom">
        <div class="amount-box">
          <span class="lbl">Rp</span>
          <span class="line"></span>
        </div>
        <div class="sign-box">
          <span class="line short" style="margin-bottom:2px;"></span>
          <div class="sign-area"></div>
          <span class="line short"></span>
        </div>
      </div>
    </div>`;

  const slots = Array.from({ length: copies }, oneSlot);
  const sheets = [];
  for (let i = 0; i < slots.length; i += 2) {
    const pair = slots.slice(i, i + 2);
    sheets.push(`
    <div class="sheet">
      ${pair[0]}
      ${pair[1] ? `<div class="cut-line"></div>${pair[1]}` : ''}
    </div>`);
  }

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<title>KWITANSI KOSONG - Polos</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:210mm;}
  body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;font-size:13px;}
  .sheet{width:210mm;height:297mm;margin:0 auto;display:flex;flex-direction:column;page-break-after:always;}
  .sheet:last-child{page-break-after:auto;}
  .slot{width:100%;height:148.5mm;padding:10mm 16mm;position:relative;border:1.5px solid #333;display:flex;flex-direction:column;box-sizing:border-box;}
  .cut-line{width:100%;border-top:1px dashed #bbb;position:relative;}
  .cut-line::after{content:'✂ potong di sini';position:absolute;left:50%;top:-7px;transform:translateX(-50%);background:#fff;padding:0 8px;font-size:8px;color:#999;letter-spacing:.5px;}
  .row1{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:18px;}
  .title{font-size:24px;font-weight:900;letter-spacing:4px;}
  .no-box{font-size:12px;}
  .field{display:grid;grid-template-columns:150px 14px 1fr;align-items:end;margin-bottom:16px;}
  .field.terbilang{align-items:start;}
  .lbl{font-size:13px;font-weight:700;}
  .sep{font-size:13px;font-weight:700;}
  .line{display:inline-block;width:100%;border-bottom:1px solid #444;min-height:20px;}
  .multiline{display:flex;flex-direction:column;gap:18px;}
  .bottom{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;gap:30px;}
  .amount-box{display:flex;align-items:baseline;gap:8px;flex:1;border:1.5px solid #333;border-radius:6px;padding:8px 14px;}
  .amount-box .lbl{font-size:15px;}
  .sign-box{display:flex;flex-direction:column;align-items:center;width:180px;}
  .sign-area{height:50px;width:100%;}
  @media print{
    @page{size:A4 portrait;margin:0;}
    .sheet{margin:0;width:100%;height:297mm;}
  }
</style></head>
<body>${sheets.join('')}
<script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════
// KARTU NAMA — 5 Template, 2 Sisi, Grid A4 presisi
// Kartu 90×55mm standar, 4 kolom × 5 baris = 20 kartu / lembar A4
// Sisi belakang di-mirror horizontal per baris agar pas saat
// kertas dibalik dari sisi panjang (long-edge flip) untuk duplex print.
// ════════════════════════════════════════════════════════════════
const CARD_W = 90;  // mm
const CARD_H = 55;  // mm
const COLS = 4;
const ROWS = 5;
const PAGE_W = 210; // mm A4
const PAGE_H = 297; // mm A4

function cnGapsAndMargin() {
  const gapX = 4, gapY = 4;
  const gridW = COLS * CARD_W + (COLS - 1) * gapX;
  const gridH = ROWS * CARD_H + (ROWS - 1) * gapY;
  const marginX = (PAGE_W - gridW) / 2;
  const marginY = (PAGE_H - gridH) / 2;
  return { gapX, gapY, marginX, marginY };
}

function contactRows(data) {
  return [
    data.phone    ? { ic: '📞', v: data.phone } : null,
    data.whatsapp ? { ic: '💬', v: data.whatsapp } : null,
    data.email    ? { ic: '✉', v: data.email } : null,
    data.website  ? { ic: '🌐', v: data.website } : null,
    data.address  ? { ic: '📍', v: data.address } : null,
  ].filter(Boolean);
}

function initials(name) {
  return (name || 'DR').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

// ════════ TEMPLATE DEFINITIONS ════════
// Setiap template punya: id, label, swatch (untuk thumbnail pemilihan),
// css (string), front(data) → html, back(data) → html
const TEMPLATES = {

  // ── 1. NAVY ROAD — elegan, garis jalan emas melengkung ─────────
  'navy-road': {
    label: 'Navy Road',
    desc: 'Elegan & korporat — navy gradient dengan jalur emas melengkung',
    swatch: ['#0f2544', '#d4a017', '#ffffff'],
    css: `
      .tpl-navy-road.cn-front{ background:linear-gradient(135deg,#0f2544 0%,#13294f 55%,#07172e 100%); color:#fff; }
      .tpl-navy-road .cn-road{ position:absolute;left:-10%;bottom:14mm;width:120%;height:14mm; border-top:1.1px solid rgba(212,160,23,.55); border-radius:50%; transform:rotate(-3deg); }
      .tpl-navy-road .cn-gold-line{ position:absolute;left:0;bottom:0;width:100%;height:2.3mm; background:linear-gradient(90deg,#d4a017,#f0c040); }
      .tpl-navy-road .cn-front-top{ position:absolute;top:4.2mm;left:5mm;right:5mm; display:flex;align-items:center;gap:2.4mm; }
      .tpl-navy-road .cn-logo{width:8mm;height:8mm;flex-shrink:0;}
      .tpl-navy-road .cn-logo img{width:100%;height:100%;object-fit:contain;}
      .tpl-navy-road .cn-logo-ph{ width:8mm;height:8mm;border-radius:1.6mm; background:linear-gradient(135deg,#d4a017,#f0c040); display:flex;align-items:center;justify-content:center; color:#0f2544;font-weight:900;font-size:2.6mm;font-family:'Playfair Display',serif; }
      .tpl-navy-road .cn-co-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:700; font-size:2.7mm;letter-spacing:.3mm;color:#f3f5fa; text-transform:uppercase;line-height:1.2; }
      .tpl-navy-road .cn-front-bottom{ position:absolute;left:5mm;bottom:6.6mm;right:5mm; }
      .tpl-navy-road .cn-person-name{ font-family:'Playfair Display',serif;font-weight:900; font-size:5.6mm;color:#fff;line-height:1.05; }
      .tpl-navy-road .cn-person-title{ margin-top:1mm;font-size:2.5mm;font-weight:600;letter-spacing:.4mm; color:#d4a017;text-transform:uppercase; }
      .tpl-navy-road.cn-back{ background:#ffffff; }
      .tpl-navy-road .cn-back-corner{ position:absolute;top:0;right:0;width:24mm;height:24mm; background:linear-gradient(135deg,transparent 50%,#f4f6fb 50%); }
      .tpl-navy-road .cn-back-corner::after{ content:'';position:absolute;top:5mm;right:5mm;width:10mm;height:10mm; border-top:1.1px solid #d4a017;border-right:1.1px solid #d4a017; border-radius:0 4mm 0 0;opacity:.8; }
      .tpl-navy-road .cn-back-co{ position:absolute;top:4.4mm;left:5mm; font-family:'Playfair Display',serif;font-weight:900; font-size:3.6mm;color:#0f2544;line-height:1.15;max-width:60mm; }
      .tpl-navy-road .cn-back-tag{ position:absolute;top:10.2mm;left:5mm; font-size:2.1mm;color:#94a3b8;font-weight:600;letter-spacing:.2mm; text-transform:uppercase;max-width:60mm; }
      .tpl-navy-road .cn-back-contacts{ position:absolute;left:5mm;bottom:4.6mm;right:5mm; display:flex;flex-direction:column;gap:1.5mm; }
      .tpl-navy-road .cn-contact-row{display:flex;align-items:baseline;gap:1.8mm;}
      .tpl-navy-road .cn-ic{font-size:2.3mm;width:4mm;flex-shrink:0;}
      .tpl-navy-road .cn-cv{font-size:2.3mm;color:#334155;font-weight:600;word-break:break-all;}
    `,
    front: data => `
      <div class="cn-road"></div>
      <div class="cn-front-top">
        <div class="cn-logo">${data.logo ? `<img src="${data.logo}" alt="Logo">` : `<div class="cn-logo-ph">DRM</div>`}</div>
        <div class="cn-co-name">${data.companyName}</div>
      </div>
      <div class="cn-front-bottom">
        <div class="cn-person-name">${data.personName || 'Nama Anda'}</div>
        <div class="cn-person-title">${data.personTitle || 'Jabatan'}</div>
      </div>
      <div class="cn-gold-line"></div>`,
    back: data => `
      <div class="cn-back-corner"></div>
      <div class="cn-back-co">${data.companyName}</div>
      <div class="cn-back-tag">${data.tagline}</div>
      <div class="cn-back-contacts">
        ${contactRows(data).map(r => `<div class="cn-contact-row"><span class="cn-ic">${r.ic}</span><span class="cn-cv">${r.v}</span></div>`).join('')}
      </div>`,
  },

  // ── 2. SPEEDLINE — sporty, garis kecepatan diagonal, merah-hitam ──
  'speedline': {
    label: 'Speedline',
    desc: 'Sporty & dinamis — garis kecepatan diagonal, aksen merah balap',
    swatch: ['#15161a', '#e11d2e', '#ffffff'],
    css: `
      .tpl-speedline.cn-front{ background:#15161a; color:#fff; }
      .tpl-speedline .sl-stripe{ position:absolute; height:5.5mm; background:#e11d2e; transform:skewX(-22deg); }
      .tpl-speedline .sl-s1{ top:0; right:-6mm; width:26mm; }
      .tpl-speedline .sl-s2{ top:6.2mm; right:-6mm; width:16mm; background:#fff; opacity:.92; }
      .tpl-speedline .sl-s3{ bottom:0; left:-6mm; width:38mm; height:4mm; }
      .tpl-speedline .cn-front-top{ position:absolute;top:4.5mm;left:5mm;right:5mm; display:flex;align-items:center;gap:2.4mm; z-index:2; }
      .tpl-speedline .cn-logo{width:8mm;height:8mm;flex-shrink:0;}
      .tpl-speedline .cn-logo img{width:100%;height:100%;object-fit:contain;}
      .tpl-speedline .cn-logo-ph{ width:8mm;height:8mm;border-radius:1.6mm; background:#e11d2e; display:flex;align-items:center;justify-content:center; color:#fff;font-weight:900;font-size:2.6mm;font-family:'Plus Jakarta Sans',sans-serif; }
      .tpl-speedline .cn-co-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:800; font-size:2.3mm;letter-spacing:.3mm;color:#fff; text-transform:uppercase;line-height:1.2;max-width:52mm; }
      .tpl-speedline .cn-front-bottom{ position:absolute;left:5mm;bottom:7mm;right:5mm; z-index:2; }
      .tpl-speedline .cn-person-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:900; font-size:5mm;color:#fff;line-height:1.05;letter-spacing:.2mm; font-style:italic; }
      .tpl-speedline .cn-person-title{ margin-top:1mm;font-size:2.4mm;font-weight:700;letter-spacing:.5mm; color:#e11d2e;text-transform:uppercase; }
      .tpl-speedline.cn-back{ background:#fff; }
      .tpl-speedline .sl-back-stripe{ position:absolute;top:0;left:0;width:100%;height:4mm;background:#e11d2e; }
      .tpl-speedline .sl-back-stripe2{ position:absolute;top:4mm;left:0;width:60%;height:1mm;background:#15161a; }
      .tpl-speedline .cn-back-co{ position:absolute;top:9mm;left:5mm; font-family:'Plus Jakarta Sans',sans-serif;font-weight:900; font-size:3.5mm;color:#15161a;line-height:1.15;max-width:65mm;text-transform:uppercase; }
      .tpl-speedline .cn-back-tag{ position:absolute;top:14.6mm;left:5mm; font-size:2.1mm;color:#e11d2e;font-weight:700;letter-spacing:.3mm; text-transform:uppercase;max-width:65mm; }
      .tpl-speedline .cn-back-contacts{ position:absolute;left:5mm;bottom:4.6mm;right:5mm; display:flex;flex-direction:column;gap:1.5mm; }
      .tpl-speedline .cn-contact-row{display:flex;align-items:baseline;gap:1.8mm;}
      .tpl-speedline .cn-ic{font-size:2.3mm;width:4mm;flex-shrink:0;}
      .tpl-speedline .cn-cv{font-size:2.3mm;color:#27272a;font-weight:700;word-break:break-all;}
    `,
    front: data => `
      <div class="sl-stripe sl-s1"></div>
      <div class="sl-stripe sl-s2"></div>
      <div class="sl-stripe sl-s3"></div>
      <div class="cn-front-top">
        <div class="cn-logo">${data.logo ? `<img src="${data.logo}" alt="Logo">` : `<div class="cn-logo-ph">DRM</div>`}</div>
        <div class="cn-co-name">${data.companyName}</div>
      </div>
      <div class="cn-front-bottom">
        <div class="cn-person-name">${data.personName || 'Nama Anda'}</div>
        <div class="cn-person-title">${data.personTitle || 'Jabatan'}</div>
      </div>`,
    back: data => `
      <div class="sl-back-stripe"></div>
      <div class="sl-back-stripe2"></div>
      <div class="cn-back-co">${data.companyName}</div>
      <div class="cn-back-tag">${data.tagline}</div>
      <div class="cn-back-contacts">
        ${contactRows(data).map(r => `<div class="cn-contact-row"><span class="cn-ic">${r.ic}</span><span class="cn-cv">${r.v}</span></div>`).join('')}
      </div>`,
  },

  // ── 3. MINIMALIST KEY — krem/charcoal, ikon kunci mobil, minimalis ─
  'minimalist-key': {
    label: 'Minimalist Key',
    desc: 'Bersih & modern — krem-charcoal dengan motif kunci mobil tipis',
    swatch: ['#f4f1ea', '#2b2826', '#b08d57'],
    css: `
      .tpl-minimalist-key.cn-front{ background:#f4f1ea; color:#2b2826; }
      .tpl-minimalist-key .mk-key{ position:absolute;right:5mm;top:50%;transform:translateY(-50%);opacity:.14; }
      .tpl-minimalist-key .mk-rule{ position:absolute;left:5mm;right:5mm;top:16.5mm;height:0.3mm;background:#2b2826;opacity:.18; }
      .tpl-minimalist-key .cn-front-top{ position:absolute;top:4.5mm;left:5mm;right:5mm; display:flex;align-items:center;gap:2.2mm; }
      .tpl-minimalist-key .cn-logo{width:7mm;height:7mm;flex-shrink:0;}
      .tpl-minimalist-key .cn-logo img{width:100%;height:100%;object-fit:contain;}
      .tpl-minimalist-key .cn-logo-ph{ width:7mm;height:7mm;border-radius:50%; border:0.5px solid #2b2826; display:flex;align-items:center;justify-content:center; color:#2b2826;font-weight:700;font-size:2.2mm;font-family:'Plus Jakarta Sans',sans-serif; }
      .tpl-minimalist-key .cn-co-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:600; font-size:2.3mm;letter-spacing:.5mm;color:#2b2826; text-transform:uppercase;line-height:1.2; }
      .tpl-minimalist-key .cn-front-bottom{ position:absolute;left:5mm;bottom:6.5mm;right:14mm; }
      .tpl-minimalist-key .cn-person-name{ font-family:'Playfair Display',serif;font-weight:700; font-size:5mm;color:#2b2826;line-height:1.05; }
      .tpl-minimalist-key .cn-person-title{ margin-top:1.2mm;font-size:2.2mm;font-weight:500;letter-spacing:.5mm; color:#b08d57;text-transform:uppercase; }
      .tpl-minimalist-key.cn-back{ background:#2b2826; color:#f4f1ea; }
      .tpl-minimalist-key .mk-rule-back{ position:absolute;left:5mm;top:13mm;width:14mm;height:0.4mm;background:#b08d57; }
      .tpl-minimalist-key .cn-back-co{ position:absolute;top:4.6mm;left:5mm; font-family:'Playfair Display',serif;font-weight:700; font-size:3.4mm;color:#f4f1ea;line-height:1.15;max-width:65mm; }
      .tpl-minimalist-key .cn-back-tag{ position:absolute;top:9.8mm;left:5mm; font-size:2mm;color:#b08d57;font-weight:500;letter-spacing:.4mm; text-transform:uppercase;max-width:65mm; }
      .tpl-minimalist-key .cn-back-contacts{ position:absolute;left:5mm;bottom:4.6mm;right:5mm; display:flex;flex-direction:column;gap:1.6mm; }
      .tpl-minimalist-key .cn-contact-row{display:flex;align-items:baseline;gap:1.8mm;}
      .tpl-minimalist-key .cn-ic{font-size:2.2mm;width:4mm;flex-shrink:0;filter:grayscale(1) brightness(1.8);}
      .tpl-minimalist-key .cn-cv{font-size:2.2mm;color:#e8e4da;font-weight:500;word-break:break-all;}
    `,
    front: data => `
      <svg class="mk-key" width="34mm" height="34mm" viewBox="0 0 100 100" fill="none" stroke="#2b2826" stroke-width="2.2">
        <circle cx="34" cy="50" r="16"/><circle cx="34" cy="50" r="5" fill="#2b2826"/>
        <line x1="50" y1="50" x2="92" y2="50"/><line x1="74" y1="50" x2="74" y2="62"/><line x1="84" y1="50" x2="84" y2="60"/>
      </svg>
      <div class="mk-rule"></div>
      <div class="cn-front-top">
        <div class="cn-logo">${data.logo ? `<img src="${data.logo}" alt="Logo">` : `<div class="cn-logo-ph">DR</div>`}</div>
        <div class="cn-co-name">${data.companyName}</div>
      </div>
      <div class="cn-front-bottom">
        <div class="cn-person-name">${data.personName || 'Nama Anda'}</div>
        <div class="cn-person-title">${data.personTitle || 'Jabatan'}</div>
      </div>`,
    back: data => `
      <div class="mk-rule-back"></div>
      <div class="cn-back-co">${data.companyName}</div>
      <div class="cn-back-tag">${data.tagline}</div>
      <div class="cn-back-contacts">
        ${contactRows(data).map(r => `<div class="cn-contact-row"><span class="cn-ic">${r.ic}</span><span class="cn-cv">${r.v}</span></div>`).join('')}
      </div>`,
  },

  // ── 4. ASPHALT NIGHT — gelap, garis aspal putus-putus, aksen kuning ─
  'asphalt-night': {
    label: 'Asphalt Night',
    desc: 'Jalanan malam — tekstur garis aspal putus-putus, kuning rambu jalan',
    swatch: ['#1c1c1e', '#fbbf24', '#ffffff'],
    css: `
      .tpl-asphalt-night.cn-front{ background:linear-gradient(180deg,#26262a 0%,#1c1c1e 100%); color:#fff; }
      .tpl-asphalt-night .an-lane{ position:absolute;left:0;right:0;top:17mm;height:1.4mm; background-image:repeating-linear-gradient(90deg,#fbbf24 0,#fbbf24 7mm,transparent 7mm,transparent 11mm); opacity:.85; }
      .tpl-asphalt-night .an-edge{ position:absolute;left:0;bottom:0;width:100%;height:1mm;background:#fbbf24; }
      .tpl-asphalt-night .cn-front-top{ position:absolute;top:4.5mm;left:5mm;right:5mm; display:flex;align-items:center;gap:2.4mm; }
      .tpl-asphalt-night .cn-logo{width:8mm;height:8mm;flex-shrink:0;}
      .tpl-asphalt-night .cn-logo img{width:100%;height:100%;object-fit:contain;}
      .tpl-asphalt-night .cn-logo-ph{ width:8mm;height:8mm;border-radius:1.4mm; background:#fbbf24; display:flex;align-items:center;justify-content:center; color:#1c1c1e;font-weight:900;font-size:2.6mm;font-family:'Plus Jakarta Sans',sans-serif; }
      .tpl-asphalt-night .cn-co-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:700; font-size:2.6mm;letter-spacing:.3mm;color:#fff; text-transform:uppercase;line-height:1.2; }
      .tpl-asphalt-night .cn-front-bottom{ position:absolute;left:5mm;bottom:4.2mm;right:5mm; }
      .tpl-asphalt-night .cn-person-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:800; font-size:5mm;color:#fff;line-height:1.05; }
      .tpl-asphalt-night .cn-person-title{ margin-top:1mm;font-size:2.4mm;font-weight:600;letter-spacing:.4mm; color:#fbbf24;text-transform:uppercase; }
      .tpl-asphalt-night.cn-back{ background:#fff; }
      .tpl-asphalt-night .an-back-lane{ position:absolute;top:0;left:0;right:0;height:1.4mm; background-image:repeating-linear-gradient(90deg,#1c1c1e 0,#1c1c1e 6mm,transparent 6mm,transparent 9.5mm); opacity:.85; }
      .tpl-asphalt-night .an-back-edge{ position:absolute;top:1.4mm;left:0;width:100%;height:0.8mm;background:#fbbf24; }
      .tpl-asphalt-night .cn-back-co{ position:absolute;top:7mm;left:5mm; font-family:'Plus Jakarta Sans',sans-serif;font-weight:800; font-size:3.5mm;color:#1c1c1e;line-height:1.15;max-width:65mm; }
      .tpl-asphalt-night .cn-back-tag{ position:absolute;top:12.6mm;left:5mm; font-size:2.1mm;color:#9a9a9e;font-weight:600;letter-spacing:.2mm; text-transform:uppercase;max-width:65mm; }
      .tpl-asphalt-night .cn-back-contacts{ position:absolute;left:5mm;bottom:4.6mm;right:5mm; display:flex;flex-direction:column;gap:1.5mm; }
      .tpl-asphalt-night .cn-contact-row{display:flex;align-items:baseline;gap:1.8mm;}
      .tpl-asphalt-night .cn-ic{font-size:2.3mm;width:4mm;flex-shrink:0;}
      .tpl-asphalt-night .cn-cv{font-size:2.3mm;color:#3f3f46;font-weight:600;word-break:break-all;}
    `,
    front: data => `
      <div class="an-lane"></div>
      <div class="an-edge"></div>
      <div class="cn-front-top">
        <div class="cn-logo">${data.logo ? `<img src="${data.logo}" alt="Logo">` : `<div class="cn-logo-ph">DRM</div>`}</div>
        <div class="cn-co-name">${data.companyName}</div>
      </div>
      <div class="cn-front-bottom">
        <div class="cn-person-name">${data.personName || 'Nama Anda'}</div>
        <div class="cn-person-title">${data.personTitle || 'Jabatan'}</div>
      </div>`,
    back: data => `
      <div class="an-back-lane"></div>
      <div class="an-back-edge"></div>
      <div class="cn-back-co">${data.companyName}</div>
      <div class="cn-back-tag">${data.tagline}</div>
      <div class="cn-back-contacts">
        ${contactRows(data).map(r => `<div class="cn-contact-row"><span class="cn-ic">${r.ic}</span><span class="cn-cv">${r.v}</span></div>`).join('')}
      </div>`,
  },

  // ── 5. LUXURY GOLD — hitam pekat + emas, monogram, kesan eksekutif ──
  'luxury-gold': {
    label: 'Luxury Gold',
    desc: 'Mewah & eksekutif — hitam pekat, emas penuh, monogram inisial',
    swatch: ['#0a0a0a', '#d4af37', '#ffffff'],
    css: `
      .tpl-luxury-gold.cn-front{ background:#0a0a0a; color:#fff; }
      .tpl-luxury-gold .lg-frame{ position:absolute;inset:2.6mm;border:0.4px solid rgba(212,175,55,.55); }
      .tpl-luxury-gold .lg-mono{ position:absolute;right:5mm;top:50%;transform:translateY(-50%); font-family:'Playfair Display',serif;font-weight:900;font-size:14mm; color:rgba(212,175,55,.16); line-height:1; }
      .tpl-luxury-gold .cn-front-top{ position:absolute;top:5.5mm;left:6mm;right:6mm; display:flex;align-items:center;gap:2.4mm; }
      .tpl-luxury-gold .cn-logo{width:7.5mm;height:7.5mm;flex-shrink:0;}
      .tpl-luxury-gold .cn-logo img{width:100%;height:100%;object-fit:contain;}
      .tpl-luxury-gold .cn-logo-ph{ width:7.5mm;height:7.5mm;border-radius:50%; border:0.6px solid #d4af37; display:flex;align-items:center;justify-content:center; color:#d4af37;font-weight:700;font-size:2.3mm;font-family:'Playfair Display',serif; }
      .tpl-luxury-gold .cn-co-name{ font-family:'Plus Jakarta Sans',sans-serif;font-weight:500; font-size:2.3mm;letter-spacing:.6mm;color:#d4af37; text-transform:uppercase;line-height:1.2; }
      .tpl-luxury-gold .cn-front-bottom{ position:absolute;left:6mm;bottom:6.8mm;right:6mm; }
      .tpl-luxury-gold .cn-person-name{ font-family:'Playfair Display',serif;font-weight:700; font-size:5.2mm;color:#fff;line-height:1.05; }
      .tpl-luxury-gold .cn-person-title{ margin-top:1.2mm;font-size:2.2mm;font-weight:500;letter-spacing:.6mm; color:#d4af37;text-transform:uppercase; }
      .tpl-luxury-gold.cn-back{ background:#0a0a0a; color:#fff; }
      .tpl-luxury-gold .lg-frame-back{ position:absolute;inset:2.6mm;border:0.4px solid rgba(212,175,55,.55); }
      .tpl-luxury-gold .lg-divider{ position:absolute;left:6mm;top:13mm;width:12mm;height:0.4px;background:#d4af37; }
      .tpl-luxury-gold .cn-back-co{ position:absolute;top:5.6mm;left:6mm; font-family:'Playfair Display',serif;font-weight:700; font-size:3.3mm;color:#fff;line-height:1.15;max-width:65mm; }
      .tpl-luxury-gold .cn-back-tag{ position:absolute;top:14.4mm;left:6mm; font-size:1.9mm;color:#d4af37;font-weight:500;letter-spacing:.4mm; text-transform:uppercase;max-width:65mm; }
      .tpl-luxury-gold .cn-back-contacts{ position:absolute;left:6mm;bottom:5mm;right:6mm; display:flex;flex-direction:column;gap:1.6mm; }
      .tpl-luxury-gold .cn-contact-row{display:flex;align-items:baseline;gap:1.8mm;}
      .tpl-luxury-gold .cn-ic{font-size:2.2mm;width:4mm;flex-shrink:0;filter:sepia(1) saturate(3) brightness(1.3);}
      .tpl-luxury-gold .cn-cv{font-size:2.2mm;color:#d8d3c4;font-weight:500;word-break:break-all;}
    `,
    front: data => `
      <div class="lg-frame"></div>
      <div class="lg-mono">${initials(data.personName)}</div>
      <div class="cn-front-top">
        <div class="cn-logo">${data.logo ? `<img src="${data.logo}" alt="Logo">` : `<div class="cn-logo-ph">DR</div>`}</div>
        <div class="cn-co-name">${data.companyName}</div>
      </div>
      <div class="cn-front-bottom">
        <div class="cn-person-name">${data.personName || 'Nama Anda'}</div>
        <div class="cn-person-title">${data.personTitle || 'Jabatan'}</div>
      </div>`,
    back: data => `
      <div class="lg-frame-back"></div>
      <div class="lg-divider"></div>
      <div class="cn-back-co">${data.companyName}</div>
      <div class="cn-back-tag">${data.tagline}</div>
      <div class="cn-back-contacts">
        ${contactRows(data).map(r => `<div class="cn-contact-row"><span class="cn-ic">${r.ic}</span><span class="cn-cv">${r.v}</span></div>`).join('')}
      </div>`,
  },
};

export const CARD_TEMPLATE_LIST = Object.entries(TEMPLATES).map(([id, t]) => ({
  id, label: t.label, desc: t.desc, swatch: t.swatch,
}));

function buildBusinessCardHTML(data, side, templateId) {
  const tpl = TEMPLATES[templateId] || TEMPLATES['navy-road'];
  const tplClass = `tpl-${templateId}`;
  const { gapX, gapY, marginX, marginY } = cnGapsAndMargin();

  const oneCard = () => `<div class="cn-card ${tplClass} cn-${side}">${side === 'front' ? tpl.front(data) : tpl.back(data)}</div>`;

  // depan: urutan normal kiri→kanan.
  // belakang: urutan tiap baris dibalik (mirror horizontal) agar saat
  // lembar dibalik dari sisi panjang kiri/kanan, posisi kartu belakang
  // jatuh tepat menimpa kartu depan.
  const cardsHTML = [];
  for (let r = 0; r < ROWS; r++) {
    const rowCards = Array.from({ length: COLS }, oneCard);
    if (side === 'back') rowCards.reverse();
    cardsHTML.push(...rowCards);
  }

  const co = data.companyName || 'Dearma Rental Mobil Medan';

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8">
<title>KARTU NAMA - ${side === 'front' ? 'Depan' : 'Belakang'} - ${tpl.label} - ${co}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:210mm;}
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#fff;}
  .cn-sheet{
    width:${PAGE_W}mm;height:${PAGE_H}mm;position:relative;
    display:grid;
    grid-template-columns:repeat(${COLS}, ${CARD_W}mm);
    grid-template-rows:repeat(${ROWS}, ${CARD_H}mm);
    gap:${gapY}mm ${gapX}mm;
    padding:${marginY}mm ${marginX}mm;
  }
  .cn-card{
    width:${CARD_W}mm;height:${CARD_H}mm;position:relative;overflow:hidden;
    border:0.3px dashed #cbd5e1;
  }
  ${tpl.css}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4 portrait;margin:0;}
  }
</style></head>
<body>
  <div class="cn-sheet">${cardsHTML.join('')}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body></html>`;
}

// ─── Public API ────────────────────────────────────────────────
export function doPrint(invoice, type, settings) {
  const html = type === 'kwitansi'
    ? buildKwitansiHTML(invoice, settings)
    : buildInvoiceHTML(invoice, settings);
  const w = window.open('', '_blank', 'width=960,height=900,scrollbars=yes');
  if (!w) { alert('Popup diblokir! Izinkan popup lalu coba lagi.'); return; }
  w.document.write(html);
  w.document.close();
}

export function doPrintBlankReceipt(variant, settings, copies = 1) {
  const html = variant === 'plain'
    ? buildBlankReceiptPlainHTML(copies)
    : buildBlankReceiptThemedHTML(settings, copies);
  const w = window.open('', '_blank', 'width=960,height=900,scrollbars=yes');
  if (!w) { alert('Popup diblokir! Izinkan popup lalu coba lagi.'); return; }
  w.document.write(html);
  w.document.close();
}

export function doPrintBusinessCard(side, data, templateId = 'navy-road') {
  const html = buildBusinessCardHTML(data, side, templateId);
  const w = window.open('', '_blank', 'width=960,height=900,scrollbars=yes');
  if (!w) { alert('Popup diblokir! Izinkan popup lalu coba lagi.'); return; }
  w.document.write(html);
  w.document.close();
}

// Single-card preview (1 kartu saja, untuk ditampilkan di iframe pratinjau)
export function buildSingleCardPreviewHTML(data, side, templateId = 'navy-road') {
  const tpl = TEMPLATES[templateId] || TEMPLATES['navy-road'];
  const tplClass = `tpl-${templateId}`;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${CARD_W}mm;height:${CARD_H}mm;overflow:hidden;}
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;}
  .cn-card{width:${CARD_W}mm;height:${CARD_H}mm;position:relative;overflow:hidden;}
  ${tpl.css}
</style></head>
<body>
  <div class="cn-card ${tplClass} cn-${side}">${side === 'front' ? tpl.front(data) : tpl.back(data)}</div>
</body></html>`;
}
