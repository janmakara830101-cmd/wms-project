import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 sm:p-8 w-full max-w-xs mx-4 shadow-lg">
        <div className="text-center mb-5">
          <i className="ti ti-package text-4xl text-[#1D9E75]" />
          <h1 className="text-xl font-semibold mt-2">PARTKH247</h1>
          <p className="text-[11.5px] text-gray-500 mt-1">Parts &amp; Inventory Management</p>
        </div>
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-[12px] mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11.5px] text-gray-500 mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              placeholder="Enter username" autoFocus />
          </div>
          <div>
            <label className="block text-[11.5px] text-gray-500 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              placeholder="Enter password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-[#1D9E75] text-white rounded-md text-[12.5px] font-medium hover:bg-[#0F6E56] disabled:opacity-50 flex items-center justify-center gap-2">
            <i className="ti ti-login" />{loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-white rounded-md text-[11px] text-gray-400 leading-relaxed">
          <strong className="text-gray-600">Default accounts:</strong><br />
          admin / admin123 &nbsp;|&nbsp; manager / manager123<br />
          staff / staff123 &nbsp;|&nbsp; viewer / viewer123
        </div>
      </div>
    </div>
  );
}
