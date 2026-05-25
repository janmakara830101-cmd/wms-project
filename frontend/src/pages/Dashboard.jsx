import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fm, calcTotals, invPaid } from '../utils/helpers';
import Badge from '../components/Badge';
import { SigBadge } from '../components/Badge';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const { settings } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const sym = settings?.curr_symbol || '$';
  const taxRate = parseFloat(settings?.tax_rate) || 10;

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return <Spinner text="Loading dashboard…" />;

  const { products, invoices, pendingQuotations, outMovements } = data;
  const low = products.filter(p => parseInt(p.stock) < parseInt(p.min_stock));
  const rev = invoices.reduce((s, i) => s + invPaid(i), 0);
  const outstanding = invoices.reduce((s, i) => {
    const items = i.items?.filter(x => x?.product_id) || [];
    const t = calcTotals(items, i.overall_disc || 0, i.overall_disc_type || 'pct', taxRate);
    return s + Math.max(0, t.total - invPaid(i));
  }, 0);

  // Monthly revenue (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), rev: 0 });
  }
  invoices.forEach(inv => (inv.payments || []).forEach(p => {
    const d = new Date(p.amount ? inv.date : '');
    // payments from dashboard include amounts
  }));
  // Simpler: sum payments by invoice date month
  invoices.forEach(inv => {
    (inv.payments || []).forEach(p => {
      if (!p?.amount) return;
      const d = new Date(inv.date);
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
      if (m) m.rev += parseFloat(p.amount || 0);
    });
  });
  const maxRev = Math.max(...months.map(m => m.rev), 1);

  // Top 5 products sold
  const soldMap = {};
  outMovements.forEach(m => { soldMap[m.product_id] = (soldMap[m.product_id] || 0) + parseInt(m.qty); });
  const top5 = products.map(p => ({ ...p, sold: soldMap[p.id] || 0 })).sort((a, b) => b.sold - a.sold).slice(0, 5);
  const maxSold = Math.max(...top5.map(t => t.sold), 1);

  const recentInvs = [...invoices].slice(0, 5);

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Dashboard</h1>
        <span className="text-[11.5px] text-gray-400">{new Date().toLocaleDateString('en-GB')}</span>
      </div>
      <div className="px-5 py-4">
        {low.length > 0 && (
          <div onClick={() => navigate('/reports?tab=outOfStock')}
            className="flex items-center gap-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4 text-[12.5px] cursor-pointer">
            <i className="ti ti-alert-triangle" />
            <div><strong>{low.length} product{low.length !== 1 ? 's' : ''} need restocking:</strong> {low.slice(0, 3).map(p => p.name).join(', ')}{low.length > 3 ? ' + more' : ''}</div>
            <i className="ti ti-chevron-right ml-auto" />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total products', value: products.length, color: '' },
            { label: 'Pending quotations', value: pendingQuotations, color: 'text-blue-600' },
            { label: 'Revenue collected', value: fm(rev, sym), color: 'text-[#1D9E75]' },
            { label: 'Outstanding', value: fm(Math.max(0, outstanding), sym), color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-md p-3">
              <div className="text-[11px] text-gray-500 mb-1">{s.label}</div>
              <div className={`text-xl font-medium ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-[12px] font-medium text-gray-500 mb-3">Monthly Revenue (last 6 months)</div>
            {months.map((m, i) => (
              <div key={i} className="flex items-center gap-2 my-1">
                <span className="text-[11px] text-gray-400 min-w-[32px] text-right">{m.label}</span>
                <div className="flex-1 bg-white rounded h-[15px] overflow-hidden">
                  <div className="h-full rounded bg-[#1D9E75]" style={{ width: `${Math.round(m.rev / maxRev * 100)}%`, minWidth: m.rev > 0 ? 3 : 0 }} />
                </div>
                <span className="text-[11px] min-w-[55px]">{fm(m.rev, sym)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-[12px] font-medium text-gray-500 mb-3">Top 5 Products Sold</div>
            {top5.map((p, i) => (
              <div key={i} className="flex items-center gap-2 my-1">
                <span className="text-[10px] text-gray-400 min-w-[65px] text-right truncate">{p.name?.substring(0, 12)}</span>
                <div className="flex-1 bg-white rounded h-[15px] overflow-hidden">
                  <div className="h-full rounded bg-blue-500" style={{ width: `${Math.round(p.sold / maxSold * 100)}%`, minWidth: p.sold > 0 ? 3 : 0 }} />
                </div>
                <span className="text-[11px] text-blue-600 min-w-[28px]">{p.sold}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-medium text-gray-500">Recent invoices</h2>
          <button onClick={() => navigate('/invoices')} className="text-[11.5px] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">View all</button>
        </div>
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr>
              {['ID','Customer','Total','Paid','Balance','Status','Sigs'].map(h => (
                <th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentInvs.map(inv => {
              const items = inv.items?.filter(x => x?.product_id) || [];
              const t = calcTotals(items, inv.overall_disc || 0, inv.overall_disc_type || 'pct', taxRate);
              const paid = invPaid(inv);
              const bal = Math.max(0, t.total - paid);
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 font-medium border-b border-gray-50">{inv.id}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{inv.customer_name}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{fm(t.total, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-[#1D9E75]">{fm(paid, sym)}</td>
                  <td className={`px-2 py-2 border-b border-gray-50 ${bal > 0 ? 'text-red-600' : 'text-[#1D9E75]'}`}>{fm(bal, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><Badge status={inv.status} /></td>
                  <td className="px-2 py-2 border-b border-gray-50"><SigBadge sigs={inv.sigs} keys={['issuer','customer']} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
