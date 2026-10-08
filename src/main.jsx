// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicInvoice from './pages/PublicInvoice.jsx'

// Link untuk customer: /v/<token>  → halaman publik (tanpa login)
const m = window.location.pathname.match(/^\/v\/([a-f0-9]{24,64})\/?$/i);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {m ? <PublicInvoice token={m[1]} /> : <App />}
  </StrictMode>,
)
