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
  query, where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { shrinkImage } from './utils.js';
import { withRequires } from './features.js';
import { HANDOVER_CHECKS } from './rental.js';

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
  return { kind: 'account', features: reg.exists() ? (reg.data().features || []) : [] };
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

  for (const col of ['vehicles', 'drivers', 'bookings', 'expenses']) {
    const sn = await getDocs(collection(db, 'users', uid, col)).catch(() => null);
    if (sn) await Promise.all(sn.docs.map(d => deleteDoc(d.ref)));
  }
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

// ─── KOLEKSI FITUR TAMBAHAN (armada, sopir, booking, pengeluaran) ─────────
// Mengikuti sesi aktif: admin utama → koleksi atas; akun → users/{uid}/...
// Akses akun dikunci di Firestore Rules berdasarkan accounts/{uid}.features.
export async function listCol(name) {
  const s = await getDocs(sCol(name));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function addTo(name, data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(sCol(name), payload);
  return { id: ref.id, ...payload };
}
export async function updateIn(name, id, data) {
  await setDoc(sDoc(name, id), data, { merge: true });
}
export async function removeFrom(name, id) {
  await deleteDoc(sDoc(name, id));
}

// ─── HAK AKSES FITUR & PENGAJUAN FITUR ──────────────────────────
// accounts/{uid}.features  → daftar fitur yang dibuka (hanya admin yang bisa mengubah)
// featureRequests/{id}      → pengajuan dari akun, disetujui / ditolak admin
export async function getMyAccess() {
  const uid = auth.currentUser?.uid;
  if (!uid) return { features: [], requests: [] };
  const acc = await getDoc(doc(db, 'accounts', uid));
  const features = acc.exists() ? (acc.data().features || []) : [];
  const rs = await getDocs(query(collection(db, 'featureRequests'), where('uid', '==', uid)));
  const requests = rs.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { features, requests };
}

export async function createFeatureRequest(featureId, note = '') {
  const u = auth.currentUser;
  if (!u) throw new Error('Sesi login tidak ditemukan.');
  const payload = {
    uid: u.uid, email: u.email || '', displayName: u.displayName || '',
    features: [featureId], note: String(note || '').slice(0, 500),
    status: 'pending', createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'featureRequests'), payload);
  return { id: ref.id, ...payload };
}
export async function cancelFeatureRequest(id) {
  await deleteDoc(doc(db, 'featureRequests', id));
}

export async function getAllFeatureRequests() {
  const s = await getDocs(collection(db, 'featureRequests'));
  return s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function setAccountFeatures(uid, features) {
  const list = withRequires(features);
  await setDoc(doc(db, 'accounts', uid), { features: list }, { merge: true });
  return list;
}

// Setujui (sebagian / seluruhnya) atau tolak pengajuan
export async function resolveFeatureRequest(req, { approve, granted = [] }) {
  if (approve) {
    const acc = await getDoc(doc(db, 'accounts', req.uid));
    const cur = acc.exists() ? (acc.data().features || []) : [];
    await setAccountFeatures(req.uid, [...new Set([...cur, ...granted])]);
  }
  await updateDoc(doc(db, 'featureRequests', req.id), {
    status: approve ? 'approved' : 'rejected',
    granted: approve ? withRequires(granted) : [],
    resolvedAt: new Date().toISOString(),
  });
}

// ─── SHARE LINK (customer melihat invoice & mengusulkan diskon/pajak) ───
// Dokumen publik di koleksi top-level `shares/{token}`. Token acak panjang
// = "kunci" link. Isinya hanya salinan (snapshot) data yang boleh dilihat
// customer — data asli invoice tetap privat.
export const SHARE_COL = 'shares';

export function newShareToken() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); // 36 hex
}

export function shareUrl(token) {
  return `${window.location.origin}/v/${token}`;
}

