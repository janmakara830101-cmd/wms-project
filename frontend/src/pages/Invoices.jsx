import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can, fm, today, calcTotals, invPaid } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import Badge from '../components/Badge';
import { SigBadge } from '../components/Badge';
import DocViewer from '../components/DocViewer';
import SigModal from '../components/SigModal';

export default function Invoices() {
  const { user, settings } = useAuth();
  const sym = settings?.curr_symbol || '$';
  const taxRate = parseFloat(settings?.tax_rate) || 10;
  const [invs, setInvs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [sigModal, setSigModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [payForm, setPayForm] = useState({ date: today(), amount:0, method:'cash', ref:'', note:'' });

  const load = () => {
    api.get('/invoices').then(r => setInvs(r.data));
    api.get('/customers').then(r => setCustomers(r.data));
    api.get('/products').then(r => setProducts(r.data));
  };
  useEffect(load, []);

  const filtered = search ? invs.filter(i => i.id?.toLowerCase().includes(search.toLowerCase()) || i.customer_name?.toLowerCase().includes(search.toLowerCase())) : invs;

  function openEdit(inv) {
    setEditForm({ date:inv.date, customer_id:inv.customer_id, status:inv.status, items:(inv.items||[]).filter(i=>i?.product_id).map(i=>({product_id:i.product_id,qty:i.qty,price:parseFloat(i.price),disc:parseFloat(i.disc||0),remark:i.remark||''})), overall_disc:parseFloat(inv.overall_disc||0), overall_disc_type:inv.overall_disc_type||'pct', notes:inv.notes||'' });
    setEditModal({ inv });
  }

  async function saveEdit() { await api.put(`/invoices/${editModal.inv.id}`, editForm); setEditModal(null); load(); }
  async function del(id) { if (!window.confirm(`Delete invoice ${id}?`)) return; await api.delete(`/invoices/${id}`); load(); }

  async function addPayment(invId) {
    await api.post(`/invoices/${invId}/payments`, payForm);
    const r = await api.get('/invoices');
    setInvs(r.data);
    const updated = r.data.find(i => i.id === invId);
    if (updated) setPayModal({ inv: updated });
  }
  async function delPayment(invId, payId) { await api.delete(`/invoices/${invId}/payments/${payId}`); load(); const r = await api.get('/invoices'); const up = r.data.find(i=>i.id===invId); if(up) setPayModal({inv:up}); }

  const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
  const Input = (p) => <input className="w-full px-2 py-1 border border-gray-200 rounded text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
  const Select = ({ children, ...p }) => <select className="w-full px-2 py-1 border border-gray-200 rounded text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Invoices</h1>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-3 w-fit">
          <i className="ti ti-search text-gray-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice # or customer…" className="text-[12px] focus:outline-none w-52" />{search&&<button onClick={()=>setSearch('')}><i className="ti ti-x text-gray-400 text-xs"/></button>}
        </div>
        <table className="w-full text-[12.5px] border-collapse">
          <thead><tr>{['Invoice#','Date','Customer','Total','Paid','Balance','Status','Sigs','Actions'].map(h=><th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(inv => {
              const items = (inv.items||[]).filter(i=>i?.product_id);
              const t = calcTotals(items, inv.overall_disc||0, inv.overall_disc_type||'pct', taxRate);
              const paid = invPaid(inv);
              const bal = Math.max(0, t.total - paid);
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{inv.id}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{inv.date}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{inv.customer_name}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{fm(t.total,sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-[#1D9E75]">{fm(paid,sym)}</td>
                  <td className={`px-2 py-2 border-b border-gray-50 ${bal>0?'text-red-600':'text-[#1D9E75]'}`}>{fm(bal,sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><Badge status={inv.status} /></td>
                  <td className="px-2 py-2 border-b border-gray-50"><SigBadge sigs={inv.sigs} keys={['issuer','customer']} /></td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1 flex-wrap">
                      <Btn variant="sm" onClick={() => setViewModal({ type:'inv', doc: inv })}><i className="ti ti-eye" /></Btn>
                      <Btn variant="sm" className="bg-blue-50 border-blue-200 text-blue-700" onClick={() => setSigModal({ type:'inv', doc: inv })}><i className="ti ti-signature" /></Btn>
                      <Btn variant="sm" className="bg-green-50 border-green-300 text-green-700" onClick={() => { const t2=calcTotals((inv.items||[]).filter(i=>i?.product_id),inv.overall_disc||0,inv.overall_disc_type||'pct',taxRate); const p=invPaid(inv); setPayForm({date:today(),amount:Math.max(0,t2.total-p).toFixed(2),method:'cash',ref:'',note:''}); setPayModal({inv}); }} title="Payments"><i className="ti ti-cash" /></Btn>
                      {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openEdit(inv)}><i className="ti ti-edit" /></Btn>}
                      {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(inv.id)}><i className="ti ti-trash" /></Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pay Modal */}
      {payModal && (() => {
        const inv = payModal.inv;
        const items = (inv.items||[]).filter(i=>i?.product_id);
        const t = calcTotals(items, inv.overall_disc||0, inv.overall_disc_type||'pct', taxRate);
        const paid = invPaid(inv);
        const bal = Math.max(0, t.total - paid);
        return (
          <Modal onClose={() => setPayModal(null)}>
            <h2 className="text-sm font-medium mb-4"><i className="ti ti-cash mr-1"/>Payments — Invoice {inv.id}</h2>
            <div className="flex gap-2 mb-4">
              {[{l:'Total',v:fm(t.total,sym)},{l:'Paid',v:fm(paid,sym),c:'text-[#1D9E75]'},{l:'Balance',v:fm(bal,sym),c:bal>0?'text-red-600':'text-[#1D9E75]'}].map(s=>(
                <div key={s.l} className="bg-gray-50 rounded-md p-3 min-w-[90px]"><div className={`text-xl font-medium ${s.c||''}`}>{s.v}</div><div className="text-[11px] text-gray-500 mt-0.5">{s.l}</div></div>
              ))}
            </div>
            {(inv.payments||[]).length > 0 && (
              <div className="border border-gray-100 rounded-lg p-3 mb-4">
                {inv.payments.map(p => p?.amount && (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                    <div><div className="font-medium text-[12.5px]">{fm(p.amount,sym)}</div><div className="text-[11px] text-gray-400">{p.date} · <span className="bg-blue-50 text-blue-700 px-1.5 rounded text-[10.5px]">{p.method}</span>{p.ref?` · ${p.ref}`:''}</div></div>
                    {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => delPayment(inv.id, p.id)}><i className="ti ti-trash"/></Btn>}
                  </div>
                ))}
              </div>
            )}
            {can(user?.role,'canEdit') && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="text-[13px] font-medium mb-3">Record New Payment</div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <F label="Amount"><Input type="number" step="0.01" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} /></F>
                  <F label="Date"><Input type="date" value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))} /></F>
                  <F label="Method"><Select value={payForm.method} onChange={e=>setPayForm(f=>({...f,method:e.target.value}))}><option value="cash">Cash</option><option value="bank transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></Select></F>
                  <F label="Reference"><Input value={payForm.ref} onChange={e=>setPayForm(f=>({...f,ref:e.target.value}))} placeholder="e.g. REC-002"/></F>
                </div>
                <F label="Note"><Input value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))} /></F>
                <button onClick={() => addPayment(inv.id)} className="mt-3 px-3 py-1.5 bg-[#1D9E75] text-white rounded text-[12.5px] flex items-center gap-1 hover:bg-[#0F6E56]"><i className="ti ti-plus"/>Record Payment</button>
              </div>
            )}
            <ModalActions><Btn onClick={() => setPayModal(null)}>Close</Btn></ModalActions>
          </Modal>
        );
      })()}

      {editModal && (
        <Modal onClose={() => setEditModal(null)}>
          <h2 className="text-sm font-medium mb-4">Edit Invoice {editModal.inv.id}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Customer"><Select value={editForm.customer_id} onChange={e=>setEditForm(f=>({...f,customer_id:e.target.value}))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></F>
            <F label="Date"><Input type="date" value={editForm.date} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))} /></F>
          </div>
          <div className="mb-3"><F label="Notes"><Input value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} /></F></div>
          <ModalActions><Btn onClick={() => setEditModal(null)}>Cancel</Btn><Btn variant="primary" onClick={saveEdit}>Update</Btn></ModalActions>
        </Modal>
      )}

      {viewModal && <Modal onClose={() => setViewModal(null)}><DocViewer type={viewModal.type} doc={viewModal.doc} co={settings} onClose={() => setViewModal(null)} onSign={() => { setSigModal({ type:viewModal.type, doc:viewModal.doc }); setViewModal(null); }} /></Modal>}
      {sigModal && <Modal onClose={() => setSigModal(null)}><SigModal type={sigModal.type} doc={sigModal.doc} onClose={() => setSigModal(null)} onSaved={() => { setSigModal(null); load(); }} /></Modal>}
    </div>
  );
}
