import React, { useState } from 'react';
import { calcTotals, invPaid, fm, xlsExport } from '../utils/helpers';
import api from '../utils/api';

const TL = {
  en: { quotation:'Quotation',invoice:'Invoice',delivery:'Delivery Slip',quoteTo:'Quote To',billTo:'Bill To',deliverTo:'Deliver To',date:'Date',ref:'Reference',product:'Product',qty:'Qty',unitPrice:'Unit Price',disc:'Disc%',subtotal:'Subtotal',remark:'Remark',lineDiscounts:'Line discounts',orderDiscount:'Order discount',afterDiscount:'After discount',tax:'Tax',total:'Total',issuedBy:'Issued by',approvedBy:'Approved by (customer)',acceptedBy:'Accepted by (customer)',receivedBy:'Received by (customer)',notes:'Notes',unit:'Unit',amountPaid:'Amount Paid',balance:'Balance Due' },
  kh: { quotation:'សម្រង់តម្លៃ',invoice:'វិក្កយបត្រ',delivery:'វិក្កយបត្រដឹកជញ្ជូន',quoteTo:'ផ្ញើរដល់',billTo:'វិក្កយបត្រទៅ',deliverTo:'ដឹកទៅ',date:'កាលបរិច្ឆេទ',ref:'យោង',product:'ផលិតផល',qty:'បរិមាណ',unitPrice:'តម្លៃឯកតា',disc:'បញ្ចុះ%',subtotal:'សរុបរង',remark:'ចំណាំ',lineDiscounts:'បញ្ចុះតម្លៃបន្ទាត់',orderDiscount:'បញ្ចុះតម្លៃការបញ្ជាទិញ',afterDiscount:'បន្ទាប់ពីបញ្ចុះ',tax:'ពន្ធ',total:'សរុប',issuedBy:'ចេញដោយ',approvedBy:'អនុម័តដោយ(អតិថិជន)',acceptedBy:'ទទួលយកដោយ(អតិថិជន)',receivedBy:'ទទួលដោយ(អតិថិជន)',notes:'កំណត់ចំណាំ',unit:'ឯកតា',amountPaid:'បានបង់',balance:'នៅខ្វះ' },
};

