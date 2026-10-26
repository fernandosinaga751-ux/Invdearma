// src/lib/rental.js
// Logika murni (tanpa Firebase/React) untuk fitur rental: hitung sewa, bentrok jadwal,
// pembayaran bertahap, pengingat dokumen, dan ekspor CSV.
import { fmt, formatDateID } from './utils.js';

// ─── Perhitungan sewa ───────────────────────────────────────────
// Sewa dihitung per 24 jam (minimal 1 hari). Kelebihan jam di atas toleransi
// dihitung overtime per jam, tetapi tidak melebihi tarif 1 hari.
export function calcRental({ pickupAt, returnAt, rate = 0, overtimeRate = 0, graceHours = 1 }) {
  const a = new Date(pickupAt), b = new Date(returnAt);
  if (!pickupAt || !returnAt || isNaN(a) || isNaN(b) || b <= a) {
    return { valid: false, days: 0, overtimeHours: 0, overtimeCharge: 0, otRate: 0 };
  }
  const hours = (b - a) / 36e5;
  let days = Math.floor(hours / 24);
  let overtimeHours = 0;
  if (days < 1) days = 1;
  else {
    const rem = hours - days * 24;
    if (rem > Number(graceHours || 0)) overtimeHours = Math.ceil(rem);
  }
  const r = Number(rate) || 0;
  const otRate = Number(overtimeRate) > 0 ? Number(overtimeRate) : Math.round(r * 0.1);
  const overtimeCharge = Math.min(overtimeHours * otRate, r);
  return { valid: true, days, overtimeHours, overtimeCharge, otRate };
}

// Rincian item invoice otomatis dari data sewa
export function rentalItems(rental, calc) {
  if (!rental?.vehicleId || !calc?.valid) return [];
  const items = [{
    description: `Sewa ${rental.vehicleName}${rental.plate ? ` (${rental.plate})` : ''} ${calc.days} hari${rental.withDriver ? ' + sopir' : ''}`,
    qty: calc.days, price: Number(rental.rate) || 0, auto: true,
  }];
  if (calc.overtimeHours > 0 && calc.overtimeCharge > 0) {
    items.push({ description: `Overtime ${calc.overtimeHours} jam`, qty: 1, price: calc.overtimeCharge, auto: true });
  }
  return items;
}

export const EXTRA_PRESETS = ['Sopir', 'BBM', 'Luar kota', 'Antar-jemput', 'Tol', 'Parkir', 'Denda BBM', 'Denda kerusakan'];

// ─── Jadwal & bentrok ───────────────────────────────────────────
export function overlaps(aS, aE, bS, bE) {
  const a1 = new Date(aS), a2 = new Date(aE), b1 = new Date(bS), b2 = new Date(bE);
  if ([a1, a2, b1, b2].some(isNaN)) return false;
  return a1 < b2 && b1 < a2;
}

// Gabungan jadwal dari invoice (yang punya data sewa) dan booking yang belum jadi invoice
export function rentalEntries(invoices = [], bookings = []) {
  const out = [];
  invoices.forEach(i => {
    const r = i.rental;
    if (r?.vehicleId && r.pickupAt && r.returnAt) {
      out.push({
        key: 'inv-' + i.id, kind: 'invoice', id: i.id, invoiceId: i.id, vehicleId: r.vehicleId,
        start: r.pickupAt, end: r.returnAt, label: i.customerName, no: i.invoiceNo,
        paid: !!i.paidDate, status: i.paidDate ? 'lunas' : 'berjalan',
      });
    }
  });
  const invIds = new Set(invoices.map(i => i.id));
  bookings.forEach(b => {
    if (b.status === 'batal') return;
    if (b.invoiceId && invIds.has(b.invoiceId)) return; // sudah diwakili invoice-nya
    if (!b.vehicleId || !b.pickupAt || !b.returnAt) return;
    out.push({
      key: 'bk-' + b.id, kind: 'booking', id: b.id, vehicleId: b.vehicleId,
      start: b.pickupAt, end: b.returnAt, label: b.customerName, status: b.status || 'booking', phone: b.phone,
    });
  });
  return out;
}

