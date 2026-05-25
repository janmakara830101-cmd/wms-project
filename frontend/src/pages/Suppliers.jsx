import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';

const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
const Input = (p) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;

export default function Suppliers() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:'', contact:'', phone:'', email:'', products:'' });

  const load = () => api.get('/suppliers').then(r => setList(r.data));
  useEffect(load, []);

  const filtered = search ? list.filter(s => ['name','contact','email'].some(k => (s[k]||'').toLowerCase().includes(search.toLowerCase()))) : list;

  function openForm(s) {
    setForm(s ? { name:s.name, contact:s.contact||'', phone:s.phone||'', email:s.email||'', products:s.products||'' } : { name:'', contact:'', phone:'', email:'', products:'' });
    setModal({ s });
  }

  async function save() {
    if (!form.name) return;
    if (modal.s?.id) await api.put(`/suppliers/${modal.s.id}`, form);
    else await api.post('/suppliers', form);
    setModal(null); load();
  }

  async function del(id) {
    if (!window.confirm('Delete supplier?')) return;
    await api.delete(`/suppliers/${id}`); load();
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Suppliers</h1>
        {can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => openForm(null)}><i className="ti ti-plus" />Add Supplier</Btn>}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-3 w-fit">
          <i className="ti ti-search text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier name…" className="text-[12px] focus:outline-none w-48" />
          {search && <button onClick={() => setSearch('')}><i className="ti ti-x text-gray-400 text-xs" /></button>}
        </div>
        {filtered.length === 0 ? <div className="text-center py-10 text-gray-400"><i className="ti ti-truck text-3xl block mb-2 opacity-40" />No suppliers found</div> : (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['Supplier','Contact','Phone','Email','Products','Actions'].map(h=><th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{s.name}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{s.contact}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{s.phone}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{s.email}</td>
                  <td className="px-2 py-2 border-b border-gray-50 text-gray-500">{s.products}</td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1">
                      {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openForm(s)}><i className="ti ti-edit" />Edit</Btn>}
                      {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(s.id)}><i className="ti ti-trash" />Delete</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.s?.id ? 'Edit' : 'Add'} Supplier</h2>
          <div className="mb-3"><F label="Supplier Name"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></F></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Contact Person"><Input value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} /></F>
            <F label="Phone"><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></F>
            <F label="Email"><Input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></F>
            <F label="Products Supplied"><Input value={form.products} onChange={e=>setForm(f=>({...f,products:e.target.value}))} /></F>
          </div>
          <ModalActions><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{modal.s?.id ? 'Update' : 'Save'}</Btn></ModalActions>
        </Modal>
      )}
    </div>
  );
}
