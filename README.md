# 🚗 Dearma Rental Mobil Medan — Sistem Invoice & Kwitansi

Aplikasi web invoice dan kwitansi berbasis React + Firebase untuk Dearma Rental Mobil Medan.

---

## ✨ Fitur

- 🔐 **Login dengan password** (dikelola dari dashboard)
- 👥 **Manajemen Customer** — simpan, edit, hapus data customer
- 🧾 **Invoice Otomatis** — format `No.01/III/DRM/2025`, increment per hari
- 📄 **Kwitansi** — dari invoice yang sama, langsung cetak PDF
- 💰 **PPN Fleksibel** — Tanpa PPN / 5% / 10% / 11% / 12%
- 🖨️ **Cetak PDF** via browser print dialog
- ⚙️ **Pengaturan** — upload logo, tanda tangan, cap/stempel, info rekening
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

#### Atur Firestore Rules

Di tab **Rules**, ganti isi dengan:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Semua koleksi bisa dibaca/ditulis (app pakai password sendiri)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Klik **Publish**.

> ⚠️ Rules di atas mengizinkan akses publik karena autentikasi dikelola oleh password di app sendiri. Untuk keamanan lebih, pertimbangkan Firebase Auth.

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

**Password default:** `admin1234`  
(Bisa diubah di menu **Pengaturan → Ubah Password Admin**)

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
│   │   ├── firebase.js     # Konfigurasi & fungsi Firebase Firestore
│   │   ├── print.js        # Engine cetak invoice/kwitansi ke PDF
│   │   └── utils.js        # Utilitas (format angka, tanggal, dll)
│   ├── pages/
│   │   ├── Dashboard.jsx   # Halaman utama / ringkasan
│   │   ├── Login.jsx       # Halaman login
│   │   ├── Customers.jsx   # Manajemen customer
│   │   ├── Invoices.jsx    # Daftar & detail invoice
│   │   ├── NewInvoice.jsx  # Buat / edit invoice
│   │   └── Settings.jsx    # Pengaturan perusahaan & password
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

## 🗃️ Struktur Database Firestore

```
firestore/
├── config/
│   ├── settings        # Pengaturan perusahaan (nama, logo, dll)
│   └── auth            # Password admin
├── customers/
│   └── {customerId}    # Data per customer
└── invoices/
    └── {invoiceId}     # Data per invoice (termasuk items)
```

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

**Q: Data tidak tersimpan?**  
A: Cek console browser. Pastikan Firestore Rules sudah diatur dan Environment Variables di Vercel sudah benar.

**Q: Bagaimana cara reset password jika lupa?**  
A: Buka Firebase Console → Firestore → koleksi `config` → dokumen `auth` → edit field `password` secara manual.

---

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|-----------|---------|
| React 18 | UI Framework |
| Vite 5 | Build Tool |
| Tailwind CSS 3 | Styling |
| Firebase Firestore | Database online |
| Vercel | Hosting & Deployment |

---

© 2025 Dearma Rental Mobil Medan. All rights reserved.
