import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wms_user')); } catch { return null; }
  });
  const [settings, setSettings] = useState({ curr_symbol: '$', tax_rate: 10, tax_label: 'VAT', name: 'WMS' });

  useEffect(() => {
    if (user) {
      api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    }
  }, [user]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('wms_token', data.token);
    localStorage.setItem('wms_user', JSON.stringify(data.user));
    setUser(data.user);
    const s = await api.get('/settings');
    setSettings(s.data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_user');
    setUser(null);
  };

  const refreshSettings = async () => {
    const s = await api.get('/settings');
    setSettings(s.data);
  };

  return (
    <AuthContext.Provider value={{ user, settings, login, logout, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
