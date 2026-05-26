import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import Spinner from '../components/Spinner';
import useLoad from '../utils/useLoad';

const ICONS = ['ti-droplet','ti-tool','ti-bolt','ti-settings','ti-pencil','ti-shield','ti-package','ti-truck','ti-cpu','ti-building-factory','ti-flame','ti-battery','ti-filter','ti-screw','ti-circuit-switchboard','ti-first-aid-kit'];
const COLORS = [['#E6F1FB','#0C447C'],['#FAEEDA','#633806'],['#EAF3DE','#27500A'],['#EEEDFE','#3C3489'],['#FBEAF0','#72243E'],['#FCEBEB','#791F1F'],['#E1F5EE','#085041'],['#FAECE7','#712B13'],['#F1EFE8','#444441']];

export default function Categories() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null); // null | {cat}
  const [form, setForm] = useState({ name:'', name_kh:'', icon:'ti-package', color:'#E6F1FB', text_color:'#0C447C' });

  const load = async () => {
    const [r1, r2] = await Promise.all([api.get('/categories'), api.get('/products')]);
    setCats(r1.data); setProducts(r2.data);
  };
  const { loading } = useLoad(load);

  function openForm(cat) {
    setForm(cat ? { name: cat.name, name_kh: cat.name_kh||'', icon: cat.icon, color: cat.color, text_color: cat.text_color } : { name:'', name_kh:'', icon:'ti-package', color:'#E6F1FB', text_color:'#0C447C' });
    setModal({ cat });
  }

  async function save() {
    if (!form.name) return;
    if (modal.cat?.id) await api.put(`/categories/${modal.cat.id}`, form);
    else await api.post('/categories', form);
    setModal(null); load();
  }

  async function del(cat) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try { await api.delete(`/categories/${cat.id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Categories</h1>
        {can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => openForm(null)}><i className="ti ti-plus" />Add Category</Btn>}
      </div>
      <div className="px-5 py-4">
        {cats.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="ti ti-category text-3xl block mb-2 opacity-40" />No categories yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr>
                  {['No.', 'Icon', 'Name (English)', 'ឈ្មោះ (ខ្មែរ)', 'Products', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((c, idx) => {
                  const n = products.filter(p => p.category_id === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 group">
                      {/* No. */}
                      <td className="px-3 py-2.5 border-b border-gray-50 text-gray-400 text-[11.5px] font-mono">
                        {String(idx+1).padStart(4,'0')}
                      </td>
                      {/* Icon */}
                      <td className="px-3 py-2.5 border-b border-gray-50">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] shadow-sm"
                          style={{ background: c.color, color: c.text_color }}>
                          <i className={`ti ${c.icon}`} />
                        </div>
                      </td>
                      {/* Name EN */}
                      <td className="px-3 py-2.5 border-b border-gray-50 font-medium">{c.name}</td>
                      {/* Name KH */}
                      <td className="px-3 py-2.5 border-b border-gray-50 text-gray-500">{c.name_kh || '—'}</td>
                      {/* Products count */}
                      <td className="px-3 py-2.5 border-b border-gray-50">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: c.color, color: c.text_color }}>
                          <i className="ti ti-package text-[10px]" />{n} product{n !== 1 ? 's' : ''}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2.5 border-b border-gray-50">
                        <div className="flex gap-1">
                          {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openForm(c)}><i className="ti ti-edit" />Edit</Btn>}
                          {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(c)}><i className="ti ti-trash" />Delete</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.cat?.id ? 'Edit' : 'Add'} Category</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-[11.5px] text-gray-500 mb-1">Name (English)</label>
              <input className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} /></div>
            <div><label className="block text-[11.5px] text-gray-500 mb-1">ឈ្មោះ (ខ្មែរ)</label>
              <input className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" value={form.name_kh} onChange={e => setForm(f => ({...f, name_kh:e.target.value}))} /></div>
          </div>
          <div className="mb-3">
            <label className="block text-[11.5px] text-gray-500 mb-2">Icon</label>
            <div className="flex flex-wrap gap-1">
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({...f, icon:ic}))}
                  className="w-8 h-8 rounded-md border flex items-center justify-center transition-colors"
                  style={{ background: form.icon===ic ? '#1D9E75' : 'none', color: form.icon===ic ? '#fff' : '#5f5e5a', borderColor: form.icon===ic ? '#1D9E75' : '#e3e2de' }}>
                  <i className={`ti ${ic} text-sm`} />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[11.5px] text-gray-500 mb-2">Colour</label>
            <div className="flex flex-wrap gap-1">
              {COLORS.map(([cl, tc]) => (
                <button key={cl} type="button" onClick={() => setForm(f => ({...f, color:cl, text_color:tc}))}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: cl, border: `2.5px solid ${form.color===cl ? tc : 'transparent'}` }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md mb-1">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-[16px]" style={{ background: form.color, color: form.text_color }}>
              <i className={`ti ${form.icon}`} />
            </div>
            <span className="text-[13px] font-medium">{form.name || 'Category name'}</span>
          </div>
          <ModalActions>
            <Btn onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>{modal.cat?.id ? 'Update' : 'Save'}</Btn>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
