// src/components/Sidebar.jsx
import { Icons } from './UI.jsx';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',           icon: 'dash'  },
  { id: 'invoices',    label: 'Invoice & Kwitansi',   icon: 'doc'   },
  { id: 'new-invoice', label: 'Buat Invoice Baru',    icon: 'plus'  },
  { id: 'customers',   label: 'Data Customer',        icon: 'users' },
  { id: 'settings',    label: 'Pengaturan',           icon: 'gear'  },
];

export default function Sidebar({ page, setPage, onLogout, settings }) {
  return (
    <aside
      className="w-62 flex flex-col min-h-screen flex-shrink-0"
      style={{ width: 240, background: 'linear-gradient(180deg,#0f2544 0%,#07172e 100%)' }}
    >
      {/* Logo & Brand */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(m => (
          <button
            key={m.id}
            onClick={() => setPage(m.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-150
              ${page === m.id
                ? 'bg-white text-[#0f2544] font-bold shadow-lg'
                : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            <span className={page === m.id ? 'text-[#d4a017]' : ''}>{Icons[m.icon]}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          {Icons.logout}
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
