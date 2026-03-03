// src/lib/firebase.js
// ─── Dual-mode: Firebase (online) atau localStorage (lokal/dev) ─────────────
import { uid } from './utils.js';

const FB_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
export const USE_LOCAL = !FB_PROJECT_ID || FB_PROJECT_ID.trim() === '' || FB_PROJECT_ID === 'your_project_id';

// ─── LocalStorage helpers ────────────────────────────────────────────────────
const LS = {
  get: (key, def = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { console.error('LS.set:', e); }
  },
};

// ─── Firebase init (hanya jika .env terisi) ──────────────────────────────────
let _db  = null;
let _fst = null;

async function initFirebase() {
  if (USE_LOCAL) return;
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const fst = await import('firebase/firestore');
    _fst = fst;
    const cfg = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         FB_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = getApps().length ? getApps()[0] : initializeApp(cfg);
    _db = fst.getFirestore(app);
    console.log('✅ Firebase terhubung:', FB_PROJECT_ID);
  } catch (e) {
    console.warn('⚠️ Firebase gagal, beralih ke localStorage:', e.message);
    _db = null;
  }
}

export const firebaseReady = initFirebase();

// ─── SETTINGS ────────────────────────────────────────────────────────────────
export async function getSettings() {
  await firebaseReady;
  if (!_db) return LS.get('drm:settings', null);
  try {
    const snap = await _fst.getDoc(_fst.doc(_db, 'config', 'settings'));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return LS.get('drm:settings', null); }
}

export async function saveSettings(data) {
  await firebaseReady;
  if (!_db) { LS.set('drm:settings', data); return; }
  await _fst.setDoc(_fst.doc(_db, 'config', 'settings'), data, { merge: true });
  LS.set('drm:settings', data);
}

// ─── PASSWORD ─────────────────────────────────────────────────────────────────
export async function getPassword() {
  await firebaseReady;
  if (!_db) return LS.get('drm:password', 'admin1234');
  try {
    const snap = await _fst.getDoc(_fst.doc(_db, 'config', 'auth'));
    return snap.exists() ? snap.data().password : 'admin1234';
  } catch { return LS.get('drm:password', 'admin1234'); }
}

export async function savePassword(pw) {
  await firebaseReady;
  LS.set('drm:password', pw);
  if (!_db) return;
  await _fst.setDoc(_fst.doc(_db, 'config', 'auth'), { password: pw });
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export async function getCustomers() {
  await firebaseReady;
  if (!_db) return LS.get('drm:customers', []);
  try {
    const snap = await _fst.getDocs(
      _fst.query(_fst.collection(_db, 'customers'), _fst.orderBy('createdAt', 'asc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { return LS.get('drm:customers', []); }
}

export async function addCustomer(data) {
  await firebaseReady;
  const created = { ...data, createdAt: new Date().toISOString() };
  if (!_db) {
    const id = uid();
    const all = LS.get('drm:customers', []);
    LS.set('drm:customers', [...all, { ...created, id }]);
    return { id, ...created };
  }
  const ref = await _fst.addDoc(_fst.collection(_db, 'customers'), created);
  return { id: ref.id, ...created };
}

export async function updateCustomer(id, data) {
  await firebaseReady;
  if (!_db) {
    const all = LS.get('drm:customers', []);
    LS.set('drm:customers', all.map(c => c.id === id ? { ...c, ...data } : c));
    return;
  }
  await _fst.updateDoc(_fst.doc(_db, 'customers', id), data);
}

export async function deleteCustomer(id) {
  await firebaseReady;
  if (!_db) {
    LS.set('drm:customers', LS.get('drm:customers', []).filter(c => c.id !== id));
    return;
  }
  await _fst.deleteDoc(_fst.doc(_db, 'customers', id));
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
export async function getInvoices() {
  await firebaseReady;
  if (!_db) return LS.get('drm:invoices', []);
  try {
    const snap = await _fst.getDocs(
      _fst.query(_fst.collection(_db, 'invoices'), _fst.orderBy('createdAt', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { return LS.get('drm:invoices', []); }
}

export async function addInvoice(data) {
  await firebaseReady;
  const created = { ...data, createdAt: new Date().toISOString() };
  if (!_db) {
    const id = uid();
    const all = LS.get('drm:invoices', []);
    LS.set('drm:invoices', [{ ...created, id }, ...all]);
    return { id, ...created };
  }
  const ref = await _fst.addDoc(_fst.collection(_db, 'invoices'), created);
  return { id: ref.id, ...created };
}

export async function updateInvoice(id, data) {
  await firebaseReady;
  if (!_db) {
    const all = LS.get('drm:invoices', []);
    LS.set('drm:invoices', all.map(i => i.id === id ? { ...i, ...data } : i));
    return;
  }
  await _fst.setDoc(_fst.doc(_db, 'invoices', id), data, { merge: true });
}

export async function deleteInvoice(id) {
  await firebaseReady;
  if (!_db) {
    LS.set('drm:invoices', LS.get('drm:invoices', []).filter(i => i.id !== id));
    return;
  }
  await _fst.deleteDoc(_fst.doc(_db, 'invoices', id));
}
