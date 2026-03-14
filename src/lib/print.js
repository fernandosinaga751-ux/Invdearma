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
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
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
  body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:12px;}
  .page{width:210mm;min-height:148mm;margin:0 auto;padding:12mm 16mm;position:relative;overflow:hidden;}
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
  .header{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:3px solid #0f2544;margin-bottom:14px;}
  .logo-box{width:64px;height:64px;flex-shrink:0;}
  .logo-box img{width:100%;height:100%;object-fit:contain;}
  .logo-ph{width:64px;height:64px;background:linear-gradient(135deg,#0f2544,#1e4080);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#d4a017;font-weight:900;font-size:18px;font-family:'Playfair Display',serif;}
  .co-name{font-family:'Playfair Display',serif;font-size:18px;color:#0f2544;font-weight:900;}
  .co-sub{color:#666;font-size:10px;margin-top:3px;line-height:1.6;}
  .kw-title{margin-left:auto;text-align:right;}
  .kw-title .t{font-family:'Playfair Display',serif;font-size:28px;color:#059669;font-weight:900;letter-spacing:3px;border-bottom:3px solid #059669;padding-bottom:2px;display:inline-block;}
  .kw-title .no{font-size:10px;color:#777;margin-top:4px;font-family:monospace;}
  /* Body kwitansi */
  .kwbody{border:2px solid #0f2544;border-radius:12px;overflow:hidden;margin-bottom:14px;}
  .kw-row{display:grid;grid-template-columns:140px 16px 1fr;align-items:start;padding:9px 14px;border-bottom:1px solid #e5e7f0;}
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
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} @page{margin:0;size:A5 landscape;}}
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
