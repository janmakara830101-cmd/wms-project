import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/helpers';
import Modal, { Btn, ModalActions } from '../components/Modal';

export default function Customers() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'' });

  const load = () => api.get('/customers').then(r => setList(r.data));
  useEffect(load, []);

  const filtered = search ? list.filter(c => ['name','phone','email','address'].some(k => (c[k]||'').toLowerCase().includes(search.toLowerCase()))) : list;

  function openForm(c) {
    setForm(c ? { name:c.name, phone:c.phone||'', email:c.email||'', address:c.address||'' } : { name:'', phone:'', email:'', address:'' });
    setModal({ c });
  }

  async function save() {
    if (!form.name) return;
    if (modal.c?.id) await api.put(`/customers/${modal.c.id}`, form);
    else await api.post('/customers', form);
    setModal(null); load();
  }

  async function del(id) {
    if (!window.confirm('Delete customer?')) return;
    await api.delete(`/customers/${id}`); load();
  }

  const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
  const Input = (p) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">Customers</h1>
        {can(user?.role,'canCreate') && <Btn variant="primary" onClick={() => openForm(null)}><i className="ti ti-plus" />Add Customer</Btn>}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-3 w-fit">
          <i className="ti ti-search text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…" className="text-[12px] focus:outline-none w-52" />
          {search && <button onClick={() => setSearch('')}><i className="ti ti-x text-gray-400 text-xs" /></button>}
        </div>
        {filtered.length === 0 ? <div className="text-center py-10 text-gray-400"><i className="ti ti-users text-3xl block mb-2 opacity-40" />No customers found</div> : (
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['Name','Phone','Email','Address','Actions'].map(h=><th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 border-b border-gray-50 font-medium">{c.name}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{c.phone}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{c.email}</td>
                  <td className="px-2 py-2 border-b border-gray-50">{c.address}</td>
                  <td className="px-2 py-2 border-b border-gray-50">
                    <div className="flex gap-1">
                      {can(user?.role,'canEdit') && <Btn variant="edit" onClick={() => openForm(c)}><i className="ti ti-edit" /></Btn>}
                      {can(user?.role,'canDelete') && <Btn variant="danger" onClick={() => del(c.id)}><i className="ti ti-trash" /></Btn>}
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
          <h2 className="text-sm font-medium mb-4">{modal.c?.id ? 'Edit' : 'Add'} Customer</h2>
          <div className="mb-3"><F label="Name"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></F></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Phone"><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></F>
            <F label="Email"><Input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></F>
          </div>
          <div className="mb-3"><F label="Address"><Input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></F></div>
          <ModalActions><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{modal.c?.id ? 'Update' : 'Save'}</Btn></ModalActions>
        </Modal>
      )}
    </div>
  );
}