async function buildShareSnapshot(invoice, settings = {}) {
  const [logo, signature, stamp, qris] = await Promise.all([
    shrinkImage(settings.logo, 300, { allowJpeg: true }),
    shrinkImage(settings.signature, 420),
    shrinkImage(settings.stamp, 300),
    shrinkImage(settings.qris, 360, { allowJpeg: true }),
  ]);
  return {
    ownerUid: auth.currentUser.uid,
    invoiceId: invoice.id,
    paid: !!invoice.paidDate,
    updatedAt: new Date().toISOString(),
    invoice: {
      invoiceNo: invoice.invoiceNo || '',
      customerName: invoice.customerName || '',
      date: invoice.date || '',
      dueDate: invoice.dueDate || '',
      paidDate: invoice.paidDate || '',
      payments: (invoice.payments || []).map(p => ({ id: p.id, date: p.date, amount: p.amount, method: p.method || '', note: p.note || '' })),
      rental: invoice.rental?.vehicleId ? {
        vehicleName: invoice.rental.vehicleName || '', plate: invoice.rental.plate || '',
        pickupAt: invoice.rental.pickupAt || '', returnAt: invoice.rental.returnAt || '', days: invoice.rental.days || 0,
        withDriver: !!invoice.rental.withDriver, destination: invoice.rental.destination || '',
      } : null,
      items: (invoice.items || []).map(i => ({
        description: i.description || '', qty: Number(i.qty) || 0, price: Number(i.price) || 0,
      })),
      subtotal: Number(invoice.subtotal) || 0,
      diskon: Number(invoice.diskon) || 0,
      ppn: Number(invoice.ppn) || 0,
      ppnAmount: Number(invoice.ppnAmount) || 0,
      taxMinus: !!invoice.taxMinus,
      total: Number(invoice.total) || 0,
      panjar: Number(invoice.panjar) || 0,
      sisa: Number(invoice.sisa) || 0,
      notes: invoice.notes || '',
    },
    company: {
      companyName: settings.companyName || '',
      address: settings.address || '',
      phone: settings.phone || '',
      ownerName: settings.ownerName || '',
      bankName: settings.bankName || '',
      bankAccount: settings.bankAccount || '',
      email: settings.email || '',
      website: settings.website || '',
      logo, signature, stamp, qris, materai: !!settings.materai, // untuk tampilan & unduhan kwitansi di sisi customer
    },
  };
}

// Buat (atau perbarui) dokumen share untuk sebuah invoice. Mengembalikan token.
export async function ensureShare(invoice, settings, { forceNew = false } = {}) {
  const fresh = forceNew || !invoice.shareToken;
  if (forceNew && invoice.shareToken) await deleteShare(invoice.shareToken); // buang link lama
  const token = fresh ? newShareToken() : invoice.shareToken;
  await setDoc(doc(db, SHARE_COL, token), await buildShareSnapshot(invoice, settings), { merge: true });
  if (fresh) await updateInvoice(invoice.id, { shareToken: token, shareClosed: false });
  return token;
}

// Tutup link: isi invoice DIHAPUS dari dokumen publik & customer tidak bisa
// mengirim usulan lagi. Dipanggil otomatis saat usulan diterapkan.
export async function closeShare(invoice, proposal) {
  if (!invoice?.shareToken) return;
  await setDoc(doc(db, SHARE_COL, invoice.shareToken), {
    ownerUid: auth.currentUser.uid,
    invoiceId: invoice.id,
    paid: !!invoice.paidDate,
    closed: true,
    closedAt: new Date().toISOString(),
    proposal: { ...proposal, status: 'applied', resolvedAt: new Date().toISOString() },
  });
}

// Sinkronkan snapshot bila invoice sudah pernah dibagikan (diam-diam, tidak melempar error)
export async function syncShare(invoice, settings) {
  if (!invoice?.shareToken || invoice.shareClosed) return; // link sudah ditutup → jangan dihidupkan lagi
  try { await ensureShare(invoice, settings); } catch (e) { console.warn('syncShare:', e); }
}

export async function deleteShare(token) {
  if (!token) return;
  try { await deleteDoc(doc(db, SHARE_COL, token)); } catch (e) { console.warn('deleteShare:', e); }
}

