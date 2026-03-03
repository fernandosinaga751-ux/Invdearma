// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
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
// Matikan offline cache → paksa baca langsung dari server Firebase
const db = initializeFirestore(app, { localCache: memoryLocalCache() });
export { db };

// ─── SETTINGS ─────────────────────────────────────────────────
export async function getSettings() {
  try {
    const s = await getDoc(doc(db, 'config', 'settings'));
    return s.exists() ? s.data() : null;
  } catch(e) { console.error('getSettings:', e); return null; }
}
export async function saveSettings(data) {
  await setDoc(doc(db, 'config', 'settings'), data, { merge: true });
}

// ─── PASSWORD ─────────────────────────────────────────────────
export async function getPassword() {
  try {
    const s = await getDoc(doc(db, 'config', 'auth'));
    return s.exists() ? s.data().password : 'admin1234';
  } catch { return 'admin1234'; }
}
export async function savePassword(pw) {
  await setDoc(doc(db, 'config', 'auth'), { password: pw });
}

// ─── CUSTOMERS ────────────────────────────────────────────────
export async function getCustomers() {
  try {
    const s = await getDocs(collection(db, 'customers'));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getCustomers:', e); return []; }
}
export async function addCustomer(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, 'customers'), payload);
  return { id: ref.id, ...payload };
}
export async function updateCustomer(id, data) {
  await updateDoc(doc(db, 'customers', id), data);
}
export async function deleteCustomer(id) {
  await deleteDoc(doc(db, 'customers', id));
}

// ─── INVOICES ─────────────────────────────────────────────────
export async function getInvoices() {
  try {
    const s = await getDocs(collection(db, 'invoices'));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getInvoices:', e); return []; }
}
export async function addInvoice(data) {
  const payload = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, 'invoices'), payload);
  return { id: ref.id, ...payload };
}
export async function updateInvoice(id, data) {
  await setDoc(doc(db, 'invoices', id), data, { merge: true });
}
export async function deleteInvoice(id) {
  await deleteDoc(doc(db, 'invoices', id));
}