export function findConflicts({ vehicleId, pickupAt, returnAt, invoices, bookings, ignoreInvoiceId, ignoreBookingId }) {
  if (!vehicleId || !pickupAt || !returnAt) return [];
  return rentalEntries(invoices, bookings).filter(e =>
    e.vehicleId === vehicleId &&
    !(e.kind === 'invoice' && e.id === ignoreInvoiceId) &&
    !(e.kind === 'booking' && e.id === ignoreBookingId) &&
    overlaps(pickupAt, returnAt, e.start, e.end)
  );
}

export const fmtDT = s => {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d)) return '-';
  const pad = n => String(n).padStart(2, '0');
  return `${formatDateID(s.slice(0, 10))} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Pembayaran bertahap ────────────────────────────────────────
export const sumPayments = inv => (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

// Total yang sudah diterima. Panjar lama (field `panjar`) dihitung sebagai pembayaran pertama.
export function paidTotal(inv) {
  if (inv.payments?.length) return Math.min(inv.total || 0, (inv.panjar || 0) + sumPayments(inv));
  return inv.paidDate ? (inv.total || 0) : (inv.panjar || 0);
}
export const outstanding = inv => Math.max(0, (inv.total || 0) - paidTotal(inv));

export const sortedPayments = inv =>
  [...(inv.payments || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));

// Susun "invoice" khusus untuk mencetak kwitansi satu pembayaran
export function paymentKwitansiInvoice(inv, payment) {
  const list = sortedPayments(inv);
  const idx = Math.max(0, list.findIndex(p => p.id === payment.id));
  const prior = (inv.panjar || 0) + list.slice(0, idx).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const after = prior + (Number(payment.amount) || 0);
  const remaining = Math.max(0, (inv.total || 0) - after);
  const final = remaining <= 0;
  const note = `Pembayaran ke-${idx + 1}${payment.method ? ` (${payment.method})` : ''}${payment.note ? ` — ${payment.note}` : ''}. ` +
    `Total invoice Rp ${fmt(inv.total)}, sudah dibayar Rp ${fmt(after)}, sisa Rp ${fmt(remaining)}.`;
  return {
    ...inv,
    paidDate: payment.date,
    panjar: 0,
    kwNominal: Number(payment.amount) || 0,
    kwMark: final ? 'LUNAS' : 'DITERIMA',
    kwBadge: final ? 'LUNAS — Bukti Pembayaran Sah' : `Pembayaran Sebagian — Sisa Rp ${fmt(remaining)}`,
    kwNote: note,
  };
}

// ─── Pengingat dokumen kendaraan ────────────────────────────────
const DOC_FIELDS = [
  ['stnkExpiry', 'STNK'], ['taxExpiry', 'Pajak tahunan'], ['kirExpiry', 'KIR'], ['serviceNextDate', 'Servis berkala'],
];
export function docReminders(vehicles = [], today = new Date(), withinDays = 30) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const out = [];
  vehicles.forEach(v => {
    if (v.status === 'nonaktif') return;
    DOC_FIELDS.forEach(([f, label]) => {
      if (!v[f]) return;
      const d = new Date(v[f] + 'T00:00:00');
      if (isNaN(d)) return;
      const days = Math.round((d - t0) / 864e5);
      if (days <= withinDays) out.push({ vehicleId: v.id, name: v.name, plate: v.plate, label, date: v[f], days, level: days < 0 ? 'expired' : 'soon' });
    });
    const km = Number(v.odometer) || 0, nextKm = Number(v.serviceNextKm) || 0;
    if (nextKm > 0 && km > 0 && km >= nextKm - 500) {
      out.push({ vehicleId: v.id, name: v.name, plate: v.plate, label: `Servis KM (${fmt(nextKm)})`, date: '', days: km >= nextKm ? -1 : 0, level: km >= nextKm ? 'expired' : 'soon', km });
    }
  });
  return out.sort((a, b) => a.days - b.days);
}

// ─── Ekspor CSV (dibuka Excel) ──────────────────────────────────
export function toCSV(headers, rows) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // "sep=;" supaya Excel (lokal apa pun) memisahkan kolom dengan benar
  return '\ufeffsep=;\r\n' + [headers, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
}

export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Ganti {placeholder} pada template pesan
export const fillTemplate = (tpl, data) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : ''));

export const DEFAULT_WA_RETURN =
  'Halo {nama}, kami dari {perusahaan}. Mengingatkan bahwa mobil {mobil} ({plat}) dijadwalkan kembali pada {tgl_kembali}. ' +
  'Mohon dapat dikembalikan tepat waktu. Terima kasih 🙏';
export const DEFAULT_WA_BOOKING =
  'Halo {nama}, booking {mobil} ({plat}) atas nama Anda sudah kami catat untuk tanggal {tgl_ambil} s.d. {tgl_kembali}. ' +
  'Terima kasih telah memilih {perusahaan} 🙏';
export const DEFAULT_WA_BILL =
  'Halo {nama}, kami dari {perusahaan}. Mengingatkan tagihan invoice {no_invoice} sebesar Rp {sisa} ' +
  'yang belum kami terima{jatuh_tempo}. Mohon konfirmasinya. Terima kasih 🙏';

export const DEFAULT_WA_HANDOVER =
  'Halo {nama_petugas}, kami dari {perusahaan}. Mohon bantu serah terima mobil {mobil} ({plat}) ' +
  'untuk penyewa {penyewa} (invoice {no_invoice}), jadwal {tgl_ambil} s.d. {tgl_kembali}.\n\n' +
  'Silakan catat kondisi mobil & minta tanda tangan penyewa lewat link berikut:\n{link}\n\n' +
  'Setelah selesai, unduh PDF perjanjian dari link tersebut dan berikan kepada penyewa. Terima kasih 🙏';

// Susun pesan WA untuk petugas serah terima. Link selalu ikut walau template tidak memuat {link}.
export function buildHandoverWaText(invoice, settings = {}, link = '') {
  const r = invoice.rental || {}, h = invoice.handover || {};
  const staff = invoice.handoverStaff?.name || '';
  const data = {
    nama: staff, nama_petugas: staff,
    perusahaan: settings.companyName || 'Dearma Rental Mobil Medan',
    penyewa: invoice.customerName || '-', hp_penyewa: invoice.customerPhone || '-',
    mobil: r.vehicleName || h.vehicleName || '-', plat: r.plate || h.plate || '-',
    tgl_ambil: r.pickupAt ? fmtDT(r.pickupAt) : '-', tgl_kembali: r.returnAt ? fmtDT(r.returnAt) : '-',
    no_invoice: invoice.invoiceNo || '-', link,
  };
  let t = fillTemplate(settings.waHandover || DEFAULT_WA_HANDOVER, data);
  if (link && !t.includes(link)) t += `\n\n${link}`;
  return t;
}

export const DEFAULT_TERMS = [
  'Penyewa wajib menggunakan kendaraan sesuai peruntukannya dan tidak untuk kegiatan melanggar hukum.',
  'Penyewa bertanggung jawab penuh atas kendaraan selama masa sewa, termasuk kehilangan, kerusakan, dan pelanggaran lalu lintas.',
  'Kendaraan dilarang disewakan kembali, dipindahtangankan, atau dijadikan jaminan kepada pihak lain.',
  'Bahan bakar dikembalikan pada level yang sama dengan saat serah terima; selisihnya menjadi tanggungan penyewa.',
  'Keterlambatan pengembalian melebihi toleransi dikenakan biaya overtime sesuai tarif yang berlaku.',
  'Kerusakan yang timbul selama masa sewa diperbaiki atas biaya penyewa, kecuali ditentukan lain secara tertulis.',
  'Dalam hal terjadi kecelakaan atau gangguan kendaraan, penyewa wajib segera menghubungi pihak rental.',
  'Deposit / jaminan dikembalikan setelah kendaraan diterima kembali dalam kondisi sesuai berita acara.',
];
export const HANDOVER_CHECKS = [
  'Body / cat', 'Kaca & spion', 'Ban & velg', 'Ban serep & dongkrak', 'Lampu & sein', 'Interior & jok',
  'AC & audio', 'STNK & kelengkapan', 'Kunci & remote',
];
export const FUEL_LEVELS = ['Kosong', '1/4', '1/2', '3/4', 'Penuh'];
