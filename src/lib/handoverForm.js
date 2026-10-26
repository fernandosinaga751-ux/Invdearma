// src/lib/handoverForm.js
// Bentuk data serah terima yang dipakai bersama oleh modal admin (HandoverModal)
// dan halaman link petugas (HandoverPublic).
import { HANDOVER_CHECKS } from './rental.js';

export const CONDITIONS = ['Baik', 'Lecet / cacat ringan', 'Rusak', 'Tidak ada'];

const pad = n => String(n).padStart(2, '0');
export const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const defChecks = () => Object.fromEntries(HANDOVER_CHECKS.map(c => [c, 'Baik']));
export const defSide = () => ({ at: nowLocal(), km: '', fuel: 'Penuh', checks: defChecks(), notes: '', custSig: '', staffSig: '' });

// Gabungkan data tersimpan (cur) dengan nilai bawaan. `r` = data sewa invoice (opsional).
export function initHandover(cur = {}, r = {}) {
  return {
    vehicleName: cur.vehicleName ?? r.vehicleName ?? '',
    plate: cur.plate ?? r.plate ?? '',
    idNo: cur.idNo || '',
    out: { ...defSide(), ...(cur.out || {}), checks: { ...defChecks(), ...(cur.out?.checks || {}) } },
    back: { ...defSide(), at: '', ...(cur.back || {}), checks: { ...defChecks(), ...(cur.back?.checks || {}) }, fines: cur.back?.fines || [] },
    finesAddedAt: cur.finesAddedAt || '',
    officerName: cur.officerName || '',
  };
}
