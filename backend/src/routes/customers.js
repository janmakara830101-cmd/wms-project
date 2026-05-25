const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM customers ORDER BY id');
  res.json(rows);
});

router.post('/', auth, requirePerm('canCreate'), async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO customers (name,phone,email,address) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, phone||'', email||'', address||'']
  );
  res.json(rows[0]);
});

router.put('/:id', auth, requirePerm('canEdit'), async (req, res) => {
  const { name, phone, email, address } = req.body;
  const { rows } = await pool.query(
    'UPDATE customers SET name=$1,phone=$2,email=$3,address=$4 WHERE id=$5 RETURNING *',
    [name, phone||'', email||'', address||'', req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', auth, requirePerm('canDelete'), async (req, res) => {
  await pool.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
