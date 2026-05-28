const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.text_color as category_text_color
    FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.id
  `);
  res.json(rows);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { name, sku, category_id, price, cost, stock, low_stock_at, unit, shelf, photo, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    `INSERT INTO products (name,sku,category_id,price,cost,stock,low_stock_at,unit,shelf,photo,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name, sku||'', category_id||null, price||0, cost||0, stock||0, low_stock_at||5, unit||'pcs', shelf||'', photo||'', note||'']
  );
  res.json(rows[0]);
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { name, sku, category_id, price, cost, stock, low_stock_at, unit, shelf, photo, note } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET name=$1,sku=$2,category_id=$3,price=$4,cost=$5,stock=$6,low_stock_at=$7,unit=$8,shelf=$9,photo=$10,note=$11
     WHERE id=$12 RETURNING *`,
    [name, sku||'', category_id||null, price||0, cost||0, stock||0, low_stock_at||5, unit||'pcs', shelf||'', photo||'', note||'', req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
