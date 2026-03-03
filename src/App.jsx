// src/App.jsx
import { useState, useEffect } from 'react';
import Sidebar    from './components/Sidebar.jsx';
import Login      from './pages/Login.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import Customers  from './pages/Customers.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import Invoices   from './pages/Invoices.jsx';
import Settings   from './pages/Settings.jsx';
import { DEF_SETTINGS } from './lib/utils.js';
import { getSettings, getPassword, getCustomers, getInvoices } from './lib/firebase.js';

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
  const [loadError,      setLoadError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
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
      } catch(e) {
        console.error('Load error:', e);
        setLoadError('Gagal konek Firebase. Cek .env dan Firestore Rules.');
      }
      setLoading(false);
    })();
  }, []);

  const setPage = p => {
    if (p !== 'new-invoice') setEditingInvoice(null);
    if (p !== 'invoices')    setViewingId(null);
    setPageState(p);
  };

  const handleLogin = (pw, setErr) => {
    if (pw === password) { setIsAuth(true); setPage('dashboard'); }
    else setErr('❌ Password salah!');
  };

  // ── Loading splash ──────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'linear-gradient(135deg,#0f2544 0%,#1e4080 55%,#2d5fa8 100%)' }}>
      <div className="text-5xl">🚗</div>
      <div className="font-black text-xl text-white" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
        {settings.companyName || 'Dearma Rental Mobil Medan'}
      </div>
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-white/50 text-sm">Menghubungkan ke Firebase...</div>
    </div>
  );

  // ── Error konek ─────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
      style={{ background: 'linear-gradient(135deg,#0f2544,#1e4080)' }}>
      <div className="text-5xl">❌</div>
      <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-2xl">
        <h2 className="font-black text-red-600 text-lg mb-2">Gagal Konek Firebase</h2>
        <p className="text-slate-600 text-sm mb-4">{loadError}</p>
        <div className="bg-slate-50 rounded-xl p-3 text-left text-xs font-mono text-slate-500 mb-4">
          Cek:<br/>
          1. File .env sudah benar<br/>
          2. Firestore Rules: allow read, write: if true<br/>
          3. Project ID sesuai
        </div>
        <button onClick={() => window.location.reload()}
          className="bg-[#0f2544] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a3a6b] transition">
          🔄 Coba Lagi
        </button>
      </div>
    </div>
  );

  // ── Login ───────────────────────────────────────────────────
  if (!isAuth) return <Login onLogin={handleLogin} settings={settings} />;

  // ── Main app ────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard invoices={invoices} customers={customers} setPage={setPage} setViewingId={setViewingId} />;
      case 'customers':
        return <Customers customers={customers} setCustomers={setCustomers} />;
      case 'invoices':
        return <Invoices invoices={invoices} setInvoices={setInvoices} settings={settings}
                  setPage={setPage} viewingId={viewingId} setViewingId={setViewingId}
                  setEditingInvoice={setEditingInvoice} />;
      case 'new-invoice':
        return <NewInvoice invoices={invoices} customers={customers} setInvoices={setInvoices}
                  setPage={setPage} setViewingId={setViewingId}
                  editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} />;
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} password={password} setPassword={setPassword} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ fontFamily: 'Plus Jakarta Sans,Segoe UI,system-ui,sans-serif' }}>
      <Sidebar page={page} setPage={setPage}
        onLogout={() => { setIsAuth(false); setPageState('login'); }}
        settings={settings} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}