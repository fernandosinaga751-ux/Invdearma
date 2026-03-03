// src/lib/utils.js

export const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
export const todayStr = () => new Date().toISOString().split('T')[0];

export const formatDateID = d => {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`;
};

export function genInvNo(invoices, dateStr) {
  const same = invoices.filter(i => i.date === dateStr);
  const n = same.length + 1;
  const d = new Date(dateStr + 'T00:00:00');
  return `No.${String(n).padStart(2, '0')}/${ROMAN[d.getMonth()]}/DRM/${d.getFullYear()}`;
}

export async function toB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export const DEF_SETTINGS = {
  companyName: 'Dearma Rental Mobil Medan',
  ownerName: '',
  phone: '',
  email: '',
  address: 'Medan, Sumatera Utara',
  bankAccount: '',
  bankName: '',
  logo: null,
  signature: null,
  stamp: null,
};

// ─── Terbilang (angka → kata dalam Bahasa Indonesia) ─────────────────────────
const SATUAN = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
  'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas','enam belas',
  'tujuh belas','delapan belas','sembilan belas'];
const PULUHAN = ['','','dua puluh','tiga puluh','empat puluh','lima puluh',
  'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'];

function terbilangRatusan(n) {
  if (n < 20) return SATUAN[n];
  if (n < 100) return PULUHAN[Math.floor(n/10)] + (n%10 ? ' ' + SATUAN[n%10] : '');
  if (n < 200) return 'seratus' + (n%100 ? ' ' + terbilangRatusan(n%100) : '');
  return SATUAN[Math.floor(n/100)] + ' ratus' + (n%100 ? ' ' + terbilangRatusan(n%100) : '');
}

export function terbilang(n) {
  n = Math.round(n);
  if (n === 0) return 'nol rupiah';
  if (n < 0) return 'minus ' + terbilang(-n);

  const parts = [];
  if (n >= 1_000_000_000) {
    const m = Math.floor(n / 1_000_000_000);
    parts.push((m === 1 ? 'satu' : terbilangRatusan(m)) + ' miliar');
    n %= 1_000_000_000;
  }
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000);
    parts.push((m === 1 ? 'satu' : terbilangRatusan(m)) + ' juta');
    n %= 1_000_000;
  }
  if (n >= 1_000) {
    const m = Math.floor(n / 1_000);
    parts.push((m === 1 ? 'seribu' : terbilangRatusan(m) + ' ribu'));
    n %= 1_000;
  }
  if (n > 0) parts.push(terbilangRatusan(n));

  // Capitalize first letter
  const str = parts.join(' ') + ' rupiah';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
