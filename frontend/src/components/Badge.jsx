import React from 'react';
import { STATUS_COLORS } from '../utils/helpers';

export default function Badge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export function CatBadge({ category }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{ background: category.category_color || category.color, color: category.category_text_color || category.text_color }}>
      <i className={`ti ${category.category_icon || category.icon} text-[10px]`} />
      {category.category_name || category.name}
    </span>
  );
}

export function ShelfBadge({ shelf }) {
  if (!shelf) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10.5px]">
      <i className="ti ti-map-pin text-[10px]" />{shelf}
    </span>
  );
}

export function StockBar({ stock, minStock }) {
  const pct = minStock > 0 ? Math.min(100, Math.round(stock / minStock * 100)) : 100;
  const color = stock === 0 ? '#A32D2D' : stock < minStock ? '#E8B500' : '#1D9E75';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded h-2.5 overflow-hidden max-w-[80px]">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color, minWidth: 3 }} />
      </div>
      <span className="text-[11px]">{stock}</span>
    </div>
  );
}

export function SigBadge({ sigs, keys }) {
  if (!sigs) return null;
  const signed = keys.filter(k => sigs[k]);
  if (!signed.length) return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 text-gray-500">unsigned</span>;
  if (signed.length === keys.length) return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10.5px]"><i className="ti ti-check text-[10px]" />signed</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] bg-amber-100 text-amber-700">{signed.length}/{keys.length}</span>;
}