export default function DocViewer({ type, doc, co, onClose, onSign }) {
  const [lang, setLang] = useState('en');
  const L = TL[lang];
  const sym = co?.curr_symbol || '$';
  const taxRate = parseFloat(co?.tax_rate) || 10;
  const taxLabel = co?.tax_label || 'Tax';

  const items = doc.items?.filter(i => i && i.product_id) || [];
  const t = calcTotals(items, doc.overall_disc || 0, doc.overall_disc_type || 'pct', taxRate);
  const paid = type === 'inv' ? invPaid(doc) : 0;
  const balance = Math.max(0, t.total - paid);

  const pn = (item) => lang === 'kh' && item.product_name_kh ? item.product_name_kh : item.product_name;

  function printDoc() {
    const content = document.getElementById('doc-content').innerHTML;
    const w = window.open('', '_blank', 'width=850,height=750');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700&display=swap" rel="stylesheet">
      <style>body{margin:25px;font-family:Arial,sans-serif;font-size:13px;-webkit-print-color-adjust:exact}@media print{body{margin:15px}}</style>
      </head><body>${content}<script>window.onload=function(){window.print();};<\/script></body></html>`);
    w.document.close();
  }

  function exportXls() {
    const rows = [
      [lang === 'kh' ? co?.name_kh : co?.name],
      [co?.address],
      [],
      [`${L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery']} ${doc.id}`],
      [`${L.date}: ${doc.date}`],
      [],
      [L.product, L.qty, L.unitPrice, L.disc, L.subtotal, L.remark],
      ...items.map(i => [pn(i), i.qty, i.price, `${i.disc || 0}%`, i.qty * i.price * (1 - (i.disc||0)/100), i.remark||'']),
      [],
      ...(t.ld > 0 ? [['', '', '', '', L.lineDiscounts, -t.ld]] : []),
      ['', '', '', '', `${taxLabel} (${taxRate}%)`, t.tax],
      ['', '', '', '', L.total, t.total],
      ...(type === 'inv' && paid > 0 ? [['', '', '', '', L.amountPaid, paid], ['', '', '', '', L.balance, balance]] : []),
    ];
    xlsExport(rows, `${type}_${doc.id}`);
  }

  const sigs = doc.sigs || {};
  const sigLabels = {
    qt: { issuer: L.issuedBy, customer: L.approvedBy },
    inv: { issuer: L.issuedBy, customer: L.acceptedBy },
    del: { issuer: L.issuedBy, customer: L.receivedBy },
  }[type] || {};

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium">{L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery']} {doc.id}</h2>
        <div className="flex border border-gray-200 rounded overflow-hidden">
          {['en','kh'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-2 py-1 text-[11.5px] border-r last:border-r-0 ${lang===l ? 'bg-[#534AB7] text-white' : 'text-gray-500'}`}>
              {l === 'en' ? 'EN' : 'ខ្មែរ'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-3 p-2 bg-gray-50 rounded-md flex-wrap">
        <span className="text-[11.5px] text-gray-500 self-center">Export:</span>
        <button onClick={printDoc} className="px-2 py-1 text-[11.5px] border border-gray-200 rounded hover:bg-white flex items-center gap-1"><i className="ti ti-printer" />Print/PDF</button>
        <button onClick={exportXls} className="px-2 py-1 text-[11.5px] border border-gray-200 rounded hover:bg-white flex items-center gap-1"><i className="ti ti-table-export" />Excel</button>
      </div>

      <div id="doc-content" className="border border-gray-200 rounded-lg p-5 text-[13px] text-gray-800 bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
          <div>
            <div className="text-[15px] font-medium">{lang === 'kh' ? co?.name_kh : co?.name}</div>
            <div className="text-[11px] text-gray-500">{co?.address} · {co?.phone}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium" style={{ color: type === 'qt' ? '#185FA5' : type === 'inv' ? '#0F6E56' : '#3C3489' }}>
              {L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery']}
            </div>
            <div className="text-[11px] text-gray-500">{doc.id} · {doc.date}</div>
            {type === 'del' && doc.invoice_id && <div className="text-[10px] text-gray-400">{L.ref}: {doc.invoice_id}</div>}
          </div>
        </div>

        {/* To block */}
        <div className="bg-gray-50 rounded-md px-3 py-2 mb-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
            {type === 'qt' ? L.quoteTo : type === 'inv' ? L.billTo : L.deliverTo}
          </div>
          <div className="font-medium">{doc.customer_name}</div>
          <div className="text-[11px] text-gray-500">{type === 'del' ? doc.addr : ''}</div>
        </div>

        {/* Items table */}
        {type !== 'del' ? (
          <table className="w-full text-[12px] mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-left border-b border-gray-200">{L.product}</th>
                <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[8%]">{L.qty}</th>
                <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[12%]">{L.unitPrice}</th>
                <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[9%]">{L.disc}</th>
                <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[13%]">{L.subtotal}</th>
                <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[20%]">{L.remark}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}><td className="px-2 py-1.5 border-b border-gray-100">{pn(item)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.qty}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{fm(item.price, sym)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.disc||0}%</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-medium">{fm(item.qty*item.price*(1-(item.disc||0)/100), sym)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.remark||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[12px] mb-3 border-collapse">
            <thead><tr className="bg-gray-100">
              <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[5%]">#</th>
              <th className="px-2 py-1.5 text-left border-b border-gray-200">{L.product}</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[10%]">{L.qty}</th>
              <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[10%]">{L.unit}</th>
              <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[30%]">{L.remark}</th>
            </tr></thead>
            <tbody>{items.map((item, i) => (
              <tr key={i}><td className="px-2 py-1.5 border-b border-gray-100 text-gray-400">{i+1}</td>
                <td className="px-2 py-1.5 border-b border-gray-100 font-medium">{pn(item)}</td>
                <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.qty}</td>
                <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.unit}</td>
                <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.remark||''}</td>
              </tr>))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        {type !== 'del' && (
          <div className="bg-gray-50 rounded-md p-3 mb-3 max-w-[250px] ml-auto text-[12px]">
            {t.ld > 0 && <div className="flex justify-between py-0.5 text-red-600"><span>{L.lineDiscounts}</span><span>− {fm(t.ld, sym)}</span></div>}
            {t.oda > 0 && <div className="flex justify-between py-0.5 text-red-600"><span>{L.orderDiscount}</span><span>− {fm(t.oda, sym)}</span></div>}
            <div className="flex justify-between py-0.5 text-gray-500"><span>{L.afterDiscount}</span><span>{fm(t.ad, sym)}</span></div>
            <div className="flex justify-between py-0.5 text-gray-500"><span>{taxLabel} ({taxRate}%)</span><span>{fm(t.tax, sym)}</span></div>
            <div className="flex justify-between py-1 font-medium border-t border-gray-200 mt-1 text-[13.5px]"><span>{L.total}</span><span>{fm(t.total, sym)}</span></div>
            {type === 'inv' && (doc.payments||[]).length > 0 && <>
              <div className="flex justify-between py-0.5 text-green-700"><span>{L.amountPaid}</span><span>{fm(paid, sym)}</span></div>
              <div className={`flex justify-between py-0.5 font-medium ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}><span>{L.balance}</span><span>{fm(balance, sym)}</span></div>
            </>}
          </div>
        )}

        {/* Notes */}
        {doc.notes && <div className="text-[11px] text-gray-500 px-3 py-2 bg-gray-50 rounded mb-3">{doc.notes}</div>}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-200">
          {['issuer','customer'].map(role => {
            const sig = sigs[role];
            return (
              <div key={role} className="text-center">
                <div className="text-[10.5px] text-gray-500 mb-2">{sigLabels[role]}</div>
                <div className="h-10 border-b border-gray-300 flex items-end justify-center pb-1">
                  {sig ? <img src={sig} className="max-h-9 max-w-[145px] object-contain" alt="sig" /> : <span />}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">&nbsp;</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded text-[12.5px] hover:bg-gray-50">Close</button>
        <button onClick={onSign} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[12.5px] flex items-center gap-1 hover:bg-blue-100"><i className="ti ti-signature" />Sign</button>
      </div>
    </div>
  );
}
