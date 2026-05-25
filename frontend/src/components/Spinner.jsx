import React from 'react';

export default function Spinner({ text = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <i className="ti ti-loader-2 text-3xl animate-spin mb-2 text-[#1D9E75]" />
      <span className="text-[12.5px]">{text}</span>
    </div>
  );
}
