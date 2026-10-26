// src/lib/handoverPdf.js
// Render surat perjanjian & berita acara serah terima (HTML yang sama dengan hasil cetak)
// menjadi PDF A4 langsung di browser — dipakai petugas di halaman link, dan admin di aplikasi.
import { buildHandoverHTML } from './print.js';
import { fileNameSafe } from './utils.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const A4_W = 210, A4_H = 297; // mm

// Satu canvas per lembar (.sheet): lembar 1 = perjanjian, lembar 2 = berita acara
export async function renderHandoverCanvases(invoice, settings) {
  const html = buildHandoverHTML(invoice, settings, { autoPrint: false });
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1200px;border:0;';
  document.body.appendChild(iframe);
  try {
    const d = iframe.contentDocument;
    d.open(); d.write(html); d.close();
    for (let i = 0; i < 40 && d.readyState !== 'complete'; i++) await sleep(50);
    try { await Promise.race([d.fonts.ready, sleep(2500)]); } catch { /* abaikan */ }
    await Promise.all([...d.images].map(im => (im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; }))));

    const { default: html2canvas } = await import('html2canvas');
    const out = [];
    for (const sheet of d.querySelectorAll('.sheet')) {
      out.push(await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794 }));
    }
    return out;
  } finally {
    iframe.remove();
  }
}

export function handoverPdfName(invoice) {
  const no = String(invoice.invoiceNo || '').replace(/[\\/:*?"<>|]/g, '-');
  return `Serah Terima - ${fileNameSafe(invoice.customerName)}${no ? ' - ' + no : ''}.pdf`;
}

// Susun PDF A4. Lembar yang lebih tinggi dari satu halaman dipotong ke halaman berikutnya.
export async function buildHandoverPdf(canvases) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let first = true;
  for (const cv of canvases) {
    const pxPerPage = Math.floor(cv.width * A4_H / A4_W);
    for (let y = 0; y < cv.height; y += pxPerPage) {
      const sliceH = Math.min(pxPerPage, cv.height - y);
      const part = document.createElement('canvas');
      part.width = cv.width; part.height = sliceH;
      const ctx = part.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, part.width, part.height);
      ctx.drawImage(cv, 0, y, cv.width, sliceH, 0, 0, cv.width, sliceH);
      if (!first) pdf.addPage('a4', 'p');
      first = false;
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, (A4_W * sliceH) / cv.width);
    }
  }
  return pdf;
}

// Unduh PDF ke perangkat. Mengembalikan Blob (untuk dibagikan lewat Web Share bila perlu).
export async function downloadHandoverPdf(invoice, settings) {
  const pdf = await buildHandoverPdf(await renderHandoverCanvases(invoice, settings));
  const name = handoverPdfName(invoice);
  pdf.save(name);
  return { blob: pdf.output('blob'), name };
}

// Buat file PDF tanpa mengunduh (untuk Web Share)
export async function makeHandoverPdfFile(invoice, settings) {
  const pdf = await buildHandoverPdf(await renderHandoverCanvases(invoice, settings));
  const name = handoverPdfName(invoice);
  return new File([pdf.output('blob')], name, { type: 'application/pdf' });
}
