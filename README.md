# 🚗 Dearma Rental Mobil Medan — Sistem Invoice & Kwitansi

Aplikasi web invoice dan kwitansi berbasis React + Firebase untuk Dearma Rental Mobil Medan.

---

## ✨ Fitur

- 🔐 **Login Utama (admin, database lama)** + **Login akun (Firebase Auth, multi-akun)**
- 🏢 **Multi-tenant** — setiap akun yang mendaftar punya databasenya sendiri, data antar akun terpisah total
- 🗂️ **Daftar Akun** (khusus Login Utama) — nonaktifkan sementara / hapus akun yang mendaftar
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

Setiap orang yang mendaftar sendiri (tab **"Daftar"** di halaman login) akan
otomatis menjadi satu akun Firebase Auth dengan UID unik, dan seluruh
datanya (pengaturan, customer, invoice) disimpan terpisah di Firestore pada
path `users/{uid}/...` — akun lain tidak bisa mengakses data akun tersebut.

Aplikasi juga tetap punya **Login Utama** (tab **"Login Utama"**) yang
memakai password lama (disimpan di `config/auth`) dan **database lama**
(`config/`, `customers/`, `invoices/` di level atas) — data yang sudah ada
sebelumnya **tidak hilang / tidak dipindah**. Login Utama ini berfungsi
sebagai akun admin: dashboardnya punya menu tambahan **"Daftar Akun"** untuk
melihat, menonaktifkan sementara, atau menghapus akun-akun yang mendaftar
sendiri. Akun yang mendaftar sendiri tidak melihat menu ini.

#### Atur Firestore Rules

Di tab **Rules**, ganti isi dengan:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Database lama / Login Utama (config, customers, invoices) ──
    // Diakses lewat password admin di app (bukan Firebase Auth),
    // jadi dibuka untuk publik seperti sebelumnya.
    match /config/{doc} {
      allow read, write: if true;
    }
    match /customers/{doc} {
      allow read, write: if true;
    }
    match /invoices/{doc} {
      allow read, write: if true;
    }

    // ── Direktori akun terdaftar ──
    // Siapa saja yang login boleh baca (untuk cek status aktif/nonaktif),
    // tapi hanya pemilik akun yang boleh membuat dokumennya sendiri saat
    // daftar. Update/hapus (nonaktifkan/hapus akun) dilakukan lewat Login
    // Utama yang aksesnya dibuka di sini demi kesederhanaan (app ini
    // tidak memakai Firebase Auth untuk Login Utama).
    match /accounts/{uid} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update, delete: if true;
    }

    // ── Data per akun terdaftar sendiri ──
    // Setiap akun hanya boleh membaca/menulis data di bawah
    // path users/{uid}/... miliknya sendiri (uid = ID akun Firebase Auth).
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Klik **Publish**.

> ⚠️ Rules `allow update, delete: if true` pada `accounts/{uid}` dan akses
> publik pada `config/customers/invoices` mengikuti pendekatan Login Utama
> yang tidak memakai Firebase Auth (sama seperti versi sebelumnya). Ini
> cukup untuk kebutuhan internal tim kecil; jika ingin lebih aman, Login
> Utama sebaiknya dimigrasikan juga ke Firebase Auth dengan custom claim
> admin di masa depan.

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
```

> 🚫 Jangan pernah upload file `.env` ke GitHub! Sudah ada di `.gitignore`.

---

### 4. Jalankan Lokal

```bash
npm run dev
```

Buka browser ke `http://localhost:5173`

**Login Utama (Admin / data lama):**
- Klik tab **"Login Utama"** di halaman login
- Password default: `admin1234`
- Bisa diubah di menu **Pengaturan → Ubah Password Login Utama**
- Dashboard Login Utama punya menu tambahan **"Daftar Akun"** untuk mengelola
  akun-akun yang mendaftar sendiri (nonaktifkan sementara / hapus)

**Akun yang mendaftar sendiri (data terpisah per akun):**
- Klik tab **"Daftar"** di halaman login, isi nama usaha, email, dan password
  (minimal 6 karakter) untuk membuat akun baru
- Setelah itu login lewat tab **"Masuk"**
- Setiap akun yang mendaftar punya data invoice, customer, dan pengaturan
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

## 🗃️ Struktur Database Firestore (Login Utama + Multi-akun)

```
firestore/
├── config/
│   ├── settings             # Pengaturan Login Utama (data lama, TIDAK berubah)
│   └── auth                 # Password Login Utama
├── customers/
│   └── {customerId}         # Data customer milik Login Utama (data lama)
├── invoices/
│   └── {invoiceId}          # Data invoice milik Login Utama (data lama)
│
├── accounts/
│   └── {uid}                # Direktori akun yang mendaftar sendiri:
│                             #   { uid, email, displayName, disabled, createdAt }
│                             # Dipakai halaman "Daftar Akun" di Login Utama
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

Login Utama selalu memakai `config/`, `customers/`, `invoices/` di level
atas (data lama, tidak pernah dipindah/hilang). Setiap akun yang mendaftar
sendiri lewat tab "Daftar" punya salinan struktur yang sama tapi di bawah
`users/{uid}/...`, terisolasi dari akun lain maupun dari Login Utama.

**Batasan menghapus akun:** tombol "Hapus" di menu Daftar Akun menghapus
seluruh data Firestore akun tsb dan mengunci (disable) supaya tidak bisa
login lagi. Menghapus kredensial login-nya secara permanen dari Firebase
Authentication memerlukan Firebase Admin SDK di server (Cloud Function)
karena aplikasi client tidak diizinkan menghapus akun pengguna lain demi
keamanan — bisa ditambahkan sebagai pengembangan lanjutan bila diperlukan.

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
A: Cek console browser. Pastikan Authentication → Sign-in method → Email/Password sudah **Enable**, dan Firestore Rules sudah sesuai contoh di atas (akses dibatasi per `uid`).

**Q: Bagaimana cara reset password jika lupa?**  
A: Buka Firebase Console → Authentication → tab **Users** → cari akun berdasarkan email → klik menu titik tiga → **Reset password** (Firebase akan mengirim email reset), atau gunakan fitur "Lupa Password" bila ditambahkan di aplikasi.

**Q: Bisakah satu akun melihat data akun lain?**  
A: Tidak. Firestore Rules membatasi setiap akun hanya bisa membaca/menulis data di path `users/{uid}/...` miliknya sendiri.

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
