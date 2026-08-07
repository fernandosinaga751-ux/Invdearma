// src/App.jsx
import { useState, useEffect } from 'react';
import Sidebar    from './components/Sidebar.jsx';
import { Icons }  from './components/UI.jsx';
import Login      from './pages/Login.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import Customers  from './pages/Customers.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import Invoices   from './pages/Invoices.jsx';
import Settings   from './pages/Settings.jsx';
import Accounts   from './pages/Accounts.jsx';
import BlankReceipt from './pages/BlankReceipt.jsx';
import BusinessCard from './pages/BusinessCard.jsx';
import { DEF_SETTINGS } from './lib/utils.js';
import {
  watchAuthState, bindAndVerifyAccount,
  restoreMasterSessionIfAny, logoutMaster, logoutAccount,
  getSettings, getCustomers, getInvoices,
} from './lib/firebase.js';

const NAV_TITLES = {
  dashboard: 'Dashboard', invoices: 'Invoice & Kwitansi', 'new-invoice': 'Buat Invoice Baru',
  'blank-receipt': 'Kwitansi Kosong', 'business-card': 'Cetak Kartu Nama',
  customers: 'Data Customer', settings: 'Pengaturan', accounts: 'Daftar Akun',
};

// Timeout helper — jika Firebase > 8 detik, lempar error
function withTimeout(promise, ms = 8000) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  return Promise.race([promise, t]);
}

