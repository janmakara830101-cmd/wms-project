import React from 'react';

export default function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 overflow-y-auto pb-8"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-gray-100 p-5 w-[580px] max-w-[95vw] shadow-xl">
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="flex gap-2 justify-end mt-4">{children}</div>;
}

export function Btn({ children, onClick, variant = 'default', type = 'button', className = '', disabled = false }) {
  const base = 'px-3 py-1.5 rounded-md text-[12.5px] flex items-center gap-1 border transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer';
  const variants = {
    default:  'border-gray-200 bg-white hover:bg-gray-50 text-gray-700',
    primary:  'bg-[#1D9E75] border-[#1D9E75] text-white hover:bg-[#0F6E56]',
    danger:   'border-red-200 text-red-600 hover:bg-red-50',
    edit:     'bg-blue-50 border-blue-200 text-blue-700',
    warn:     'bg-amber-50 border-amber-300 text-amber-800',
    purple:   'bg-purple-50 border-purple-300 text-purple-700',
    green:    'bg-green-50 border-green-300 text-green-700',
    sm:       'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[11.5px] px-2 py-1',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </button>
  );
}
