# 🚗 Dearma Rental Mobil Medan — Sistem Invoice & Kwitansi

Aplikasi web invoice dan kwitansi berbasis React + Firebase untuk Dearma Rental Mobil Medan.

---

## ✨ Fitur

- 🔐 **1 sistem login untuk semua** — Firebase Authentication asli (email & password), aman & tidak bisa dibobol lewat Firestore
- 👑 **Login Utama otomatis** — akun dengan email admin (`VITE_ADMIN_EMAIL`) otomatis memakai database lama, akun lain memakai database sendiri
- ✅ **Approval admin** — akun baru yang daftar wajib disetujui admin dulu sebelum bisa login
- 🏢 **Multi-tenant** — setiap akun yang disetujui punya databasenya sendiri, data antar akun terpisah total
- 🗂️ **Daftar Akun** (khusus admin) — setujui, nonaktifkan sementara, atau hapus akun yang mendaftar
- 📱 **Responsive** — nyaman dipakai di HP maupun desktop
- 👥 **Manajemen Customer** — simpan, edit, hapus data customer
- 🧾 **Invoice Otomatis** — format `No.01/III/DRM/2025`, increment per hari
- 📄 **Kwitansi** — dari invoice yang sama, langsung cetak PDF
- 💰 **PPN Fleksibel** — Tanpa PPN / 5% / 10% / 11% / 12%
- 🖨️ **Cetak PDF** via browser print dialog
- ⚙️ **Pengaturan** — upload logo, tanda tangan, cap/stempel, info rekening (per akun)
- ☁️ **Firebase Firestore** — semua data tersimpan online secara realtime

---

## 🔧 Setup (Langkah demi Langkah)

### 1. Clone / Download Proyek

```bash
git clone https://github.com/username/dearma-invoice.git
cd dearma-invoice
npm install
```

---

### 2. Buat Project Firebase

1. Buka **[Firebase Console](https://console.firebase.google.com/)**
2. Klik **"Add project"** → Beri nama (misal: `dearma-invoice`)
3. Nonaktifkan Google Analytics jika tidak perlu → **Create project**

#### Aktifkan Firestore Database

1. Di sidebar Firebase, klik **Build → Firestore Database**
2. Klik **Create database**
3. Pilih **"Start in production mode"**
4. Pilih lokasi server → **`asia-southeast1` (Singapura)** (terdekat dari Indonesia)
5. Klik **Done**

#### Aktifkan Firebase Authentication

1. Di sidebar Firebase, klik **Build → Authentication**
2. Klik **Get started**
3. Pada tab **Sign-in method**, pilih **Email/Password** → aktifkan (Enable) → **Save**

Aplikasi ini memakai **satu sistem login** untuk semua orang, semuanya lewat
Firebase Authentication (email & password asli, di-hash & dikelola oleh
Google — jauh lebih aman dibanding password polos yang tersimpan sebagai
teks di Firestore). Bedanya cuma satu email khusus:

- **Admin / Login Utama** — akun dengan email **persis sama** dengan
  `VITE_ADMIN_EMAIL` di `.env` otomatis dikenali sebagai admin. Sesi ini
  memakai **database lama** (`config/`, `customers/`, `invoices/` di level
  atas) — data yang sudah ada sebelumnya **tidak hilang / tidak dipindah**.
  Dashboard admin punya menu tambahan **"Daftar Akun"** untuk menyetujui,
  menonaktifkan sementara, atau menghapus akun lain.
- **Akun biasa** — siapa saja yang daftar lewat tab **"Daftar Akun"**.
  Datanya disimpan terpisah di `users/{uid}/...`. Akun baru **berstatus
  "Menunggu Persetujuan"** dan tidak bisa login sampai admin klik
  **Setujui** di menu Daftar Akun. Akun biasa tidak melihat menu ini.

**Membuat akun admin pertama kali:** cukup daftar seperti biasa lewat tab
"Daftar Akun" menggunakan email yang sama dengan `VITE_ADMIN_EMAIL` — akun
ini otomatis langsung aktif tanpa perlu approval (karena dialah adminnya).

#### Atur Firestore Rules

Di tab **Rules**, ganti isi dengan (ganti `admin@email-anda.com` dengan
email admin Anda yang sebenarnya, **huruf kecil semua**, harus SAMA PERSIS
dengan `VITE_ADMIN_EMAIL` di `.env`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email != null
        && request.auth.token.email.lower() == 'admin@email-anda.com';
    }

    // ── Database lama / Login Utama (config, customers, invoices) ──
    // Hanya bisa diakses oleh akun dengan email admin di atas.
    match /config/{doc} {
      allow read, write: if isAdmin();
    }
    match /customers/{doc} {
      allow read, write: if isAdmin();
    }
    match /invoices/{doc} {
      allow read, write: if isAdmin();
    }

    // ── Direktori akun terdaftar ──
    // Pemilik akun boleh baca statusnya sendiri (utk cek pending/disabled),
    // admin boleh baca semua. Hanya pemilik yang boleh membuat dokumennya
    // sendiri saat daftar. Approve/nonaktifkan/hapus hanya lewat admin.
    match /accounts/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update, delete: if isAdmin();
    }

    // ── Data per akun terdaftar sendiri ──
    // Pemilik akun ATAU admin boleh membaca/menulis (admin butuh akses ini
    // supaya bisa menghapus data saat menghapus akun dari menu Daftar Akun).
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());
    }
  }
}
```

Klik **Publish**.

> ✅ Rules di atas memverifikasi identitas admin lewat token Firebase Auth
> yang ditandatangani server Google — **tidak bisa dipalsukan dari sisi
> client**, jauh lebih aman dibanding password polos yang sebelumnya
> tersimpan sebagai teks biasa di Firestore.

#### Dapatkan Firebase Config

1. Di Firebase Console, klik ikon ⚙️ (Project settings)
2. Scroll ke **"Your apps"** → Klik ikon **`</>`** (Web)
3. Beri nama app (misal: `dearma-web`) → Klik **Register app**
4. Salin konfigurasi `firebaseConfig` yang ditampilkan

---

### 3. Buat File `.env`

Copy file contoh:
```bash
cp .env.example .env
```

Isi `.env` dengan nilai dari Firebase:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dearma-invoice.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dearma-invoice
VITE_FIREBASE_STORAGE_BUCKET=dearma-invoice.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Email admin (Login Utama) — HARUS sama persis (huruf kecil semua)
# dengan email yang dipakai di Firestore Rules
VITE_ADMIN_EMAIL=admin@email-anda.com
```

