import React from 'react';
import SignatureCanvas from './SignatureCanvas';
import api from '../utils/api';

const ROLES = {
  qt:  { issuer: 'Issued by (staff)', customer: 'Approved by (customer)' },
  inv: { issuer: 'Issued by (staff)', customer: 'Accepted by (customer)' },
  del: { issuer: 'Issued by (staff)', customer: 'Received by (customer)' },
};

export default function SigModal({ type, doc, onClose, onSaved }) {
  const roles = ROLES[type] || {};
  const sigs = doc.sigs || {};

  async function save(role, data) {
    await api.post('/signatures', { document_type: type, document_id: doc.id, role, signature_data: data });
    if (onSaved) onSaved();
  }

  async function clear(role) {
    await api.delete('/signatures', { data: { document_type: type, document_id: doc.id, role } });
    if (onSaved) onSaved();
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-4 flex items-center gap-2"><i className="ti ti-signature text-base" />Signatures — {doc.id}</h2>
      <div className="flex flex-col gap-4">
        {Object.entries(roles).map(([role, label]) => {
          const sig = sigs[role];
          return (
            <div key={role} className="border border-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-medium">{label}</span>
                {sig
                  ? <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10.5px]"><i className="ti ti-check text-[10px]" />Signed</span>
                  : <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] bg-gray-100 text-gray-500">Not signed</span>
                }
              </div>
              {sig ? (
                <div>
                  <div className="bg-gray-50 rounded p-2 text-center mb-2">
                    <img src={sig} className="max-h-12 max-w-[200px] object-contain inline" alt="signature" />
                  </div>
                  <button onClick={() => clear(role)} className="text-[11.5px] border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1">
                    <i className="ti ti-trash" />Clear
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-[12px] text-gray-500 mb-2">Draw your signature:</div>
                  <SignatureCanvas onSave={(data) => save(role, data)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded text-[12.5px] hover:bg-gray-50">Done</button>
      </div>
    </div>
  );
}
