import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can, today } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import Badge from '../components/Badge';
import { SigBadge } from '../components/Badge';
import DocViewer from '../components/DocViewer';
import SigModal from '../components/SigModal';
import Spinner from '../components/Spinner';
import useLoad from '../utils/useLoad';

const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
const Input = (p) => <input className="w-full px-2 py-1 border border-gray-200 rounded text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full px-2 py-1 border border-gray-200 rounded text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;

export default function Deliveries() {
  const { user, settings } = useAuth();
  const [dels, setDels] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [sigModal, setSigModal] = useState(null);
  const [form, setForm] = useState({ invoice_id: '', date: today(), delivery_date: '', address: '', notes: '', items: [] });

  const load = async () => {
    const [r1, r2] = await Promise.all([api.get('/deliveries'), api.get('/invoices')]);
    setDels(r1.data); setInvoices(r2.data);
  };
  const { loading } = useLoad(load);

  const filtered = search
    ? dels.filter(d => d.id?.toLowerCase().includes(search.toLowerCase()) || d.customer_name?.toLowerCase().includes(search.toLowerCase()) || d.invoice_id?.toLowerCase().includes(search.toLowerCase()))
    : dels;

  // Available invoices: hide only when EVERY item's qty has been fully covered
  // by the sum of quantities across all 'delivered' delivery slips for that invoice.
  const availableInvoices = invoices.filter(inv => {
    const invItems = (inv.items || []).filter(it => it?.product_id);
    if (!invItems.length) return true; // no items → always show
    // Sum delivered qty per product from all 'delivered' DSes
    const deliveredQtys = {};
    dels.filter(d => d.invoice_id === inv.id && d.status === 'delivered')
        .forEach(d => (d.items || []).forEach(it => {
          deliveredQtys[it.product_id] = (deliveredQtys[it.product_id] || 0) + Number(it.qty || 0);
        }));
    // Show if ANY item still has remaining quantity to deliver
    return invItems.some(it => (deliveredQtys[it.product_id] || 0) < Number(it.qty || 0));
  });
  // Invoices that have at least one 'delivered' DS but are still available → label [Partial]
  const partiallyDeliveredIds = new Set(
    dels.filter(d => d.status === 'delivered').map(d => d.invoice_id)
  );

  /* Helper: sum qty already delivered (status='delivered') per product for an invoice */
  function deliveredQtysFor(invId) {
    const qtys = {};
    dels.filter(d => d.invoice_id === invId && d.status === 'delivered')
        .forEach(d => (d.items || []).forEach(it => {
          qtys[it.product_id] = (qtys[it.product_id] || 0) + Number(it.qty || 0);
        }));
    return qtys;
  }

  /* Build remaining items for an invoice (deduct already delivered qty) */
  function remainingItems(inv) {
    const dq = deliveredQtysFor(inv.id);
    return (inv.items || [])
      .filter(i => i?.product_id)
      .map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        qty: Math.max(0, Number(i.qty || 0) - (dq[i.product_id] || 0)),
        remark: '',
      }))
      .filter(i => i.qty > 0); // skip fully-delivered items
  }

  function openCreate() {
    const first = availableInvoices[0];
    const items = first ? remainingItems(first) : [];
    const addr  = first ? (first.customer_name || '') : '';
    setForm({ invoice_id: first?.id || '', date: today(), delivery_date: '', address: addr, notes: '', items });
    setModal({ ds: null });
  }

  function openEdit(ds) {
    setForm({
      invoice_id: ds.invoice_id,
      date: ds.date,
      delivery_date: ds.delivery_date || '',
      address: ds.address || '',
      notes: ds.notes || '',
      items: (ds.items || []).map(i => ({ product_id: i.product_id, product_name: i.product_name, qty: i.qty, remark: i.remark || i.note || '' }))
    });
    setModal({ ds });
  }

  function onInvoiceChange(invId) {
    const inv = invoices.find(i => i.id === invId);
    const items = inv ? remainingItems(inv) : [];
    const addr  = inv ? (inv.customer_name || '') : '';
    setForm(f => ({ ...f, invoice_id: invId, items, address: addr }));
  }

  function setItem(i, key, val) {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }; });
  }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) })); }

  async function save() {
    const its = form.items;
    if (its.length === 0) { alert('No items to deliver.'); return; }
    if (its.length === 1 && Number(its[0].qty || 0) < 1) {
      alert('Quantity must be at least 1.'); return;
    }
    if (its.length > 1 && its.every(it => Number(it.qty || 0) < 1)) {
      alert('At least one item must have a quantity of 1 or more.'); return;
    }
    // Strip out 0-qty items (supplier doesn't have them) before saving
    const payload = { ...form, items: its.filter(it => Number(it.qty || 0) > 0) };
    if (modal.ds?.id) await api.put(`/deliveries/${modal.ds.id}`, payload);
    else await api.post('/deliveries', payload);
    setModal(null); load();
  }

  async function del(id) {
    if (!window.confirm(`Delete delivery ${id}?`)) return;
    await api.delete(`/deliveries/${id}`); load();
  }

  async function setStatus(id, status) {
    await api.put(`/deliveries/${id}/status`, { status }); load();
  }

  const statusNext  = { draft: 'dispatched', dispatched: 'delivered' };
  const statusLabel = { draft: 'Dispatch', dispatched: 'Mark Delivered' };
  const statusIcon  = { draft: 'ti-truck', dispatched: 'ti-circle-check' };
  const statusColor = { draft: 'bg-amber-50 border-amber-200 text-amber-700', dispatched: 'bg-blue-50 border-blue-200 text-blue-700' };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Delivery Slips</h1>
        {can(user?.role, 'canCreate') && <Btn variant="primary" onClick={openCreate}><i className="ti ti-plus" />Create Delivery</Btn>}
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-3 w-full sm:w-fit">
          <i className="ti ti-search text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, invoice or customer…" className="text-[12px] focus:outline-none flex-1 sm:w-56" />
          {search && <button onClick={() => setSearch('')}><i className="ti ti-x text-gray-400 text-xs" /></button>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr>{['No.', 'DS#', 'Date', 'Invoice', 'Customer', 'Items', 'Status', 'Sigs', 'Actions'].map(h =>
                <th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {[...filtered].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map((ds, idx) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-400 text-[11.5px] font-mono">{String(idx+1).padStart(4,'0')}</td>
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{ds.id}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{(ds.date||'').slice(0,10)}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-[#1D9E75]">{ds.invoice_id}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{ds.customer_name}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-500">{(ds.items || []).length} item(s)</td>
                  <td className="px-2 py-2 border-b border-gray-50"><Badge status={ds.status} /></td>
                  <td className="px-2 py-2 border-b border-gray-50"><SigBadge sigs={ds.sigs} keys={['issuer', 'customer']} /></td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1 flex-wrap">
                      <Btn variant="sm" onClick={() => setViewModal({ type: 'ds', doc: ds })}><i className="ti ti-eye" />View</Btn>
                      <Btn variant="sm" className="bg-blue-50 border-blue-200 text-blue-700" onClick={() => setSigModal({ type: 'ds', doc: ds })}><i className="ti ti-signature" />Sign</Btn>
                      {can(user?.role, 'canEdit') && ds.status !== 'delivered' && (
                        <Btn variant="sm" className={statusColor[ds.status] || ''} onClick={() => setStatus(ds.id, statusNext[ds.status])}>
                          <i className={`ti ${statusIcon[ds.status]}`} />{statusLabel[ds.status]}
                        </Btn>
                      )}
                      {can(user?.role, 'canEdit') && ds.status === 'draft' && <Btn variant="edit" onClick={() => openEdit(ds)}><i className="ti ti-edit" />Edit</Btn>}
                      {can(user?.role, 'canDelete') && ds.status === 'draft' && <Btn variant="danger" onClick={() => del(ds.id)}><i className="ti ti-trash" />Delete</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <i className="ti ti-truck text-3xl block mb-2 opacity-40" />No delivery slips found
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.ds?.id ? `Edit Delivery ${modal.ds.id}` : 'Create Delivery Slip'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Invoice">
              {!modal.ds?.id && availableInvoices.length === 0 ? (
                <div className="w-full px-2 py-1.5 border border-gray-200 rounded text-[12px] text-gray-400 bg-gray-50">
                  All invoices have been delivered
                </div>
              ) : (
                <Select value={form.invoice_id} onChange={e => onInvoiceChange(e.target.value)} disabled={!!modal.ds?.id}>
                  {(modal.ds?.id ? invoices : availableInvoices).map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.id} — {inv.customer_name}{!modal.ds?.id && partiallyDeliveredIds.has(inv.id) ? ' [Partial]' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </F>
            <F label="Date"><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></F>
            <F label="Expected Delivery Date"><Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} /></F>
            <F label="Delivery Address"><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></F>
          </div>

          {form.items.length > 0 && (
            <div className="mb-3">
              <div className="text-[11.5px] text-gray-500 font-medium mb-1">Items</div>
              <table className="w-full border-collapse text-[11.5px] border border-gray-100 rounded overflow-hidden">
                <thead><tr className="bg-gray-50">
                  {['Product', 'Qty', 'Remark', ''].map(h => <th key={h} className="px-2 py-1 text-left border-b border-gray-100 text-[11px] text-gray-500 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {form.items.map((it, i) => {
                    const singleItem = form.items.length === 1;
                    const minQty = singleItem ? 1 : 0;
                    return (
                      <tr key={i}>
                        <td className="px-2 py-1 text-[12px] font-medium">{it.product_name}</td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={minQty}
                            value={it.qty}
                            onChange={e => {
                              let v = parseInt(e.target.value);
                              if (isNaN(v) || v < 0) v = 0;
                              if (singleItem && v < 1) v = 1;
                              setItem(i, 'qty', v);
                            }}
                            className="w-16 px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input value={it.remark || ''} onChange={e => setItem(i, 'remark', e.target.value)} className="w-full px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none" placeholder="Remark…" />
                        </td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><i className="ti ti-x text-xs" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-3"><F label="Notes"><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></F></div>
          <ModalActions>
            <Btn onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}
              disabled={!modal.ds?.id && availableInvoices.length === 0}
              style={!modal.ds?.id && availableInvoices.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
              {modal.ds?.id ? 'Update' : 'Create'}
            </Btn>
          </ModalActions>
        </Modal>
      )}

      {viewModal && <Modal onClose={() => setViewModal(null)}><DocViewer type={viewModal.type} doc={viewModal.doc} co={settings} onClose={() => setViewModal(null)} onSign={() => { setSigModal({ type: viewModal.type, doc: viewModal.doc }); setViewModal(null); }} /></Modal>}
      {sigModal && <Modal onClose={() => setSigModal(null)}><SigModal type={sigModal.type} doc={sigModal.doc} onClose={() => setSigModal(null)} onSaved={() => { setSigModal(null); load(); }} /></Modal>}
    </div>
  );
}
