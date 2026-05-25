const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.*, c.name as customer_name,
      json_agg(DISTINCT jsonb_build_object('id',ii.id,'product_id',ii.product_id,'qty',ii.qty,'price',ii.price,'disc',ii.disc,'remark',ii.remark,'product_name',p.name)) as items,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id',ip.id,'date',ip.date,'amount',ip.amount,'method',ip.method,'ref',ip.ref,'note',ip.note)) FILTER (WHERE ip.id IS NOT NULL), '[]') as payments,
      json_build_object('issuer', sig_i.signature_data, 'issuer_date', sig_i.signed_at, 'customer', sig_c.signature_data, 'customer_date', sig_c.signed_at) as sigs
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id=c.id
    LEFT JOIN invoice_items ii ON ii.invoice_id=i.id
    LEFT JOIN products p ON ii.product_id=p.id
    LEFT JOIN invoice_payments ip ON ip.invoice_id=i.id
    LEFT JOIN signatures sig_i ON sig_i.document_type='inv' AND sig_i.document_id=i.id AND sig_i.role='issuer'
    LEFT JOIN signatures sig_c ON sig_c.document_type='inv' AND sig_c.document_id=i.id AND sig_c.role='customer'
    GROUP BY i.id, c.name, sig_i.signature_data, sig_i.signed_at, sig_c.signature_data, sig_c.signed_at
    ORDER BY i.id DESC
  `);
  res.json(rows);
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { date, customer_id, status, items, overall_disc, overall_disc_type, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE invoices SET date=$1,customer_id=$2,status=$3,overall_disc=$4,overall_disc_type=$5,notes=$6 WHERE id=$7`,
      [date, customer_id, status, overall_disc||0, overall_disc_type||'pct', notes||'', req.params.id]
    );
    if (items) {
      await client.query('DELETE FROM invoice_items WHERE invoice_id=$1', [req.params.id]);
      for (const it of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, it.product_id, it.qty, it.price, it.disc||0, it.remark||'']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ id: req.params.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Payments
router.post('/:id/payments', auth, requirePerm('canEdit'), async (req, res) => {
  const { date, amount, method, ref, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const { rows } = await pool.query(
    `INSERT INTO invoice_payments (invoice_id,date,amount,method,ref,note,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, date, amount, method||'cash', ref||'', note||'', req.user.id]
  );
  // Auto-update status
  const inv = await pool.query(`SELECT i.overall_disc,i.overall_disc_type,SUM(ii.qty*ii.price*(1-ii.disc/100)) as sub FROM invoices i LEFT JOIN invoice_items ii ON ii.invoice_id=i.id WHERE i.id=$1 GROUP BY i.id`, [req.params.id]);
  const paid = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM invoice_payments WHERE invoice_id=$1', [req.params.id]);
  if (inv.rows[0]) {
    const sub = parseFloat(inv.rows[0].sub)||0;
    const od = parseFloat(inv.rows[0].overall_disc)||0;
    const odt = inv.rows[0].overall_disc_type;
    const oda = odt === 'pct' ? sub * od / 100 : od;
    const total = (sub - oda) * 1.1; // rough; frontend will calc exact
    const paidAmt = parseFloat(paid.rows[0].total)||0;
    const status = paidAmt <= 0 ? 'unpaid' : paidAmt >= total * 0.999 ? 'paid' : 'partial';
    await pool.query('UPDATE invoices SET status=$1 WHERE id=$2', [status, req.params.id]);
  }
  res.json(rows[0]);
});

router.delete('/:id/payments/:payId', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM invoice_payments WHERE id=$1 AND invoice_id=$2', [req.params.payId, req.params.id]);
  res.json({ message: 'Deleted' });
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
