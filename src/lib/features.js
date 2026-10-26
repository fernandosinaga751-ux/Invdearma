// src/lib/features.js
// Daftar fitur tambahan + aturan akses.
//  - Admin Utama ('master')  → semua fitur terbuka.
//  - Akun biasa ('account')  → fitur terkunci sampai admin menyetujui pengajuan.
// Izin akun disimpan di accounts/{uid}.features (hanya admin yang bisa mengubah).

export const FEATURES = [
  {
    id: 'fleet', emoji: '🚗', page: 'fleet', requires: [],
    name: 'Armada, Sopir & Pengingat Dokumen',
    short: 'Kelola daftar mobil, sopir, tarif per hari, dan pengingat pajak/STNK/KIR/servis.',
    points: [
      'Data mobil: nama, plat, tahun, tarif per hari, tarif overtime per jam, status (tersedia/bengkel/nonaktif)',
      'Pengingat otomatis: STNK, pajak tahunan, KIR, servis berkala (tanggal & KM)',
      'Data sopir beserta masa berlaku SIM',
      'Status "sedang disewa" terlihat otomatis dari booking & invoice',
    ],
  },
  {
    id: 'booking', emoji: '📅', page: 'bookings', requires: ['fleet'],
    name: 'Booking, Kalender & Sewa Otomatis',
    short: 'Kalender ketersediaan per mobil, deteksi bentrok jadwal, dan hitung sewa otomatis di invoice.',
    points: [
      'Kalender bulanan per mobil dengan warna status (booking / belum lunas / lunas)',
      'Peringatan otomatis bila jadwal mobil bentrok atau mobil sedang di bengkel',
      'Di invoice: pilih mobil + tanggal ambil & kembali → jumlah hari & total dihitung otomatis',
      'Overtime per jam, tambahan cepat (sopir, BBM, luar kota, antar-jemput, tol, parkir)',
      'Konversi booking menjadi invoice, dan kirim pengingat pengembalian lewat WhatsApp',
    ],
  },
  {
    id: 'payments', emoji: '💳', page: null, requires: [],
    name: 'Pembayaran Bertahap, Deposit, QRIS & Materai',
    short: 'Catat DP, cicilan, dan pelunasan; kwitansi per pembayaran; deposit/jaminan.',
    points: [
      'Riwayat pembayaran per invoice (tanggal, jumlah, metode) dengan sisa tagihan otomatis',
      'Kwitansi terpisah untuk setiap pembayaran — customer bisa mengunduhnya dari link',
      'Catatan deposit / jaminan (uang atau barang: KTP, SIM, motor) dan status pengembaliannya',
      'Gambar QRIS di invoice dan ruang materai di kwitansi',
    ],
  },
  {
    id: 'handover', emoji: '📝', page: null, requires: [],
    name: 'Perjanjian Sewa & Serah Terima Mobil',
    short: 'Surat perjanjian sewa dan berita acara serah terima dengan tanda tangan di layar.',
    points: [
      'Checklist kondisi mobil saat diambil & dikembalikan, KM awal/akhir, level BBM',
      'Tanda tangan customer dan petugas langsung di layar',
      'Isi nama & HP petugas di invoice → link serah terima otomatis dibuat; petugas mencatat kondisi mobil & minta TTD penyewa tanpa login',
      'Link + pesan WhatsApp (template bisa diubah) dikirim ke petugas, yang bisa mengunduh PDF perjanjian untuk diberikan ke penyewa',
      'Denda BBM / kerusakan bisa langsung ditambahkan ke invoice',
      'Cetak / simpan PDF surat perjanjian lengkap dengan pasal-pasal yang bisa Anda ubah',
    ],
  },
  {
    id: 'expenses', emoji: '🧰', page: 'expenses', requires: [],
    name: 'Pengeluaran & Laba per Mobil',
    short: 'Catat biaya servis, BBM, cuci, pajak, dan lihat laba bersih tiap mobil.',
    points: [
      'Catat pengeluaran per kategori dan per mobil',
      'Ringkasan pendapatan − pengeluaran = laba per mobil dan per bulan',
    ],
  },
  {
    id: 'reports', emoji: '📊', page: 'reports', requires: [],
    name: 'Laporan & Piutang',
    short: 'Pendapatan bulanan, per mobil, per customer, dan daftar piutang dengan umur tunggakan.',
    points: [
      'Grafik pendapatan 12 bulan, tagihan vs uang yang sudah diterima',
      'Daftar piutang (belum bayar / lewat jatuh tempo) dengan tombol tagih via WhatsApp',
      'Ekspor ke Excel (CSV)',
    ],
  },
  {
    id: 'crm', emoji: '🪪', page: null, requires: [],
    name: 'Data Customer Lengkap',
    short: 'Foto KTP & SIM, NIK, riwayat sewa, dan tanda customer bermasalah.',
    points: [
      'Simpan NIK serta foto KTP dan SIM customer',
      'Riwayat sewa dan total transaksi per customer',
      'Tandai customer bermasalah — muncul peringatan saat membuat invoice',
    ],
  },
  {
    id: 'backup', emoji: '💾', page: 'backup', requires: [],
    name: 'Backup & Ekspor Data',
    short: 'Unduh seluruh data (JSON) dan ekspor invoice / customer ke Excel (CSV).',
    points: [
      'Backup lengkap: pengaturan, customer, invoice, armada, booking, pengeluaran',
      'Ekspor invoice dan customer ke Excel (CSV)',
    ],
  },
];

export const featureById   = id => FEATURES.find(f => f.id === id);
export const featureByPage = p  => FEATURES.find(f => f.page === p);

// Tambahkan fitur prasyarat (mis. booking butuh fleet)
export function withRequires(ids = []) {
  const out = new Set();
  const add = id => {
    const f = featureById(id);
    if (!f || out.has(id)) return;
    out.add(id);
    (f.requires || []).forEach(add);
  };
  ids.forEach(add);
  return [...out];
}

// Apakah sesi ini boleh memakai fitur?
export function canUse(sessionKind, features, id) {
  if (sessionKind === 'master') return true;
  const f = featureById(id);
  if (!f) return false;
  const list = features || [];
  return list.includes(id) && (f.requires || []).every(r => list.includes(r));
}
