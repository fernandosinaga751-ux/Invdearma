// src/pages/NewInvoice.jsx
import { useState } from 'react';
import { Card, Input, Btn, Icons } from '../components/UI.jsx';
import { fmt, uid, todayStr, genInvNo } from '../lib/utils.js';
import { addInvoice, updateInvoice } from '../lib/firebase.js';

export default function NewInvoice({ invoices, customers, setInvoices, setPage, setViewingId, editingInvoice, setEditingInvoice }) {
  const today = todayStr();
  const [date, setDate]       = useState(editingInvoice?.date || today);
  const [custQuery, setCustQuery] = useState(editingInvoice?.customerName || '');
  const [selCust, setSelCust] = useState(editingInvoice
    ? { id: editingInvoice.customerId, name: editingInvoice.customerName, phone: editingInvoice.customerPhone, address: editingInvoice.customerAddress }
    : null);
  const [showDrop, setShowDrop] = useState(false);
  const [items, setItems]     = useState(editingInvoice?.items || [{ id: uid(), description: '', qty: 1, price: 0 }]);
  const [ppnPct, setPpnPct]   = useState(editingInvoice?.ppn || 0);
  const [dueDate, setDueDate] = useState(editingInvoice?.dueDate || '');
  const [notes, setNotes]     = useState(editingInvoice?.notes || '');
  const [saving, setSaving]   = useState(false);

  const filtCust = customers.filter(c =>
    c.name.toLowerCase().includes(custQuery.toLowerCase())
  );
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const ppnAmt   = Math.round(subtotal * ppnPct / 100);
  const total    = subtotal + ppnAmt;
  const previewNo = editingInvoice?.invoiceNo || genInvNo(invoices, date);

  const addItem    = () => setItems([...items, { id: uid(), description: '', qty: 1, price: 0 }]);
  const removeItem = id => items.length > 1 && setItems(items.filter(i => i.id !== id));
  const updItem    = (id, f, v) => setItems(items.map(i => i.id === id ? { ...i, [f]: v } : i));

  const handleSave = async () => {
    if (!selCust)                            return alert('Pilih customer terlebih dahulu!');
    if (items.some(i => !i.description.trim())) return alert('Keterangan item tidak boleh kosong!');
    setSaving(true);
    try {
      const invNo = editingInvoice?.invoiceNo
        || genInvNo(invoices.filter(i => i.id !== editingInvoice?.id), date);

      const payload = {
        invoiceNo: invNo,
        customerId: selCust.id, customerName: selCust.name,
        customerPhone: selCust.phone || '', customerAddress: selCust.address || '',
        date, dueDate,
        items: items.map(i => ({ ...i, qty: Number(i.qty) || 1, price: Number(i.price) || 0 })),
        subtotal, ppn: ppnPct, ppnAmount: ppnAmt, total,
        notes,
      };

      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, payload);
        const updated = invoices.map(i => i.id === editingInvoice.id ? { ...i, ...payload } : i);
        setInvoices(updated);
        setEditingInvoice(null);
        setViewingId(editingInvoice.id);
      } else {
        const added = await addInvoice(payload);
        setInvoices([{ ...payload, id: added.id, createdAt: new Date().toISOString() }, ...invoices]);
        setViewingId(added.id);
      }
      setPage('invoices');
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>
            {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
          </h1>
          <p className="text-slate-400 text-sm font-mono mt-0.5">{previewNo}</p>
        </div>
        <Btn variant="ghost" onClick={() => setPage('invoices')}>{Icons.back} Kembali</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer */}
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-3 flex items-center gap-2">{Icons.users} Customer</h3>
          <div className="relative">
            <Input
              label="Nama Customer *"
              value={custQuery}
              onChange={e => { setCustQuery(e.target.value); setSelCust(null); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder="Cari atau pilih customer..."
            />
            {showDrop && custQuery && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                {filtCust.length > 0 ? filtCust.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => { setSelCust(c); setCustQuery(c.name); setShowDrop(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-slate-50 last:border-0"
                  >
                    <div className="font-bold text-sm text-[#0f2544]">{c.name}</div>
                    {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                  </button>
                )) : (
                  <div className="p-3 text-sm text-slate-400">
                    Customer tidak ditemukan.{' '}
                    <button onClick={() => setPage('customers')} className="text-[#0f2544] font-bold hover:underline">Tambah baru?</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {selCust && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
              <div className="font-bold text-[#0f2544]">{selCust.name}</div>
              {selCust.phone   && <div className="text-slate-500 text-xs mt-0.5">📞 {selCust.phone}</div>}
              {selCust.address && <div className="text-slate-500 text-xs">📍 {selCust.address}</div>}
            </div>
          )}
        </Card>

        {/* Detail */}
        <Card className="p-5">
          <h3 className="font-bold text-[#0f2544] mb-3">Detail Invoice</h3>
          <div className="space-y-3">
            <Input label="Tanggal Invoice" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Due Date / Jatuh Tempo (Opsional)" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">PPN</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 5, 10, 11, 12].map(p => (
                  <button
                    key={p}
                    onClick={() => setPpnPct(p)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition
                      ${ppnPct === p ? 'bg-[#0f2544] text-white border-[#0f2544]' : 'border-slate-200 text-slate-600 hover:border-[#0f2544]'}`}
                  >
                    {p === 0 ? 'Tanpa PPN' : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Catatan (Opsional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0f2544]">Rincian Keterangan</h3>
          <Btn variant="outline" onClick={addItem} className="text-xs px-3 py-1.5">+ Tambah Baris</Btn>
        </div>

        <div className="space-y-2">
          <div
            className="hidden md:grid text-xs font-bold text-slate-400 uppercase tracking-wider px-1 gap-2"
            style={{ gridTemplateColumns: '1fr 72px 150px 36px' }}
          >
            <span>Keterangan</span>
            <span className="text-center">Qty</span>
            <span className="text-right pr-1">Harga Satuan (Rp)</span>
            <span></span>
          </div>
          {items.map((item, idx) => (
            <div key={item.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 72px 150px 36px' }}>
              <input
                value={item.description}
                onChange={e => updItem(item.id, 'description', e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder={`Keterangan ${idx + 1}...`}
              />
              <input
                type="number" min="1"
                value={item.qty}
                onChange={e => updItem(item.id, 'qty', e.target.value)}
                className="border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
              />
              <input
                type="number" min="0"
                value={item.price}
                onChange={e => updItem(item.id, 'price', e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#0f2544]/25 focus:border-[#0f2544]"
                placeholder="0"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition"
              >{Icons.trash}</button>
            </div>
          ))}
        </div>

        {/* Total preview */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">Rp {fmt(subtotal)}</span>
            </div>
            {ppnPct > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">PPN {ppnPct}%</span>
                <span className="font-bold">Rp {fmt(ppnAmt)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-[#0f2544] text-base font-black text-[#0f2544]">
              <span>TOTAL</span>
              <span>Rp {fmt(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 pb-6">
        <Btn onClick={handleSave} disabled={saving} className="text-base px-6 py-3">
          {Icons.save}
          {saving ? 'Menyimpan...' : (editingInvoice ? 'Simpan Perubahan' : 'Simpan Invoice')}
        </Btn>
        <Btn variant="ghost" onClick={() => setPage('invoices')}>Batal</Btn>
      </div>
    </div>
  );
}
