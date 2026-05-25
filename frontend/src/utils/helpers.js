export function fm(n, sym = '$') {
  if (sym === '៛') return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) + sym;
  return sym + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function calcTotals(items = [], od = 0, odt = 'pct', taxRate = 10) {
  const sub = items.reduce((s, i) => s + i.qty * i.price, 0);
  const ld  = items.reduce((s, i) => s + i.qty * i.price * (i.disc || 0) / 100, 0);
  const ald = sub - ld;
  const oda = odt === 'pct' ? ald * (od || 0) / 100 : parseFloat(od) || 0;
  const ad  = Math.max(0, ald - oda);
  const tax = ad * taxRate / 100;
  return { sub, ld, ald, oda, ad, tax, total: ad + tax };
}

export function invPaid(inv) {
  return (inv.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
}

export function invStatus(inv, taxRate = 10) {
  const t = calcTotals(inv.items || [], inv.overall_disc || 0, inv.overall_disc_type || 'pct', taxRate);
  const paid = invPaid(inv);
  if (paid <= 0) return 'unpaid';
  if (paid >= t.total * 0.999) return 'paid';
  return 'partial';
}

export const PERMS = {
  admin:   { users: true,  settings: true,  canDelete: true,  canEdit: true,  canCreate: true,  canView: true },
  manager: { users: false, settings: true,  canDelete: true,  canEdit: true,  canCreate: true,  canView: true },
  staff:   { users: false, settings: false, canDelete: false, canEdit: true,  canCreate: true,  canView: true },
  viewer:  { users: false, settings: false, canDelete: false, canEdit: false, canCreate: false, canView: true },
};

export function can(role, perm) {
  return !!(PERMS[role] && PERMS[role][perm]);
}

export const STATUS_COLORS = {
  pending:    'bg-amber-100 text-amber-700',
  approved:   'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
  converted:  'bg-blue-100 text-blue-700',
  invoiced:   'bg-blue-100 text-blue-700',
  paid:       'bg-teal-100 text-teal-700',
  unpaid:     'bg-amber-100 text-amber-700',
  partial:    'bg-purple-100 text-purple-700',
  cancelled:  'bg-gray-100 text-gray-500',
  delivered:  'bg-teal-100 text-teal-700',
  dispatched: 'bg-blue-100 text-blue-700',
  draft:      'bg-gray-100 text-gray-500',
};

export function xlsExport(rows, filename) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded. Please check your internet connection.'); return; }
  if (!rows || rows.length === 0) { alert('No data to export'); return; }
  // Support both array-of-arrays and array-of-objects
  const ws = Array.isArray(rows[0])
    ? XLSX.utils.aoa_to_sheet(rows)
    : XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.substring(0, 31));
  XLSX.writeFile(wb, `${filename}_${today()}.xlsx`);
}
