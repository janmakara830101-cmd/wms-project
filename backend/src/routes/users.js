const router = require('express').Router();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, requirePerm('users'), async (req, res) => {
  const { rows } = await pool.query('SELECT id,username,display_name,role,active,created_at FROM users ORDER BY id');
  res.json(rows);
});

router.post('/', auth, requirePerm('users'), async (req, res) => {
  const { username, display_name, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username,display_name,password_hash,role,active) VALUES ($1,$2,$3,$4,true) RETURNING id,username,display_name,role,active',
      [username, display_name||'', hash, role||'staff']
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already taken' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, requirePerm('users'), async (req, res) => {
  const { display_name, password, role } = req.body;
  try {
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      if (role != null) {
        // Full edit: update name, password, and role
        await pool.query(
          'UPDATE users SET display_name=$1,password_hash=$2,role=$3 WHERE id=$4',
          [display_name||'', hash, role, req.params.id]
        );
      } else {
        // Password-only reset: only update password_hash
        await pool.query(
          'UPDATE users SET password_hash=$1 WHERE id=$2',
          [hash, req.params.id]
        );
      }
    } else if (role != null) {
      await pool.query(
        'UPDATE users SET display_name=$1,role=$2 WHERE id=$3',
        [display_name||'', role, req.params.id]
      );
    }
    const { rows } = await pool.query('SELECT id,username,display_name,role,active FROM users WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, requirePerm('users'), async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: "Can't delete your own account" });
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
