// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, updatePassword,
} from 'firebase/auth';
import {
  initializeFirestore, memoryLocalCache,
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
// Matikan offline cache → paksa baca langsung dari server Firebase.
// experimentalAutoDetectLongPolling: mengatasi error WebChannel 400 /
// koneksi macet yang sering terjadi di jaringan tertentu.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
const auth = getAuth(app);
const functions = getFunctions(app);
export { db, auth };

function withTimeout(promise, ms = 10000) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms));
  return Promise.race([promise, t]);
}

// Email admin (Login Utama) — diset lewat Environment Variable.
// Akun Firebase Auth dengan email PERSIS sama ini otomatis diperlakukan
// sebagai admin: memakai database lama (config/customers/invoices di
// level atas) dan bisa mengelola akun lain di menu "Daftar Akun".
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

// ─────────────────────────────────────────────────────────────────
// SESI AKTIF
//  - 'master'  → email login = VITE_ADMIN_EMAIL, memakai DATABASE LAMA
//                 di path atas: config/, customers/, invoices/
//                 (data yang sudah ada sebelumnya, TIDAK dipindah/hilang)
//  - 'account' → akun yang daftar sendiri, datanya disimpan terpisah
//                 di users/{uid}/..., dan harus di-approve admin dulu
//                 sebelum bisa login.
// Keduanya SAMA-SAMA login lewat Firebase Authentication (email &
// password asli, di-hash & dikelola oleh Google) — jauh lebih aman
// dibanding password polos yang dulu tersimpan di Firestore.
// ─────────────────────────────────────────────────────────────────
let session = null; // { kind: 'master', uid } | { kind: 'account', uid }

export function getSessionKind() { return session?.kind || null; }
export function clearActiveSession() { session = null; }

function basePath() {
  if (session?.kind === 'master')  return [];
  if (session?.kind === 'account') return ['users', session.uid];
  throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
}
function sDoc(...parts) { return doc(db, ...basePath(), ...parts); }
function sCol(...parts) { return collection(db, ...basePath(), ...parts); }

// ─── AUTH: Firebase Authentication (Login Utama & Akun) ─────────
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// Dipanggil setiap kali ada user Firebase Auth aktif (baru login atau
// sesi lama yang dipulihkan saat reload). Menentukan jenis sesi
// (master/account) dan memverifikasi status akun (pending/disabled).
export async function bindAndVerifyAccount(fbUser) {
  const email = (fbUser.email || '').toLowerCase();

  if (ADMIN_EMAIL && email === ADMIN_EMAIL) {
    session = { kind: 'master', uid: fbUser.uid };
    return { kind: 'master' };
  }

  const reg = await withTimeout(getDoc(doc(db, 'accounts', fbUser.uid)));
  const status = reg.exists() ? (reg.data().status || 'active') : 'active';

  if (status === 'pending') {
    await signOut(auth);
    throw new Error('ACCOUNT_PENDING');
  }
  if (status === 'disabled') {
    await signOut(auth);
    throw new Error('ACCOUNT_DISABLED');
  }
  session = { kind: 'account', uid: fbUser.uid };
  return { kind: 'account' };
}

export async function registerAccount(email, password, displayName) {
  const emailTrim = email.trim();
  const cred = await createUserWithEmailAndPassword(auth, emailTrim, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }

  const isAdmin = ADMIN_EMAIL && emailTrim.toLowerCase() === ADMIN_EMAIL;

  await setDoc(doc(db, 'accounts', cred.user.uid), {
    uid: cred.user.uid,
    email: emailTrim,
    displayName: displayName?.trim() || '',
    status: isAdmin ? 'active' : 'pending',
    createdAt: new Date().toISOString(),
  });

  if (isAdmin) {
    session = { kind: 'master', uid: cred.user.uid };
    await setDoc(doc(db, 'config', 'settings'), {
      companyName: displayName?.trim() || '',
    }, { merge: true });
    return { pending: false, kind: 'master', user: cred.user };
  }

  // Akun biasa: siapkan settings-nya, tapi tetap harus menunggu approve admin
  await setDoc(doc(db, 'users', cred.user.uid, 'config', 'settings'), {
    companyName: displayName?.trim() || '',
  }, { merge: true });

  await signOut(auth);
  session = null;
  return { pending: true };
}

export async function loginAccount(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await bindAndVerifyAccount(cred.user); // melempar error kalau pending/disabled
  return cred.user;
}

export async function logoutSession() {
  await signOut(auth);
  session = null;
}

export async function changeAccountPassword(newPassword) {
  if (!auth.currentUser) throw new Error('Sesi login tidak ditemukan.');
  await updatePassword(auth.currentUser, newPassword);
}

