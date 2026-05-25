const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { document_type, document_id, role, signature_data } = req.body;
  if (!document_type || !document_id || !role || !signature_data)
    return res.status(400).json({ error: 'Missing fields' });
  const { rows } = await pool.query(`
    INSERT INTO signatures (document_type, document_id, role, signature_data, signed_by, signed_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (document_type, document_id, role)
    DO UPDATE SET signature_data=EXCLUDED.signature_data, signed_by=EXCLUDED.signed_by, signed_at=NOW()
    RETURNING *
  `, [document_type, document_id, role, signature_data, req.user.name]);
  res.json(rows[0]);
});

router.delete('/', auth, async (req, res) => {
  const { document_type, document_id, role } = req.body;
  await pool.query(
    'DELETE FROM signatures WHERE document_type=$1 AND document_id=$2 AND role=$3',
    [document_type, document_id, role]
  );
  res.json({ message: 'Cleared' });
});

module.exports = router;
