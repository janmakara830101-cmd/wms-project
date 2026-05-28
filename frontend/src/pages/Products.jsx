import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can, fm, today } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import { CatBadge, ShelfBadge, StockBar } from '../components/Badge';
import Spinner from '../components/Spinner';
import useLoad from '../utils/useLoad';

const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
const Input = ({ ...p }) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;

export default function Products() {
  const { user, settings } = useAuth();
  const sym = settings?.curr_symbol || '$';
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [supps, setSupps] = useState([]);
  const [catF, setCatF] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [adjModal, setAdjModal] = useState(null);
  const [siModal, setSiModal] = useState(null);
  const [soModal, setSoModal] = useState(null);
  const [form, setForm] = useState({});
  const [adjForm, setAdjForm] = useState({ product_id:'', adj_type:'set', qty:0, reason:'' });
  const [siForm, setSiForm] = useState({ product_id:'', qty:1, date:today(), supplier_id:'', shelf:'', ref:'', note:'' });
  const [soForm, setSoForm] = useState({ product_id:'', qty:1, date:today(), ref:'', note:'' });

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([api.get('/products'), api.get('/categories'), api.get('/suppliers')]);
    setProducts(r1.data); setCats(r2.data); setSupps(r3.data);
  };
  const { loading } = useLoad(load);

  let list = catF === 'all' ? products : products.filter(p => p.category_id == catF);
  if (search) { const q = search.toLowerCase(); list = list.filter(p => (p.name||'').toLowerCase().includes(q) || (p.name_kh||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)); }

  function openForm(prod) {
    setForm(prod ? { name:prod.name, name_kh:prod.name_kh||'', sku:prod.sku||'', category_id:prod.category_id, price:prod.price, cost:prod.cost, stock:prod.stock, low_stock_at:prod.low_stock_at||5, unit:prod.unit, shelf:prod.shelf||'', photo:prod.photo||'', note:prod.note||'' } : { name:'', name_kh:'', sku:'', category_id:cats[0]?.id||'', price:0, cost:0, stock:0, low_stock_at:5, unit:'pcs', shelf:'', photo:'', note:'' });
    setModal({ prod });
  }

  async function save() {
    if (!form.name) return;
    if (modal.prod?.id) await api.put(`/products/${modal.prod.id}`, form);
    else await api.post('/products', form);
    setModal(null); load();
  }

  async function del(id) {
    if (!window.confirm('Delete product?')) return;
    await api.delete(`/products/${id}`); load();
  }

  async function saveAdj() {
    if (!adjForm.product_id || !adjForm.reason) { alert('Select product and enter reason'); return; }
    await api.post('/movements/adjust', adjForm);
    setAdjModal(false); load();
  }

  async function saveSI() {
    if (!siForm.product_id || siForm.qty <= 0) return;
    await api.post('/movements/in', siForm);
    setSiModal(false); load();
  }

  async function saveSO() {
    if (!soForm.product_id || soForm.qty <= 0) return;
    await api.post('/movements/out', soForm);
    setSoModal(false); load();
  }

  if (loading) return <Spinner />;

  // Adjustment preview
  const adjProd = products.find(p => p.id == adjForm.product_id);
  let adjPreview = null;
  if (adjProd) {
    const q = parseInt(adjForm.qty)||0;
    let ns = parseInt(adjProd.stock);
    if (adjForm.adj_type === 'set') ns = q;
    else if (adjForm.adj_type === 'add') ns = parseInt(adjProd.stock) + q;
    else ns = Math.max(0, parseInt(adjProd.stock) - q);
    const diff = ns - parseInt(adjProd.stock);
    adjPreview = { ns, diff };
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Products</h1>
        <div className="flex gap-2">
          {can(user?.role,'canEdit') && <Btn variant="warn" onClick={() => { setAdjForm({ product_id:'', adj_type:'set', qty:0, reason:'' }); setAdjModal(true); }}><i className="ti ti-adjustments" />Adjust</Btn>}
          {can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => openForm(null)}><i className="ti ti-plus" />Add Product</Btn>}
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white">
            <i className="ti ti-search text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU…" className="text-[12px] focus:outline-none flex-1 sm:w-48" />
            {search && <button onClick={() => setSearch('')}><i className="ti ti-x text-gray-400 text-xs" /></button>}
          </div>
          {can(user?.role,'canCreate') && <Btn onClick={() => { setSiForm({ product_id: products[0]?.id||'', qty:1, date:today(), supplier_id:'', shelf:'', ref:'', note:'' }); setSiModal(true); }}><i className="ti ti-arrow-bar-to-down text-blue-600" />Stock In</Btn>}
          {can(user?.role,'canCreate') && <Btn onClick={() => { setSoForm({ product_id: products[0]?.id||'', qty:1, date:today(), ref:'', note:'' }); setSoModal(true); }}><i className="ti ti-arrow-bar-up text-red-600" />Stock Out</Btn>}
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setCatF('all')} className={`px-3 py-1 rounded-full text-[11.5px] border transition-colors ${catF==='all' ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>All ({products.length})</button>
          {cats.map(c => { const n = products.filter(p => p.category_id === c.id).length; return (
            <button key={c.id} onClick={() => setCatF(c.id)} className={`px-3 py-1 rounded-full text-[11.5px] border transition-colors flex items-center gap-1 ${catF==c.id ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <i className={`ti ${c.icon} text-[10px]`} />{c.name} ({n})
            </button>
          ); })}
        </div>

        {list.length === 0 ? <div className="text-center py-10 text-gray-400"><i className="ti ti-package text-3xl block mb-2 opacity-40" />No products found</div> : (
          <div className="overflow-x-auto"><table className="w-full text-[12.5px] border-collapse">
            <thead><tr>
              {['No.','SKU','Name','Category','Unit','Cost','Price','Stock Level','Shelf','Actions'].map(h => (
                <th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-400 text-[11.5px] font-mono">{String(idx+1).padStart(4,'0')}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-400">{p.sku}</td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      {p.photo
                        ? <img src={p.photo} className="w-8 h-8 object-contain rounded border border-gray-100 shrink-0 bg-white" alt="" />
                        : <div className="w-8 h-8 rounded border border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center"><i className="ti ti-photo text-gray-300 text-xs" /></div>}
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {p.name}
                          {p.note && <i className="ti ti-note text-[10px] text-gray-300" title={p.note} />}
                        </div>
                        {p.name_kh && <div className="text-[10px] text-gray-400">{p.name_kh}</div>}
                        {p.note && <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{p.note}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 border-b border-gray-50"><CatBadge category={p} /></td>
                  <td className="px-2 py-2 border-b border-gray-50">{p.unit}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{fm(p.cost, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{fm(p.price, sym)}</td>
                  <td className="px-2 py-2 border-b border-gray-50"><StockBar stock={parseInt(p.stock)} minStock={parseInt(p.low_stock_at)} /></td>
                  <td className="px-2 py-2 border-b border-gray-50"><ShelfBadge shelf={p.shelf} /></td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1 flex-wrap">
                      {can(user?.role,'canCreate') && <Btn variant="sm" onClick={() => { setSiForm({ product_id: p.id, qty:1, date:today(), supplier_id:'', shelf:p.shelf||'', ref:'', note:'' }); setSiModal(true); }}><i className="ti ti-plus text-blue-600" />Stock In</Btn>}
                      {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openForm(p)}><i className="ti ti-edit" />Edit</Btn>}
                      {can(user?.role,'canEdit') && <Btn variant="warn" onClick={() => { setAdjForm({ product_id: p.id, adj_type:'set', qty: parseInt(p.stock), reason:'' }); setAdjModal(true); }}><i className="ti ti-adjustments" />Adjust</Btn>}
                      {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(p.id)}><i className="ti ti-trash" />Delete</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Product Form Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.prod?.id ? 'Edit' : 'Add'} Product</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Name (English)"><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></F>
            <F label="ឈ្មោះ (ខ្មែរ)"><Input value={form.name_kh} onChange={e => setForm(f=>({...f,name_kh:e.target.value}))} /></F>
            <F label="Category"><Select value={form.category_id} onChange={e => setForm(f=>({...f,category_id:parseInt(e.target.value)}))}>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></F>
            <F label="SKU"><Input value={form.sku} onChange={e => setForm(f=>({...f,sku:e.target.value}))} /></F>
            <F label="Unit"><Input value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))} placeholder="pcs, kg, bottle…" /></F>
            <F label="Shelf Location"><Input value={form.shelf} onChange={e => setForm(f=>({...f,shelf:e.target.value}))} placeholder="A-01-02" /></F>
            <F label="Cost Price"><Input type="number" step="0.01" value={form.cost} onChange={e => setForm(f=>({...f,cost:e.target.value}))} /></F>
            <F label="Selling Price"><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} /></F>
            <F label="Current Stock"><Input type="number" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} /></F>
            <F label="Min. Stock Level"><Input type="number" value={form.low_stock_at} onChange={e => setForm(f=>({...f,low_stock_at:e.target.value}))} /></F>
          </div>
          <div className="mb-3">
            <label className="block text-[11.5px] text-gray-500 mb-2">Product Photo</label>
            <div className="flex gap-4 items-start">
              {form.photo ? (
                <div className="flex flex-col items-center gap-1.5">
                  <img src={form.photo} alt="Product" className="w-20 h-20 object-contain border border-gray-200 rounded-lg p-1 bg-white" />
                  <button type="button" onClick={() => setForm(f=>({...f,photo:''}))} className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1"><i className="ti ti-trash" />Remove</button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300">
                  <i className="ti ti-photo text-2xl" /><span className="text-[10px] mt-0.5">No photo</span>
                </div>
              )}
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 hover:bg-gray-50 cursor-pointer">
                <i className="ti ti-upload text-gray-400" />Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setForm(f=>({...f,photo:ev.target.result}));
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[11.5px] text-gray-500 mb-1">Notes <span className="text-gray-400 font-normal">(equivalent part numbers, remarks…)</span></label>
            <textarea
              rows={3}
              value={form.note}
              onChange={e => setForm(f=>({...f,note:e.target.value}))}
              placeholder="e.g. Equivalent to OEM#12345, fits model X and Y…"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] resize-none"
            />
          </div>
          <ModalActions><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{modal.prod?.id ? 'Update' : 'Save'}</Btn></ModalActions>
        </Modal>
      )}

      {/* Adjustment Modal */}
      {adjModal && (
        <Modal onClose={() => setAdjModal(false)}>
          <h2 className="text-sm font-medium mb-1 text-amber-700"><i className="ti ti-adjustments mr-1" />Stock Adjustment</h2>
          <p className="text-[12.5px] text-gray-500 mb-4">Correct stock after a physical count.</p>
          <div className="mb-3"><F label="Product"><Select value={adjForm.product_id} onChange={e => setAdjForm(f=>({...f,product_id:e.target.value}))}><option value="">Select…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — current: {p.stock} {p.unit}</option>)}</Select></F></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Adjustment Type"><Select value={adjForm.adj_type} onChange={e => setAdjForm(f=>({...f,adj_type:e.target.value}))}><option value="set">Set exact count</option><option value="add">Add quantity (+)</option><option value="remove">Remove quantity (−)</option></Select></F>
            <F label="Quantity"><Input type="number" min="0" value={adjForm.qty} onChange={e => setAdjForm(f=>({...f,qty:parseInt(e.target.value)||0}))} /></F>
          </div>
          {adjPreview && <div className="px-3 py-2 bg-gray-50 rounded-md text-[12.5px] text-gray-500 mb-3">Current: <strong>{adjProd.stock} {adjProd.unit}</strong> → New: <strong>{adjPreview.ns} {adjProd.unit}</strong> <span className={adjPreview.diff >= 0 ? 'text-green-600' : 'text-red-600'}>({adjPreview.diff >= 0 ? '+' : ''}{adjPreview.diff})</span></div>}
          <div className="mb-3"><F label="Reason (required)"><Input value={adjForm.reason} onChange={e => setAdjForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Physical count, damage, loss…" /></F></div>
          <ModalActions><Btn onClick={() => setAdjModal(false)}>Cancel</Btn><Btn variant="warn" onClick={saveAdj}><i className="ti ti-check" />Apply</Btn></ModalActions>
        </Modal>
      )}

      {/* Stock In Modal */}
      {siModal && (
        <Modal onClose={() => setSiModal(false)}>
          <h2 className="text-sm font-medium mb-4 text-blue-700">Stock In</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Product"><Select value={siForm.product_id} onChange={e => { const p = products.find(x=>x.id==e.target.value); setSiForm(f=>({...f,product_id:e.target.value,shelf:p?.shelf||f.shelf})); }}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></F>
            <F label="Date"><Input type="date" value={siForm.date} onChange={e => setSiForm(f=>({...f,date:e.target.value}))} /></F>
            <F label="Quantity"><Input type="number" min="1" value={siForm.qty} onChange={e => setSiForm(f=>({...f,qty:parseInt(e.target.value)||1}))} /></F>
            <F label="Supplier"><Select value={siForm.supplier_id} onChange={e => setSiForm(f=>({...f,supplier_id:e.target.value}))}><option value="">—</option>{supps.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></F>
            <F label="Shelf"><Input value={siForm.shelf} onChange={e => setSiForm(f=>({...f,shelf:e.target.value}))} /></F>
            <F label="Ref / PO #"><Input value={siForm.ref} onChange={e => setSiForm(f=>({...f,ref:e.target.value}))} /></F>
          </div>
          <div className="mb-3"><F label="Note"><Input value={siForm.note} onChange={e => setSiForm(f=>({...f,note:e.target.value}))} /></F></div>
          <ModalActions><Btn onClick={() => setSiModal(false)}>Cancel</Btn><Btn variant="primary" onClick={saveSI}>Record</Btn></ModalActions>
        </Modal>
      )}

      {/* Stock Out Modal */}
      {soModal && (
        <Modal onClose={() => setSoModal(false)}>
          <h2 className="text-sm font-medium mb-4 text-red-700">Stock Out</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Product"><Select value={soForm.product_id} onChange={e => setSoForm(f=>({...f,product_id:e.target.value}))}>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</Select></F>
            <F label="Date"><Input type="date" value={soForm.date} onChange={e => setSoForm(f=>({...f,date:e.target.value}))} /></F>
            <F label="Quantity"><Input type="number" min="1" value={soForm.qty} onChange={e => setSoForm(f=>({...f,qty:parseInt(e.target.value)||1}))} /></F>
            <F label="Ref"><Input value={soForm.ref} onChange={e => setSoForm(f=>({...f,ref:e.target.value}))} /></F>
          </div>
          <div className="mb-3"><F label="Reason"><Input value={soForm.note} onChange={e => setSoForm(f=>({...f,note:e.target.value}))} /></F></div>
          <ModalActions><Btn onClick={() => setSoModal(false)}>Cancel</Btn><Btn variant="danger" onClick={saveSO}>Record</Btn></ModalActions>
        </Modal>
      )}
    </div>
  );
}
