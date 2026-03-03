// src/App.jsx
import { useState, useEffect } from 'react';
import Sidebar   from './components/Sidebar.jsx';
import Login     from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import Invoices  from './pages/Invoices.jsx';
import Settings  from './pages/Settings.jsx';
import { DEF_SETTINGS } from './lib/utils.js';
import {
  getSettings, getPassword, getCustomers, getInvoices, USE_LOCAL,
} from './lib/firebase.js';

export default function App() {
  const [page,           setPageState]     = useState('login');
  const [isAuth,         setIsAuth]        = useState(false);
  const [loading,        setLoading]       = useState(true);
  const [customers,      setCustomers]     = useState([]);
  const [invoices,       setInvoices]      = useState([]);
  const [settings,       setSettings]      = useState(DEF_SETTINGS);
  const [password,       setPassword]      = useState('admin1234');
  const [viewingId,      setViewingId]     = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    // Timeout 6 detik — jika Firebase hang, tetap lanjut
    const timeout = setTimeout(() => setLoading(false), 6000);

    (async () => {
      try {
        await firebaseReady;
        const [s, p, c, i] = await Promise.all([
          getSettings(),
          getPassword(),
          getCustomers(),
          getInvoices(),
        ]);
        if (s) setSettings({ ...DEF_SETTINGS, ...s });
        if (p) setPassword(p);
        setCustomers(c || []);
        setInvoices(i  || []);
      } catch (e) {
        console.error('Load error:', e);
      }
      clearTimeout(timeout);
      setLoading(false);
    })();

    return () => clearTimeout(timeout);
  }, []);

  const setPage = p => {
    if (p !== 'new-invoice') setEditingInvoice(null);
    if (p !== 'invoices')    setViewingId(null);
    setPageState(p);
  };

  const handleLogin = async (pw, setErr) => {
    if (pw === password) { setIsAuth(true); setPage('dashboard'); }
    else setErr('❌ Password salah! Silakan coba lagi.');
  };

  // ── Loading splash ──────────────────────────────────────────
  if (loading) return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'linear-gradient(135deg,#0f2544 0%,#1e4080 55%,#2d5fa8 100%)' }}
    >
      <div className="text-5xl">🚗</div>
      <div className="font-black text-xl text-white" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
        {settings.companyName || 'Dearma Rental Mobil Medan'}
      </div>
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-white/50 text-sm">
        {USE_LOCAL ? 'Memuat data lokal...' : 'Menghubungkan ke Firebase...'}
      </div>
    </div>
  );

  // ── Login ───────────────────────────────────────────────────
  if (!isAuth) return (
    <>
      <Login onLogin={handleLogin} settings={settings} />
      {USE_LOCAL && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            💾 Mode Lokal — Data disimpan di browser. Isi .env untuk pakai Firebase.
          </div>
        </div>
      )}
    </>
  );

  // ── Main app ────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard invoices={invoices} customers={customers} setPage={setPage} setViewingId={setViewingId} />;
      case 'customers':
        return <Customers customers={customers} setCustomers={setCustomers} />;
      case 'invoices':
        return <Invoices invoices={invoices} setInvoices={setInvoices} settings={settings} setPage={setPage}
                  viewingId={viewingId} setViewingId={setViewingId} setEditingInvoice={setEditingInvoice} />;
      case 'new-invoice':
        return <NewInvoice invoices={invoices} customers={customers} setInvoices={setInvoices} setPage={setPage}
                  setViewingId={setViewingId} editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} />;
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} password={password} setPassword={setPassword} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: 'Plus Jakarta Sans,Segoe UI,system-ui,sans-serif' }}>
      <Sidebar page={page} setPage={setPage} onLogout={() => { setIsAuth(false); setPageState('login'); }} settings={settings} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
        {USE_LOCAL && (
          <div className="fixed bottom-3 right-3 z-50">
            <div className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow">
              💾 Mode Lokal
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
