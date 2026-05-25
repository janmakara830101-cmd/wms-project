import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can, today } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import { CatBadge, ShelfBadge } from '../components/Badge';

const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
const Input = (p) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;

export default function Movements() {
  const { user } = useAuth();
  const [movs, setMovs] = useState([]);
  const [products, setProducts] = useState([]);
  const [supps, setSupps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [siModal, setSiModal] = useState(false);
  const [soModal, setSoModal] = useState(false);
  const [adjModal, setAdjModal] = useState(false);
  const [siForm, setSiForm] = useState({ product_id:'', qty:1, date:today(), supplier_id:'', shelf:'', ref:'', note:'' });
  const [soForm, setSoForm] = useState({ product_id:'', qty:1, date:today(), ref:'', note:'' });
  const [adjForm, setAdjForm] = useState({ product_id:'', adj_type:'set', qty:0, reason:'' });

  const load = () => {
    api.get('/movements').then(r => setMovs(r.data));
    api.get('/products').then(r => setProducts(r.data));
    api.get('/suppliers').then(r => setSupps(r.data));
  };
  useEffect(load, []);

  const list = filter === 'all' ? movs : movs.filter(m => m.type === filter);

  async function delMov(id) {
    if (!window.confirm('Delete movement?')) return;
    await api.delete(`/movements/${id}`); load();
  }

  async function saveSI() { await api.post('/movements/in', siForm); setSiModal(false); load(); }
  async function saveSO() { await api.post('/movements/out', soForm); setSoModal(false); load(); }
  async function saveAdj() {
    if (!adjForm.product_id || !adjForm.reason) { alert('Select product and reason'); return; }
    await api.post('/movements/adjust', adjForm); setAdjModal(false); load();
  }

  const adjProd = products.find(p => p.id == adjForm.product_id);
  let adjPreview = null;
  if (adjProd) {
    const q = parseInt(adjForm.qty)||0; let ns = parseInt(adjProd.stock);
    if (adjForm.adj_type === 'set') ns = q;
    else if (adjForm.adj_type === 'add') ns += q;
    else ns = Math.max(0, ns - q);
    adjPreview = { ns, diff: ns - parseInt(adjProd.stock) };
  }


  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 flex-wrap gap-2">
        <h1 className="text-base font-medium">Stock Movements</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex border border-gray-200 rounded-md overflow-hidden text-[11.5px]">
            {['all','in','out'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 border-r last:border-r-0 ${filter===f ? 'bg-[#1D9E75] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{f==='all'?'All':f==='in'?'In':'Out'}</button>)}
          </div>
          {can(user?.role,'canCreate') && <>
            <Btn onClick={() => { setSiForm({ product_id: products[0]?.id||'', qty:1, date:today(), supplier_id:'', shelf:products[0]?.shelf||'', ref:'', note:'' }); setSiModal(true); }} className="bg-blue-50 border-blue-200 text-blue-700"><i className="ti ti-arrow-bar-to-down" />Stock In</Btn>
            <Btn onClick={() => { setSoForm({ product_id: products[0]?.id||'', qty:1, date:today(), ref:'', note:'' }); setSoModal(true); }} className="bg-red-50 border-red-200 text-red-700"><i className="ti ti-arrow-bar-up" />Stock Out</Btn>
            <Btn variant="warn" onClick={() => { setAdjForm({ product_id:'', adj_type:'set', qty:0, reason:'' }); setAdjModal(true); }}><i className="ti ti-adjustments" />Adjust</Btn>
          </>}
        </div>
      </div>
      <div className="px-5 py-4">
        <table className="w-full text-[12.5px] border-collapse">
          <thead><tr>{['Type','Product','Category','Qty','Date','Supplier','Shelf','Ref/Note',''].map(h=><th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {list.map(m => {
              const isAdj = m.adj_type === 'adj';
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50">
                    {isAdj ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10.5px] font-medium">ADJ</span>
                      : m.type === 'in' ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10.5px] font-medium">IN</span>
                      : <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[10.5px] font-medium">OUT</span>}
                  </td>
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{m.product_name}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><CatBadge category={m} /></td>
                  <td className={`px-2 py-2 border-b border-gray-50 font-medium ${m.type==='in'?'text-blue-700':isAdj?'text-amber-700':'text-red-700'}`}>{m.type==='in'?'+':'-'}{m.qty}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{m.date}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-500">{m.supplier_name||'—'}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><ShelfBadge shelf={m.shelf} /></td>
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-500 max-w-[150px] truncate">{[m.ref, m.note].filter(Boolean).join(' · ')||'—'}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => delMov(m.id)}><i className="ti ti-trash" />Delete</Btn>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {siModal && <Modal onClose={() => setSiModal(false)}><h2 className="text-sm font-medium text-blue-700 mb-4">Stock In</h2><div className="grid grid-cols-2 gap-3 mb-3"><F label="Product"><Select value={siForm.product_id} onChange={e=>{const p=products.find(x=>x.id==e.target.value);setSiForm(f=>({...f,product_id:e.target.value,shelf:p?.shelf||''}));}}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></F><F label="Date"><Input type="date" value={siForm.date} onChange={e=>setSiForm(f=>({...f,date:e.target.value}))} /></F><F label="Quantity"><Input type="number" min="1" value={siForm.qty} onChange={e=>setSiForm(f=>({...f,qty:parseInt(e.target.value)||1}))} /></F><F label="Supplier"><Select value={siForm.supplier_id} onChange={e=>setSiForm(f=>({...f,supplier_id:e.target.value}))}><option value="">—</option>{supps.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></F><F label="Shelf"><Input value={siForm.shelf} onChange={e=>setSiForm(f=>({...f,shelf:e.target.value}))} /></F><F label="Ref/PO#"><Input value={siForm.ref} onChange={e=>setSiForm(f=>({...f,ref:e.target.value}))} /></F></div><F label="Note"><Input value={siForm.note} onChange={e=>setSiForm(f=>({...f,note:e.target.value}))} /></F><ModalActions><Btn onClick={()=>setSiModal(false)}>Cancel</Btn><Btn variant="primary" onClick={saveSI}>Record</Btn></ModalActions></Modal>}

      {soModal && <Modal onClose={() => setSoModal(false)}><h2 className="text-sm font-medium text-red-700 mb-4">Stock Out</h2><div className="grid grid-cols-2 gap-3 mb-3"><F label="Product"><Select value={soForm.product_id} onChange={e=>setSoForm(f=>({...f,product_id:e.target.value}))}>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</Select></F><F label="Date"><Input type="date" value={soForm.date} onChange={e=>setSoForm(f=>({...f,date:e.target.value}))} /></F><F label="Quantity"><Input type="number" min="1" value={soForm.qty} onChange={e=>setSoForm(f=>({...f,qty:parseInt(e.target.value)||1}))} /></F><F label="Ref"><Input value={soForm.ref} onChange={e=>setSoForm(f=>({...f,ref:e.target.value}))} /></F></div><F label="Reason"><Input value={soForm.note} onChange={e=>setSoForm(f=>({...f,note:e.target.value}))} /></F><ModalActions><Btn onClick={()=>setSoModal(false)}>Cancel</Btn><Btn variant="danger" onClick={saveSO}>Record</Btn></ModalActions></Modal>}

      {adjModal && <Modal onClose={()=>setAdjModal(false)}><h2 className="text-sm font-medium text-amber-700 mb-4"><i className="ti ti-adjustments mr-1"/>Stock Adjustment</h2><div className="mb-3"><F label="Product"><Select value={adjForm.product_id} onChange={e=>setAdjForm(f=>({...f,product_id:e.target.value}))}><option value="">Select…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — current: {p.stock} {p.unit}</option>)}</Select></F></div><div className="grid grid-cols-2 gap-3 mb-3"><F label="Type"><Select value={adjForm.adj_type} onChange={e=>setAdjForm(f=>({...f,adj_type:e.target.value}))}><option value="set">Set exact count</option><option value="add">Add (+)</option><option value="remove">Remove (−)</option></Select></F><F label="Quantity"><Input type="number" min="0" value={adjForm.qty} onChange={e=>setAdjForm(f=>({...f,qty:parseInt(e.target.value)||0}))} /></F></div>{adjPreview&&<div className="px-3 py-2 bg-gray-50 rounded mb-3 text-[12.5px] text-gray-500">Current: <strong>{adjProd.stock}</strong> → New: <strong>{adjPreview.ns}</strong> <span className={adjPreview.diff>=0?'text-green-600':'text-red-600'}>({adjPreview.diff>=0?'+':''}{adjPreview.diff})</span></div>}<F label="Reason"><Input value={adjForm.reason} onChange={e=>setAdjForm(f=>({...f,reason:e.target.value}))} placeholder="Physical count, damage…"/></F><ModalActions><Btn onClick={()=>setAdjModal(false)}>Cancel</Btn><Btn variant="warn" onClick={saveAdj}><i className="ti ti-check"/>Apply</Btn></ModalActions></Modal>}
    </div>
  );
}
