const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.*, p.name as product_name, p.unit as product_unit,
           c.name as category_name, c.icon as category_icon, c.color as category_color, c.text_color as category_text_color,
           s.name as supplier_name
    FROM stock_movements m
    LEFT JOIN products p ON m.product_id=p.id
    LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN suppliers s ON m.supplier_id=s.id
    ORDER BY m.id DESC
  `);
  res.json(rows);
});

router.post('/in', auth, requirePerm('canCreate'), async (req, res) => {
  const { product_id, qty, date, supplier_id, shelf, ref, note } = req.body;
  if (!product_id || !qty || qty <= 0) return res.status(400).json({ error: 'Invalid input' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO stock_movements (type,product_id,qty,date,supplier_id,shelf,ref,note,created_by)
       VALUES ('in',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [product_id, qty, date, supplier_id||null, shelf||'', ref||'', note||'', req.user.id]
    );
    await client.query('UPDATE products SET stock=stock+$1, shelf=COALESCE(NULLIF($2,\'\'),shelf) WHERE id=$3', [qty, shelf||'', product_id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.post('/out', auth, requirePerm('canCreate'), async (req, res) => {
  const { product_id, qty, date, ref, note } = req.body;
  if (!product_id || !qty || qty <= 0) return res.status(400).json({ error: 'Invalid input' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pr } = await client.query('SELECT shelf FROM products WHERE id=$1', [product_id]);
    const shelf = pr[0]?.shelf || '';
    const { rows } = await client.query(
      `INSERT INTO stock_movements (type,product_id,qty,date,shelf,ref,note,created_by)
       VALUES ('out',$1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [product_id, qty, date, shelf, ref||'', note||'', req.user.id]
    );
    await client.query('UPDATE products SET stock=GREATEST(0,stock-$1) WHERE id=$2', [qty, product_id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.post('/adjust', auth, requirePerm('canEdit'), async (req, res) => {
  const { product_id, adj_type, qty, reason } = req.body;
  if (!product_id || !reason) return res.status(400).json({ error: 'Invalid input' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pr } = await client.query('SELECT stock, shelf FROM products WHERE id=$1', [product_id]);
    const p = pr[0];
    let newStock = p.stock;
    if (adj_type === 'set') newStock = qty;
    else if (adj_type === 'add') newStock = p.stock + qty;
    else newStock = Math.max(0, p.stock - qty);
    const diff = newStock - p.stock;
    if (diff !== 0) {
      const movType = diff > 0 ? 'in' : 'out';
      await client.query(
        `INSERT INTO stock_movements (type,product_id,qty,date,shelf,ref,note,adj_type,created_by)
         VALUES ($1,$2,$3,NOW(),$4,'ADJ',$5,'adj',$6)`,
        [movType, product_id, Math.abs(diff), p.shelf||'', `Adjustment: ${reason}`, req.user.id]
      );
      await client.query('UPDATE products SET stock=$1 WHERE id=$2', [newStock, product_id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Adjusted', newStock });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM stock_movements WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
