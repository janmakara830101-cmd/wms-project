const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM suppliers ORDER BY id');
  res.json(rows);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { name, contact, phone, email, products } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO suppliers (name,contact,phone,email,products) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, contact||'', phone||'', email||'', products||'']
  );
  res.json(rows[0]);
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { name, contact, phone, email, products } = req.body;
  const { rows } = await pool.query(
    'UPDATE suppliers SET name=$1,contact=$2,phone=$3,email=$4,products=$5 WHERE id=$6 RETURNING *',
    [name, contact||'', phone||'', email||'', products||'', req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM suppliers WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
