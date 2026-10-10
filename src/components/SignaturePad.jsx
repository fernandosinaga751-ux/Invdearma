// src/components/SignaturePad.jsx
// Modal untuk menggambar tanda tangan langsung di layar (jari / stylus / mouse).
// Hasilnya PNG transparan (data URL) yang dikirim lewat onSave.
import { useRef, useEffect, useState } from 'react';
import { Btn } from './UI.jsx';

const W = 640;   // resolusi internal kanvas
const H = 240;

export default function SignaturePad({ onSave, onClose, initial = null }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const last      = useRef({ x: 0, y: 0 });
  const [empty, setEmpty] = useState(true);
  const [color, setColor] = useState('#0f2544');

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const pos = e => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width  / r.width),
      y: (e.clientY - r.top)  * (c.height / r.height),
    };
  };

  const start = e => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    // titik kecil supaya sekali ketuk pun terlihat
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    setEmpty(false);
  };

  const move = e => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.strokeStyle = color;
    // tekanan stylus bila ada, jika tidak tebal tetap
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure ? 1.5 + e.pressure * 3 : 3;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  // Potong area kosong di sekeliling coretan supaya TTD pas di invoice
  const trimmedDataUrl = () => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) return null;
    const pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad);
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h);
    return out.toDataURL('image/png');
  };

  const save = () => {
    const url = trimmedDataUrl();
    if (!url) return alert('Silakan gambar tanda tangan terlebih dahulu.');
    onSave(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,37,68,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <h2 className="font-black text-[#0f2544] text-lg" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            ✍️ Gambar Tanda Tangan
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tanda tangan di kotak bawah ini dengan jari, stylus, atau mouse.</p>
        </div>

        <div className="px-6">
          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(#e2e8f0,#e2e8f0)', backgroundSize: '100% 1px', backgroundRepeat: 'no-repeat', backgroundPosition: '0 78%' }}>
            <canvas
              ref={canvasRef}
              width={W} height={H}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              onPointerCancel={end}
              className="w-full block"
              style={{ touchAction: 'none', cursor: 'crosshair', aspectRatio: `${W} / ${H}` }}
            />
            {empty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-semibold">
                Tanda tangan di sini
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Warna tinta</span>
            {[['#0f2544', 'Biru tua'], ['#000000', 'Hitam'], ['#1d4ed8', 'Biru']].map(([c, n]) => (
              <button key={c} title={n} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${color === c ? 'border-[#d4a017] scale-110' : 'border-white ring-1 ring-slate-200'}`}
                style={{ background: c }} />
            ))}
            <div className="flex-1" />
            <button onClick={clear} className="text-xs font-bold text-red-500 hover:underline">🗑️ Hapus coretan</button>
          </div>
        </div>

        <div className="px-6 py-5 flex gap-3">
          <Btn onClick={save} className="flex-1 justify-center py-3">✅ Pakai Tanda Tangan Ini</Btn>
          <Btn variant="ghost" onClick={onClose} className="px-5">Batal</Btn>
        </div>
      </div>
    </div>
  );
}
