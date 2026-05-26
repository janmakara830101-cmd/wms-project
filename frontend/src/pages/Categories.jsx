import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';
import Spinner from '../components/Spinner';
import useLoad from '../utils/useLoad';

/* ── Same helper components as Products page ── */
const F = ({ label, children }) => (
  <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>
);
const Input = (p) => (
  <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />
);

const ICONS = [
  'ti-droplet','ti-tool','ti-bolt','ti-settings','ti-pencil','ti-shield',
  'ti-package','ti-truck','ti-cpu','ti-building-factory','ti-flame','ti-battery',
  'ti-filter','ti-screw','ti-circuit-switchboard','ti-first-aid-kit',
];
const COLORS = [
  ['#E6F1FB','#0C447C'],['#FAEEDA','#633806'],['#EAF3DE','#27500A'],
  ['#EEEDFE','#3C3489'],['#FBEAF0','#72243E'],['#FCEBEB','#791F1F'],
  ['#E1F5EE','#085041'],['#FAECE7','#712B13'],['#F1EFE8','#444441'],
];

export default function Categories() {
  const { user } = useAuth();
  const [cats, setCats]         = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ name:'', name_kh:'', icon:'ti-package', color:'#E6F1FB', text_color:'#0C447C' });

  const load = async () => {
    const [r1, r2] = await Promise.all([api.get('/categories'), api.get('/products')]);
    setCats(r1.data); setProducts(r2.data);
  };
  const { loading } = useLoad(load);

  const filtered = search
    ? cats.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.name_kh?.toLowerCase().includes(search.toLowerCase()))
    : cats;

  function openForm(cat) {
    setForm(cat
      ? { name: cat.name, name_kh: cat.name_kh||'', icon: cat.icon, color: cat.color, text_color: cat.text_color }
      : { name:'', name_kh:'', icon:'ti-package', color:'#E6F1FB', text_color:'#0C447C' }
    );
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
      {/* ── Sticky header ── */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Categories</h1>
        {can(user?.role,'canCreate') && (
          <Btn variant="primary" onClick={() => openForm(null)}>
            <i className="ti ti-plus" />Add Category
          </Btn>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-5 py-4">

        {/* Search bar — same style as Products */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-4 w-full sm:w-fit">
          <i className="ti ti-search text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search category…"
            className="text-[12px] focus:outline-none flex-1 sm:w-48"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <i className="ti ti-x text-gray-400 text-xs" />
            </button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="ti ti-category text-3xl block mb-2 opacity-40" />
            {search ? 'No categories match your search' : 'No categories yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr>
                  {['No.', 'Icon', 'Category Name', 'Products', 'Actions'].map(h => (
                    <th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const n = products.filter(p => p.category_id === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      {/* No. */}
                      <td className="px-2 py-2.5 border-b border-gray-50 text-gray-400 text-[11.5px] font-mono w-[60px]">
                        {String(idx+1).padStart(4,'0')}
                      </td>
                      {/* Icon */}
                      <td className="px-2 py-2.5 border-b border-gray-50 w-[56px]">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
                          style={{ background: c.color, color: c.text_color }}>
                          <i className={`ti ${c.icon}`} />
                        </div>
                      </td>
                      {/* Category Name */}
                      <td className="px-2 py-2.5 border-b border-gray-50">
                        <div className="font-medium">{c.name}</div>
                        {c.name_kh && <div className="text-[11px] text-gray-400 mt-0.5">{c.name_kh}</div>}
                      </td>
                      {/* Products */}
                      <td className="px-2 py-2.5 border-b border-gray-50">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: c.color, color: c.text_color }}>
                          <i className="ti ti-package text-[10px]" />
                          {n} product{n !== 1 ? 's' : ''}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-2 py-2.5 border-b border-gray-50">
                        <div className="flex gap-1">
                          {can(user?.role,'canEdit')   && <Btn variant="edit"   onClick={() => openForm(c)}><i className="ti ti-edit"  />Edit</Btn>}
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

      {/* ── Add / Edit Modal — same layout style as Products form ── */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">
            {modal.cat?.id ? 'Edit Category' : 'Add Category'}
          </h2>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <F label="Name (English)">
              <Input
                placeholder="e.g. Spare Parts"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
              />
            </F>
            <F label="ឈ្មោះ (ខ្មែរ)">
              <Input
                placeholder="ឈ្មោះជាភាសាខ្មែរ"
                value={form.name_kh}
                onChange={e => setForm(f => ({...f, name_kh: e.target.value}))}
              />
            </F>
          </div>

          {/* Icon picker */}
          <F label="Icon">
            <div className="flex flex-wrap gap-1.5 mt-1.5 p-3 bg-gray-50 rounded-md">
              {ICONS.map(ic => (
                <button key={ic} type="button"
                  onClick={() => setForm(f => ({...f, icon: ic}))}
                  className="w-8 h-8 rounded-md border flex items-center justify-center transition-colors"
                  style={{
                    background:   form.icon === ic ? '#1D9E75' : '#fff',
                    color:        form.icon === ic ? '#fff'    : '#5f5e5a',
                    borderColor:  form.icon === ic ? '#1D9E75' : '#e3e2de',
                  }}>
                  <i className={`ti ${ic} text-sm`} />
                </button>
              ))}
            </div>
          </F>

          {/* Colour picker */}
          <div className="mt-4 mb-4">
            <F label="Colour">
              <div className="flex flex-wrap gap-2 mt-1.5 p-3 bg-gray-50 rounded-md">
                {COLORS.map(([cl, tc]) => (
                  <button key={cl} type="button"
                    onClick={() => setForm(f => ({...f, color: cl, text_color: tc}))}
                    className="w-8 h-8 rounded-full transition-all flex items-center justify-center"
                    style={{ background: cl, border: `2.5px solid ${form.color === cl ? tc : 'transparent'}` }}>
                    {form.color === cl && <i className="ti ti-check text-[11px]" style={{ color: tc }} />}
                  </button>
                ))}
              </div>
            </F>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-md bg-white mb-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] flex-shrink-0"
              style={{ background: form.color, color: form.text_color }}>
              <i className={`ti ${form.icon}`} />
            </div>
            <div>
              <div className="text-[13px] font-medium">{form.name || <span className="text-gray-300">Category name</span>}</div>
              {form.name_kh && <div className="text-[11px] text-gray-400">{form.name_kh}</div>}
            </div>
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
