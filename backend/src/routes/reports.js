const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

// Dashboard summary
router.get('/dashboard', auth, async (req, res) => {
  const [prods, invs, qts, movs] = await Promise.all([
    pool.query('SELECT * FROM products'),
    pool.query(`
      SELECT i.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('amount',ip.amount)) FILTER (WHERE ip.id IS NOT NULL), '[]') as payments,
        COALESCE(json_agg(jsonb_build_object('qty',ii.qty,'price',ii.price,'disc',ii.disc)) FILTER (WHERE ii.id IS NOT NULL), '[]') as items,
        i.overall_disc, i.overall_disc_type
      FROM invoices i
      LEFT JOIN invoice_payments ip ON ip.invoice_id=i.id
      LEFT JOIN invoice_items ii ON ii.invoice_id=i.id
      GROUP BY i.id ORDER BY i.id DESC
    `),
    pool.query(`SELECT COUNT(*) as count FROM quotations WHERE status='pending'`),
    pool.query(`SELECT m.*, p.price FROM stock_movements m JOIN products p ON m.product_id=p.id WHERE m.type='out'`),
  ]);
  res.json({
    products: prods.rows,
    invoices: invs.rows,
    pendingQuotations: parseInt(qts.rows[0].count),
    outMovements: movs.rows
  });
});

// Products report
router.get('/products', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.text_color as category_text_color
    FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.name
  `);
  res.json(rows);
});

// Stock In report
router.get('/stock-in', auth, async (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT m.*, p.name as product_name, p.unit,
      c.name as category_name, s.name as supplier_name
    FROM stock_movements m
    LEFT JOIN products p ON m.product_id=p.id
    LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN suppliers s ON m.supplier_id=s.id
    WHERE m.type='in'
  `;
  const params = [];
  if (from) { params.push(from); q += ` AND m.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND m.date<=$${params.length}`; }
  q += ' ORDER BY m.date DESC, m.id DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Stock Out report
router.get('/stock-out', auth, async (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT m.*, p.name as product_name, p.unit,
      c.name as category_name, s.name as supplier_name
    FROM stock_movements m
    LEFT JOIN products p ON m.product_id=p.id
    LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN suppliers s ON m.supplier_id=s.id
    WHERE m.type='out'
  `;
  const params = [];
  if (from) { params.push(from); q += ` AND m.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND m.date<=$${params.length}`; }
  q += ' ORDER BY m.date DESC, m.id DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Hot selling products (by qty sold via invoice items)
router.get('/hot', auth, async (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT p.id, p.name, p.unit, c.name as category_name,
      COALESCE(SUM(ii.qty), 0) as total_sold,
      COALESCE(SUM(ii.qty * ii.price * (1 - ii.disc/100)), 0) as revenue
    FROM products p
    LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN invoice_items ii ON ii.product_id=p.id
    LEFT JOIN invoices i ON ii.invoice_id=i.id
    WHERE 1=1
  `;
  const params = [];
  if (from) { params.push(from); q += ` AND i.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND i.date<=$${params.length}`; }
  q += ' GROUP BY p.id, p.name, p.unit, c.name HAVING COALESCE(SUM(ii.qty),0) > 0 ORDER BY total_sold DESC LIMIT 20';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Low stock products
router.get('/low-stock', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id=c.id
    WHERE p.stock <= p.low_stock_at
    ORDER BY p.stock ASC
  `);
  res.json(rows);
});

// Quotations report
router.get('/quotations', auth, async (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT q.*, c.name as customer_name,
      COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) as sub,
      q.overall_disc,
      COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) - CASE WHEN q.overall_disc_type='pct' THEN COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) * q.overall_disc / 100 ELSE q.overall_disc END as after_disc,
      CASE WHEN q.overall_disc_type='pct' THEN COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) * q.overall_disc / 100 ELSE q.overall_disc END as disc,
      (COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) - CASE WHEN q.overall_disc_type='pct' THEN COALESCE(SUM(qi.qty * qi.price * (1 - qi.disc/100)), 0) * q.overall_disc / 100 ELSE q.overall_disc END) * 1.1 as total
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id=c.id
    LEFT JOIN quotation_items qi ON qi.quotation_id=q.id
    WHERE 1=1
  `;
  const params = [];
  if (from) { params.push(from); q += ` AND q.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND q.date<=$${params.length}`; }
  q += ' GROUP BY q.id, c.name ORDER BY q.date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Invoices report
router.get('/invoices', auth, async (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT i.id, i.date, i.status, c.name as customer_name,
      COALESCE(SUM(DISTINCT ii.qty * ii.price * (1 - ii.disc/100)), 0) as sub,
      COALESCE(SUM(DISTINCT ip.amount), 0) as paid,
      (COALESCE(SUM(DISTINCT ii.qty * ii.price * (1 - ii.disc/100)), 0) -
        CASE WHEN i.overall_disc_type='pct'
          THEN COALESCE(SUM(DISTINCT ii.qty * ii.price * (1 - ii.disc/100)), 0) * i.overall_disc / 100
          ELSE i.overall_disc END
      ) * 1.1 as total
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id=c.id
    LEFT JOIN invoice_items ii ON ii.invoice_id=i.id
    LEFT JOIN invoice_payments ip ON ip.invoice_id=i.id
    WHERE 1=1
  `;
  const params = [];
  if (from) { params.push(from); q += ` AND i.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND i.date<=$${params.length}`; }
  q += ' GROUP BY i.id, i.date, i.status, c.name, i.overall_disc, i.overall_disc_type ORDER BY i.date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Customers report
router.get('/customers', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT cu.id, cu.name, cu.phone, cu.email, cu.address,
      COUNT(DISTINCT i.id) as total_orders,
      COALESCE(SUM(ip.amount), 0) as total_spent
    FROM customers cu
    LEFT JOIN invoices i ON i.customer_id=cu.id
    LEFT JOIN invoice_payments ip ON ip.invoice_id=i.id
    GROUP BY cu.id ORDER BY total_spent DESC
  `);
  res.json(rows);
});

// Suppliers report
router.get('/suppliers', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT su.id, su.name, su.contact, su.phone, su.email, su.products,
      COUNT(DISTINCT m.id) as total_deliveries,
      COALESCE(SUM(m.qty), 0) as total_qty
    FROM suppliers su
    LEFT JOIN stock_movements m ON m.supplier_id=su.id AND m.type='in'
    GROUP BY su.id ORDER BY total_qty DESC
  `);
  res.json(rows);
});

// Legacy: stock-movements (for backward compat)
router.get('/stock-movements', auth, async (req, res) => {
  const { from, to, type } = req.query;
  let q = `
    SELECT m.*, p.name as product_name, p.unit,
      c.name as category_name, s.name as supplier_name
    FROM stock_movements m
    LEFT JOIN products p ON m.product_id=p.id
    LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN suppliers s ON m.supplier_id=s.id WHERE 1=1
  `;
  const params = [];
  if (type) { params.push(type); q += ` AND m.type=$${params.length}`; }
  if (from) { params.push(from); q += ` AND m.date>=$${params.length}`; }
  if (to)   { params.push(to);   q += ` AND m.date<=$${params.length}`; }
  q += ' ORDER BY m.date DESC, m.id DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

module.exports = router;