// ─── PENGELOLAAN AKUN (khusus admin / Login Utama) ──────────────
export async function getAllAccounts() {
  const s = await getDocs(collection(db, 'accounts'));
  return s.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export async function approveAccount(uid) {
  await updateDoc(doc(db, 'accounts', uid), { status: 'active' });
}
export async function setAccountStatus(uid, status) {
  await updateDoc(doc(db, 'accounts', uid), { status });
}

// Menghapus entri direktori (accounts/{uid}) SEPENUHNYA, tanpa menyentuh
// data users/{uid}/... maupun akun Firebase Auth.
//
// ⚠️ HANYA aman dipakai kalau akun Firebase Auth-nya SUDAH BENAR-BENAR
// TIDAK ADA LAGI (misal sudah dihapus manual lewat Firebase Console →
// Authentication). Kalau akun Auth-nya masih ada dan entri direktorinya
// dihapus, sistem akan menganggap "tidak ada catatan = akun aktif" saat
// orang itu login lagi — jadi JANGAN dipakai untuk akun yang masih aktif.
export async function removeAccountEntry(uid) {
  await deleteDoc(doc(db, 'accounts', uid));
}

export async function deleteAccountCompletely(uid) {
  // Menghapus seluruh data Firestore milik akun ini (settings, customers,
  // invoices) dan mengunci akun secara PERMANEN.
  //
  // PENTING: dokumen accounts/{uid} TIDAK dihapus, cuma diubah statusnya
  // jadi 'disabled' + ditandai dataWiped. Kalau dokumennya sampai dihapus
  // total, bindAndVerifyAccount() akan menganggap akun ini "tidak
  // terdaftar di direktori" dan otomatis meloloskannya sebagai status
  // default 'active' — itulah bug lama yang menyebabkan akun yang sudah
  // dihapus tetap bisa login lagi.
  //
  // Catatan: menghapus akun *login* (Firebase Authentication) itu sendiri
  // secara permanen memerlukan Firebase Admin SDK di server (Cloud
  // Function) karena alasan keamanan — client app tidak diizinkan
  // menghapus akun pengguna lain. Fungsi ini sudah memblokir login akun
  // tsb secara permanen dan menghapus seluruh datanya. Untuk benar-benar
  // menghilangkan akunnya dari Firebase Authentication, hapus manual di
  // Firebase Console → Authentication → Users (lihat catatan di README).
  await setDoc(doc(db, 'accounts', uid), {
    status: 'disabled',
    dataWiped: true,
    deletedAt: new Date().toISOString(),
  }, { merge: true });

  const custSnap = await getDocs(collection(db, 'users', uid, 'customers'));
  await Promise.all(custSnap.docs.map(d => deleteDoc(d.ref)));

  const invSnap = await getDocs(collection(db, 'users', uid, 'invoices'));
  await Promise.all(invSnap.docs.map(d => deleteDoc(d.ref)));

  await deleteDoc(doc(db, 'users', uid, 'config', 'settings')).catch(() => {});
  // Dokumen accounts/{uid} SENGAJA tidak dihapus — lihat penjelasan di atas.

  // Coba hapus akunnya juga dari Firebase Authentication lewat Cloud
  // Function (kalau sudah di-deploy — lihat README "Cloud Function: Hapus
  // Akun Permanen"). Kalau belum di-deploy, ini gagal dengan aman dan
  // tidak menghentikan proses — akun tetap terkunci lewat status
  // 'disabled' di atas, cuma masih tercatat di Firebase Authentication.
  try {
    const fn = httpsCallable(functions, 'deleteAuthUser');
    await fn({ uid });
    return { authUserDeleted: true };
  } catch (e) {
    return { authUserDeleted: false, reason: e.message };
  }
}

// ─── SETTINGS (mengikuti sesi aktif: master / akun) ─────────────
export async function getSettings() {
  try {
    const s = await getDoc(sDoc('config', 'settings'));
    return s.exists() ? s.data() : null;
  } catch(e) { console.error('getSettings:', e); return null; }
}
export async function saveSettings(data) {
  await setDoc(sDoc('config', 'settings'), data, { merge: true });
}

// ─── CUSTOMERS (mengikuti sesi aktif: master / akun) ────────────
export async function getCustomers() {
  try {
    const s = await getDocs(sCol('customers'));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getCustomers:', e); return []; }
}
export async function addCustomer(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(sCol('customers'), payload);
  return { id: ref.id, ...payload };
}
export async function updateCustomer(id, data) {
  await updateDoc(sDoc('customers', id), data);
}
export async function deleteCustomer(id) {
  await deleteDoc(sDoc('customers', id));
}

// ─── INVOICES (mengikuti sesi aktif: master / akun) ─────────────
export async function getInvoices() {
  try {
    const s = await getDocs(sCol('invoices'));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getInvoices:', e); return []; }
}
export async function addInvoice(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(sCol('invoices'), payload);
  return { id: ref.id, ...payload };
}
export async function updateInvoice(id, data) {
  await setDoc(sDoc('invoices', id), data, { merge: true });
}
export async function deleteInvoice(id) {
  await deleteDoc(sDoc('invoices', id));
}
