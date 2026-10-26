// src/lib/kwitansiPdf.js
// Render kwitansi (HTML yang sama dengan hasil cetak) menjadi gambar & PDF
// langsung di browser — dipakai di halaman link customer.
import { buildKwitansiHTML } from './print.js';
import { fileNameSafe } from './utils.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function renderKwitansiCanvas(invoice, settings) {
  const html = buildKwitansiHTML(invoice, settings, { autoPrint: false });
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

    const page = d.querySelector('.page');
    const { default: html2canvas } = await import('html2canvas');
    return await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794 });
  } finally {
    iframe.remove();
  }
}

export async function downloadKwitansiPdf(canvas, invoice, suffix = '') {
  const { jsPDF } = await import('jspdf');
  const w = 210;                                  // lebar kertas (mm)
  const h = (w * canvas.height) / canvas.width;   // tinggi mengikuti isi (A5 landscape / A4 portrait)
  const pdf = new jsPDF({ orientation: h > w ? 'p' : 'l', unit: 'mm', format: [w, h] });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h);
  const name = `Kwitansi - ${fileNameSafe(invoice.customerName)} - ${String(invoice.invoiceNo || '').replace(/[\\/:*?"<>|]/g, '-')}${suffix ? ' - ' + suffix : ''}`;
  pdf.save(`${name}.pdf`);
}
