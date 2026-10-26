// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicInvoice from './pages/PublicInvoice.jsx'
import HandoverPublic from './pages/HandoverPublic.jsx'

// Link untuk customer: /v/<token>  → halaman publik invoice (tanpa login)
// Link untuk petugas serah terima: /h/<token> → halaman catat kondisi mobil (tanpa login)
const m  = window.location.pathname.match(/^\/v\/([a-f0-9]{24,64})\/?$/i);
const mh = window.location.pathname.match(/^\/h\/([a-f0-9]{24,64})\/?$/i);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {m ? <PublicInvoice token={m[1]} /> : mh ? <HandoverPublic token={mh[1]} /> : <App />}
  </StrictMode>,
)
