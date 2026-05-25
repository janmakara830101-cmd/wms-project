const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY id');
  res.json(rows);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { name, icon, color, text_color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO categories (name,icon,color,text_color) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, icon||'ti-package', color||'#E6F1FB', text_color||'#0C447C']
  );
  res.json(rows[0]);
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { name, icon, color, text_color } = req.body;
  const { rows } = await pool.query(
    'UPDATE categories SET name=$1,icon=$2,color=$3,text_color=$4 WHERE id=$5 RETURNING *',
    [name, icon, color, text_color, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) FROM products WHERE category_id=$1', [req.params.id]);
  if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Category has products — reassign them first' });
  await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
