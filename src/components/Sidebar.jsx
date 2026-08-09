// src/components/Sidebar.jsx
import { Icons } from './UI.jsx';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',           icon: 'dash'  },
  { id: 'invoices',    label: 'Invoice & Kwitansi',   icon: 'doc'   },
  { id: 'new-invoice', label: 'Buat Invoice Baru',    icon: 'plus'  },
  { id: 'blank-receipt', label: 'Kwitansi Kosong',    icon: 'receipt' },
  { id: 'business-card', label: 'Cetak Kartu Nama',   icon: 'idcard' },
  { id: 'customers',   label: 'Data Customer',        icon: 'users' },
  { id: 'settings',    label: 'Pengaturan',           icon: 'gear'  },
];

export default function Sidebar({ page, setPage, onLogout, settings, sessionKind, accountLabel, isOpen, onClose }) {
  const nav = sessionKind === 'master'
    ? [...NAV, { id: 'accounts', label: 'Daftar Akun', icon: 'list' }]
    : NAV;

  const handleNav = id => { setPage(id); onClose?.(); };

  return (
    <>
      {/* Overlay khusus mobile saat sidebar terbuka */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 md:w-60 flex flex-col fixed md:static inset-y-0 left-0 z-40 min-h-screen flex-shrink-0
          transform transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: 'linear-gradient(180deg,#0f2544 0%,#07172e 100%)' }}
      >
        {/* Logo & Brand */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {settings?.logo ? (
              <img src={settings.logo} className="w-11 h-11 object-contain rounded-xl flex-shrink-0" alt="Logo" />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d4a017,#f0c040)', color: '#0f2544', fontFamily: 'Georgia,serif' }}
              >DRM</div>
            )}
            <div className="overflow-hidden">
              <div className="font-bold text-white text-xs leading-tight truncate">
                {settings?.companyName || 'Dearma Rental'}
              </div>
              <div className="text-white/40 text-[10px] mt-0.5">Sistem Invoice</div>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white p-1">
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(m => (
            <button
              key={m.id}
              onClick={() => handleNav(m.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-150
                ${page === m.id
                  ? 'bg-white text-[#0f2544] font-bold shadow-lg'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
            >
              <span className={page === m.id ? 'text-[#d4a017]' : ''}>{Icons[m.icon] || Icons.users}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>

        {/* Akun & Logout */}
        <div className="p-3 border-t border-white/10">
          <div className="px-3.5 py-2 mb-1 text-[11px] text-white/40 truncate" title={accountLabel}>
            👤 {accountLabel}{sessionKind === 'master' ? ' (Admin)' : ''}
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            {Icons.logout}
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