// Semua share milik user yang sedang login → { [invoiceId]: shareDoc }
export async function getShares() {
  try {
    const q = query(collection(db, SHARE_COL), where('ownerUid', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    const map = {};
    snap.docs.forEach(d => { const v = d.data(); if (v.invoiceId) map[v.invoiceId] = { token: d.id, ...v }; });
    return map;
  } catch (e) { console.warn('getShares:', e); return {}; }
}

export async function setProposalStatus(token, status) {
  await updateDoc(doc(db, SHARE_COL, token), {
    'proposal.status': status,
    'proposal.resolvedAt': new Date().toISOString(),
  });
}

// ── Sisi customer (tanpa login) ──
export async function getPublicShare(token) {
  const s = await getDoc(doc(db, SHARE_COL, token));
  return s.exists() ? { token, ...s.data() } : null;
}

export async function submitProposal(token, { diskon, pajak }) {
  await updateDoc(doc(db, SHARE_COL, token), {
    proposal: {
      diskon: Math.max(0, Math.round(Number(diskon) || 0)),
      pajak:  Math.max(0, Math.round(Number(pajak)  || 0)),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    },
  });
}

// ─── LINK SERAH TERIMA (petugas mencatat kondisi mobil tanpa login) ─────────
// Dokumen publik `handovers/{token}`: satu link per invoice. Token acak panjang
// = "kunci" link. Petugas hanya bisa MENGUBAH field `handover` (checklist, KM, BBM,
// catatan, tanda tangan); data invoice di dokumen ini hanyalah salinan baca-saja.
export const HANDOVER_COL = 'handovers';

export function handoverUrl(token) {
  return `${window.location.origin}/h/${token}`;
}

async function buildHandoverSnapshot(invoice, settings = {}) {
  const logo = await shrinkImage(settings.logo, 160, { allowJpeg: true });
  const r = invoice.rental?.vehicleId ? invoice.rental : null;
  const d = invoice.deposit;
  return {
    ownerUid: auth.currentUser.uid,
    invoiceId: invoice.id,
    updatedAt: new Date().toISOString(),
    staff: {
      name: String(invoice.handoverStaff?.name || '').trim().slice(0, 80),
      phone: String(invoice.handoverStaff?.phone || '').trim().slice(0, 30),
    },
    invoice: {
      invoiceNo: invoice.invoiceNo || '',
      customerName: invoice.customerName || '',
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      total: Number(invoice.total) || 0,
      rental: r ? {
        vehicleName: r.vehicleName || '', plate: r.plate || '', pickupAt: r.pickupAt || '', returnAt: r.returnAt || '',
        days: r.days || 0, withDriver: !!r.withDriver, driverName: r.driverName || '', destination: r.destination || '',
      } : null,
      deposit: d ? { type: d.type || 'uang', item: d.item || '', amount: Number(d.amount) || 0, status: d.status || '' } : null,
    },
    company: {
      companyName: settings.companyName || '',
      address: settings.address || '',
      phone: settings.phone || '',
      ownerName: settings.ownerName || '',
      contractTerms: String(settings.contractTerms || '').slice(0, 6000),
      logo,
    },
  };
}

const newerHandover = (a, b) => ((a?.updatedAt || '') >= (b?.updatedAt || '') ? a : b);

export async function getHandoverLink(token) {
  if (!token) return null;
  const s = await getDoc(doc(db, HANDOVER_COL, token));
  return s.exists() ? { token, ...s.data() } : null;
}
export const getPublicHandover = getHandoverLink;

// Buat (atau perbarui) link serah terima sebuah invoice. Mengembalikan token.
// Data `handover` di dokumen link TIDAK ditimpa saat pembaruan biasa.
export async function ensureHandoverLink(invoice, settings, { forceNew = false } = {}) {
  const fresh = forceNew || !invoice.handoverToken;
  let carry = invoice.handover || null;
  if (forceNew && invoice.handoverToken) {
    try {
      const old = await getHandoverLink(invoice.handoverToken);
      if (old?.handover) carry = carry ? newerHandover(carry, old.handover) : old.handover;
    } catch (e) { console.warn('handover lama:', e); }
    await deleteHandoverLink(invoice.handoverToken);
  }
  const token = fresh ? newShareToken() : invoice.handoverToken;
  const payload = await buildHandoverSnapshot(invoice, settings);
  if (fresh && carry) payload.handover = carry; // bawa data yang sudah pernah diisi
  await setDoc(doc(db, HANDOVER_COL, token), payload, { merge: true });
  if (fresh) await updateInvoice(invoice.id, { handoverToken: token });
  return token;
}

// Sinkronkan salinan data invoice di link (diam-diam, tidak melempar error)
export async function syncHandoverLink(invoice, settings) {
  if (!invoice?.handoverToken || !invoice.handoverStaff?.name) return;
  try { await ensureHandoverLink(invoice, settings); } catch (e) { console.warn('syncHandoverLink:', e); }
}

// Admin menyimpan data serah terima dari aplikasi → dorong ke link supaya petugas melihat versi terbaru
export async function pushHandoverToLink(token, handover) {
  if (!token || !handover) return;
  try { await updateDoc(doc(db, HANDOVER_COL, token), { handover }); } catch (e) { console.warn('pushHandoverToLink:', e); }
}

export async function deleteHandoverLink(token) {
  if (!token) return;
  try { await deleteDoc(doc(db, HANDOVER_COL, token)); } catch (e) { console.warn('deleteHandoverLink:', e); }
}

// Hapus link, tapi selamatkan dulu isian petugas yang belum sempat ditarik ke invoice.
// Mengembalikan data handover yang lebih baru (atau null bila tidak ada).
export async function removeHandoverLink(invoice) {
  if (!invoice?.handoverToken) return null;
  let rescued = null;
  try {
    const l = await getHandoverLink(invoice.handoverToken);
    if (l?.handover && (l.handover.updatedAt || '') > (invoice.handover?.updatedAt || '')) rescued = l.handover;
  } catch (e) { console.warn('removeHandoverLink:', e); }
  if (rescued) await updateInvoice(invoice.id, { handover: rescued });
  await deleteHandoverLink(invoice.handoverToken);
  return rescued;
}

// Semua link milik user yang sedang login → { [invoiceId]: linkDoc }
export async function getHandoverLinks() {
  try {
    const q = query(collection(db, HANDOVER_COL), where('ownerUid', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    const map = {};
    snap.docs.forEach(d => { const v = d.data(); if (v.invoiceId) map[v.invoiceId] = { token: d.id, ...v }; });
    return map;
  } catch (e) { console.warn('getHandoverLinks:', e); return {}; }
}

// Tarik isian petugas yang lebih baru ke invoice. Mengembalikan daftar { id, handover } yang diperbarui.
export async function pullHandoverUpdates(invoices) {
  const links = await getHandoverLinks();
  const patched = [];
  for (const inv of invoices) {
    const h = links[inv.id]?.handover;
    if (h?.updatedAt && h.updatedAt > (inv.handover?.updatedAt || '')) {
      try { await updateInvoice(inv.id, { handover: h }); patched.push({ id: inv.id, handover: h }); }
      catch (e) { console.warn('pullHandoverUpdates:', e); }
    }
  }
  return { links, patched };
}

// ── Sisi petugas (tanpa login) ──
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const cleanSig = v => (/^data:image\/(png|jpe?g|webp);base64,/.test(String(v || '')) && String(v).length < 150000 ? String(v) : '');
function cleanSide(x = {}) {
  const checks = {};
  HANDOVER_CHECKS.forEach(c => { checks[c] = cut(x.checks?.[c] || 'Baik', 40); });
  return {
    at: cut(x.at, 20), km: cut(x.km, 10), fuel: cut(x.fuel || 'Penuh', 12), checks,
    notes: cut(x.notes, 600), custSig: cleanSig(x.custSig), staffSig: cleanSig(x.staffSig),
  };
}

export async function submitHandover(token, data) {
  const ref = doc(db, HANDOVER_COL, token);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Link tidak ditemukan atau sudah dinonaktifkan.');
  const cur = snap.data();
  if (cur.closed) throw new Error('Link ini sudah tidak berlaku.');
  const prev = cur.handover || {};
  const clean = {
    vehicleName: cut(data.vehicleName, 80), plate: cut(data.plate, 20), idNo: cut(data.idNo, 40),
    out: cleanSide(data.out),
    back: { ...cleanSide(data.back), fines: prev.back?.fines || [] }, // denda hanya diatur admin
    finesAddedAt: prev.finesAddedAt || '',
    officerName: cut(cur.staff?.name, 80),
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(ref, { handover: clean });
  return clean;
}
