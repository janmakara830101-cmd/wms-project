import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Btn } from '../components/Modal';
import Spinner from '../components/Spinner';
import useLoad from '../utils/useLoad';

const F = ({ label, children, hint }) => (
  <div>
    <label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>
    {children}
    {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
  </div>
);
const Input = (p) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;

const CURRENCIES = [
  { sym: '$', name: 'USD — US Dollar' },
  { sym: '€', name: 'EUR — Euro' },
  { sym: '£', name: 'GBP — British Pound' },
  { sym: '¥', name: 'JPY — Japanese Yen' },
  { sym: '₭', name: 'LAK — Lao Kip' },
  { sym: '฿', name: 'THB — Thai Baht' },
  { sym: '₫', name: 'VND — Vietnamese Dong' },
  { sym: '៛', name: 'KHR — Cambodian Riel' },
  { sym: 'RM', name: 'MYR — Malaysian Ringgit' },
  { sym: 'Rp', name: 'IDR — Indonesian Rupiah' },
];

export default function Settings() {
  const { user, refreshSettings } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_logo: '', curr_symbol: '$', tax_label: 'Tax', tax_rate: '10', invoice_prefix: 'INV-', quote_prefix: 'QT-', delivery_prefix: 'DS-', footer_note: '', bank_name: '', bank_account: '', bank_account_name: '', bank_qr: '' });
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [tab, setTab] = useState('company');

  const load = async () => {
    const r = await api.get('/settings');
    const s = r.data;
    setForm({
      company_name: s.company_name || '',
      company_address: s.company_address || '',
      company_phone: s.company_phone || '',
      company_email: s.company_email || '',
      company_logo: s.company_logo || '',
      curr_symbol: s.curr_symbol || '$',
      tax_label: s.tax_label || 'Tax',
      tax_rate: s.tax_rate || '10',
      invoice_prefix: s.invoice_prefix || 'INV-',
      quote_prefix: s.quote_prefix || 'QT-',
      delivery_prefix: s.delivery_prefix || 'DS-',
      footer_note: s.footer_note || '',
      bank_name: s.bank_name || '',
      bank_account: s.bank_account || '',
      bank_account_name: s.bank_account_name || '',
      bank_qr: s.bank_qr || '',
    });
  };
  const { loading } = useLoad(load);

  async function saveSettings() {
    await api.put('/settings', form);
    await refreshSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePw() {
    setPwErr(''); setPwOk(false);
    if (!pwForm.old_password || !pwForm.new_password) return setPwErr('All fields required');
    if (pwForm.new_password !== pwForm.confirm) return setPwErr('Passwords do not match');
    if (pwForm.new_password.length < 6) return setPwErr('Minimum 6 characters');
    try {
      await api.post('/auth/change-password', { old_password: pwForm.old_password, new_password: pwForm.new_password });
      setPwOk(true);
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (e) {
      setPwErr(e.response?.data?.error || 'Failed to change password');
    }
  }

  async function exportBackup() {
    const r = await api.get('/settings/backup');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `wms-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!window.confirm('This will overwrite all data. Continue?')) return;
        await api.post('/settings/restore', data);
        alert('Restore successful. Refreshing…');
        window.location.reload();
      } catch { alert('Invalid backup file'); }
    };
    reader.readAsText(file);
  }

  if (loading) return <Spinner />;

  function handleQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, bank_qr: ev.target.result }));
    reader.readAsDataURL(file);
  }

  const TABS = [
    { key: 'company', label: 'Company', icon: 'ti-building' },
    { key: 'finance', label: 'Finance', icon: 'ti-currency-dollar' },
    { key: 'bank', label: 'Banking', icon: 'ti-building-bank' },
    { key: 'security', label: 'Security', icon: 'ti-lock' },
    ...(isAdmin ? [{ key: 'backup', label: 'Backup', icon: 'ti-database-export' }] : []),
  ];

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Settings</h1>
        {tab !== 'security' && tab !== 'backup' && isAdmin && (
          <button onClick={saveSettings} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[12.5px] transition-all ${saved ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-[#1D9E75] text-white hover:bg-[#0F6E56]'}`}>
            <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />{saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="px-5 pt-3 border-b border-gray-100 flex gap-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] border-b-2 transition-colors ${tab === t.key ? 'border-[#1D9E75] text-[#1D9E75] font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 max-w-2xl">

        {/* Company Settings */}
        {tab === 'company' && (
          <div className="space-y-4">
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3">Company Information</div>
            <F label="Company Name"><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} disabled={!isAdmin} /></F>
            <F label="Address"><Input value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} disabled={!isAdmin} /></F>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Phone"><Input value={form.company_phone} onChange={e => setForm(f => ({ ...f, company_phone: e.target.value }))} disabled={!isAdmin} /></F>
              <F label="Email"><Input value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} disabled={!isAdmin} /></F>
            </div>
            <div>
              <label className="block text-[11.5px] text-gray-500 mb-2">Company Logo</label>
              <div className="flex gap-4 items-start flex-wrap">
                {/* Preview */}
                {form.company_logo ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={form.company_logo} alt="Logo preview" className="h-16 max-w-[160px] object-contain border border-gray-200 rounded-lg p-2 bg-white" onError={e => e.target.style.display='none'} />
                    {isAdmin && (
                      <button onClick={() => setForm(f => ({ ...f, company_logo: '' }))} className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1">
                        <i className="ti ti-trash" />Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-28 h-16 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300">
                    <i className="ti ti-photo text-2xl" />
                    <span className="text-[10px] mt-0.5">No logo</span>
                  </div>
                )}
                {/* Upload + URL fallback */}
                {isAdmin && (
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-[#1D9E75] text-[#1D9E75] bg-[#f0faf6] rounded-md text-[12px] hover:bg-[#e0f5ee] cursor-pointer w-fit font-medium">
                      <i className="ti ti-upload" />Upload Logo Image
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setForm(f => ({ ...f, company_logo: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    <div className="text-[11px] text-gray-400">— or paste image URL —</div>
                    <Input value={form.company_logo?.startsWith('data:') ? '' : (form.company_logo || '')} onChange={e => setForm(f => ({ ...f, company_logo: e.target.value }))} placeholder="https://…/logo.png" />
                    <div className="text-[11px] text-gray-400">PNG / JPG / SVG. Upload stores the image directly (works in PDF &amp; offline).</div>
                  </div>
                )}
              </div>
            </div>
            <F label="Document Footer Note" hint="Appears at the bottom of invoices, quotations, and deliveries.">
              <textarea value={form.footer_note} onChange={e => setForm(f => ({ ...f, footer_note: e.target.value }))} disabled={!isAdmin} rows={2} className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] resize-none" />
            </F>
          </div>
        )}

        {/* Finance Settings */}
        {tab === 'finance' && (
          <div className="space-y-4">
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3">Currency & Tax</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Currency Symbol">
                <Select value={form.curr_symbol} onChange={e => setForm(f => ({ ...f, curr_symbol: e.target.value }))} disabled={!isAdmin}>
                  {CURRENCIES.map(c => <option key={c.sym} value={c.sym}>{c.sym} — {c.name.split('—')[1].trim()}</option>)}
                </Select>
              </F>
              <F label="Tax Label" hint="e.g. VAT, GST, Tax">
                <Input value={form.tax_label} onChange={e => setForm(f => ({ ...f, tax_label: e.target.value }))} disabled={!isAdmin} />
              </F>
              <F label="Tax Rate (%)">
                <Input type="number" min="0" max="100" step="0.5" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} disabled={!isAdmin} />
              </F>
            </div>
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3 mt-4">Document Number Prefixes</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <F label="Invoice Prefix"><Input value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} disabled={!isAdmin} /></F>
              <F label="Quotation Prefix"><Input value={form.quote_prefix} onChange={e => setForm(f => ({ ...f, quote_prefix: e.target.value }))} disabled={!isAdmin} /></F>
              <F label="Delivery Prefix"><Input value={form.delivery_prefix} onChange={e => setForm(f => ({ ...f, delivery_prefix: e.target.value }))} disabled={!isAdmin} /></F>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[11.5px] rounded-md px-3 py-2 mt-2">
              <i className="ti ti-alert-triangle mr-1" />Changing prefixes only affects new documents. Existing documents keep their current IDs.
            </div>
          </div>
        )}

        {/* Banking */}
        {tab === 'bank' && (
          <div className="space-y-4">
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3">Bank / Payment Details</div>
            <p className="text-[12px] text-gray-500 -mt-2">These details appear on every invoice document so customers know how to pay.</p>
            <F label="Bank Name"><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} disabled={!isAdmin} placeholder="e.g. ABA Bank, Wing, ACLEDA…" /></F>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Account Number"><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} disabled={!isAdmin} placeholder="e.g. 000-123-456" /></F>
              <F label="Account Holder Name"><Input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))} disabled={!isAdmin} placeholder="e.g. MY TRADING CO." /></F>
            </div>
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mt-4">QR Code for Payment</div>
            <div className="flex gap-4 items-start flex-wrap">
              {form.bank_qr ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={form.bank_qr} alt="Bank QR" className="w-28 h-28 object-contain border border-gray-200 rounded-lg p-1 bg-white" />
                  {isAdmin && (
                    <button onClick={() => setForm(f => ({ ...f, bank_qr: '' }))} className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1">
                      <i className="ti ti-trash" />Remove
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-28 h-28 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300">
                  <i className="ti ti-qrcode text-3xl" />
                  <span className="text-[10px] mt-1">No QR</span>
                </div>
              )}
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 hover:bg-gray-50 cursor-pointer w-fit">
                    <i className="ti ti-upload text-gray-400" />Upload QR Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                  </label>
                  <div className="text-[11px] text-gray-400">— or paste image URL —</div>
                  <Input value={form.bank_qr?.startsWith('data:') ? '' : form.bank_qr} onChange={e => setForm(f => ({ ...f, bank_qr: e.target.value }))} placeholder="https://…/qr.png" />
                  <div className="text-[11px] text-gray-400">PNG / JPG recommended. Upload stores image directly in the system (works offline & in PDF).</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security */}
        {tab === 'security' && (
          <div className="max-w-sm">
            <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-4">Change Your Password</div>
            <div className="space-y-3">
              <F label="Current Password"><Input type="password" value={pwForm.old_password} onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} /></F>
              <F label="New Password"><Input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} /></F>
              <F label="Confirm New Password"><Input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></F>
            </div>
            {pwErr && <div className="mt-2 text-red-600 text-[12px] flex items-center gap-1"><i className="ti ti-alert-circle" />{pwErr}</div>}
            {pwOk && <div className="mt-2 text-green-600 text-[12px] flex items-center gap-1"><i className="ti ti-circle-check" />Password changed successfully!</div>}
            <button onClick={changePw} className="mt-4 px-4 py-1.5 bg-[#1D9E75] text-white rounded text-[12.5px] hover:bg-[#0F6E56] flex items-center gap-1">
              <i className="ti ti-lock" />Change Password
            </button>
          </div>
        )}

        {/* Backup / Restore */}
        {tab === 'backup' && isAdmin && (
          <div className="space-y-6">
            <div>
              <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3">Export Backup</div>
              <p className="text-[12px] text-gray-500 mb-3">Download a full JSON backup of all your data (products, customers, invoices, etc.).</p>
              <button onClick={exportBackup} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[12.5px] hover:bg-blue-100">
                <i className="ti ti-download" />Download Backup JSON
              </button>
            </div>
            <div>
              <div className="text-[12px] font-medium text-gray-600 border-b border-gray-100 pb-1 mb-3">Restore from Backup</div>
              <p className="text-[12px] text-gray-500 mb-3">Upload a previously exported backup file. <strong className="text-red-600">This will overwrite all existing data.</strong></p>
              <label className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-[12.5px] hover:bg-red-100 cursor-pointer w-fit">
                <i className="ti ti-upload" />Choose Backup File
                <input type="file" accept=".json" className="hidden" onChange={importBackup} />
              </label>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
              <div className="text-[12px] font-medium text-gray-600 mb-1.5"><i className="ti ti-info-circle mr-1" />About Backups</div>
              <ul className="text-[11.5px] text-gray-500 space-y-1 list-disc list-inside">
                <li>Backups include all products, customers, suppliers, quotations, invoices, deliveries, and payments</li>
                <li>User accounts and passwords are not included in backups</li>
                <li>Company settings are included</li>
                <li>Restore operation cannot be undone</li>
              </ul>
            </div>
          </div>
        )}

        {!isAdmin && tab !== 'security' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-700 text-[12px] rounded-md px-4 py-3">
            <i className="ti ti-lock mr-1" />Only admins can modify settings.
          </div>
        )}
      </div>
    </div>
  );
}
