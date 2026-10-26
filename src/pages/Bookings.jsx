// src/pages/Bookings.jsx — kalender ketersediaan per mobil + daftar booking
import { useState } from 'react';
import { Card, Input, Select, Btn, Modal, Icons } from '../components/UI.jsx';
import { MONTHS_ID, normalizeWaNumber } from '../lib/utils.js';
import { addTo, updateIn, removeFrom } from '../lib/firebase.js';
import { rentalEntries, findConflicts, fmtDT, fillTemplate, DEFAULT_WA_RETURN, DEFAULT_WA_BOOKING } from '../lib/rental.js';

const pad = n => String(n).padStart(2, '0');
const nowLocal = () => { const d = new Date(); d.setMinutes(0, 0, 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`; };
const EMPTY = () => ({ customerId: '', customerName: '', phone: '', vehicleId: '', pickupAt: nowLocal(), returnAt: '', destination: '', note: '', status: 'booking' });
const COLOR = { lunas: 'bg-emerald-500', berjalan: 'bg-amber-400', booking: 'bg-blue-500', selesai: 'bg-slate-400' };
const LABEL = { lunas: 'Invoice lunas', berjalan: 'Invoice belum lunas', booking: 'Booking', selesai: 'Selesai' };

export default function Bookings({ bookings, setBookings, vehicles, invoices, customers, settings, setPage, setBookingDraft, setEditingInvoice, setViewingId }) {
  const today = new Date();
  const [ym, setYm]         = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [form, setForm]     = useState(null);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const entries = rentalEntries(invoices, bookings);
  const vById   = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const daysInM = new Date(ym.y, ym.m + 1, 0).getDate();
  const days    = Array.from({ length: daysInM }, (_, i) => i + 1);

  const entriesOn = (vid, day) => {
    const s = new Date(ym.y, ym.m, day, 0, 0, 0), e = new Date(ym.y, ym.m, day, 23, 59, 59);
    return entries.filter(x => x.vehicleId === vid && new Date(x.start) <= e && new Date(x.end) >= s);
  };
  const colorOf = x => COLOR[x.status] || COLOR.booking;
  const shift = d => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  const upcoming = entries.filter(x => new Date(x.end) >= today).sort((a, b) => a.start.localeCompare(b.start));
  const invOf = x => invoices.find(i => i.id === x.invoiceId);
  const bkOf  = x => bookings.find(b => b.id === x.id);

  const conflicts = form ? findConflicts({ vehicleId: form.vehicleId, pickupAt: form.pickupAt, returnAt: form.returnAt, invoices, bookings, ignoreBookingId: editId }) : [];
  const vForm = form ? vById[form.vehicleId] : null;

  const save = async () => {
    if (!form.customerName.trim()) return alert('Nama customer wajib diisi!');
    if (!form.vehicleId) return alert('Pilih mobil terlebih dahulu.');
    if (!form.pickupAt || !form.returnAt) return alert('Isi tanggal & jam ambil serta kembali.');
    if (new Date(form.returnAt) <= new Date(form.pickupAt)) return alert('Waktu kembali harus setelah waktu ambil.');
    if (conflicts.length && !confirm('Mobil ini sudah terjadwal pada waktu tersebut (' + conflicts.map(c => c.label).join(', ') + ').\n\nTetap simpan booking?')) return;
    setSaving(true);
    const v = vById[form.vehicleId];
    const data = { ...form, customerName: form.customerName.trim(), vehicleName: v?.name || '', plate: v?.plate || '' };
    try {
      if (editId) { await updateIn('bookings', editId, data); setBookings(bookings.map(b => b.id === editId ? { ...b, ...data } : b)); }
      else { const a = await addTo('bookings', data); setBookings([a, ...bookings]); }
      setForm(null); setEditId(null);
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
    setSaving(false);
  };

  const setStatus = async (b, status) => {
    try { await updateIn('bookings', b.id, { status }); setBookings(bookings.map(x => x.id === b.id ? { ...x, status } : x)); setDetail(null); }
    catch (e) { alert('Gagal: ' + e.message); }
  };
  const del = async b => {
    if (!confirm('Hapus booking ini?')) return;
    try { await removeFrom('bookings', b.id); setBookings(bookings.filter(x => x.id !== b.id)); setDetail(null); }
    catch (e) { alert('Gagal menghapus: ' + e.message); }
  };
  const toInvoice = b => { setDetail(null); setEditingInvoice(null); setBookingDraft(b); setPage('new-invoice'); };

  const remind = (x, tplKey = 'waReturn') => {
    const inv = invOf(x), b = bkOf(x);
    const phone = normalizeWaNumber(inv?.customerPhone || b?.phone || x.phone);
    if (!phone) return alert('Nomor WhatsApp customer belum ada.');
    const v = vById[x.vehicleId] || {};
    const tpl = tplKey === 'waBooking' ? (settings.waBooking || DEFAULT_WA_BOOKING) : (settings.waReturn || DEFAULT_WA_RETURN);
    const text = fillTemplate(tpl, {
      nama: x.label, mobil: v.name || b?.vehicleName || inv?.rental?.vehicleName || '', plat: v.plate || b?.plate || inv?.rental?.plate || '',
      tgl_ambil: fmtDT(x.start), tgl_kembali: fmtDT(x.end), perusahaan: settings.companyName || '',
    });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const openInvoice = x => { setDetail(null); setViewingId(x.invoiceId); setPage('invoices'); };

  const EntryRow = ({ x }) => {
    const b = x.kind === 'booking' ? bkOf(x) : null;
    const v = vById[x.vehicleId];
    return (
      <div className="border border-slate-100 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-[#0f2544] text-sm">{x.label} <span className="text-slate-400 font-normal">— {v ? `${v.name} (${v.plate})` : 'mobil dihapus'}</span></div>
            <div className="text-xs text-slate-500">{fmtDT(x.start)} → {fmtDT(x.end)}</div>
            {x.no && <div className="text-[11px] font-mono text-slate-400">{x.no}</div>}
          </div>
          <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${colorOf(x)}`}>{LABEL[x.status] || x.status}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {x.kind === 'invoice' && <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => openInvoice(x)}>Buka Invoice</Btn>}
          {b && <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={() => toInvoice(b)}>🧾 Jadikan Invoice</Btn>}
          <Btn variant="green" className="text-xs px-3 py-1.5" onClick={() => remind(x, 'waReturn')}>💬 Ingatkan Kembali</Btn>
          {b && <Btn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => remind(x, 'waBooking')}>💬 Konfirmasi</Btn>}
          {b && b.status === 'booking' && <Btn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setStatus(b, 'selesai')}>✔️ Selesai</Btn>}
          {b && <Btn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => { setDetail(null); setEditId(b.id); setForm({ ...EMPTY(), ...b }); }}>{Icons.edit} Edit</Btn>}
          {b && b.status !== 'batal' && <Btn variant="ghost" className="text-xs px-3 py-1.5 text-red-500" onClick={() => setStatus(b, 'batal')}>Batalkan</Btn>}
          {b && <Btn variant="ghost" className="text-xs px-2 py-1.5 text-red-500" onClick={() => del(b)}>{Icons.trash}</Btn>}
        </div>
      </div>
    );
  };

  const pickCustomer = id => {
    const c = customers.find(x => x.id === id);
    setForm(f => ({ ...f, customerId: id, customerName: c ? c.name : f.customerName, phone: c ? (c.phone || '') : f.phone }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0f2544]" style={{ fontFamily: 'Playfair Display,Georgia,serif' }}>Booking & Kalender</h1>
          <p className="text-slate-400 text-sm">{upcoming.length} jadwal berjalan / mendatang</p>
        </div>
        <Btn onClick={() => { setEditId(null); setForm(EMPTY()); }} disabled={vehicles.length === 0}>{Icons.plus} Booking Baru</Btn>
      </div>

      {vehicles.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">Tambahkan mobil dulu di menu <strong>Armada & Sopir</strong> sebelum membuat booking.</Card>
      )}

      {vehicles.length > 0 && (
        <Card>
          <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={() => shift(-1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">‹</button>
              <div className="font-black text-[#0f2544] min-w-[150px] text-center">{MONTHS_ID[ym.m]} {ym.y}</div>
              <button onClick={() => shift(1)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">›</button>
              <button onClick={() => setYm({ y: today.getFullYear(), m: today.getMonth() })} className="text-xs font-bold text-[#0f2544] hover:underline ml-2">Bulan ini</button>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {Object.entries(LABEL).map(([k, l]) => <span key={k} className="flex items-center gap-1"><i className={`inline-block w-3 h-3 rounded ${COLOR[k]}`} />{l}</span>)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: 160 + daysInM * 34 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white z-10 text-left px-3 py-2 w-40 border-b border-slate-100 text-slate-400 uppercase tracking-wider">Mobil</th>
                  {days.map(d => {
                    const dt = new Date(ym.y, ym.m, d); const wk = dt.getDay() === 0 || dt.getDay() === 6;
                    const isT = dt.toDateString() === today.toDateString();
                    return <th key={d} className={`w-[34px] py-2 border-b border-slate-100 font-bold ${isT ? 'bg-[#0f2544] text-white' : wk ? 'text-red-400' : 'text-slate-400'}`}>{d}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td className="sticky left-0 bg-white z-10 px-3 py-1.5 border-b border-slate-50">
                      <div className="font-bold text-[#0f2544] truncate w-36" title={v.name}>{v.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{v.plate}{v.status === 'bengkel' ? ' 🔧' : ''}</div>
                    </td>
                    {days.map(d => {
                      const es = entriesOn(v.id, d);
                      return (
                        <td key={d} className="border-b border-l border-slate-50 p-0 h-9">
                          {es.length > 0 ? (
                            <button onClick={() => setDetail({ title: `${v.name} — ${d} ${MONTHS_ID[ym.m]} ${ym.y}`, entries: es })}
                              title={es.map(e => e.label).join(', ')}
                              className={`w-full h-full hover:opacity-80 ${es.length > 1 ? 'bg-red-500' : colorOf(es[0])}`} />
                          ) : (v.status === 'bengkel' ? <div className="w-full h-full bg-slate-100" /> : null)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">Kotak merah = ada jadwal bertumpuk. Klik kotak berwarna untuk melihat detail & aksi.</div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100 font-bold text-[#0f2544]">Jadwal Berjalan & Mendatang</div>
        {upcoming.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">Belum ada jadwal.</div> : (
          <div className="p-4 grid lg:grid-cols-2 gap-3">{upcoming.slice(0, 30).map(x => <EntryRow key={x.key} x={x} />)}</div>
        )}
      </Card>

      {detail && (
        <Modal wide title={detail.title} onClose={() => setDetail(null)}>
          <div className="space-y-3">{detail.entries.map(x => <EntryRow key={x.key} x={x} />)}</div>
        </Modal>
      )}

      {form && (
        <Modal wide title={editId ? 'Edit Booking' : 'Booking Baru'} onClose={() => { setForm(null); setEditId(null); }}
          footer={<><Btn onClick={save} disabled={saving} className="flex-1 justify-center py-3">{Icons.save} {saving ? 'Menyimpan...' : 'Simpan Booking'}</Btn><Btn variant="ghost" onClick={() => { setForm(null); setEditId(null); }}>Batal</Btn></>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Pilih dari Data Customer" value={form.customerId} onChange={e => pickCustomer(e.target.value)}>
              <option value="">— ketik manual —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Nama Customer *" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value, customerId: '' })} />
            <Input label="No. WhatsApp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            <Select label="Mobil *" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">— pilih mobil —</option>
              {vehicles.filter(v => v.status !== 'nonaktif').map(v => <option key={v.id} value={v.id}>{v.name} — {v.plate}</option>)}
            </Select>
            <Input label="Ambil (tanggal & jam) *" type="datetime-local" value={form.pickupAt} onChange={e => setForm({ ...form, pickupAt: e.target.value })} />
            <Input label="Kembali (tanggal & jam) *" type="datetime-local" value={form.returnAt} onChange={e => setForm({ ...form, returnAt: e.target.value })} />
            <Input label="Tujuan / Keperluan" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
            <Input label="Catatan" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          {vForm?.status === 'bengkel' && <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">🔧 Mobil ini sedang berstatus <strong>di bengkel</strong>.</div>}
          {conflicts.length > 0 && (
            <div className="mt-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2">
              ⚠️ <strong>Jadwal bentrok</strong> dengan: {conflicts.map(c => `${c.label} (${fmtDT(c.start)} – ${fmtDT(c.end)})`).join('; ')}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
