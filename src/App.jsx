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
import Features   from './pages/Features.jsx';
import FeatureRequests from './pages/FeatureRequests.jsx';
import Fleet      from './pages/Fleet.jsx';
import Bookings   from './pages/Bookings.jsx';
import Expenses   from './pages/Expenses.jsx';
import Reports    from './pages/Reports.jsx';
import Backup     from './pages/Backup.jsx';
import { LockedFeature } from './components/FeatureGate.jsx';
import { canUse } from './lib/features.js';
import { DEF_SETTINGS } from './lib/utils.js';
import {
  watchAuthState, bindAndVerifyAccount, logoutSession,
  getSettings, getCustomers, getInvoices, getShares,
  listCol, getMyAccess, createFeatureRequest, cancelFeatureRequest, getAllFeatureRequests,
} from './lib/firebase.js';

const NAV_TITLES = {
  dashboard: 'Dashboard', invoices: 'Invoice & Kwitansi', 'new-invoice': 'Buat Invoice Baru',
  'blank-receipt': 'Kwitansi Kosong', 'business-card': 'Cetak Kartu Nama',
  customers: 'Data Customer', settings: 'Pengaturan', accounts: 'Daftar Akun',
  features: 'Fitur Tambahan', 'feature-requests': 'Pengajuan Fitur', fleet: 'Armada & Sopir',
  bookings: 'Booking & Kalender', expenses: 'Pengeluaran', reports: 'Laporan & Piutang', backup: 'Backup Data',
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
  const [fbUser,         setFbUser]        = useState(null); // objek user Firebase Auth
  const [dataLoading,    setDataLoading]   = useState(false);
  const [customers,      setCustomers]     = useState([]);
  const [invoices,       setInvoices]      = useState([]);
  const [shares,         setShares]        = useState({}); // { invoiceId: shareDoc }
  const [settings,       setSettings]      = useState(DEF_SETTINGS);
  const [viewingId,      setViewingId]     = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loadError,      setLoadError]     = useState('');
  const [sidebarOpen,    setSidebarOpen]   = useState(false);
  // ── Fitur tambahan (khusus admin utama; akun biasa perlu persetujuan) ──
  const [features,       setFeatures]      = useState([]);
  const [requests,       setRequests]      = useState([]);
  const [adminPending,   setAdminPending]  = useState(0);
  const [vehicles,       setVehicles]      = useState([]);
  const [drivers,        setDrivers]       = useState([]);
  const [bookings,       setBookings]      = useState([]);
  const [expenses,       setExpenses]      = useState([]);
  const [featureWarn,    setFeatureWarn]   = useState('');
  const [bookingDraft,   setBookingDraft]  = useState(null);

  // ── Pantau status login Firebase Auth (Login Utama & Akun) ──────
  useEffect(() => {
    const unsub = watchAuthState(async (u) => {
      if (u) {
        try {
          const res = await bindAndVerifyAccount(u);
          setFeatures(res.features || []);
          setFbUser(u);
          setSessionKind(res.kind);
        } catch (e) {
          setFbUser(null);
          setSessionKind(null);
          if (e.message === 'ACCOUNT_PENDING') {
            setLoadError('Akun ini masih menunggu persetujuan admin.');
          } else if (e.message === 'ACCOUNT_DISABLED') {
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

  const can = id => canUse(sessionKind, features, id);

  // Muat data fitur tambahan hanya untuk fitur yang boleh dipakai (hindari "permission denied")
  const loadFeatureData = async (kind, feats) => {
    const has = id => canUse(kind, feats, id);
    const plan = [['vehicles', 'fleet', setVehicles], ['drivers', 'fleet', setDrivers],
                  ['bookings', 'booking', setBookings], ['expenses', 'expenses', setExpenses]];
    const failed = [];
    await Promise.all(plan.map(async ([col, f, set]) => {
      if (!has(f)) { set([]); return; }
      try { set(await listCol(col)); } catch (e) { console.error('loadFeatureData', col, e); failed.push(col); }
    }));
    setFeatureWarn(failed.length ? `Data fitur (${failed.join(', ')}) gagal dimuat. Pastikan Firestore Rules terbaru sudah dipublikasikan (lihat README).` : '');
  };

  const refreshAdminPending = async () => {
    try { setAdminPending((await getAllFeatureRequests()).filter(r => r.status === 'pending').length); }
    catch (e) { console.warn('pengajuan fitur:', e.message); }
  };

  const refreshAccess = async () => {
    try {
      const a = await getMyAccess();
      setRequests(a.requests);
      if ([...a.features].sort().join() !== [...features].sort().join()) {
        setFeatures(a.features);
        await loadFeatureData('account', a.features);
      }
    } catch (e) { console.warn('refreshAccess:', e.message); }
  };

  const access = {
    requests,
    refresh: refreshAccess,
    submit: async (fid, note) => { const r = await createFeatureRequest(fid, note); setRequests(l => [r, ...l]); },
    cancel: async id => { await cancelFeatureRequest(id); setRequests(l => l.filter(r => r.id !== id)); },
  };

  // ── Muat data khusus sesi aktif setiap kali sesi berganti ───────
  useEffect(() => {
    if (!sessionKind) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setLoadError('');
      try {
        const [s, c, i, sh] = await withTimeout(
          Promise.all([getSettings(), getCustomers(), getInvoices(), getShares()])
        );
        if (cancelled) return;
        setSettings(s ? { ...DEF_SETTINGS, ...s } : DEF_SETTINGS);
        setCustomers(c || []);
        setInvoices(i  || []);
        setShares(sh || {});

        // Izin fitur terbaru + pengajuan (akun biasa) / jumlah pengajuan menunggu (admin)
        let feats = features;
        if (sessionKind === 'account') {
          try { const a = await getMyAccess(); feats = a.features; setFeatures(a.features); setRequests(a.requests); }
          catch (e) { console.warn('getMyAccess:', e.message); }
        } else { refreshAdminPending(); }
        await loadFeatureData(sessionKind, feats);
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

  const refreshShares = async () => setShares(await getShares());

  const pendingCount = Object.values(shares).filter(x => x.proposal?.status === 'pending').length;

  const setPage = p => {
    if (p !== 'new-invoice') setEditingInvoice(null);
    if (p !== 'invoices')    setViewingId(null);
    if (p !== 'new-invoice') setBookingDraft(null);
    setPageState(p);
  };

  const handleLogout = async () => {
    await logoutSession();
    setSessionKind(null);
    setFbUser(null);
    setCustomers([]); setInvoices([]); setShares({}); setSettings(DEF_SETTINGS);
    setFeatures([]); setRequests([]); setVehicles([]); setDrivers([]); setBookings([]); setExpenses([]); setFeatureWarn(''); setBookingDraft(null);
    setPageState('dashboard'); setLoadError(''); setSidebarOpen(false);
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
  if (!sessionKind) return (
    <>
      <Login settings={settings} />
      {loadError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl px-5 py-3 text-sm text-red-600 max-w-sm text-center z-50">
          ⚠️ {loadError}
        </div>
      )}
    </>
  );

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
          <div>✅ Cek file .env → Project ID & VITE_ADMIN_EMAIL benar</div>
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
  const gate = (id, el) => can(id) ? el : <LockedFeature featureId={id} access={access} setPage={setPage} />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard invoices={invoices} customers={customers} setPage={setPage} setViewingId={setViewingId} pendingCount={pendingCount}
                                    can={can} vehicles={vehicles} bookings={bookings} />;
      case 'customers':   return <Customers customers={customers} setCustomers={setCustomers} invoices={invoices} can={can} setPage={setPage} />;
      case 'invoices':    return <Invoices  invoices={invoices} setInvoices={setInvoices} customers={customers} settings={settings}
                                    setPage={setPage} viewingId={viewingId} setViewingId={setViewingId}
                                    setEditingInvoice={setEditingInvoice}
                                    shares={shares} refreshShares={refreshShares} can={can} />;
      case 'new-invoice': return <NewInvoice invoices={invoices} customers={customers} setInvoices={setInvoices}
                                    setPage={setPage} setViewingId={setViewingId}
                                    editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} settings={settings}
                                    can={can} vehicles={vehicles} drivers={drivers} bookings={bookings} setBookings={setBookings}
                                    bookingDraft={bookingDraft} setBookingDraft={setBookingDraft} />;
      case 'settings':    return <Settings settings={settings} setSettings={setSettings} sessionKind={sessionKind} fbUser={fbUser} can={can} />;
      case 'accounts':    return sessionKind === 'master' ? <Accounts /> : null;
      case 'blank-receipt': return <BlankReceipt settings={settings} setPage={setPage} />;
      case 'business-card': return <BusinessCard settings={settings} setPage={setPage} />;
      case 'features':    return <Features sessionKind={sessionKind} features={features} access={access} setPage={setPage} />;
      case 'feature-requests': return sessionKind === 'master' ? <FeatureRequests onChanged={refreshAdminPending} /> : null;
      case 'fleet':       return gate('fleet', <Fleet vehicles={vehicles} setVehicles={setVehicles} drivers={drivers} setDrivers={setDrivers} invoices={invoices} bookings={bookings} />);
      case 'bookings':    return gate('booking', <Bookings bookings={bookings} setBookings={setBookings} vehicles={vehicles} invoices={invoices} customers={customers}
                                    settings={settings} setPage={setPage} setBookingDraft={setBookingDraft} setEditingInvoice={setEditingInvoice} setViewingId={setViewingId} />);
      case 'expenses':    return gate('expenses', <Expenses expenses={expenses} setExpenses={setExpenses} vehicles={vehicles} invoices={invoices} fleetOn={can('fleet')} />);
      case 'reports':     return gate('reports', <Reports invoices={invoices} expenses={expenses} vehicles={vehicles} settings={settings} setPage={setPage} setViewingId={setViewingId} />);
      case 'backup':      return gate('backup', <Backup settings={settings} customers={customers} invoices={invoices} />);
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
        can={can}
        requestBadge={adminPending}
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
        <main className="flex-1 overflow-y-auto">
          {featureWarn && (
            <div className="mx-4 mt-4 sm:mx-6 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5">⚠️ {featureWarn}</div>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
