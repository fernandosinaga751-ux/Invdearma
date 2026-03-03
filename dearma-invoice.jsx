import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════
// CONSTANTS & UTILITIES
// ═══════════════════════════════════════════════════
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n||0));
const uid = () => Date.now().toString(36)+Math.random().toString(36).substr(2,6);
const todayStr = () => new Date().toISOString().split('T')[0];
const formatDateID = d => { const dt=new Date(d+'T00:00:00'); return `${dt.getDate()} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`; };

function genInvNo(invoices, dateStr) {
  const same = invoices.filter(i => i.date === dateStr);
  const n = same.length + 1;
  const d = new Date(dateStr+'T00:00:00');
  return `No.${String(n).padStart(2,'0')}/${ROMAN[d.getMonth()]}/DRM/${d.getFullYear()}`;
}

async function toB64(file) {
  return new Promise((res,rej)=>{
    const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════
async function sg(key, def=null) {
  try { const r=await window.storage.get(key); return r?JSON.parse(r.value):def; }
  catch { return def; }
}
async function ss(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch(e){console.error(e);}
}

// ═══════════════════════════════════════════════════
// PRINT ENGINE
// ═══════════════════════════════════════════════════
function buildPrintHTML(invoice, type, settings) {
  const isK = type === 'kwitansi';
  const title = isK ? 'KWITANSI' : 'INVOICE';
  const co = settings.companyName || 'Dearma Rental Mobil Medan';
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${title} - ${invoice.invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Source Sans 3',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:12px;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 15mm;position:relative;}
  .header{display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #0f2544;margin-bottom:18px;}
  .logo-box{width:72px;height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  .logo-box img{width:100%;height:100%;object-fit:contain;}
  .logo-placeholder{width:72px;height:72px;background:linear-gradient(135deg,#0f2544,#1e4080);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#d4a017;font-weight:700;font-size:18px;letter-spacing:1px;}
  .co-name{font-family:'Playfair Display',Georgia,serif;font-size:19px;color:#0f2544;line-height:1.2;}
  .co-sub{color:#555;font-size:10px;margin-top:3px;line-height:1.6;}
  .doc-badge{margin-left:auto;text-align:right;}
  .doc-badge .label{font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#0f2544;letter-spacing:2px;border-bottom:3px solid #d4a017;padding-bottom:2px;display:inline-block;}
  .doc-badge .no{font-size:10px;color:#666;margin-top:4px;font-family:monospace;}
  .info-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
  .info-card{background:#f8f9ff;border-radius:8px;padding:10px 12px;border-left:3px solid #0f2544;}
  .info-card.right{text-align:right;border-left:none;border-right:3px solid #d4a017;}
  .info-card .lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:3px;}
  .info-card .val{font-size:13px;font-weight:700;color:#0f2544;line-height:1.3;}
  .info-card .sub{font-size:10px;color:#555;margin-top:2px;}
  table{width:100%;border-collapse:collapse;margin:10px 0;}
  thead tr{background:#0f2544;}
  th{color:#d4a017;padding:8px 10px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;}
  td{padding:8px 10px;border-bottom:1px solid #e8eaf0;font-size:11px;vertical-align:top;}
  tbody tr:nth-child(even) td{background:#f9fafb;}
  .num{text-align:center;}
  .right{text-align:right;}
  .totals{display:flex;justify-content:flex-end;margin:6px 0 18px;}
  .totals-box{width:250px;}
  .t-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8eaf0;font-size:11px;}
  .t-grand{border-top:2px solid #0f2544;border-bottom:none;margin-top:4px;font-size:14px;font-weight:700;color:#0f2544;padding-top:7px;}
  .footer{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;padding-top:16px;border-top:1px dashed #ccd;}
  .pay-info h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#0f2544;font-weight:700;margin-bottom:8px;}
  .pay-info p{font-size:11px;color:#333;line-height:1.8;}
  .sig-box{text-align:center;}
  .sig-inner{display:inline-block;min-width:160px;position:relative;}
  .sig-imgs{height:80px;position:relative;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;}
  .stamp-img{position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:90px;height:90px;object-fit:contain;opacity:0.45;}
  .sign-img{height:55px;object-fit:contain;position:relative;z-index:1;}
  .sig-name{border-top:1px solid #333;padding-top:5px;font-size:11px;font-weight:700;color:#0f2544;}
  .sig-title{font-size:9px;color:#777;margin-top:1px;}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(15,37,68,0.04);pointer-events:none;font-family:'Playfair Display',serif;white-space:nowrap;z-index:0;}
  .content{position:relative;z-index:1;}
  .notes-box{background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;margin:10px 0;font-size:10.5px;}
  .notes-box strong{color:#b45309;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style>
</head>
<body>
<div class="page">
  <div class="watermark">${title}</div>
  <div class="content">
    <div class="header">
      <div class="logo-box">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo">` : `<div class="logo-placeholder">DRM</div>`}
      </div>
      <div>
        <div class="co-name">${co}</div>
        <div class="co-sub">
          ${settings.address ? settings.address+'<br>' : ''}
          ${[settings.phone?'📞 '+settings.phone:'', settings.email?'✉ '+settings.email:''].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}
        </div>
      </div>
      <div class="doc-badge">
        <div class="label">${title}</div>
        <div class="no">${invoice.invoiceNo}</div>
      </div>
    </div>

    <div class="info-row">
      <div class="info-card">
        <div class="lbl">Kepada Yth.</div>
        <div class="val">${invoice.customerName}</div>
        ${invoice.customerPhone ? `<div class="sub">📞 ${invoice.customerPhone}</div>` : ''}
        ${invoice.customerAddress ? `<div class="sub">📍 ${invoice.customerAddress}</div>` : ''}
      </div>
      <div class="info-card right">
        <div class="lbl">Tanggal ${title}</div>
        <div class="val">${formatDateID(invoice.date)}</div>
        ${isK && invoice.paidDate ? `<div class="lbl" style="margin-top:8px;">Tanggal Bayar</div><div class="val">${formatDateID(invoice.paidDate)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:32px;">No</th>
          <th>Keterangan / Deskripsi</th>
          <th style="width:55px;text-align:center;">Qty</th>
          <th style="width:100px;text-align:right;">Harga Satuan</th>
          <th style="width:110px;text-align:right;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item,i)=>`
        <tr>
          <td class="num">${i+1}</td>
          <td>${item.description}</td>
          <td class="num">${item.qty}</td>
          <td class="right">Rp ${fmt(item.price)}</td>
          <td class="right">Rp ${fmt((item.qty||0)*(item.price||0))}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="t-row"><span>Subtotal</span><span>Rp ${fmt(invoice.subtotal)}</span></div>
        ${invoice.ppn > 0 ? `<div class="t-row"><span>PPN ${invoice.ppn}%</span><span>Rp ${fmt(invoice.ppnAmount)}</span></div>` : ''}
        <div class="t-row t-grand"><span>TOTAL</span><span>Rp ${fmt(invoice.total)}</span></div>
      </div>
    </div>

    ${invoice.notes ? `<div class="notes-box"><strong>📝 Catatan: </strong>${invoice.notes}</div>` : ''}

    <div class="footer">
      <div class="pay-info">
        ${settings.bankName||settings.bankAccount ? `
        <h4>Informasi Pembayaran</h4>
        <p>
          ${settings.bankName ? `Bank : ${settings.bankName}<br>` : ''}
          ${settings.bankAccount ? `No. Rek : <strong>${settings.bankAccount}</strong><br>` : ''}
          ${settings.ownerName ? `A/N : ${settings.ownerName}` : ''}
        </p>` : '<p style="color:#aaa;font-size:10px;font-style:italic;">Hubungi kami untuk informasi pembayaran.</p>'}
        ${isK ? `<div style="margin-top:12px;padding:8px;background:#e8f5e9;border-radius:6px;font-size:10.5px;color:#2e7d32;">
          <strong>✅ LUNAS</strong> — ${title} ini merupakan bukti pembayaran yang sah.
        </div>` : ''}
      </div>
      <div class="sig-box">
        <div class="sig-inner">
          <div style="font-size:9px;color:#888;margin-bottom:6px;">Hormat Kami,</div>
          <div class="sig-imgs">
            ${settings.stamp ? `<img src="${settings.stamp}" class="stamp-img" alt="Stempel">` : ''}
            ${settings.signature ? `<img src="${settings.signature}" class="sign-img" alt="Tanda Tangan">` : '<div style="height:55px;"></div>'}
          </div>
          <div class="sig-name">${settings.ownerName || 'Pimpinan'}</div>
          <div class="sig-title">${co}</div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function(){ window.print(); }, 400);
  };
</script>
</body>
</html>`;
}

function doPrint(invoice, type, settings) {
  const html = buildPrintHTML(invoice, type, settings);
  const w = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
  if (!w) { alert('Popup diblokir! Izinkan popup untuk mencetak.'); return; }
  w.document.write(html);
  w.document.close();
}

// ═══════════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════════
const DEF_SETTINGS = {
  companyName: 'Dearma Rental Mobil Medan',
  ownerName: '',
  phone: '',
  email: '',
  address: 'Medan, Sumatera Utara',
  bankAccount: '',
  bankName: '',
  logo: null, signature: null, stamp: null,
};

// ═══════════════════════════════════════════════════
// ICONS (inline SVG)
// ═══════════════════════════════════════════════════
const Icons = {
  dash: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  doc: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  plus: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  users: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  gear: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  print: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  eye: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  trash: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  edit: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  car: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/><path d="M5 9l2-4h10l2 4"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>,
};

// ═══════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════
const Input = ({label, ...p}) => (
  <div>
    {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <input {...p} className={`w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 bg-white transition ${p.className||''}`} style={{...p.style,focusRingColor:'#0f2544'}} />
  </div>
);

const Btn = ({variant='primary', children, ...p}) => {
  const styles = {
    primary: 'bg-[#0f2544] hover:bg-[#1a3a6b] text-white',
    gold: 'bg-[#d4a017] hover:bg-[#b8870f] text-white',
    outline: 'border border-[#0f2544] text-[#0f2544] hover:bg-[#0f2544] hover:text-white',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    green: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };
  return (
    <button {...p} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${styles[variant]} ${p.className||''}`}>
      {children}
    </button>
  );
};

const Card = ({children, className=''}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>
);

const Badge = ({color='blue', children}) => {
  const c = {blue:'bg-blue-100 text-blue-700',green:'bg-emerald-100 text-emerald-700',amber:'bg-amber-100 text-amber-700',red:'bg-red-100 text-red-700'};
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${c[color]}`}>{children}</span>;
};

// ═══════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════
function LoginPage({onLogin, settings}) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const handle = () => onLogin(pw, setErr);
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg, #0f2544 0%, #1e4080 50%, #2d5fa8 100%)'}}>
      <div className="absolute inset-0 opacity-10" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'20px 20px'}} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          {settings.logo
            ? <img src={settings.logo} className="w-24 h-24 object-contain mx-auto mb-4 rounded-xl" alt="Logo"/>
            : <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-[#d4a017] font-black text-xl" style={{background:'linear-gradient(135deg,#0f2544,#1e4080)'}}>DRM</div>
          }
          <h1 className="text-2xl font-black text-[#0f2544] tracking-tight" style={{fontFamily:'Georgia,serif'}}>
            {settings.companyName || 'Dearma Rental Mobil Medan'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Invoice & Kwitansi</p>
        </div>
        <div className="space-y-4">
          <Input label="Password Admin" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} placeholder="••••••••" />
          {err && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <Btn onClick={handle} className="w-full justify-center py-3 text-base">Masuk ke Sistem</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════
function Sidebar({page, setPage, onLogout, settings}) {
  const nav = [
    {id:'dashboard', label:'Dashboard', icon: Icons.dash},
    {id:'invoices', label:'Invoice & Kwitansi', icon: Icons.doc},
    {id:'new-invoice', label:'Buat Invoice Baru', icon: Icons.plus},
    {id:'customers', label:'Data Customer', icon: Icons.users},
    {id:'settings', label:'Pengaturan', icon: Icons.gear},
  ];
  return (
    <aside className="w-60 flex flex-col min-h-screen" style={{background:'linear-gradient(180deg,#0f2544 0%,#0a1a33 100%)'}}>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} className="w-10 h-10 object-contain rounded-xl flex-shrink-0" alt="Logo"/>
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{background:'linear-gradient(135deg,#d4a017,#f0c040)',color:'#0f2544'}}>DRM</div>
          }
          <div className="overflow-hidden">
            <div className="font-bold text-white text-xs leading-tight truncate">{settings.companyName||'Dearma Rental'}</div>
            <div className="text-white/40 text-[10px]">Sistem Invoice</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(m=>(
          <button key={m.id} onClick={()=>setPage(m.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-150
              ${page===m.id?'bg-white text-[#0f2544] font-bold shadow-lg':'text-white/60 hover:bg-white/10 hover:text-white'}`}>
            <span className={page===m.id?'text-[#d4a017]':''}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout}
          className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm text-white/40 hover:text-white hover:bg-white/10 transition">
          {Icons.logout} <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function Dashboard({invoices, customers, setPage, setViewingId}) {
  const now = new Date();
  const thisM = now.getMonth(), thisY = now.getFullYear();
  const mInvs = invoices.filter(i=>{ const d=new Date(i.date+'T00:00:00'); return d.getMonth()===thisM&&d.getFullYear()===thisY; });
  const mTotal = mInvs.reduce((s,i)=>s+i.total,0);
  const allTotal = invoices.reduce((s,i)=>s+i.total,0);
  const recent = [...invoices].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,8);

  const stats = [
    {label:'Total Invoice', val: invoices.length, sub:'Semua waktu', color:'#0f2544', icon:'📋'},
    {label:'Invoice Bulan Ini', val: mInvs.length, sub:`Rp ${fmt(mTotal)}`, color:'#059669', icon:'📅'},
    {label:'Total Pendapatan', val: `Rp ${fmt(allTotal)}`, sub:'Semua invoice', color:'#d4a017', icon:'💰', big:true},
    {label:'Data Customer', val: customers.length, sub:'Terdaftar', color:'#7c3aed', icon:'👥'},
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">{formatDateID(todayStr())}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s,i)=>(
          <Card key={i} className="p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`${s.big?'text-lg':'text-3xl'} font-black`} style={{color:s.color}}>{s.val}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-[#0f2544]">Invoice Terbaru</h2>
          <Btn variant="ghost" onClick={()=>setPage('invoices')} className="text-xs">Lihat Semua →</Btn>
        </div>
        {recent.length===0
          ? <div className="p-10 text-center text-slate-400 text-sm">Belum ada invoice. <button onClick={()=>setPage('new-invoice')} className="text-[#0f2544] font-semibold hover:underline">Buat invoice pertama →</button></div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">No. Invoice</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3"></th>
                </tr></thead>
                <tbody>
                  {recent.map(inv=>(
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-mono text-xs text-[#0f2544] font-bold">{inv.invoiceNo}</td>
                      <td className="px-5 py-3 font-medium">{inv.customerName}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDateID(inv.date)}</td>
                      <td className="px-5 py-3 text-right font-bold text-[#059669]">Rp {fmt(inv.total)}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={()=>{setViewingId(inv.id);setPage('view-invoice');}}
                          className="text-[#0f2544] hover:underline text-xs font-semibold flex items-center gap-1 ml-auto">
                          {Icons.eye} Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CUSTOMERS PAGE
// ═══════════════════════════════════════════════════
function CustomersPage({customers, saveCustomers}) {
  const empty = {name:'',phone:'',address:'',email:''};
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search));

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Nama customer wajib diisi!');
    let updated;
    if (editing) {
      updated = customers.map(c => c.id===editing ? {...c,...form} : c);
    } else {
      updated = [...customers, {...form, id: uid(), createdAt: new Date().toISOString()}];
    }
    await saveCustomers(updated);
    setForm(empty); setEditing(null); setShowForm(false);
  };

  const handleEdit = c => { setForm({name:c.name,phone:c.phone||'',address:c.address||'',email:c.email||''}); setEditing(c.id); setShowForm(true); };
  const handleDel = async id => { if(!confirm('Hapus customer ini?'))return; await saveCustomers(customers.filter(c=>c.id!==id)); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>Data Customer</h1>
          <p className="text-slate-400 text-sm">{customers.length} customer terdaftar</p>
        </div>
        <Btn onClick={()=>{setForm(empty);setEditing(null);setShowForm(true);}}>+ Tambah Customer</Btn>
      </div>

      {showForm && (
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-4">{editing?'Edit Customer':'Tambah Customer Baru'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nama Customer *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama lengkap" />
            <Input label="No. Telepon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx" />
            <Input label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@contoh.com" />
            <Input label="Alamat" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Alamat lengkap" />
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={handleSave}>{editing?'Simpan Perubahan':'Tambah Customer'}</Btn>
            <Btn variant="ghost" onClick={()=>{setShowForm(false);setEditing(null);}}>Batal</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100">
          <Input placeholder="Cari nama atau telepon..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        {filtered.length===0
          ? <div className="p-10 text-center text-slate-400 text-sm">Tidak ada data customer.</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b">
                  <th className="px-5 py-3 font-semibold">Nama</th>
                  <th className="px-5 py-3 font-semibold">Telepon</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Alamat</th>
                  <th className="px-5 py-3"></th>
                </tr></thead>
                <tbody>
                  {filtered.map(c=>(
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-[#0f2544]">{c.name}</td>
                      <td className="px-5 py-3 text-slate-600">{c.phone||'-'}</td>
                      <td className="px-5 py-3 text-slate-600">{c.email||'-'}</td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{c.address||'-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={()=>handleEdit(c)} className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.edit}</button>
                          <button onClick={()=>handleDel(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">{Icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// NEW INVOICE
// ═══════════════════════════════════════════════════
function NewInvoicePage({invoices, customers, saveInvoices, setPage, setViewingId, editingInvoice, setEditingInvoice}) {
  const today = todayStr();
  const [date, setDate] = useState(editingInvoice?.date || today);
  const [custQuery, setCustQuery] = useState(editingInvoice?.customerName || '');
  const [selCust, setSelCust] = useState(editingInvoice ? {id:editingInvoice.customerId, name:editingInvoice.customerName, phone:editingInvoice.customerPhone, address:editingInvoice.customerAddress} : null);
  const [showDrop, setShowDrop] = useState(false);
  const [items, setItems] = useState(editingInvoice?.items || [{id:uid(),description:'',qty:1,price:0}]);
  const [ppnPct, setPpnPct] = useState(editingInvoice?.ppn || 0);
  const [notes, setNotes] = useState(editingInvoice?.notes || '');
  const [saving, setSaving] = useState(false);

  const filtCust = customers.filter(c => c.name.toLowerCase().includes(custQuery.toLowerCase()));
  const subtotal = items.reduce((s,i) => s + (Number(i.qty)||0)*(Number(i.price)||0), 0);
  const ppnAmt = Math.round(subtotal * ppnPct / 100);
  const total = subtotal + ppnAmt;
  const previewNo = editingInvoice?.invoiceNo || genInvNo(invoices, date);

  const addItem = () => setItems([...items, {id:uid(),description:'',qty:1,price:0}]);
  const removeItem = id => items.length>1 && setItems(items.filter(i=>i.id!==id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id===id ? {...i,[field]:val} : i));

  const handleSave = async () => {
    if (!selCust) return alert('Pilih customer terlebih dahulu!');
    if (items.some(i => !i.description.trim())) return alert('Keterangan item tidak boleh kosong!');
    setSaving(true);
    const invNo = editingInvoice?.invoiceNo || genInvNo(invoices.filter(i=>i.id!==editingInvoice?.id), date);
    const newInv = {
      id: editingInvoice?.id || uid(),
      invoiceNo: invNo,
      customerId: selCust.id, customerName: selCust.name,
      customerPhone: selCust.phone||'', customerAddress: selCust.address||'',
      date, items: items.map(i=>({...i, qty:Number(i.qty)||1, price:Number(i.price)||0})),
      subtotal, ppn: ppnPct, ppnAmount: ppnAmt, total,
      notes, createdAt: editingInvoice?.createdAt || new Date().toISOString(),
    };
    const updated = editingInvoice
      ? invoices.map(i => i.id===editingInvoice.id ? newInv : i)
      : [...invoices, newInv];
    await saveInvoices(updated);
    setSaving(false);
    if (setEditingInvoice) setEditingInvoice(null);
    setViewingId(newInv.id);
    setPage('view-invoice');
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>
            {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
          </h1>
          <p className="text-slate-400 text-sm font-mono mt-0.5">{previewNo}</p>
        </div>
        <Btn variant="ghost" onClick={()=>setPage('invoices')}>← Kembali</Btn>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Customer */}
        <Card className="p-5 col-span-2 lg:col-span-1">
          <h3 className="font-bold text-[#0f2544] mb-3 flex items-center gap-2">{Icons.users} Customer</h3>
          <div className="relative">
            <Input label="Nama Customer *" value={custQuery}
              onChange={e=>{setCustQuery(e.target.value);setSelCust(null);setShowDrop(true);}}
              onFocus={()=>setShowDrop(true)} placeholder="Cari atau pilih customer..." />
            {showDrop && custQuery && filtCust.length>0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {filtCust.map(c=>(
                  <button key={c.id} onClick={()=>{setSelCust(c);setCustQuery(c.name);setShowDrop(false);}}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-slate-50 last:border-0">
                    <div className="font-semibold text-sm text-[#0f2544]">{c.name}</div>
                    {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                  </button>
                ))}
              </div>
            )}
            {showDrop && custQuery && filtCust.length===0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm text-slate-400">
                Customer tidak ditemukan. <button onClick={()=>setPage('customers')} className="text-[#0f2544] font-semibold hover:underline">Tambah customer baru?</button>
              </div>
            )}
          </div>
          {selCust && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
              <div className="font-bold text-[#0f2544]">{selCust.name}</div>
              {selCust.phone && <div className="text-slate-500 text-xs">📞 {selCust.phone}</div>}
              {selCust.address && <div className="text-slate-500 text-xs">📍 {selCust.address}</div>}
            </div>
          )}
        </Card>

        {/* Date & PPN */}
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-3">Detail Invoice</h3>
          <div className="space-y-3">
            <Input label="Tanggal Invoice" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PPN (%)</label>
              <div className="flex gap-2 flex-wrap">
                {[0,5,10,11,12].map(p=>(
                  <button key={p} onClick={()=>setPpnPct(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${ppnPct===p?'bg-[#0f2544] text-white border-[#0f2544]':'border-slate-200 text-slate-600 hover:border-[#0f2544]'}`}>
                    {p===0?'Tanpa PPN':`${p}%`}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Catatan (Opsional)" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Catatan tambahan..." />
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0f2544]">Rincian Keterangan</h3>
          <Btn variant="outline" onClick={addItem} className="text-xs">+ Tambah Baris</Btn>
        </div>
        <div className="space-y-2">
          <div className="grid text-xs font-semibold text-slate-400 uppercase tracking-wider px-1" style={{gridTemplateColumns:'1fr 80px 140px 36px'}}>
            <span>Keterangan</span><span className="text-center">Qty</span><span className="text-center">Harga Satuan</span><span></span>
          </div>
          {items.map((item,idx)=>(
            <div key={item.id} className="grid gap-2 items-center" style={{gridTemplateColumns:'1fr 80px 140px 36px'}}>
              <input value={item.description} onChange={e=>updateItem(item.id,'description',e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/30"
                placeholder={`Keterangan ${idx+1}...`} />
              <input type="number" min="1" value={item.qty} onChange={e=>updateItem(item.id,'qty',e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0f2544]/30" />
              <input type="number" min="0" value={item.price} onChange={e=>updateItem(item.id,'price',e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0f2544]/30" placeholder="0" />
              <button onClick={()=>removeItem(item.id)} className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition">{Icons.trash}</button>
            </div>
          ))}
        </div>

        {/* Totals Preview */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-60 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">Rp {fmt(subtotal)}</span></div>
            {ppnPct>0 && <div className="flex justify-between"><span className="text-slate-500">PPN {ppnPct}%</span><span className="font-semibold">Rp {fmt(ppnAmt)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-black text-[#0f2544]">
              <span>TOTAL</span><span>Rp {fmt(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Btn onClick={handleSave} disabled={saving} className="text-base px-6 py-3">
          {saving ? '⏳ Menyimpan...' : (editingInvoice ? '💾 Simpan Perubahan' : '✅ Simpan Invoice')}
        </Btn>
        <Btn variant="ghost" onClick={()=>setPage('invoices')}>Batal</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// INVOICE VIEW
// ═══════════════════════════════════════════════════
function ViewInvoice({invoice, settings, onBack, onEdit, onDelete}) {
  if (!invoice) return <div className="p-6"><p className="text-slate-400">Invoice tidak ditemukan.</p><Btn variant="ghost" onClick={onBack}>← Kembali</Btn></div>;

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" onClick={onBack}>← Kembali</Btn>
        <div className="flex-1" />
        <Btn variant="outline" onClick={()=>onEdit(invoice)}>{Icons.edit} Edit</Btn>
        <Btn variant="green" onClick={()=>doPrint(invoice,'invoice',settings)}>{Icons.print} Cetak Invoice</Btn>
        <Btn variant="gold" onClick={()=>doPrint(invoice,'kwitansi',settings)}>{Icons.print} Cetak Kwitansi</Btn>
        <Btn variant="danger" onClick={()=>onDelete(invoice.id)}>{Icons.trash}</Btn>
      </div>

      <Card>
        {/* Invoice Header Preview */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {settings.logo ? <img src={settings.logo} className="w-12 h-12 object-contain rounded-lg" alt="Logo"/> : <div className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-sm" style={{background:'linear-gradient(135deg,#0f2544,#1e4080)',color:'#d4a017'}}>DRM</div>}
                <div>
                  <div className="font-black text-[#0f2544] text-lg" style={{fontFamily:'Georgia,serif'}}>{settings.companyName||'Dearma Rental Mobil Medan'}</div>
                  <div className="text-xs text-slate-400">{settings.address||''}</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-2xl text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>INVOICE</div>
              <div className="font-mono text-xs text-slate-500 mt-1">{invoice.invoiceNo}</div>
              <div className="text-xs text-slate-500">{formatDateID(invoice.date)}</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <div className="text-xs text-slate-400 mb-0.5">Kepada Yth.</div>
            <div className="font-bold text-[#0f2544]">{invoice.customerName}</div>
            <div className="text-xs text-slate-500">{[invoice.customerPhone, invoice.customerAddress].filter(Boolean).join(' · ')}</div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50">
              <th className="px-5 py-3 font-semibold w-8">No</th>
              <th className="px-5 py-3 font-semibold">Keterangan</th>
              <th className="px-5 py-3 font-semibold text-center">Qty</th>
              <th className="px-5 py-3 font-semibold text-right">Harga</th>
              <th className="px-5 py-3 font-semibold text-right">Jumlah</th>
            </tr></thead>
            <tbody>
              {invoice.items.map((item,i)=>(
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-5 py-3 text-slate-400 text-center">{i+1}</td>
                  <td className="px-5 py-3">{item.description}</td>
                  <td className="px-5 py-3 text-center">{item.qty}</td>
                  <td className="px-5 py-3 text-right">Rp {fmt(item.price)}</td>
                  <td className="px-5 py-3 text-right font-semibold">Rp {fmt((item.qty||0)*(item.price||0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-5 flex justify-end border-t border-slate-100">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>Rp {fmt(invoice.subtotal)}</span></div>
            {invoice.ppn>0 && <div className="flex justify-between"><span className="text-slate-500">PPN {invoice.ppn}%</span><span>Rp {fmt(invoice.ppnAmount)}</span></div>}
            <div className="flex justify-between pt-2 border-t text-base font-black text-[#0f2544]">
              <span>TOTAL</span><span>Rp {fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && <div className="px-5 pb-4 text-xs text-slate-500 italic">📝 {invoice.notes}</div>}
      </Card>

      {/* Bank info */}
      {(settings.bankName||settings.bankAccount) && (
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Informasi Pembayaran</div>
          <div className="text-sm text-slate-700">
            {settings.bankName && <span className="mr-4">🏦 {settings.bankName}</span>}
            {settings.bankAccount && <span className="font-mono font-bold">{settings.bankAccount}</span>}
            {settings.ownerName && <span className="ml-3 text-slate-500">a/n {settings.ownerName}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// INVOICES LIST
// ═══════════════════════════════════════════════════
function InvoicesPage({invoices, customers, settings, saveInvoices, setPage, setViewingId, viewingId, editingInvoice, setEditingInvoice}) {
  const [search, setSearch] = useState('');

  if (viewingId) {
    const inv = invoices.find(i=>i.id===viewingId);
    return <ViewInvoice
      invoice={inv} settings={settings}
      onBack={()=>setViewingId(null)}
      onEdit={(inv)=>{setEditingInvoice(inv);setPage('new-invoice');}}
      onDelete={async id=>{if(!confirm('Hapus invoice ini?'))return;await saveInvoices(invoices.filter(i=>i.id!==id));setViewingId(null);}}
    />;
  }

  const filtered = [...invoices]
    .filter(i => i.customerName.toLowerCase().includes(search.toLowerCase()) || i.invoiceNo.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>Invoice & Kwitansi</h1>
          <p className="text-slate-400 text-sm">{invoices.length} total invoice</p>
        </div>
        <Btn onClick={()=>setPage('new-invoice')}>+ Buat Invoice Baru</Btn>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <Input placeholder="Cari nomor invoice atau nama customer..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        {filtered.length===0
          ? <div className="p-10 text-center text-slate-400 text-sm">Tidak ada invoice ditemukan.</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b bg-slate-50">
                  <th className="px-5 py-3 font-semibold">No. Invoice</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3 font-semibold">PPN</th>
                  <th className="px-5 py-3 font-semibold text-center">Aksi</th>
                </tr></thead>
                <tbody>
                  {filtered.map(inv=>(
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[#0f2544]">{inv.invoiceNo}</td>
                      <td className="px-5 py-3 font-medium">{inv.customerName}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{formatDateID(inv.date)}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">Rp {fmt(inv.total)}</td>
                      <td className="px-5 py-3">{inv.ppn>0?<Badge color="amber">PPN {inv.ppn}%</Badge>:<Badge color="green">Non-PPN</Badge>}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={()=>setViewingId(inv.id)} title="Detail" className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.eye}</button>
                          <button onClick={()=>doPrint(inv,'invoice',settings)} title="Cetak Invoice" className="p-1.5 text-slate-400 hover:text-[#0f2544] hover:bg-slate-100 rounded-lg transition">{Icons.print}</button>
                          <button onClick={()=>doPrint(inv,'kwitansi',settings)} title="Cetak Kwitansi"
                            className="px-2 py-1 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">KWIT</button>
                          <button onClick={async()=>{if(!confirm('Hapus invoice ini?'))return;await saveInvoices(invoices.filter(i=>i.id!==inv.id));}}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">{Icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════
function SettingsPage({settings, saveSettings, password, savePassword}) {
  const [form, setForm] = useState({...settings});
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [saved, setSaved] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const handleImg = async (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return alert('Ukuran file max 2MB!');
    const b64 = await toB64(file);
    setForm(f => ({...f, [field]: b64}));
  };

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const handlePw = async () => {
    if (!newPw.trim()) return setPwMsg('Password baru tidak boleh kosong!');
    if (newPw !== confPw) return setPwMsg('Konfirmasi password tidak cocok!');
    if (newPw.length < 4) return setPwMsg('Password minimal 4 karakter!');
    await savePassword(newPw);
    setNewPw(''); setConfPw('');
    setPwMsg('✅ Password berhasil diubah!');
    setTimeout(()=>setPwMsg(''),3000);
  };

  const ImgUpload = ({field, label, desc}) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50">
          {form[field] ? <img src={form[field]} className="w-full h-full object-contain p-1" alt={label}/> : <span className="text-3xl">{field==='logo'?'🏢':field==='signature'?'✍️':'🔴'}</span>}
        </div>
        <div>
          <label className="cursor-pointer inline-block px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition">
            📤 Upload {label}
            <input type="file" accept="image/*" className="hidden" onChange={e=>handleImg(field,e)} />
          </label>
          {form[field] && <button onClick={()=>setForm(f=>({...f,[field]:null}))} className="ml-2 text-xs text-red-500 hover:underline">Hapus</button>}
          <p className="text-xs text-slate-400 mt-1">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-2xl font-black text-[#0f2544]" style={{fontFamily:'Georgia,serif'}}>Pengaturan</h1>

      {/* Company Info */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4">Informasi Perusahaan</h3>
        <div className="space-y-3">
          <Input label="Nama Perusahaan" value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})} />
          <Input label="Nama Pemilik / Pimpinan" value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})} placeholder="Nama yang tampil di tanda tangan" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="No. Telepon / HP" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx" />
            <Input label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@contoh.com" />
          </div>
          <Input label="Alamat Lengkap" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Jl. Contoh No.1, Medan" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Bank" value={form.bankName} onChange={e=>setForm({...form,bankName:e.target.value})} placeholder="BCA / BNI / BRI / Mandiri..." />
            <Input label="No. Rekening" value={form.bankAccount} onChange={e=>setForm({...form,bankAccount:e.target.value})} placeholder="12345678xxxx" />
          </div>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4">Logo, Tanda Tangan & Stempel</h3>
        <div className="space-y-5">
          <ImgUpload field="logo" label="Logo Perusahaan" desc="Tampil di header invoice & login. PNG/JPG, max 2MB." />
          <ImgUpload field="signature" label="Tanda Tangan" desc="Tanda tangan pimpinan untuk invoice & kwitansi." />
          <ImgUpload field="stamp" label="Cap / Stempel" desc="Stempel perusahaan. Gunakan background transparan (PNG)." />
        </div>
      </Card>

      <div className="flex gap-3">
        <Btn onClick={handleSave}>{saved ? '✅ Tersimpan!' : '💾 Simpan Pengaturan'}</Btn>
      </div>

      {/* Password */}
      <Card className="p-5">
        <h3 className="font-bold text-[#0f2544] mb-4">Ubah Password Admin</h3>
        <div className="space-y-3">
          <Input label="Password Baru" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="••••••••" />
          <Input label="Konfirmasi Password Baru" type="password" value={confPw} onChange={e=>setConfPw(e.target.value)} placeholder="••••••••" />
          {pwMsg && <p className={`text-sm ${pwMsg.startsWith('✅')?'text-green-600':'text-red-500'}`}>{pwMsg}</p>}
          <Btn variant="outline" onClick={handlePw}>🔐 Ubah Password</Btn>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState('login');
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(DEF_SETTINGS);
  const [password, setPasswordState] = useState('admin1234');
  const [viewingId, setViewingId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(()=>{
    (async()=>{
      const [c,i,s,p] = await Promise.all([
        sg('drm:customers',[]),
        sg('drm:invoices',[]),
        sg('drm:settings',DEF_SETTINGS),
        sg('drm:password','admin1234'),
      ]);
      setCustomers(c||[]);
      setInvoices(i||[]);
      setSettings({...DEF_SETTINGS,...(s||{})});
      if(p) setPasswordState(p);
      setLoading(false);
    })();
  },[]);

  const saveCustomers = async d => { setCustomers(d); await ss('drm:customers',d); };
  const saveInvoices = async d => { setInvoices(d); await ss('drm:invoices',d); };
  const saveSettings = async d => { setSettings(d); await ss('drm:settings',d); };
  const savePassword = async d => { setPasswordState(d); await ss('drm:password',d); };

  const handleLogin = (pw, setErr) => {
    if (pw === password) { setIsAuth(true); setPage('dashboard'); }
    else setErr('❌ Password salah! Coba lagi.');
  };

  const handlePageChange = (p) => {
    if (p !== 'new-invoice') setEditingInvoice(null);
    if (p !== 'view-invoice' && p !== 'invoices') setViewingId(null);
    setPage(p);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#0f2544,#1e4080)'}}>
      <div className="text-white text-center">
        <div className="text-4xl mb-3">🚗</div>
        <div className="font-bold text-lg">Memuat sistem...</div>
        <div className="text-white/50 text-sm mt-1">Dearma Rental Mobil Medan</div>
      </div>
    </div>
  );

  if (!isAuth) return <LoginPage onLogin={handleLogin} settings={settings} />;

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <Dashboard invoices={invoices} customers={customers} setPage={handlePageChange} setViewingId={setViewingId} />;
      case 'customers': return <CustomersPage customers={customers} saveCustomers={saveCustomers} />;
      case 'invoices': return <InvoicesPage
        invoices={invoices} customers={customers} settings={settings}
        saveInvoices={saveInvoices} setPage={handlePageChange}
        viewingId={viewingId} setViewingId={setViewingId}
        editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice}
      />;
      case 'view-invoice': return <InvoicesPage
        invoices={invoices} customers={customers} settings={settings}
        saveInvoices={saveInvoices} setPage={handlePageChange}
        viewingId={viewingId} setViewingId={setViewingId}
        editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice}
      />;
      case 'new-invoice': return <NewInvoicePage
        invoices={invoices} customers={customers}
        saveInvoices={saveInvoices} setPage={handlePageChange}
        setViewingId={setViewingId}
        editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice}
      />;
      case 'settings': return <SettingsPage settings={settings} saveSettings={saveSettings} password={password} savePassword={savePassword} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <Sidebar page={page} setPage={handlePageChange} onLogout={()=>{setIsAuth(false);setPage('login');}} settings={settings} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
