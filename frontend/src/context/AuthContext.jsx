import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ curr_symbol: '$', tax_rate: 10, tax_label: 'VAT', name: 'WMS' });
  const [authLoading, setAuthLoading] = useState(true); // true until token is verified

  // On every page load: verify the stored token with the backend.
  // If missing or expired → clear storage and stay logged out.
  useEffect(() => {
    const storedUser  = localStorage.getItem('wms_user');
    const storedToken = localStorage.getItem('wms_token');

    if (!storedToken || !storedUser) {
      setAuthLoading(false);
      return;
    }

    api.get('/auth/verify')
      .then(r => {
        // Token valid — restore user and load settings
        setUser(JSON.parse(storedUser));
        return api.get('/settings');
      })
      .then(r => {
        if (r) setSettings(r.data);
      })
      .catch(() => {
        // Token invalid / expired — force logout
        localStorage.removeItem('wms_token');
        localStorage.removeItem('wms_user');
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

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
    <AuthContext.Provider value={{ user, settings, authLoading, login, logout, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
