import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal, { Btn, ModalActions } from '../components/Modal';

const ROLES = ['admin', 'manager', 'staff', 'viewer'];
const F = ({ label, children }) => <div><label className="block text-[11.5px] text-gray-500 mb-1">{label}</label>{children}</div>;
const Input = (p) => <input className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75]" {...p}>{children}</select>;
const roleColor = { admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-green-100 text-green-700', viewer: 'bg-gray-100 text-gray-600' };

export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [pwModal, setPwModal] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'staff', display_name: '' });
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');

  const load = () => api.get('/users').then(r => setList(r.data));
  useEffect(load, []);

  const filtered = search
    ? list.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase()))
    : list;

  function openCreate() {
    setForm({ username: '', password: '', role: 'staff', display_name: '' });
    setModal({ u: null });
  }

  function openEdit(u) {
    setForm({ username: u.username, password: '', role: u.role, display_name: u.display_name || '' });
    setModal({ u });
  }

  async function save() {
    if (!form.username || !form.role) return;
    if (!modal.u?.id && !form.password) return alert('Password is required for new users');
    const payload = { username: form.username, role: form.role, display_name: form.display_name };
    if (form.password) payload.password = form.password;
    if (modal.u?.id) await api.put(`/users/${modal.u.id}`, payload);
    else await api.post('/users', payload);
    setModal(null); load();
  }

  async function del(id) {
    if (id === me?.id) return alert('Cannot delete your own account');
    if (!window.confirm('Delete user?')) return;
    await api.delete(`/users/${id}`); load();
  }

  async function resetPw() {
    if (!pwForm.password) return setPwErr('Password is required');
    if (pwForm.password !== pwForm.confirm) return setPwErr('Passwords do not match');
    if (pwForm.password.length < 6) return setPwErr('Minimum 6 characters');
    await api.put(`/users/${pwModal.u.id}`, { password: pwForm.password });
    setPwModal(null); setPwErr('');
  }


  const permMap = {
    admin:   { canCreate: '✓', canEdit: '✓', canDelete: '✓', canApprove: '✓', users: '✓' },
    manager: { canCreate: '✓', canEdit: '✓', canDelete: '✓', canApprove: '✓', users: '—' },
    staff:   { canCreate: '✓', canEdit: '✓', canDelete: '—', canApprove: '—', users: '—' },
    viewer:  { canCreate: '—', canEdit: '—', canDelete: '—', canApprove: '—', users: '—' },
  };

  return (
    <div>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-base font-medium">User Management</h1>
        <Btn variant="primary" onClick={openCreate}><i className="ti ti-plus" />Add User</Btn>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white mb-4 w-fit">
          <i className="ti ti-search text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="text-[12px] focus:outline-none w-44" />
          {search && <button onClick={() => setSearch('')}><i className="ti ti-x text-gray-400 text-xs" /></button>}
        </div>

        <table className="w-full text-[12.5px] border-collapse mb-8">
          <thead><tr>{['Username', 'Display Name', 'Role', 'Actions'].map(h =>
            <th key={h} className="text-left px-2 py-2 text-[11.5px] font-medium text-gray-400 border-b border-gray-100">{h}</th>
          )}</tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${u.id === me?.id ? 'bg-green-50/30' : ''}`}>
                <td className="px-2 py-2 border-b border-gray-50 font-medium flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#1D9E75] text-white text-[10px] flex items-center justify-center font-bold">{(u.display_name||u.username).charAt(0).toUpperCase()}</div>
                  {u.username}
                  {u.id === me?.id && <span className="text-[10px] text-gray-400">(you)</span>}
                </td>
                <td className="px-2 py-2 border-b border-gray-50">{u.display_name || '—'}</td>
                <td className="px-2 py-2 border-b border-gray-50">
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${roleColor[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                </td>
                <td className="px-2 py-2 border-b border-gray-50">
                  <div className="flex gap-1">
                    <Btn variant="edit" onClick={() => openEdit(u)}><i className="ti ti-edit" />Edit</Btn>
                    <Btn variant="sm" className="bg-amber-50 border-amber-200 text-amber-700" onClick={() => { setPwForm({ password: '', confirm: '' }); setPwErr(''); setPwModal({ u }); }}><i className="ti ti-lock-open" />Reset Password</Btn>
                    {u.id !== me?.id && <Btn variant="danger" onClick={() => del(u.id)}><i className="ti ti-trash" />Delete</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Permissions Reference */}
        <div className="mt-2">
          <div className="text-[12px] font-medium text-gray-600 mb-2">Role Permissions Reference</div>
          <table className="text-[12px] border-collapse border border-gray-200 rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-[11px] text-gray-500 font-medium border-b border-gray-200">Permission</th>
                {ROLES.map(r => <th key={r} className="px-3 py-2 text-center text-[11px] border-b border-gray-200"><span className={`px-2 py-0.5 rounded-full font-medium ${roleColor[r]}`}>{r}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {[['Create', 'canCreate'], ['Edit', 'canEdit'], ['Delete', 'canDelete'], ['Approve', 'canApprove'], ['User Mgmt', 'users']].map(([label, key]) => (
                <tr key={key} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-3 py-1.5 text-gray-600">{label}</td>
                  {ROLES.map(r => (
                    <td key={r} className={`px-3 py-1.5 text-center font-medium ${permMap[r][key]==='✓'?'text-green-600':'text-gray-300'}`}>{permMap[r][key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-sm font-medium mb-4">{modal.u?.id ? `Edit User — ${modal.u.username}` : 'Add User'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <F label="Username"><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={!!modal.u?.id} /></F>
            <F label="Display Name"><Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} /></F>
            <F label="Role">
              <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </Select>
            </F>
            {!modal.u?.id && <F label="Password"><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></F>}
          </div>
          <ModalActions><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{modal.u?.id ? 'Update' : 'Create'}</Btn></ModalActions>
        </Modal>
      )}

      {pwModal && (
        <Modal onClose={() => setPwModal(null)}>
          <h2 className="text-sm font-medium mb-4"><i className="ti ti-lock-open mr-1 text-amber-600" />Reset Password — {pwModal.u.username}</h2>
          <div className="grid gap-3 mb-3">
            <F label="New Password"><Input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} /></F>
            <F label="Confirm Password"><Input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></F>
          </div>
          {pwErr && <div className="text-red-600 text-[12px] mb-2"><i className="ti ti-alert-circle mr-1" />{pwErr}</div>}
          <ModalActions><Btn onClick={() => setPwModal(null)}>Cancel</Btn><Btn variant="warn" onClick={resetPw}>Reset Password</Btn></ModalActions>
        </Modal>
      )}
    </div>
  );
}
