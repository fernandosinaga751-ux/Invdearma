// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc,
  query, orderBy
} from 'firebase/firestore';
import { uid } from './utils.js';

// ─── Deteksi mode ─────────────────────────────────────────────
const PID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
export const USE_LOCAL = !PID || PID.trim() === '' || PID === 'your_project_id';

// ─── LocalStorage fallback ────────────────────────────────────
const LS = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { console.error(e); } },
};

// ─── Firebase init ────────────────────────────────────────────
let db = null;

if (!USE_LOCAL) {
  try {
    const cfg = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         PID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = getApps().length ? getApps()[0] : initializeApp(cfg);
    db = getFirestore(app);
    console.log('✅ Firebase aktif:', PID);
  } catch(e) {
    console.error('❌ Firebase gagal:', e.message);
    db = null;
  }
} else {
  console.log('💾 Mode lokal (localStorage). Isi .env untuk Firebase.');
}

// ─── SETTINGS ─────────────────────────────────────────────────
export async function getSettings() {
  if (!db) return LS.get('drm:settings', null);
  try {
    const s = await getDoc(doc(db, 'config', 'settings'));
    return s.exists() ? s.data() : null;
  } catch(e) { console.error(e); return LS.get('drm:settings', null); }
}
export async function saveSettings(data) {
  LS.set('drm:settings', data);
  if (!db) return;
  await setDoc(doc(db, 'config', 'settings'), data, { merge: true });
}

// ─── PASSWORD ─────────────────────────────────────────────────
export async function getPassword() {
  if (!db) return LS.get('drm:password', 'admin1234');
  try {
    const s = await getDoc(doc(db, 'config', 'auth'));
    return s.exists() ? s.data().password : 'admin1234';
  } catch { return LS.get('drm:password', 'admin1234'); }
}
export async function savePassword(pw) {
  LS.set('drm:password', pw);
  if (!db) return;
  await setDoc(doc(db, 'config', 'auth'), { password: pw });
}

// ─── CUSTOMERS ────────────────────────────────────────────────
export async function getCustomers() {
  if (!db) return LS.get('drm:customers', []);
  try {
    const s = await getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'asc')));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error(e); return LS.get('drm:customers', []); }
}
export async function addCustomer(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  if (!db) {
    const id = uid();
    LS.set('drm:customers', [...LS.get('drm:customers', []), { id, ...payload }]);
    return { id, ...payload };
  }
  const ref = await addDoc(collection(db, 'customers'), payload);
  return { id: ref.id, ...payload };
}
export async function updateCustomer(id, data) {
  if (!db) {
    LS.set('drm:customers', LS.get('drm:customers', []).map(c => c.id === id ? { ...c, ...data } : c));
    return;
  }
  await updateDoc(doc(db, 'customers', id), data);
}
export async function deleteCustomer(id) {
  if (!db) { LS.set('drm:customers', LS.get('drm:customers', []).filter(c => c.id !== id)); return; }
  await deleteDoc(doc(db, 'customers', id));
}

// ─── INVOICES ─────────────────────────────────────────────────
export async function getInvoices() {
  if (!db) return LS.get('drm:invoices', []);
  try {
    const s = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error(e); return LS.get('drm:invoices', []); }
}
export async function addInvoice(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  if (!db) {
    const id = uid();
    LS.set('drm:invoices', [{ id, ...payload }, ...LS.get('drm:invoices', [])]);
    return { id, ...payload };
  }
  const ref = await addDoc(collection(db, 'invoices'), payload);
  return { id: ref.id, ...payload };
}
export async function updateInvoice(id, data) {
  if (!db) {
    LS.set('drm:invoices', LS.get('drm:invoices', []).map(i => i.id === id ? { ...i, ...data } : i));
    return;
  }
  await setDoc(doc(db, 'invoices', id), data, { merge: true });
}
export async function deleteInvoice(id) {
  if (!db) { LS.set('drm:invoices', LS.get('drm:invoices', []).filter(i => i.id !== id)); return; }
  await deleteDoc(doc(db, 'invoices', id));
}
