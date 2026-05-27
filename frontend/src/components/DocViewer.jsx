import React, { useState } from 'react';
import { calcTotals, invPaid, fm, xlsExport } from '../utils/helpers';

const TL = {
  en: { quotation:'Quotation',invoice:'Invoice',delivery:'Delivery Slip',quoteTo:'Quote To',billTo:'Bill To',deliverTo:'Deliver To',date:'Date',ref:'Reference',product:'Product',qty:'Qty',unitPrice:'Unit Price',disc:'Disc%',subtotal:'Subtotal',remark:'Remark',lineDiscounts:'Line discounts',orderDiscount:'Order discount',afterDiscount:'After discount',tax:'Tax',total:'Total',issuedBy:'Issued by',approvedBy:'Approved by (customer)',acceptedBy:'Accepted by (customer)',receivedBy:'Received by (customer)',notes:'Notes',unit:'Unit',amountPaid:'Amount Paid',balance:'Balance Due' },
  kh: { quotation:'សម្រង់តម្លៃ',invoice:'វិក្កយបត្រ',delivery:'វិក្កយបត្រដឹកជញ្ជូន',quoteTo:'ផ្ញើរដល់',billTo:'វិក្កយបត្រទៅ',deliverTo:'ដឹកទៅ',date:'កាលបរិច្ឆេទ',ref:'យោង',product:'ផលិតផល',qty:'បរិមាណ',unitPrice:'តម្លៃឯកតា',disc:'បញ្ចុះ%',subtotal:'សរុបរង',remark:'ចំណាំ',lineDiscounts:'បញ្ចុះតម្លៃបន្ទាត់',orderDiscount:'បញ្ចុះតម្លៃការបញ្ជាទិញ',afterDiscount:'បន្ទាប់ពីបញ្ចុះ',tax:'ពន្ធ',total:'សរុប',issuedBy:'ចេញដោយ',approvedBy:'អនុម័តដោយ(អតិថិជន)',acceptedBy:'ទទួលយកដោយ(អតិថិជន)',receivedBy:'ទទួលដោយ(អតិថិជន)',notes:'កំណត់ចំណាំ',unit:'ឯកតា',amountPaid:'បានបង់',balance:'នៅខ្វះ' },
};

