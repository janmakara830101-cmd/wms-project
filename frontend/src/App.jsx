import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Movements from './pages/Movements';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import Deliveries from './pages/Deliveries';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

function Layout() {
  const { user, settings } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 bg-white shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-700 active:bg-gray-200"
          >
            <i className="ti ti-menu-2 text-lg" />
          </button>
          <div className="text-sm font-semibold text-[#1D9E75] flex items-center gap-1.5 flex-1">
            <i className="ti ti-building-warehouse" />
            {settings?.company_name?.split(' ').slice(0, 3).join(' ') || 'WMS'}
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
