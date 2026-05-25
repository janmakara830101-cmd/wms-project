const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows: qts } = await pool.query(`
    SELECT q.*, c.name as customer_name, COALESCE(q.tax_rate, 10) as tax_rate,
      json_agg(json_build_object('id',qi.id,'product_id',qi.product_id,'qty',qi.qty,'price',qi.price,'disc',qi.disc,'remark',qi.remark,'product_name',p.name) ORDER BY qi.id) as items,
      json_build_object('issuer', sig_i.signature_data, 'issuer_date', sig_i.signed_at, 'customer', sig_c.signature_data, 'customer_date', sig_c.signed_at) as sigs
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id=c.id
    LEFT JOIN quotation_items qi ON qi.quotation_id=q.id
    LEFT JOIN products p ON qi.product_id=p.id
    LEFT JOIN signatures sig_i ON sig_i.document_type='qt' AND sig_i.document_id=q.id AND sig_i.role='issuer'
    LEFT JOIN signatures sig_c ON sig_c.document_type='qt' AND sig_c.document_id=q.id AND sig_c.role='customer'
    GROUP BY q.id, c.name, sig_i.signature_data, sig_i.signed_at, sig_c.signature_data, sig_c.signed_at
    ORDER BY q.id DESC
  `);
  res.json(qts);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { date, customer_id, items, overall_disc, overall_disc_type, tax_rate, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seqRow = await client.query(`SELECT nextval('quotation_seq') as n`);
    const id = `QT-${String(seqRow.rows[0].n).padStart(3,'0')}`;
    await client.query(
      `INSERT INTO quotations (id,date,customer_id,status,overall_disc,overall_disc_type,tax_rate,notes,created_by)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8)`,
      [id, date, customer_id, overall_disc||0, overall_disc_type||'pct', tax_rate||10, notes||'', req.user.id]
    );
    for (const it of items) {
      await client.query(
        `INSERT INTO quotation_items (quotation_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, it.product_id, it.qty, it.price, it.disc||0, it.remark||'']
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
  const { date, customer_id, items, overall_disc, overall_disc_type, tax_rate, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE quotations SET date=$1,customer_id=$2,overall_disc=$3,overall_disc_type=$4,tax_rate=$5,notes=$6 WHERE id=$7`,
      [date, customer_id, overall_disc||0, overall_disc_type||'pct', tax_rate||10, notes||'', req.params.id]
    );
    await client.query('DELETE FROM quotation_items WHERE quotation_id=$1', [req.params.id]);
    for (const it of items) {
      await client.query(
        `INSERT INTO quotation_items (quotation_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.params.id, it.product_id, it.qty, it.price, it.disc||0, it.remark||'']
      );
    }
    await client.query('COMMIT');
    res.json({ id: req.params.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id/approve', auth, requirePerm('canEdit'), async (req, res) => {
  await pool.query(`UPDATE quotations SET status='approved' WHERE id=$1`, [req.params.id]);
  res.json({ message: 'Approved' });
});

router.post('/:id/convert', auth, requirePerm('canCreate'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: qRows } = await client.query(
      `SELECT q.*, json_agg(json_build_object('product_id',qi.product_id,'qty',qi.qty,'price',qi.price,'disc',qi.disc,'remark',qi.remark)) as items
       FROM quotations q JOIN quotation_items qi ON qi.quotation_id=q.id WHERE q.id=$1 GROUP BY q.id`,
      [req.params.id]
    );
    const q = qRows[0];
    if (!q) return res.status(404).json({ error: 'Not found' });
    const seqRow = await client.query(`SELECT nextval('invoice_seq') as n`);
    const invId = `INV-${String(seqRow.rows[0].n).padStart(3,'0')}`;
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO invoices (id,date,quotation_id,customer_id,status,overall_disc,overall_disc_type,tax_rate,notes,created_by)
       VALUES ($1,$2,$3,$4,'unpaid',$5,$6,$7,$8,$9)`,
      [invId, today, q.id, q.customer_id, q.overall_disc||0, q.overall_disc_type||'pct', q.tax_rate||10, q.notes||'', req.user.id]
    );
    for (const it of q.items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6)`,
        [invId, it.product_id, it.qty, it.price, it.disc||0, it.remark||'']
      );
      // Deduct stock
      await client.query('UPDATE products SET stock=GREATEST(0,stock-$1) WHERE id=$2', [it.qty, it.product_id]);
      const { rows: pr } = await client.query('SELECT shelf FROM products WHERE id=$1', [it.product_id]);
      await client.query(
        `INSERT INTO stock_movements (type,product_id,qty,date,shelf,ref,note,created_by) VALUES ('out',$1,$2,$3,$4,$5,'Auto: invoice',$6)`,
        [it.product_id, it.qty, today, pr[0]?.shelf||'', invId, req.user.id]
      );
    }
    await client.query(`UPDATE quotations SET status='converted' WHERE id=$1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ id: invId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM quotations WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