export default function DocViewer({ type, doc, co, onClose, onSign }) {
  const [lang, setLang] = useState('en');
  const [pdfLoading, setPdfLoading] = useState(false);
  const L = TL[lang];
  const sym = co?.curr_symbol || '$';
  const taxRate = parseFloat(co?.tax_rate) || 10;
  const taxLabel = co?.tax_label || 'Tax';

  const items = doc.items?.filter(i => i && i.product_id) || [];
  const t = calcTotals(items, doc.overall_disc || 0, doc.overall_disc_type || 'pct', 0);
  const paid = type === 'inv' ? invPaid(doc) : 0;
  const balance = Math.max(0, t.total - paid);

  const pn = (item) => lang === 'kh' && item.product_name_kh ? item.product_name_kh : item.product_name;
  const fmDate = (d) => (d || '').slice(0, 10);

  const docLabel = type === 'qt' ? 'Quotation' : type === 'inv' ? 'Invoice' : 'DeliverySlip';

  /* ── Print (loads Tailwind so output matches the on-screen form exactly) ── */
  function printDoc() {
    const content = document.getElementById('doc-content').innerHTML;
    const docTitle = `${docLabel}_${doc.id}`;
    const w = window.open('', '_blank', 'width=920,height=820');
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>${docTitle}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { font-family: Arial,'Hanuman',sans-serif; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @media screen { body { padding:24px; max-width:820px; margin:0 auto; } }
  @media print  { @page { size:A4 portrait; margin:12mm 14mm; } body { margin:0; padding:0; } }
</style>
</head><body>
<div class="text-[13px] text-gray-800 bg-white">${content}</div>
<script>
window.addEventListener('load', function() {
  setTimeout(function() { window.focus(); window.print(); }, 1200);
});
<\/script>
</body></html>`);
    w.document.close();
  }

  /* ── Save as PDF (captures the rendered form exactly as displayed) ── */
  async function savePdf() {
    const html2pdf = window.html2pdf;
    if (!html2pdf) { alert('PDF library not loaded. Please check your internet connection.'); return; }
    const element = document.getElementById('doc-content');
    setPdfLoading(true);
    try {
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${docLabel}_${doc.id}.pdf`,
          image: { type: 'jpeg', quality: 0.99 },
          html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } finally {
      setPdfLoading(false);
    }
  }

  /* ── Excel (formatted document layout) ── */
  function exportXls() {
    const XLSX = window.XLSX;
    if (!XLSX) { alert('Excel library not loaded.'); return; }
    const coName = co?.company_name || '';
    const docType = L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery'];
    const rows = [
      [coName || ''],
      [co?.company_address || ''],
      [co?.company_phone || ''],
      [],
      [`${docType}`, '', '', '', '', `${L.date}:`],
      [`${doc.id}`, '', '', '', '', fmDate(doc.date)],
      [],
      [type === 'qt' ? L.quoteTo : type === 'inv' ? L.billTo : L.deliverTo, doc.customer_name || ''],
      [],
      // Table header
      ['#', L.product, L.qty, L.unitPrice, L.disc, L.subtotal, L.remark],
      // Items
      ...items.map((item, i) => [
        i + 1,
        pn(item),
        item.qty,
        parseFloat(item.price),
        `${item.disc || 0}%`,
        parseFloat((item.qty * item.price * (1 - (item.disc||0)/100)).toFixed(2)),
        item.remark || '',
      ]),
      [],
      // Totals
      ...(t.ld > 0  ? [['', '', '', '', '', L.lineDiscounts, -parseFloat(t.ld.toFixed(2))]]  : []),
      ...(t.oda > 0 ? [['', '', '', '', '', L.orderDiscount, -parseFloat(t.oda.toFixed(2))]] : []),
      ['', '', '', '', '', L.total, parseFloat(t.total.toFixed(2))],
      ...(type === 'inv' && paid > 0 ? [
        ['', '', '', '', '', L.amountPaid, parseFloat(paid.toFixed(2))],
        ['', '', '', '', '', L.balance,    parseFloat(balance.toFixed(2))],
      ] : []),
      [],
      [doc.notes ? `${L.notes}: ${doc.notes}` : ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, docType.substring(0, 31));
    XLSX.writeFile(wb, `${docLabel}_${doc.id}_${fmDate(new Date().toISOString())}.xlsx`);
  }

  const sigs = doc.sigs || {};
  const sigLabels = {
    qt:  { issuer: L.issuedBy, customer: L.approvedBy },
    inv: { issuer: L.issuedBy, customer: L.acceptedBy },
    ds:  { issuer: L.issuedBy, customer: L.receivedBy },
    del: { issuer: L.issuedBy, customer: L.receivedBy },
  }[type] || {};

  return (
    <div>
      {/* Title + language toggle */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium">
          {L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery']} {doc.id}
        </h2>
        <div className="flex border border-gray-200 rounded overflow-hidden">
          {['en','kh'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-2 py-1 text-[11.5px] border-r last:border-r-0 ${lang===l ? 'bg-[#534AB7] text-white' : 'text-gray-500'}`}>
              {l === 'en' ? 'EN' : 'ខ្មែរ'}
            </button>
          ))}
        </div>
      </div>

      {/* Export action bar — 3 separate buttons */}
      <div className="flex gap-2 mb-3 p-2 bg-gray-50 rounded-md flex-wrap items-center">
        <span className="text-[11.5px] text-gray-400">Export:</span>

        {/* Print */}
        <button onClick={printDoc}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-300 bg-white rounded-md hover:bg-gray-50 text-gray-700 shadow-sm">
          <i className="ti ti-printer text-gray-500" />Print
        </button>

        {/* PDF */}
        <button onClick={savePdf} disabled={pdfLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-red-200 bg-red-50 rounded-md hover:bg-red-100 text-red-700 shadow-sm disabled:opacity-60">
          {pdfLoading
            ? <><i className="ti ti-loader-2 animate-spin" />Generating…</>
            : <><i className="ti ti-file-type-pdf" />PDF</>
          }
        </button>

        {/* Excel */}
        <button onClick={exportXls}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-green-300 bg-green-50 rounded-md hover:bg-green-100 text-green-700 shadow-sm">
          <i className="ti ti-table-export" />Excel
        </button>
      </div>

      {/* Document content */}
      <div id="doc-content" className="border border-gray-200 rounded-lg p-5 text-[13px] text-gray-800 bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-start gap-3">
            {co?.company_logo && (
              <img src={co.company_logo} alt="Logo" className="h-14 max-w-[120px] object-contain" onError={e => e.target.style.display='none'} />
            )}
            <div>
              <div className="text-[15px] font-medium">{co?.company_name}</div>
              <div className="text-[11px] text-gray-500">
                {[co?.company_address, co?.company_phone].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium" style={{ color: type === 'qt' ? '#185FA5' : type === 'inv' ? '#0F6E56' : '#3C3489' }}>
              {L[type === 'qt' ? 'quotation' : type === 'inv' ? 'invoice' : 'delivery']}
            </div>
            <div className="text-[12px] font-medium text-gray-700">{doc.id}</div>
            <div className="text-[11px] text-gray-500">{L.date}: {fmDate(doc.date)}</div>
            {(type === 'del' || type === 'ds') && doc.invoice_id && <div className="text-[10px] text-gray-400">{L.ref}: {doc.invoice_id}</div>}
          </div>
        </div>

        {/* To block */}
        <div className="bg-gray-50 rounded-md px-3 py-2 mb-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
            {type === 'qt' ? L.quoteTo : type === 'inv' ? L.billTo : L.deliverTo}
          </div>
          <div className="font-medium">{doc.customer_name}</div>
          {(type === 'del' || type === 'ds') && doc.address && <div className="text-[11px] text-gray-500">{doc.address}</div>}
        </div>

        {/* Items table */}
        {type !== 'del' && type !== 'ds' ? (
          <table className="w-full text-[12px] mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[5%]">#</th>
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
                <tr key={i}>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-400 text-[11px]">{i+1}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <div className="font-medium">{pn(item)}</div>
                    {item.product_sku && <div className="font-mono text-[10.5px] text-[#1D9E75]">{item.product_sku}</div>}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.qty}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{fm(item.price, sym)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.disc||0}%</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-medium">{fm(item.qty*item.price*(1-(item.disc||0)/100), sym)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.remark || item.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[12px] mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[5%]">#</th>
                <th className="px-2 py-1.5 text-left border-b border-gray-200">{L.product}</th>
                <th className="px-2 py-1.5 text-right border-b border-gray-200 w-[10%]">{L.qty}</th>
                <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[10%]">{L.unit}</th>
                <th className="px-2 py-1.5 text-left border-b border-gray-200 w-[30%]">{L.remark}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-400">{i+1}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-medium">{pn(item)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{item.qty}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.unit}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500">{item.remark || item.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals — only for quotation & invoice */}
        {type !== 'del' && type !== 'ds' && (
          <div className="bg-gray-50 rounded-md p-3 mb-3 max-w-[250px] ml-auto text-[12px]">
            {t.ld > 0 && <div className="flex justify-between py-0.5 text-red-600"><span>{L.lineDiscounts}</span><span>− {fm(t.ld, sym)}</span></div>}
            {t.oda > 0 && <div className="flex justify-between py-0.5 text-red-600"><span>{L.orderDiscount}</span><span>− {fm(t.oda, sym)}</span></div>}
            <div className="flex justify-between py-1 font-medium border-t border-gray-200 mt-1 text-[13.5px]"><span>{L.total}</span><span>{fm(t.total, sym)}</span></div>
            {type === 'inv' && (doc.payments||[]).length > 0 && <>
              <div className="flex justify-between py-0.5 text-green-700"><span>{L.amountPaid}</span><span>{fm(paid, sym)}</span></div>
              <div className={`flex justify-between py-0.5 font-medium ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}><span>{L.balance}</span><span>{fm(balance, sym)}</span></div>
            </>}
          </div>
        )}

        {/* Bank / Payment details — invoices only */}
        {type === 'inv' && (co?.bank_name || co?.bank_account || co?.bank_qr) && (
          <div className="flex justify-between items-start border border-gray-100 rounded-lg px-4 py-3 mb-3 bg-gray-50">
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <i className="ti ti-building-bank" />Payment Details
              </div>
              {co.bank_name && <div className="text-[12.5px] font-semibold text-gray-700">{co.bank_name}</div>}
              {co.bank_account && <div className="text-[11.5px] text-gray-600 mt-0.5">Account No: <span className="font-medium">{co.bank_account}</span></div>}
              {co.bank_account_name && <div className="text-[11.5px] text-gray-600">Name: <span className="font-medium">{co.bank_account_name}</span></div>}
            </div>
            {co.bank_qr && (
              <div className="text-center ml-4 shrink-0">
                <img src={co.bank_qr} className="w-24 h-24 object-contain" alt="Bank QR Code" />
                <div className="text-[10px] text-gray-400 mt-0.5">Scan to pay</div>
              </div>
            )}
          </div>
        )}

        {/* Per-document notes */}
        {doc.notes && <div className="text-[11px] text-gray-500 px-3 py-2 bg-gray-50 rounded mb-3">{doc.notes}</div>}

        {/* Signatures */}
        <div className={`grid gap-4 mt-4 pt-3 border-t border-gray-200 ${Object.keys(sigLabels).length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {Object.entries(sigLabels).map(([role, label]) => {
            const sig = sigs[role];
            return (
              <div key={role} className="text-center">
                <div className="text-[10.5px] text-gray-500 mb-2">{label}</div>
                <div className="h-10 border-b border-gray-300 flex items-end justify-center pb-1">
                  {sig ? <img src={sig} className="max-h-9 max-w-[130px] object-contain" alt="sig" /> : <span />}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">&nbsp;</div>
              </div>
            );
          })}
        {/* Company footer note */}
        {co?.footer_note && (
          <div className="mt-4 pt-3 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400 leading-relaxed">
            {co.footer_note}
          </div>
        )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded text-[12.5px] hover:bg-gray-50">Close</button>
        <button onClick={onSign} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[12.5px] flex items-center gap-1 hover:bg-blue-100">
          <i className="ti ti-signature" />Sign
        </button>
      </div>
    </div>
  );
}
