const router = require('express').Router();
const https  = require('https');
const pool = require('../db/pool');
const { auth, requirePerm } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM company_settings LIMIT 1');
  res.json(rows[0] || {});
});

router.put('/', auth, requirePerm('settings'), async (req, res) => {
  const {
    company_name, company_address, company_phone, company_email, company_logo,
    tax_rate, tax_label, curr_symbol, invoice_prefix, quote_prefix, delivery_prefix, footer_note,
    bank_name, bank_account, bank_account_name, bank_qr,
    telegram_bot_token, telegram_chat_id
  } = req.body;
  try {
    const { rows } = await pool.query('SELECT id FROM company_settings LIMIT 1');
    if (rows.length) {
      await pool.query(
        `UPDATE company_settings SET
          company_name=$1, company_address=$2, company_phone=$3, company_email=$4, company_logo=$5,
          tax_rate=$6, tax_label=$7, curr_symbol=$8,
          invoice_prefix=$9, quote_prefix=$10, delivery_prefix=$11, footer_note=$12,
          bank_name=$13, bank_account=$14, bank_account_name=$15, bank_qr=$16,
          telegram_bot_token=$17, telegram_chat_id=$18
         WHERE id=$19`,
        [company_name, company_address, company_phone, company_email, company_logo||'',
         tax_rate, tax_label, curr_symbol,
         invoice_prefix||'INV-', quote_prefix||'QT-', delivery_prefix||'DS-', footer_note||'',
         bank_name||'', bank_account||'', bank_account_name||'', bank_qr||'',
         telegram_bot_token||'', telegram_chat_id||'',
         rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO company_settings
          (company_name,company_address,company_phone,company_email,company_logo,tax_rate,tax_label,curr_symbol,invoice_prefix,quote_prefix,delivery_prefix,footer_note,bank_name,bank_account,bank_account_name,bank_qr,telegram_bot_token,telegram_chat_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [company_name, company_address, company_phone, company_email, company_logo||'',
         tax_rate, tax_label, curr_symbol,
         invoice_prefix||'INV-', quote_prefix||'QT-', delivery_prefix||'DS-', footer_note||'',
         bank_name||'', bank_account||'', bank_account_name||'', bank_qr||'',
         telegram_bot_token||'', telegram_chat_id||'']
      );
    }
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Telegram — send a test message with the given token+chatId (before saving)
router.post('/test-telegram', auth, requirePerm('settings'), async (req, res) => {
  const { token, chat_id } = req.body;
  if (!token || !chat_id) return res.status(400).json({ error: 'Bot token and Chat ID are required' });
  const body = JSON.stringify({
    chat_id,
    text: '✅ <b>PARTKH247</b>\n\nTelegram notifications are working! 🎉',
    parse_mode: 'HTML',
  });
  const opts = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };
  try {
    await new Promise((resolve, reject) => {
      const r = https.request(opts, (resp) => {
        let raw = '';
        resp.on('data', d => raw += d);
        resp.on('end', () => {
          const parsed = JSON.parse(raw);
          if (parsed.ok) resolve();
          else reject(new Error(parsed.description || 'Telegram error'));
        });
      });
      r.on('error', reject);
      r.write(body);
      r.end();
    });
    res.json({ message: 'Test message sent successfully!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Backup — export all data as JSON
router.get('/backup', auth, requirePerm('settings'), async (req, res) => {
  try {
    const [settings, cats, prods, supps, custs, movs, qts, qtItems, invs, invItems, payments, dels, delItems] = await Promise.all([
      pool.query('SELECT * FROM company_settings LIMIT 1'),
      pool.query('SELECT * FROM categories ORDER BY id'),
      pool.query('SELECT * FROM products ORDER BY id'),
      pool.query('SELECT * FROM suppliers ORDER BY id'),
      pool.query('SELECT * FROM customers ORDER BY id'),
      pool.query('SELECT * FROM stock_movements ORDER BY id'),
      pool.query('SELECT * FROM quotations ORDER BY id'),
      pool.query('SELECT * FROM quotation_items ORDER BY id'),
      pool.query('SELECT * FROM invoices ORDER BY id'),
      pool.query('SELECT * FROM invoice_items ORDER BY id'),
      pool.query('SELECT * FROM invoice_payments ORDER BY id'),
      pool.query('SELECT * FROM deliveries ORDER BY id'),
      pool.query('SELECT * FROM delivery_items ORDER BY id'),
    ]);
    res.json({
      exported_at: new Date().toISOString(),
      settings: settings.rows[0],
      categories: cats.rows,
      products: prods.rows,
      suppliers: supps.rows,
      customers: custs.rows,
      stock_movements: movs.rows,
      quotations: qts.rows,
      quotation_items: qtItems.rows,
      invoices: invs.rows,
      invoice_items: invItems.rows,
      invoice_payments: payments.rows,
      deliveries: dels.rows,
      delivery_items: delItems.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore — import backup JSON
router.post('/restore', auth, requirePerm('settings'), async (req, res) => {
  const data = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Truncate in safe order
    await client.query('TRUNCATE delivery_items, deliveries, invoice_payments, invoice_items, invoices, quotation_items, quotations, stock_movements, customers, suppliers, products, categories, company_settings RESTART IDENTITY CASCADE');
    // Re-insert
    if (data.settings) {
      const s = data.settings;
      await client.query(`INSERT INTO company_settings (company_name,company_address,company_phone,company_email,company_logo,tax_rate,tax_label,curr_symbol,invoice_prefix,quote_prefix,delivery_prefix,footer_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [s.company_name||'',s.company_address||'',s.company_phone||'',s.company_email||'',s.company_logo||'',s.tax_rate||10,s.tax_label||'Tax',s.curr_symbol||'$',s.invoice_prefix||'INV-',s.quote_prefix||'QT-',s.delivery_prefix||'DS-',s.footer_note||'']);
    }
    for (const c of (data.categories||[])) await client.query(`INSERT INTO categories (id,name,icon,color,text_color) VALUES ($1,$2,$3,$4,$5)`, [c.id,c.name,c.icon||'ti-package',c.color||'#E6F1FB',c.text_color||'#0C447C']);
    for (const p of (data.products||[]))   await client.query(`INSERT INTO products (id,name,sku,category_id,price,cost,stock,low_stock_at,unit,shelf) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [p.id,p.name,p.sku||'',p.category_id,p.price||0,p.cost||0,p.stock||0,p.low_stock_at||5,p.unit||'pcs',p.shelf||'']);
    for (const s of (data.suppliers||[]))  await client.query(`INSERT INTO suppliers (id,name,contact,phone,email,products) VALUES ($1,$2,$3,$4,$5,$6)`, [s.id,s.name,s.contact||'',s.phone||'',s.email||'',s.products||'']);
    for (const c of (data.customers||[]))  await client.query(`INSERT INTO customers (id,name,phone,email,address) VALUES ($1,$2,$3,$4,$5)`, [c.id,c.name,c.phone||'',c.email||'',c.address||'']);
    for (const m of (data.stock_movements||[])) await client.query(`INSERT INTO stock_movements (id,type,product_id,qty,date,supplier_id,shelf,ref,note,adj_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [m.id,m.type,m.product_id,m.qty,m.date,m.supplier_id||null,m.shelf||'',m.ref||'',m.note||'',m.adj_type||'']);
    for (const q of (data.quotations||[]))      await client.query(`INSERT INTO quotations (id,date,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [q.id,q.date,q.customer_id,q.status||'pending',q.overall_disc||0,q.overall_disc_type||'pct',q.notes||'']);
    for (const qi of (data.quotation_items||[])) await client.query(`INSERT INTO quotation_items (id,quotation_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [qi.id,qi.quotation_id,qi.product_id,qi.qty,qi.price,qi.disc||0,qi.remark||'']);
    for (const i of (data.invoices||[]))         await client.query(`INSERT INTO invoices (id,date,quotation_id,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [i.id,i.date,i.quotation_id||null,i.customer_id,i.status||'unpaid',i.overall_disc||0,i.overall_disc_type||'pct',i.notes||'']);
    for (const ii of (data.invoice_items||[]))   await client.query(`INSERT INTO invoice_items (id,invoice_id,product_id,qty,price,disc,remark) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [ii.id,ii.invoice_id,ii.product_id,ii.qty,ii.price,ii.disc||0,ii.remark||'']);
    for (const p of (data.invoice_payments||[]))  await client.query(`INSERT INTO invoice_payments (id,invoice_id,date,amount,method,ref,note) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [p.id,p.invoice_id,p.date,p.amount,p.method||'cash',p.ref||'',p.note||'']);
    for (const d of (data.deliveries||[]))        await client.query(`INSERT INTO deliveries (id,date,invoice_id,customer_id,address,driver,vehicle,delivery_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [d.id,d.date,d.invoice_id||null,d.customer_id,d.address||'',d.driver||'',d.vehicle||'',d.delivery_date||null,d.status||'draft',d.notes||'']);
    for (const di of (data.delivery_items||[]))   await client.query(`INSERT INTO delivery_items (id,delivery_id,product_id,product_name,qty,note) VALUES ($1,$2,$3,$4,$5,$6)`, [di.id,di.delivery_id,di.product_id,di.product_name||'',di.qty,di.note||'']);
    // Restore sequences
    await client.query(`SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories),1))`);
    await client.query(`SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products),1))`);
    await client.query(`SELECT setval('suppliers_id_seq', COALESCE((SELECT MAX(id) FROM suppliers),1))`);
    await client.query(`SELECT setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers),1))`);
    await client.query(`SELECT setval('stock_movements_id_seq', COALESCE((SELECT MAX(id) FROM stock_movements),1))`);
    await client.query(`SELECT setval('quotation_items_id_seq', COALESCE((SELECT MAX(id) FROM quotation_items),1))`);
    await client.query(`SELECT setval('invoice_items_id_seq', COALESCE((SELECT MAX(id) FROM invoice_items),1))`);
    await client.query(`SELECT setval('invoice_payments_id_seq', COALESCE((SELECT MAX(id) FROM invoice_payments),1))`);
    await client.query(`SELECT setval('delivery_items_id_seq', COALESCE((SELECT MAX(id) FROM delivery_items),1))`);
    await client.query('COMMIT');
    res.json({ message: 'Restore complete' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
