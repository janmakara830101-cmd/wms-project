const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.*, c.name as customer_name,
      json_agg(json_build_object(
        'id', di.id, 'product_id', di.product_id, 'product_name', di.product_name,
        'qty', di.qty, 'remark', di.note
      ) ORDER BY di.id) FILTER (WHERE di.id IS NOT NULL) as items,
      json_build_object(
        'issuer',   sig_i.signature_data,  'issuer_date',   sig_i.signed_at,
        'driver',   sig_d.signature_data,  'driver_date',   sig_d.signed_at,
        'customer', sig_c.signature_data,  'customer_date', sig_c.signed_at
      ) as sigs
    FROM deliveries d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN delivery_items di ON di.delivery_id = d.id
    LEFT JOIN signatures sig_i ON sig_i.document_type='ds' AND sig_i.document_id=d.id AND sig_i.role='issuer'
    LEFT JOIN signatures sig_d ON sig_d.document_type='ds' AND sig_d.document_id=d.id AND sig_d.role='driver'
    LEFT JOIN signatures sig_c ON sig_c.document_type='ds' AND sig_c.document_id=d.id AND sig_c.role='customer'
    GROUP BY d.id, c.name, sig_i.signature_data, sig_i.signed_at, sig_d.signature_data, sig_d.signed_at, sig_c.signature_data, sig_c.signed_at
    ORDER BY d.id DESC
  `);
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.*, c.name as customer_name,
      json_agg(json_build_object(
        'id', di.id, 'product_id', di.product_id, 'product_name', di.product_name,
        'qty', di.qty, 'remark', di.note
      ) ORDER BY di.id) FILTER (WHERE di.id IS NOT NULL) as items,
      json_build_object(
        'issuer',   sig_i.signature_data,  'issuer_date',   sig_i.signed_at,
        'customer', sig_c.signature_data,  'customer_date', sig_c.signed_at
      ) as sigs
    FROM deliveries d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN delivery_items di ON di.delivery_id = d.id
    LEFT JOIN signatures sig_i ON sig_i.document_type='ds' AND sig_i.document_id=d.id AND sig_i.role='issuer'
    LEFT JOIN signatures sig_c ON sig_c.document_type='ds' AND sig_c.document_id=d.id AND sig_c.role='customer'
    WHERE d.id=$1
    GROUP BY d.id, c.name, sig_i.signature_data, sig_i.signed_at, sig_c.signature_data, sig_c.signed_at
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { date, invoice_id, items, address, driver, vehicle, delivery_date, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Determine customer from invoice
    let customer_id = null;
    if (invoice_id) {
      const inv = await client.query('SELECT customer_id FROM invoices WHERE id=$1', [invoice_id]);
      if (inv.rows[0]) customer_id = inv.rows[0].customer_id;
    }
    const seqRow = await client.query(`SELECT nextval('delivery_seq') as n`);
    const id = `DS-${String(seqRow.rows[0].n).padStart(3,'0')}`;
    await client.query(
      `INSERT INTO deliveries (id,date,invoice_id,customer_id,address,driver,vehicle,delivery_date,status,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10)`,
      [id, date, invoice_id||null, customer_id, address||'', driver||'', vehicle||'', delivery_date||null, notes||'', req.user.id]
    );
    for (const it of (items||[])) {
      await client.query(
        `INSERT INTO delivery_items (delivery_id,product_id,product_name,qty,note) VALUES ($1,$2,$3,$4,$5)`,
        [id, it.product_id, it.product_name||'', it.qty, it.remark||it.note||'']
      );
    }
    await client.query('COMMIT');
    res.json({ id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { date, address, driver, vehicle, delivery_date, notes, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE deliveries SET date=$1,address=$2,driver=$3,vehicle=$4,delivery_date=$5,notes=$6 WHERE id=$7`,
      [date, address||'', driver||'', vehicle||'', delivery_date||null, notes||'', req.params.id]
    );
    await client.query('DELETE FROM delivery_items WHERE delivery_id=$1', [req.params.id]);
    for (const it of (items||[])) {
      await client.query(
        `INSERT INTO delivery_items (delivery_id,product_id,product_name,qty,note) VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, it.product_id, it.product_name||'', it.qty, it.remark||it.note||'']
      );
    }
    await client.query('COMMIT');
    res.json({ id: req.params.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id/status', auth, requirePerm('canEdit'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['draft','dispatched','delivered'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await pool.query('UPDATE deliveries SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM deliveries WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
