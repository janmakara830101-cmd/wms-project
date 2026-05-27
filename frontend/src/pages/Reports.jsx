import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fm, xlsExport } from '../utils/helpers';
import Spinner from '../components/Spinner';

const today10 = () => new Date().toISOString().slice(0,10);

const tabs = [
  { key: 'products',    label: 'Products',      icon: 'ti-box' },
  { key: 'stock-in',    label: 'Stock In',       icon: 'ti-arrow-bar-to-down' },
  { key: 'stock-out',   label: 'Stock Out',      icon: 'ti-arrow-bar-up' },
  { key: 'hot',         label: 'Hot Selling',    icon: 'ti-flame' },
  { key: 'low-stock',   label: 'Low Stock',      icon: 'ti-alert-triangle' },
  { key: 'quotations',  label: 'Quotations',     icon: 'ti-file-description' },
  { key: 'invoices',    label: 'Invoices',       icon: 'ti-receipt' },
  { key: 'customers',   label: 'Customers',      icon: 'ti-users' },
  { key: 'suppliers',   label: 'Suppliers',      icon: 'ti-truck' },
];

export default function Reports() {
  const { settings } = useAuth();
  const sym = settings?.curr_symbol || '$';
  const [tab, setTab] = useState('invoices');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const tabLabel = tabs.find(t => t.key === tab)?.label || tab;
  const coName = settings?.company_name || 'PARTKH247';
  const coLogo = settings?.company_logo || '';

  async function load(t) {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await api.get(`/reports/${t}`, { params });
      setData(r.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(tab); }, [tab, dateFrom, dateTo]);

  function exportXls() {
    xlsExport(data, `${tab}-report`);
  }

  /* ── Print report ── */
  function printReport() {
    const el = document.getElementById('report-table');
    if (!el) return;
    const dateRange = (dateFrom || dateTo) ? ` (${dateFrom || '…'} → ${dateTo || '…'})` : '';
    const w = window.open('', '_blank', 'width=1050,height=820');
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>${tabLabel} Report</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
  body { font-family:Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @media screen { body { padding:24px; max-width:1050px; margin:0 auto; } }
  @media print  { @page { size:A4 landscape; margin:10mm 12mm; } body { margin:0; padding:0; } }
</style>
</head><body>
<div class="text-[13px] text-gray-800">
  <div class="mb-4 pb-2 border-b border-gray-300 flex items-center gap-3">
    ${coLogo ? `<img src="${coLogo}" style="height:52px;max-width:120px;object-fit:contain;" onerror="this.style.display='none'" />` : ''}
    <div>
      <div class="text-[17px] font-semibold">${coName}</div>
      <div class="text-[13px] font-medium text-gray-600">${tabLabel} Report${dateRange}</div>
      <div class="text-[11px] text-gray-400">Printed: ${today10()}</div>
    </div>
  </div>
  ${el.outerHTML}
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},1200);});<\/script>
</body></html>`);
    w.document.close();
  }

  /* ── PDF report ── */
  async function savePdfReport() {
    const html2pdf = window.html2pdf;
    if (!html2pdf) { alert('PDF library not loaded.'); return; }
    const el = document.getElementById('report-content');
    if (!el) return;
    setPdfLoading(true);
    try {
      await html2pdf().set({
        margin: [8, 6, 8, 6],
        filename: `${tabLabel}-Report_${today10()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      }).from(el).save();
    } finally { setPdfLoading(false); }
  }

  function renderTable() {
    if (loading) return <Spinner />;
    if (!data.length) return <div className="py-12 text-center text-gray-400">No data found</div>;

    switch (tab) {
      case 'products':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','SKU','Name','Category','Price','Stock','Unit','Low Stock At','Status'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td>{r.sku}</Td><Td bold>{r.name}</Td><Td>{r.category_name}</Td>
                <Td>{fm(r.price,sym)}</Td>
                <Td className={parseInt(r.stock)<=parseInt(r.low_stock_at)?'text-red-600 font-medium':''}>{r.stock}</Td>
                <Td>{r.unit}</Td><Td>{r.low_stock_at}</Td>
                <Td><span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${parseInt(r.stock)<=parseInt(r.low_stock_at)?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{parseInt(r.stock)<=parseInt(r.low_stock_at)?'Low Stock':'OK'}</span></Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'stock-in':
      case 'stock-out':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Date','Product','Category','Qty','Supplier','Shelf','Ref','Note'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td>{(r.date||'').slice(0,10)}</Td><Td bold>{r.product_name}</Td><Td>{r.category_name}</Td>
                <Td className={tab==='stock-in'?'text-blue-700':'text-red-700'}>{tab==='stock-in'?'+':'-'}{r.qty}</Td>
                <Td>{r.supplier_name||'—'}</Td><Td>{r.shelf||'—'}</Td><Td>{r.ref||'—'}</Td><Td>{r.note||'—'}</Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'hot':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Product','Category','Total Sold','Revenue'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td bold>{r.name}</Td><Td>{r.category_name}</Td>
                <Td className="text-blue-700 font-medium">{r.total_sold}</Td>
                <Td className="text-green-700 font-medium">{fm(r.revenue,sym)}</Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'low-stock':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Product','Category','Current Stock','Low Stock At','Unit','Needed'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td bold>{r.name}</Td><Td>{r.category_name}</Td>
                <Td className="text-red-600 font-medium">{r.stock}</Td>
                <Td>{r.low_stock_at}</Td><Td>{r.unit}</Td>
                <Td className="text-amber-700 font-medium">{Math.max(0, parseInt(r.low_stock_at) - parseInt(r.stock) + 5)}</Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'quotations':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','ID','Date','Customer','Gross','Disc','Total','Status'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td bold>{r.id}</Td><Td>{(r.date||'').slice(0,10)}</Td><Td>{r.customer_name}</Td>
                <Td>{fm(r.sub,sym)}</Td>
                <Td className="text-red-600">{parseFloat(r.disc||0)>0?`-${fm(r.disc,sym)}`:'—'}</Td>
                <Td bold>{fm(r.total,sym)}</Td>
                <Td><span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${r.status==='approved'?'bg-green-100 text-green-700':r.status==='converted'?'bg-purple-100 text-purple-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'invoices':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Invoice#','Date','Customer','Total','Paid','Balance','Status'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {data.map((r,i) => {
                const bal = Math.max(0, parseFloat(r.total||0) - parseFloat(r.paid||0));
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                    <Td bold>{r.id}</Td><Td>{(r.date||'').slice(0,10)}</Td><Td>{r.customer_name}</Td>
                    <Td bold>{fm(r.total,sym)}</Td>
                    <Td className="text-green-700">{fm(r.paid,sym)}</Td>
                    <Td className={bal>0?'text-red-600':'text-green-700'}>{fm(bal,sym)}</Td>
                    <Td><span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${r.status==='paid'?'bg-green-100 text-green-700':r.status==='partial'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></Td>
                  </tr>
                );
              })}
              {data.length > 0 && (
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-2 py-2 text-[11.5px] font-medium text-gray-500">TOTALS</td>
                  <Td bold>{fm(data.reduce((s,r)=>s+parseFloat(r.total||0),0),sym)}</Td>
                  <Td className="text-green-700 font-medium">{fm(data.reduce((s,r)=>s+parseFloat(r.paid||0),0),sym)}</Td>
                  <Td className="text-red-600 font-medium">{fm(data.reduce((s,r)=>s+Math.max(0,parseFloat(r.total||0)-parseFloat(r.paid||0)),0),sym)}</Td>
                  <Td />
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'customers':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Customer','Phone','Email','Total Orders','Total Spent'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td bold>{r.name}</Td><Td>{r.phone||'—'}</Td><Td>{r.email||'—'}</Td>
                <Td>{r.total_orders}</Td>
                <Td className="text-green-700 font-medium">{fm(r.total_spent,sym)}</Td>
              </tr>
            ))}</tbody>
          </table>
        );

      case 'suppliers':
        return (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['No.','Supplier','Contact','Phone','Email','Total Deliveries','Products'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>{data.map((r,i) => (
              <tr key={i} className="hover:bg-gray-50">
                <Td className="text-gray-400 font-mono">{String(i+1).padStart(4,'0')}</Td>
                <Td bold>{r.name}</Td><Td>{r.contact||'—'}</Td><Td>{r.phone||'—'}</Td><Td>{r.email||'—'}</Td>
                <Td>{r.total_deliveries}</Td>
                <Td className="text-gray-500 max-w-[200px] truncate">{r.products||'—'}</Td>
              </tr>
            ))}</tbody>
          </table>
        );

      default: return null;
    }
  }

  const hasDates = ['stock-in','stock-out','quotations','invoices'].includes(tab);

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Reports</h1>
        <div className="flex gap-2">
          {/* Print */}
          <button onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded text-[12.5px] hover:bg-gray-50 shadow-sm">
            <i className="ti ti-printer" />Print
          </button>
          {/* PDF */}
          <button onClick={savePdfReport} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded text-[12.5px] hover:bg-red-100 shadow-sm disabled:opacity-60">
            {pdfLoading ? <><i className="ti ti-loader-2 animate-spin" />PDF…</> : <><i className="ti ti-file-type-pdf" />PDF</>}
          </button>
          {/* Excel */}
          <button onClick={exportXls}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 bg-green-50 text-green-700 rounded text-[12.5px] hover:bg-green-100">
            <i className="ti ti-file-spreadsheet" />Excel
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-5 pt-3 border-b border-gray-100 flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-[#1D9E75] text-[#1D9E75] font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4" id="report-content">
        {/* Report heading — shown on screen, print, and PDF */}
        <div className="mb-4 pb-3 border-b border-gray-200 flex items-center gap-3" id="report-pdf-header">
          {coLogo && <img src={coLogo} alt="Logo" className="h-12 max-w-[110px] object-contain" onError={e => e.target.style.display='none'} />}
          <div>
            <div className="text-[15px] font-semibold">{coName}</div>
            <div className="text-[12px] text-gray-600">{tabLabel} Report</div>
            <div className="text-[11px] text-gray-400">Generated: {today10()}</div>
          </div>
        </div>
        {/* Date filters */}
        {hasDates && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <i className="ti ti-calendar" />
              <span>From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-[#1D9E75]" />
              <span>To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-[12px] focus:outline-none focus:border-[#1D9E75]" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[11.5px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <i className="ti ti-x text-xs" />Clear
              </button>
            )}
          </div>
        )}

        {/* Summary cards for invoices */}
        {tab === 'invoices' && data.length > 0 && (
          <div className="flex gap-3 mb-4 flex-wrap">
            {[
              { l: 'Total Revenue', v: fm(data.reduce((s,r)=>s+parseFloat(r.total||0),0),sym), c: '' },
              { l: 'Collected', v: fm(data.reduce((s,r)=>s+parseFloat(r.paid||0),0),sym), c: 'text-[#1D9E75]' },
              { l: 'Outstanding', v: fm(data.reduce((s,r)=>s+Math.max(0,parseFloat(r.total||0)-parseFloat(r.paid||0)),0),sym), c: 'text-red-600' },
              { l: 'Invoices', v: data.length, c: '' },
            ].map(s => (
              <div key={s.l} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 min-w-[120px]">
                <div className={`text-lg font-semibold ${s.c}`}>{s.v}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Summary cards for hot selling */}
        {tab === 'hot' && data.length > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              <div className="text-lg font-semibold">{data.reduce((s,r)=>s+parseInt(r.total_sold||0),0)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Total Units Sold</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              <div className="text-lg font-semibold text-[#1D9E75]">{fm(data.reduce((s,r)=>s+parseFloat(r.revenue||0),0),sym)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Total Revenue</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto" id="report-table">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}

const Th = ({ children }) => <th className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{children}</th>;
const Td = ({ children, bold, className = '' }) => <td className={`px-2 py-2 border-b border-gray-50 ${bold ? 'font-medium' : ''} ${className}`}>{children}</td>;
