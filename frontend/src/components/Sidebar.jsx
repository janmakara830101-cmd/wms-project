import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/helpers';

const NAV = [
  { section: 'Main' },
  { path: '/',           icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { path: '/categories', icon: 'ti-tags',             label: 'Categories' },
  { path: '/products',   icon: 'ti-package',          label: 'Products' },
  { path: '/movements',  icon: 'ti-arrows-exchange',  label: 'Stock Movements' },
  { section: 'Sales' },
  { path: '/customers',  icon: 'ti-users',            label: 'Customers' },
  { path: '/suppliers',  icon: 'ti-truck',            label: 'Suppliers' },
  { path: '/quotations', icon: 'ti-file-description', label: 'Quotations' },
  { path: '/invoices',   icon: 'ti-receipt',          label: 'Invoices' },
  { path: '/deliveries', icon: 'ti-truck-delivery',   label: 'Delivery Slips' },
  { section: 'Analytics' },
  { path: '/reports',    icon: 'ti-chart-bar',        label: 'Reports' },
];

export default function Sidebar() {
  const { user, settings, logout } = useAuth();
  const navigate = useNavigate();

  const ROLE_COLORS = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-purple-100 text-purple-700',
    staff: 'bg-green-100 text-green-700',
    viewer: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="w-[185px] flex-shrink-0 h-screen border-r border-gray-100 bg-gray-50 flex flex-col overflow-y-auto">
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-[#1D9E75] flex items-center gap-1">
          <i className="ti ti-building-warehouse text-lg" />
          {settings?.name?.split(' ').slice(0, 3).join(' ') || 'WMS'}
        </div>
      </div>

      <nav className="flex-1 py-1">
        {NAV.map((item, i) => {
          if (item.section) {
            return <div key={i} className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.section}</div>;
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-[7px] text-[12.5px] w-full border-r-2 transition-colors ${
                  isActive
                    ? 'bg-white text-gray-900 font-medium border-[#1D9E75]'
                    : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-800'
                }`
              }
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </NavLink>
          );
        })}

        {can(user?.role, 'settings') && (
          <>
            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin</div>
            {can(user?.role, 'users') && (
              <NavLink to="/users" className={({ isActive }) => `flex items-center gap-2 px-3 py-[7px] text-[12.5px] w-full border-r-2 transition-colors ${isActive ? 'bg-white text-gray-900 font-medium border-[#1D9E75]' : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-800'}`}>
                <i className="ti ti-shield-lock" /> Users
              </NavLink>
            )}
            <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 px-3 py-[7px] text-[12.5px] w-full border-r-2 transition-colors ${isActive ? 'bg-white text-gray-900 font-medium border-[#1D9E75]' : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-800'}`}>
              <i className="ti ti-settings" /> Settings
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-medium text-gray-800">{user?.name}</div>
            <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user?.role]}`}>{user?.role}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-gray-400 hover:text-gray-700 p-1" title="Logout">
            <i className="ti ti-logout text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}
