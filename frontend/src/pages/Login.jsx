import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LOCKOUT_MS  = 3 * 60 * 1000; // 3 minutes
const MAX_ATTEMPTS = 3;

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Persist fail count + lockout across page refreshes via localStorage
  const [failCount, setFailCount] = useState(
    () => parseInt(localStorage.getItem('pk_fail_count') || '0', 10)
  );
  const [remaining, setRemaining] = useState(() => {
    const until = parseInt(localStorage.getItem('pk_lockout_until') || '0', 10);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });

  const timerRef = useRef(null);
  const locked   = remaining > 0;

  // Countdown tick while locked
  useEffect(() => {
    if (!locked) return;
    timerRef.current = setInterval(() => {
      const until = parseInt(localStorage.getItem('pk_lockout_until') || '0', 10);
      const rem   = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current);
        localStorage.removeItem('pk_lockout_until');
        localStorage.removeItem('pk_fail_count');
        setFailCount(0);
        setError('');
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [locked]);

  const fmtTime = (sec) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked || loading) return;
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      // Success — clear lockout state
      localStorage.removeItem('pk_fail_count');
      localStorage.removeItem('pk_lockout_until');
      navigate('/');
    } catch (err) {
      const newCount = failCount + 1;
      setFailCount(newCount);
      localStorage.setItem('pk_fail_count', String(newCount));

      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        localStorage.setItem('pk_lockout_until', String(until));
        setRemaining(Math.ceil(LOCKOUT_MS / 1000));
        setError('Too many failed attempts. Contact your Admin or wait 3 minutes.');
      } else {
        const left = MAX_ATTEMPTS - newCount;
        setError(
          `Incorrect username or password. ${left} attempt${left === 1 ? '' : 's'} remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 sm:p-8 w-full max-w-xs mx-4 shadow-lg">

        {/* Brand */}
        <div className="text-center mb-5">
          <i className="ti ti-package text-4xl text-[#1D9E75]" />
          <h1 className="text-xl font-semibold mt-2">PARTKH247</h1>
          <p className="text-[11.5px] text-gray-500 mt-1">Parts &amp; Inventory Management</p>
        </div>

        {/* Lockout banner */}
        {locked && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-4 mb-4 text-center">
            <i className="ti ti-lock text-2xl text-red-500" />
            <div className="font-mono text-2xl font-bold text-red-600 mt-1">{fmtTime(remaining)}</div>
            <div className="text-[12px] font-medium text-red-600 mt-1">Account temporarily locked</div>
            <div className="text-[11.5px] text-red-500 mt-0.5">
              Please contact your Admin or wait for the timer.
            </div>
          </div>
        )}

        {/* Error message (only when not locked) */}
        {!locked && error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-[12px] mb-3 flex items-start gap-1.5">
            <i className="ti ti-alert-circle mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11.5px] text-gray-500 mb-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="off"
              disabled={locked}
              className={`w-full px-3 py-2 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 ${locked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11.5px] text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="off"
              disabled={locked}
              className={`w-full px-3 py-2 border border-gray-200 rounded-md text-[12.5px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 ${locked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loading || locked}
            className="w-full py-2 bg-[#1D9E75] text-white rounded-md text-[12.5px] font-medium hover:bg-[#0F6E56] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {locked
              ? <><i className="ti ti-lock" />Locked — {fmtTime(remaining)}</>
              : loading
                ? <><i className="ti ti-loader-2 animate-spin" />Signing in…</>
                : <><i className="ti ti-login" />Sign In</>
            }
          </button>
        </form>

      </div>
    </div>
  );
}