> 🚫 Jangan pernah upload file `.env` ke GitHub! Sudah ada di `.gitignore`.

---

### 4. Jalankan Lokal

```bash
npm run dev
```

Buka browser ke `http://localhost:5173`

**Login Utama / Admin (data lama):**
- Klik tab **"Daftar Akun"**, daftar memakai email yang sama persis dengan
  `VITE_ADMIN_EMAIL` di `.env` → akun ini otomatis langsung aktif sebagai admin
- Setelah itu login lewat tab **"Masuk"** seperti biasa
- Dashboard admin punya menu tambahan **"Daftar Akun"** untuk menyetujui,
  menonaktifkan sementara, atau menghapus akun-akun lain
- Password bisa diubah di menu **Pengaturan → Ubah Password Login Utama**

**Akun biasa (data terpisah per akun):**
- Klik tab **"Daftar Akun"**, isi nama usaha, email (bukan email admin), dan
  password (minimal 6 karakter)
- Setelah daftar, akun berstatus **"Menunggu Persetujuan"** — belum bisa login
- Admin harus klik **Setujui** dulu di menu Daftar Akun
- Setelah disetujui, login lewat tab **"Masuk"**
- Setiap akun yang disetujui punya data invoice, customer, dan pengaturan
  masing-masing yang terpisah, dan **tidak** melihat menu "Daftar Akun"

---

## 🚀 Deploy ke Vercel

### Cara 1: Via GitHub (Rekomendasi)

1. **Push ke GitHub:**
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/dearma-invoice.git
git push -u origin main
```

2. **Import di Vercel:**
   - Buka [vercel.com](https://vercel.com) → Login → **New Project**
   - Import repository GitHub kamu
   - Vercel otomatis mendeteksi Vite

3. **Tambahkan Environment Variables di Vercel:**
   - Di halaman project Vercel → **Settings → Environment Variables**
   - Tambahkan satu per satu variabel yang sama dengan isi file `.env`

4. Klik **Deploy** → Tunggu beberapa menit → ✅ Live!

### Cara 2: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Saat ditanya Environment Variables, masukkan nilai Firebase.

---

## 📁 Struktur Project

```
dearma-invoice/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx     # Navigasi sidebar
│   │   └── UI.jsx          # Komponen reusable (Button, Input, Card, dll)
│   ├── lib/
│   │   ├── firebase.js     # Konfigurasi Firebase Auth & Firestore (per akun)
│   │   ├── print.js        # Engine cetak invoice/kwitansi ke PDF
│   │   └── utils.js        # Utilitas (format angka, tanggal, dll)
│   ├── pages/
│   │   ├── Dashboard.jsx   # Halaman utama / ringkasan
│   │   ├── Login.jsx       # Halaman Login & Daftar Akun Baru
│   │   ├── Customers.jsx   # Manajemen customer
│   │   ├── Invoices.jsx    # Daftar & detail invoice
│   │   ├── NewInvoice.jsx  # Buat / edit invoice
│   │   └── Settings.jsx    # Pengaturan perusahaan & password akun
│   ├── App.jsx             # Root component
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind CSS
├── .env                    # (lokal saja, jangan diupload!)
├── .env.example            # Template environment variables
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json             # Konfigurasi routing Vercel
```

---

## 🗃️ Struktur Database Firestore (Admin + Multi-akun)

```
firestore/
├── config/
│   └── settings              # Pengaturan Login Utama / Admin (data lama, TIDAK berubah)
├── customers/
│   └── {customerId}          # Data customer milik Admin (data lama)
├── invoices/
│   └── {invoiceId}           # Data invoice milik Admin (data lama)
│
├── accounts/
│   └── {uid}                 # Direktori akun yang mendaftar sendiri:
│                              #   { uid, email, displayName, status, createdAt }
│                              #   status: 'pending' | 'active' | 'disabled'
│                              # Dipakai halaman "Daftar Akun" di dashboard Admin
│
└── users/
    └── {uid}/                  # ID unik tiap akun (dari Firebase Auth)
        ├── config/
        │   └── settings        # Pengaturan perusahaan — khusus akun ini
        ├── customers/
        │   └── {customerId}    # Data customer — khusus akun ini
        └── invoices/
            └── {invoiceId}     # Data invoice — khusus akun ini