export default function App() {
  const [page,           setPageState]     = useState('dashboard');
  const [authChecking,   setAuthChecking]  = useState(true);
  const [sessionKind,    setSessionKind]   = useState(null); // 'master' | 'account' | null
  const [fbUser,         setFbUser]        = useState(null); // objek user Firebase Auth (hanya utk 'account')
  const [dataLoading,    setDataLoading]   = useState(false);
  const [customers,      setCustomers]     = useState([]);
  const [invoices,       setInvoices]      = useState([]);
  const [settings,       setSettings]      = useState(DEF_SETTINGS);
  const [viewingId,      setViewingId]     = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loadError,      setLoadError]     = useState('');
  const [sidebarOpen,    setSidebarOpen]   = useState(false);

  // ── Deteksi sesi aktif saat pertama kali app dibuka ─────────────
  useEffect(() => {
    // 1) Prioritas: sesi Login Utama (master) yang tersimpan lokal
    if (restoreMasterSessionIfAny()) {
      setSessionKind('master');
      setAuthChecking(false);
      return;
    }
    // 2) Kalau tidak, pantau status login akun (Firebase Auth)
    const unsub = watchAuthState(async (u) => {
      if (u) {
        try {
          await bindAndVerifyAccount(u);
          setFbUser(u);
          setSessionKind('account');
        } catch (e) {
          setFbUser(null);
          setSessionKind(null);
          if (e.message === 'ACCOUNT_DISABLED') {
            setLoadError('Akun ini telah dinonaktifkan sementara oleh admin.');
          }
        }
      } else {
        setFbUser(null);
        setSessionKind(null);
      }
      setAuthChecking(false);
    });
    return unsub;
  }, []);

  // ── Muat data khusus sesi aktif setiap kali sesi berganti ───────
  useEffect(() => {
    if (!sessionKind) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setLoadError('');
      try {
        const [s, c, i] = await withTimeout(
          Promise.all([getSettings(), getCustomers(), getInvoices()])
        );
        if (cancelled) return;
        setSettings(s ? { ...DEF_SETTINGS, ...s } : DEF_SETTINGS);
        setCustomers(c || []);
        setInvoices(i  || []);
      } catch(e) {
        if (cancelled) return;
        const msg = e.message === 'timeout'
          ? 'Koneksi Firebase timeout. Periksa Rules Firestore dan Project ID di .env'
          : 'Gagal konek Firebase: ' + e.message;
        setLoadError(msg);
      }
      if (!cancelled) setDataLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionKind, fbUser?.uid]);

  const setPage = p => {
    if (p !== 'new-invoice') setEditingInvoice(null);
    if (p !== 'invoices')    setViewingId(null);
    setPageState(p);
  };

  const resetLocalState = () => {
    setCustomers([]); setInvoices([]); setSettings(DEF_SETTINGS);
    setPageState('dashboard'); setLoadError(''); setSidebarOpen(false);
  };

  const handleMasterLogin = () => {
    setSessionKind('master');
    resetLocalState();
  };

  const handleLogout = async () => {
    if (sessionKind === 'master') logoutMaster();
    else await logoutAccount();
    setSessionKind(null);
    setFbUser(null);
    resetLocalState();
  };

  // ── Memeriksa sesi login ────────────────────────────────────────
  if (authChecking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: 'linear-gradient(135deg,#0f2544 0%,#1e4080 55%,#2d5fa8 100%)' }}>
      <div className="text-5xl">🚗</div>
      <div className="font-black text-xl text-white text-center" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
        Dearma Rental Mobil Medan
      </div>
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-white/50 text-sm">Memeriksa sesi login...</div>
    </div>
  );

  // ── Belum login → tampilkan halaman Login ──────────────────────
  if (!sessionKind) return <Login settings={settings} onMasterLogin={handleMasterLogin} />;

  // ── Memuat data khusus sesi yang login ───────────────────────────
  if (dataLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: 'linear-gradient(135deg,#0f2544 0%,#1e4080 55%,#2d5fa8 100%)' }}>
      <div className="text-5xl">🚗</div>
      <div className="font-black text-xl text-white text-center" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
        Dearma Rental Mobil Medan
      </div>
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-white/50 text-sm">Menghubungkan ke Firebase...</div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
      style={{ background: 'linear-gradient(135deg,#0f2544,#1e4080)' }}>
      <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">
        <div className="text-3xl mb-3 text-center">⚠️</div>
        <h2 className="font-black text-red-600 text-lg mb-2 text-center">Gagal Konek Firebase</h2>
        <p className="text-slate-600 text-sm mb-4 text-center">{loadError}</p>
        <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-500 space-y-1 mb-5">
          <div>✅ Cek Firestore Rules → akses per akun (lihat README)</div>
          <div>✅ Cek file .env → Project ID benar</div>
          <div>✅ Cek di Vercel → Environment Variables sudah diisi</div>
        </div>
        <button onClick={() => window.location.reload()}
          className="w-full bg-[#0f2544] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3a6b] transition">
          🔄 Coba Lagi
        </button>
      </div>
    </div>
  );

  // ── App ───────────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard invoices={invoices} customers={customers} setPage={setPage} setViewingId={setViewingId} />;
      case 'customers':   return <Customers customers={customers} setCustomers={setCustomers} />;
      case 'invoices':    return <Invoices  invoices={invoices} setInvoices={setInvoices} settings={settings}
                                    setPage={setPage} viewingId={viewingId} setViewingId={setViewingId}
                                    setEditingInvoice={setEditingInvoice} />;
      case 'new-invoice': return <NewInvoice invoices={invoices} customers={customers} setInvoices={setInvoices}
                                    setPage={setPage} setViewingId={setViewingId}
                                    editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} />;
      case 'settings':    return <Settings settings={settings} setSettings={setSettings} sessionKind={sessionKind} fbUser={fbUser} />;
      case 'accounts':    return sessionKind === 'master' ? <Accounts /> : <Dashboard invoices={invoices} customers={customers} setPage={setPage} setViewingId={setViewingId} />;
      case 'blank-receipt': return <BlankReceipt settings={settings} setPage={setPage} />;
      case 'business-card': return <BusinessCard settings={settings} setPage={setPage} />;
      default: return null;
    }
  };

  const accountLabel = fbUser?.displayName || fbUser?.email || '';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ fontFamily: 'Plus Jakarta Sans,Segoe UI,system-ui,sans-serif' }}>
      <Sidebar
        page={page} setPage={setPage}
        onLogout={handleLogout}
        settings={settings}
        sessionKind={sessionKind}
        accountLabel={accountLabel}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-[#0f2544] p-1 -ml-1">
            {Icons.menu}
          </button>
          <div className="font-bold text-[#0f2544] text-sm">{NAV_TITLES[page] || 'Dearma Rental'}</div>
        </div>
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
