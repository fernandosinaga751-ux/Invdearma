// src/components/UI.jsx

export const Input = ({ label, className = '', ...p }) => (
  <div>
    {label && (
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <input
      {...p}
      className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]
        bg-white transition placeholder:text-slate-300 ${className}`}
    />
  </div>
);

export const Textarea = ({ label, className = '', ...p }) => (
  <div>
    {label && (
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <textarea
      {...p}
      rows={3}
      className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]
        bg-white transition resize-none placeholder:text-slate-300 ${className}`}
    />
  </div>
);

export const Btn = ({ variant = 'primary', children, className = '', ...p }) => {
  const styles = {
    primary: 'bg-[#0f2544] hover:bg-[#1a3a6b] text-white shadow-sm',
    gold:    'bg-[#d4a017] hover:bg-[#b8870f] text-white shadow-sm',
    outline: 'border-2 border-[#0f2544] text-[#0f2544] hover:bg-[#0f2544] hover:text-white',
    ghost:   'text-slate-600 hover:bg-slate-100',
    danger:  'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    green:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    amber:   'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
  };
  return (
    <button
      {...p}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

export const Badge = ({ color = 'blue', children }) => {
  const c = {
    blue:  'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${c[color] || c.blue}`}>
      {children}
    </span>
  );
};

export const Spinner = () => (
  <div className="flex items-center justify-center p-10">
    <div className="w-8 h-8 border-4 border-[#0f2544]/20 border-t-[#0f2544] rounded-full animate-spin" />
  </div>
);

// Icons
export const Icons = {
  dash:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  doc:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  plus:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  users:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  gear:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  print:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  eye:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  trash:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  edit:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  save:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>,
  back:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>,
};
