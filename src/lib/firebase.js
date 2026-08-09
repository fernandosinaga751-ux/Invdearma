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
// koneksi macet yang sering terjadi di jaringan tertentu (proxy, firewall,
// hosting) dengan otomatis beralih ke mode long-polling saat streaming
// biasa gagal/tidak stabil.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
const auth = getAuth(app);
export { db, auth };

// ─────────────────────────────────────────────────────────────────
// SESI AKTIF
// Ada 2 jenis sesi:
//  - 'master'  → Login Utama (password lama), memakai DATABASE LAMA
//                 di path atas: config/, customers/, invoices/
//                 (data yang sudah ada sebelumnya, TIDAK dipindah/hilang)
//  - 'account' → akun yang daftar sendiri lewat Firebase Auth, datanya
//                 disimpan terpisah di users/{uid}/...
// ─────────────────────────────────────────────────────────────────
let session = null; // { kind: 'master' } | { kind: 'account', uid }

export function getSessionKind() { return session?.kind || null; }
export function clearActiveSession() { session = null; }

function basePath() {
  if (session?.kind === 'master')  return [];
  if (session?.kind === 'account') return ['users', session.uid];
  throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
}
function sDoc(...parts) { return doc(db, ...basePath(), ...parts); }
function sCol(...parts) { return collection(db, ...basePath(), ...parts); }

// ─── LOGIN UTAMA (database lama, password lama) ────────────────
const MASTER_FLAG = 'dearma_master_session';

function withTimeout(promise, ms = 10000) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms));
  return Promise.race([promise, t]);
}

export async function getMasterPassword() {
  try {
    const s = await withTimeout(getDoc(doc(db, 'config', 'auth')));
    return s.exists() ? s.data().password : 'admin1234';
  } catch { return 'admin1234'; }
}
export async function saveMasterPassword(pw) {
  await withTimeout(setDoc(doc(db, 'config', 'auth'), { password: pw }));
}
export async function loginMaster(pw) {
  let real;
  try {
    const s = await withTimeout(getDoc(doc(db, 'config', 'auth')));
    real = s.exists() ? s.data().password : 'admin1234';
  } catch (e) {
    if (e.message === 'TIMEOUT') {
      throw new Error('Koneksi ke Firebase macet/timeout. Periksa koneksi internet atau coba refresh halaman.');
    }
    throw new Error('Gagal menghubungi Firebase: ' + e.message);
  }
  if (pw !== real) throw new Error('WRONG_PASSWORD');
  session = { kind: 'master' };
  try { localStorage.setItem(MASTER_FLAG, '1'); } catch {}
}
export function restoreMasterSessionIfAny() {
  try {
    if (localStorage.getItem(MASTER_FLAG) === '1') {
      session = { kind: 'master' };
      return true;
    }
  } catch {}
  return false;
}
export function logoutMaster() {
  try { localStorage.removeItem(MASTER_FLAG); } catch {}
  if (session?.kind === 'master') session = null;
}

// ─── AKUN TERDAFTAR (Firebase Authentication) ──────────────────
// Direktori ringan berisi daftar akun terdaftar, disimpan di
// koleksi top-level `accounts/{uid}` supaya Login Utama bisa
// menampilkan & mengelola (nonaktifkan / hapus) tanpa perlu
// Firebase Admin SDK di server.
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

async function bindAndVerifyAccount(fbUser) {
  const reg = await getDoc(doc(db, 'accounts', fbUser.uid));
  if (reg.exists() && reg.data().disabled) {
    await signOut(auth);
    throw new Error('ACCOUNT_DISABLED');
  }
  session = { kind: 'account', uid: fbUser.uid };
}
export { bindAndVerifyAccount };

export async function registerAccount(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  await setDoc(doc(db, 'accounts', cred.user.uid), {
    uid: cred.user.uid,
    email: email.trim(),
    displayName: displayName?.trim() || '',
    disabled: false,
    createdAt: new Date().toISOString(),
  });
  session = { kind: 'account', uid: cred.user.uid };
  await setDoc(doc(db, 'users', cred.user.uid, 'config', 'settings'), {
    companyName: displayName?.trim() || '',
  }, { merge: true });
  return cred.user;
}

export async function loginAccount(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    await bindAndVerifyAccount(cred.user);
  } catch (e) {
    if (e.message === 'ACCOUNT_DISABLED') {
      throw new Error('ACCOUNT_DISABLED');
    }
    throw e;
  }
  return cred.user;
}

export async function logoutAccount() {
  await signOut(auth);
  if (session?.kind === 'account') session = null;
}

export async function changeAccountPassword(newPassword) {
  if (!auth.currentUser) throw new Error('Sesi login tidak ditemukan.');
  await updatePassword(auth.currentUser, newPassword);
}

// ─── PENGELOLAAN AKUN (khusus Login Utama / master) ─────────────
export async function getAllAccounts() {
  const s = await getDocs(collection(db, 'accounts'));
  return s.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export async function setAccountDisabled(uid, disabled) {
  await updateDoc(doc(db, 'accounts', uid), { disabled });
}
export async function deleteAccountCompletely(uid) {
  // Menghapus seluruh data Firestore milik akun ini (settings, customers,
  // invoices) serta entri direktorinya, dan mengunci akun (disabled)
  // sehingga tidak bisa login lagi.
  //
  // Catatan: menghapus akun *login* (Firebase Authentication) itu sendiri
  // secara permanen memerlukan Firebase Admin SDK di server (Cloud
  // Function) karena alasan keamanan — client app tidak diizinkan
  // menghapus akun pengguna lain. Fungsi ini sudah memblokir login akun
  // tsb (disabled) dan menghapus seluruh datanya secara permanen, yang
  // secara praktis membuat akun tersebut tidak bisa dipakai lagi.
  await setDoc(doc(db, 'accounts', uid), { disabled: true }, { merge: true });

  const custSnap = await getDocs(collection(db, 'users', uid, 'customers'));
  await Promise.all(custSnap.docs.map(d => deleteDoc(d.ref)));

  const invSnap = await getDocs(collection(db, 'users', uid, 'invoices'));
  await Promise.all(invSnap.docs.map(d => deleteDoc(d.ref)));

  await deleteDoc(doc(db, 'users', uid, 'config', 'settings')).catch(() => {});
  await deleteDoc(doc(db, 'accounts', uid));
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