```

Akun admin (email = `VITE_ADMIN_EMAIL`) selalu memakai `config/`,
`customers/`, `invoices/` di level atas (data lama, tidak pernah
dipindah/hilang). Setiap akun biasa yang disetujui admin punya salinan
struktur yang sama tapi di bawah `users/{uid}/...`, terisolasi dari akun
lain maupun dari data admin.

**Alur approval:** saat daftar, dokumen `accounts/{uid}` dibuat dengan
`status: 'pending'`. Akun ini akan otomatis di-sign-out & ditolak login
sampai admin mengubah statusnya jadi `'active'` lewat tombol **Setujui**
di menu Daftar Akun.

**Batasan menghapus akun:** tombol "Hapus" di menu Daftar Akun menghapus
seluruh data Firestore akun tsb dan mengunci (`status: 'disabled'`) supaya
tidak bisa login lagi. Menghapus kredensial login-nya secara permanen dari
Firebase Authentication memerlukan Firebase Admin SDK di server (Cloud
Function) karena aplikasi client tidak diizinkan menghapus akun pengguna
lain demi keamanan — bisa ditambahkan sebagai pengembangan lanjutan bila
diperlukan.

---

## 📋 Format Nomor Invoice

```
No.{urutan}/{bulan_romawi}/DRM/{tahun}
```

Contoh: `No.03/VII/DRM/2025`
- `03` → Invoice ke-3 pada hari tersebut
- `VII` → Bulan Juli
- `DRM` → Kode perusahaan (tetap)
- `2025` → Tahun

---

## ❓ FAQ

**Q: Logo tidak muncul di cetak PDF?**  
A: Pastikan browser mengizinkan popup. Izinkan popup untuk domain Vercel kamu.

**Q: Data tidak tersimpan / error permission-denied?**  
A: Cek console browser. Pastikan Authentication → Sign-in method → Email/Password sudah **Enable**, dan Firestore Rules sudah sesuai contoh di atas — terutama pastikan `VITE_ADMIN_EMAIL` di `.env` **sama persis (huruf kecil semua)** dengan email di dalam fungsi `isAdmin()` pada Firestore Rules.

**Q: Bagaimana cara reset password jika lupa?**  
A: Buka Firebase Console → Authentication → tab **Users** → cari akun berdasarkan email → klik menu titik tiga → **Reset password** (Firebase akan mengirim email reset).

**Q: Bisakah satu akun melihat data akun lain?**  
A: Tidak. Firestore Rules membatasi setiap akun hanya bisa membaca/menulis data di path `users/{uid}/...` miliknya sendiri. Hanya akun admin yang bisa mengakses semua data (untuk keperluan kelola akun).

**Q: Akun baru daftar tapi tidak bisa langsung login?**  
A: Ini disengaja — setiap akun baru (selain email admin) berstatus "Menunggu Persetujuan" dan wajib disetujui admin dulu di menu **Daftar Akun** sebelum bisa login.

**Q: Tombol "Hapus" di Daftar Akun tidak berfungsi / error permission?**  
A: Pastikan Rules sudah diperbarui ke versi terbaru (dengan `isAdmin()`) dan Anda login memakai email yang sama persis dengan `VITE_ADMIN_EMAIL`. Rules versi lama (password-based) tidak mengizinkan admin menghapus data `users/{uid}/...` milik akun lain.

**Q: Akun yang sudah dihapus di panel masih bisa login lagi?**  
A: Ini bug yang sudah diperbaiki — versi lama sempat menghapus dokumen direktori akun (`accounts/{uid}`) sepenuhnya saat "Hapus", padahal itu menyebabkan sistem menganggap akun tanpa dokumen = otomatis aktif kembali. Sekarang dokumen itu **tidak dihapus**, cuma ditandai `status: 'disabled'` secara permanen — pastikan Anda memakai versi kode terbaru.

**Q: Sudah hapus akun manual di Firebase Console (Authentication), tapi masih muncul di halaman Daftar Akun?**  
A: Wajar — Firestore (tempat data "Daftar Akun" disimpan) dan Firebase Authentication itu dua sistem terpisah, menghapus salah satunya tidak otomatis menghapus yang lain kecuali dihubungkan lewat Cloud Function. Ada 2 opsi:
1. **Cepat:** klik tombol **"🧹 Bersihkan dari Daftar"** di baris akun tsb — ini langsung menghapus entrinya dari Firestore tanpa menyentuh Firebase Auth (aman dipakai justru karena Auth-nya memang sudah tidak ada).
2. **Otomatis selamanya:** deploy Cloud Function `onAuthUserDeleted` (lihat bagian di bawah) — setelah itu, setiap kali akun dihapus di Firebase Console, Firestore-nya (termasuk halaman Daftar Akun) otomatis ikut bersih tanpa perlu klik apapun.

## ☁️ Cloud Functions: Sinkronisasi Firebase Auth ↔ Firestore (Opsional)

Tombol "Hapus" di menu Daftar Akun **selalu** menghapus data (customer,
invoice, settings) dan mengunci akun agar tidak bisa login — ini jalan
tanpa perlu setup tambahan apapun.

Tapi ada 2 hal yang butuh Cloud Function kalau mau full-otomatis (folder
`functions/` di repo ini sudah menyiapkan keduanya):

| Fungsi | Kapan jalan | Yang dilakukan |
|---|---|---|
| `deleteAuthUser` | Dipanggil otomatis saat klik "Hapus" di panel | Menghapus akun dari Firebase Authentication |
| `onAuthUserDeleted` | Otomatis setiap kali akun Auth dihapus (lewat fungsi di atas **atau** manual lewat Firebase Console) | Menghapus data akun tsb di Firestore (`users/{uid}/...` + `accounts/{uid}`), supaya halaman Daftar Akun otomatis ikut bersih |

Keduanya **opsional** — kalau tidak di-deploy, aplikasi tetap berjalan
normal, cuma perlu klik "🧹 Bersihkan dari Daftar" manual setelah hapus
akun lewat Firebase Console.

### Cara deploy

1. **Firebase project harus di plan Blaze** (pay-as-you-go). Cloud Functions
   generasi baru (v2) mengharuskan ini, meskipun untuk pemakaian kecil
   biasanya tetap gratis (ada kuota gratis bulanan). Upgrade di Firebase
   Console → klik nama project → **Upgrade** (kanan bawah/sidebar).
2. Install Firebase CLI (kalau belum ada):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
3. Di dalam folder project ini (root, yang ada `functions/`):
   ```bash
   firebase init functions
   ```
   Saat ditanya, pilih **"Use an existing project"** → pilih project Firebase Anda, dan pilih **"JavaScript"**. Kalau ditanya mau overwrite `functions/index.js` atau `functions/package.json`, jawab **No** (biar tidak menimpa yang sudah disiapkan).
4. Buka `functions/index.js`, ganti baris:
   ```js
   const ADMIN_EMAIL = 'admin@email-anda.com';
   ```
   dengan email admin Anda yang sebenarnya (huruf kecil semua, sama persis dengan `VITE_ADMIN_EMAIL`).
5. Install dependency & deploy:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```
6. Setelah sukses deploy, coba lagi tombol "Hapus" di menu Daftar Akun — kali ini akunnya akan otomatis terhapus juga dari Firebase Authentication (tidak muncul lagi info "masih tercatat di Auth").

> 💡 Kalau Anda tidak familiar dengan command line / Cloud Functions, tidak
> apa-apa dilewati saja — fitur hapus data & blokir login tetap berfungsi
> penuh tanpa ini. Cukup hapus manual lewat Firebase Console sesekali kalau
> perlu benar-benar bersih-bersih daftar user.

---

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|-----------|---------|
| React 18 | UI Framework |
| Vite 5 | Build Tool |
| Tailwind CSS 3 | Styling |
| Firebase Authentication | Login multi-akun (email & password) |
| Firebase Firestore | Database online per akun |
| Vercel | Hosting & Deployment |

---

© 2025 Dearma Rental Mobil Medan. All rights reserved.
