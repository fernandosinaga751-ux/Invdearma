// functions/index.js
//
// Cloud Functions OPSIONAL untuk Dearma Invoice:
//
// 1. deleteAuthUser      — dipanggil dari halaman Daftar Akun (tombol
//                          "Hapus") untuk menghapus akun Firebase Auth
//                          secara permanen. Ini tidak bisa dilakukan dari
//                          aplikasi web (client) karena Firebase memang
//                          sengaja tidak mengizinkan satu user menghapus
//                          akun user lain dari sisi client.
//
// 2. onAuthUserDeleted   — trigger otomatis: berjalan setiap kali akun
//                          Firebase Auth dihapus (baik lewat fungsi #1,
//                          MAUPUN dihapus manual lewat Firebase Console).
//                          Membersihkan data & catatan akun tsb di
//                          Firestore secara otomatis, supaya halaman
//                          "Daftar Akun" selalu sinkron.
//
// Cara pakai: lihat bagian "Cloud Function: Hapus Akun Permanen" di README.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const functionsV1 = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

// Samakan dengan VITE_ADMIN_EMAIL di .env aplikasi (huruf kecil semua)
const ADMIN_EMAIL = 'admin@email-anda.com';

exports.deleteAuthUser = onCall(async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();

  if (!request.auth || callerEmail !== ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Hanya admin yang boleh menghapus akun.');
  }

  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'uid wajib diisi.');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'Tidak bisa menghapus akun sendiri lewat fungsi ini.');
  }

  await admin.auth().deleteUser(uid);
  return { success: true };
});

// Trigger otomatis: berjalan setiap kali akun Firebase Authentication
// dihapus DENGAN CARA APAPUN — baik lewat fungsi deleteAuthUser di atas,
// MAUPUN dihapus manual langsung lewat Firebase Console → Authentication.
//
// Ini yang membuat halaman "Daftar Akun" otomatis ikut bersih tanpa perlu
// klik "Bersihkan dari Daftar" secara manual, karena begitu akun Auth-nya
// hilang, Firestore-nya (accounts/{uid} + semua data users/{uid}/...)
// otomatis ikut dihapus di sini.
exports.onAuthUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();

  const deleteCollection = async (path) => {
    const snap = await db.collection(path).get();
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  };

  await deleteCollection(`users/${uid}/customers`);
  await deleteCollection(`users/${uid}/invoices`);
  await db.doc(`users/${uid}/config/settings`).delete().catch(() => {});
  await db.doc(`accounts/${uid}`).delete().catch(() => {});
});
