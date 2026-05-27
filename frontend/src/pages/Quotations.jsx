import React, { useState, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can, fm, today, calcTotals } from '../utils/helpers';
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

/* ── Searchable product picker ── */
const ProductSearch = ({ products, value, onSelect }) => {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const inputRef        = useRef(null);
  const sel  = products.find(p => p.id === value);
  const hits = q
    ? products.filter(p =>
        p.name?.toLowerCase().includes(q.toLowerCase()) ||
        p.name_kh?.toLowerCase().includes(q.toLowerCase()))
    : products;

  return (
    <div className="relative" style={{ minWidth: 150 }}>
      <input
        ref={inputRef}
        className="w-full px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none focus:border-[#1D9E75]"
        placeholder="Type to search…"
        value={open ? q : (sel?.name || '')}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(''); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />
      {open && (
        <div className="absolute z-[999] top-full left-0 w-60 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto mt-0.5">
          {hits.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-red-500 flex items-start gap-1.5">
              <i className="ti ti-alert-circle text-sm shrink-0 mt-0.5" />
              <span>Product not found.<br />Please add it in the <strong>Products</strong> page first.</span>
            </div>
          ) : hits.map(p => (
            <button key={p.id} type="button"
              onMouseDown={() => { onSelect(p); setOpen(false); setQ(''); }}
              className={`w-full text-left px-2.5 py-1.5 text-[11.5px] border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-gray-50
                ${value === p.id ? 'bg-[#E6F7F2]' : ''}`}>
              <span className="font-medium truncate max-w-[160px]">{p.name}</span>
              <span className="text-gray-400 text-[10.5px] shrink-0 ml-1">${parseFloat(p.price||0).toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Quotations() {
  const { user, settings } = useAuth();
  const sym = settings?.curr_symbol || '$';
  const taxRate = parseFloat(settings?.tax_rate) || 10;
  const [qts, setQts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [sigModal, setSigModal] = useState(null);
  const [form, setForm] = useState({ date: today(), customer_id:'', items:[], overall_disc:0, overall_disc_type:'pct', notes:'' });

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([api.get('/quotations'), api.get('/customers'), api.get('/products')]);
    setQts(r1.data); setCustomers(r2.data); setProducts(r3.data);
  };
  const { loading } = useLoad(load);

  const filtered = search ? qts.filter(q => q.id?.toLowerCase().includes(search.toLowerCase()) || q.customer_name?.toLowerCase().includes(search.toLowerCase())) : qts;

  function openForm(qt) {
    if (qt) {
      setForm({ date: qt.date, customer_id: qt.customer_id, items: (qt.items||[]).filter(i=>i?.product_id).map(i=>({product_id:i.product_id,product_name:i.product_name||'',qty:i.qty,price:parseFloat(i.price),disc:0,remark:i.remark||''})), overall_disc: parseFloat(qt.overall_disc||0), overall_disc_type: qt.overall_disc_type||'pct', notes: qt.notes||'' });
    } else {
      setForm({ date: today(), customer_id: customers[0]?.id||'', items: [], overall_disc:0, overall_disc_type:'pct', notes:'' });
    }
    setModal({ qt });
  }

  function setItem(i, key, val) { setForm(f => { const items = [...f.items]; items[i] = {...items[i], [key]: val}; return {...f, items}; }); }

  /* Called when user picks a product from the search dropdown */
  function selectProduct(i, p) {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], product_id: p.id, product_name: p.name, price: parseFloat(p.price) || 0 };
      return { ...f, items };
    });
  }

  /* Add a blank row — user must pick a product via search */
  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: null, product_name: '', qty: 1, price: 0, disc: 0, remark: '' }] }));
  }

  function removeItem(i) { setForm(f => ({...f, items: f.items.filter((_,j) => j!==i)})); }

  async function save() {
    if (form.items.length === 0) { alert('Please add at least one product.'); return; }
    if (form.items.some(it => !it.product_id)) {
      alert('Some rows have no product selected.\nPlease pick a product or remove the empty row.'); return;
    }
    if (modal.qt?.id) await api.put(`/quotations/${modal.qt.id}`, form);
    else await api.post('/quotations', form);
    setModal(null); load();
  }

  async function approve(id) { await api.put(`/quotations/${id}/approve`); load(); }
  async function convert(id) { await api.post(`/quotations/${id}/convert`); load(); }
  async function del(id) { if (!window.confirm(`Delete quotation ${id}?`)) return; await api.delete(`/quotations/${id}`); load(); }

  const t = calcTotals(form.items, form.overall_disc, form.overall_disc_type, 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Quotations</h1>
        {can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => openForm(null)}><i className="ti ti-plus" />Create Quotation</Btn>}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-3 w-full sm:w-fit">
          <i className="ti ti-search text-gray-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID or customer…" className="text-[12px] focus:outline-none flex-1 sm:w-52" />{search&&<button onClick={()=>setSearch('')}><i className="ti ti-x text-gray-400 text-xs"/></button>}
        </div>
        <div className="overflow-x-auto"><table className="w-full text-[12.5px] border-collapse">
          <thead><tr>{['No.','ID','Date','Customer','Gross','Disc','Total','Status','Sigs','Actions'].map(h=><th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {[...filtered].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map((q, idx) => {
              const items = (q.items||[]).filter(i=>i?.product_id);
              const t2 = calcTotals(items, q.overall_disc||0, q.overall_disc_type||'pct', 0);
              const dt = t2.ld + t2.oda;
              return (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-400 text-[11.5px] font-mono">{String(idx+1).padStart(4,'0')}</td>
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{q.id}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{(q.date||'').slice(0,10)}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{q.customer_name}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{fm(t2.sub, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-red-600">{dt > 0 ? `-${fm(dt, sym)}` : '—'}</td>
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{fm(t2.total, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><Badge status={q.status} /></td>
                  <td className="px-2 py-2 border-b border-gray-50"><SigBadge sigs={q.sigs} keys={['issuer','customer']} /></td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1 flex-wrap">
                      <Btn variant="sm" onClick={() => setViewModal({ type:'qt', doc: q })}><i className="ti ti-eye" />View</Btn>
                      <Btn variant="sm" className="bg-blue-50 border-blue-200 text-blue-700" onClick={() => setSigModal({ type:'qt', doc: q })}><i className="ti ti-signature" />Sign</Btn>
                      {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openForm(q)}><i className="ti ti-edit" />Edit</Btn>}
                      {q.status === 'pending' && can(user?.role,'canEdit') && <Btn variant="green" onClick={() => approve(q.id)}><i className="ti ti-check" />Approve</Btn>}
                      {q.status === 'approved' && can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => convert(q.id)}><i className="ti ti-receipt" />To Invoice</Btn>}
                      {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(q.id)}><i className="ti ti-trash" />Delete</Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.qt?.id ? `Edit Quotation ${modal.qt.id}` : 'Create Quotation'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Customer"><Select value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></F>
            <F label="Date"><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></F>
          </div>
          <table className="w-full border-collapse text-[11.5px] mb-2 border border-gray-100 rounded overflow-hidden">
            <thead><tr className="bg-gray-50">{['Product','Qty','Price','Sub','Remark',''].map(h=><th key={h} className="px-1.5 py-1 text-left border-b border-gray-100 text-[11px] text-gray-500 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {form.items.map((it, i) => (
                <tr key={i} className={!it.product_id ? 'bg-red-50' : ''}>
                  <td className="px-1 py-0.5">
                    <ProductSearch products={products} value={it.product_id} onSelect={p => selectProduct(i, p)} />
                  </td>
                  <td className="px-1 py-0.5"><input type="number" min="1" value={it.qty} onChange={e=>setItem(i,'qty',parseInt(e.target.value)||1)} className="w-14 px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none" /></td>
                  <td className="px-1 py-0.5"><input type="number" step="0.01" value={it.price} onChange={e=>setItem(i,'price',parseFloat(e.target.value)||0)} className="w-20 px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none" /></td>
                  <td className="px-1 py-0.5 font-medium text-[11.5px]">{fm((it.qty||0)*(it.price||0),sym)}</td>
                  <td className="px-1 py-0.5"><input value={it.remark||''} onChange={e=>setItem(i,'remark',e.target.value)} className="w-full px-1 py-0.5 border border-gray-200 rounded text-[11.5px] focus:outline-none" placeholder="…"/></td>
                  <td className="px-1 py-0.5"><button type="button" onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600"><i className="ti ti-x text-xs"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addItem} className="text-[11.5px] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1 mb-3"><i className="ti ti-plus"/>Add</button>
          <div className="bg-gray-50 rounded-md p-3 mb-3">
            <div className="text-[11.5px] font-medium text-gray-500 mb-2">Order discount</div>
            <div className="flex gap-2 items-center">
              <Select value={form.overall_disc_type} onChange={e=>setForm(f=>({...f,overall_disc_type:e.target.value}))} className="w-28"><option value="pct">Percent %</option><option value="fixed">Fixed</option></Select>
              <input type="number" min="0" step="0.5" value={form.overall_disc} onChange={e=>setForm(f=>({...f,overall_disc:parseFloat(e.target.value)||0}))} className="w-20 px-2 py-1 border border-gray-200 rounded text-[12.5px] focus:outline-none" />
              {t.oda>0&&<span className="text-red-600 text-[12.5px] font-medium">− {fm(t.oda,sym)}</span>}
            </div>
          </div>
          <div className="bg-gray-50 rounded-md p-3 mb-3 text-[12.5px]">
            <div className="flex justify-between text-gray-500 py-0.5"><span>Subtotal</span><span>{fm(t.sub,sym)}</span></div>
            {t.oda>0&&<div className="flex justify-between text-red-600 py-0.5"><span>Discount</span><span>− {fm(t.oda,sym)}</span></div>}
            <div className="flex justify-between font-medium border-t border-gray-200 mt-1 pt-1.5 text-[13.5px]"><span>Total</span><span>{fm(t.ad,sym)}</span></div>
          </div>
          <div className="mb-3"><F label="Notes"><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></F></div>
          <ModalActions><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{modal.qt?.id ? 'Update' : 'Save'}</Btn></ModalActions>
        </Modal>
      )}

      {viewModal && (
        <Modal onClose={() => setViewModal(null)}>
          <DocViewer type={viewModal.type} doc={viewModal.doc} co={settings} onClose={() => setViewModal(null)} onSign={() => { setSigModal({ type: viewModal.type, doc: viewModal.doc }); setViewModal(null); }} />
        </Modal>
      )}

      {sigModal && (
        <Modal onClose={() => setSigModal(null)}>
          <SigModal type={sigModal.type} doc={sigModal.doc} onClose={() => setSigModal(null)} onSaved={() => { setSigModal(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}
