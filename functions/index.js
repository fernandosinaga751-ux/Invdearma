// functions/index.js
//
// Cloud Function OPSIONAL: menghapus akun Firebase Authentication secara
// PERMANEN. Ini tidak bisa dilakukan dari aplikasi web (client) karena
// Firebase memang sengaja tidak mengizinkan satu user menghapus akun user
// lain dari sisi client — harus lewat Admin SDK di server tepercaya,
// makanya perlu Cloud Function ini.
//
// Cara pakai: lihat bagian "Cloud Function: Hapus Akun Permanen" di README.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
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
