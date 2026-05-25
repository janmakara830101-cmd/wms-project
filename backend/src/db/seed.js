require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Company settings
    await client.query(`
      INSERT INTO company_settings (company_name, company_address, company_phone, company_email, tax_rate, tax_label, curr_symbol, invoice_prefix, quote_prefix, delivery_prefix, footer_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT DO NOTHING
    `, ['My Trading Co.', 'Phnom Penh, Cambodia', '012-000-000', 'info@myco.kh', 10, 'Tax', '$', 'INV-', 'QT-', 'DS-', 'Thank you for your business!']);

    // Users
    const users = [
      { username: 'admin',   password: 'admin123',   display_name: 'Administrator', role: 'admin'   },
      { username: 'manager', password: 'manager123', display_name: 'Manager',       role: 'manager' },
      { username: 'staff',   password: 'staff123',   display_name: 'Staff User',    role: 'staff'   },
      { username: 'viewer',  password: 'viewer123',  display_name: 'Viewer',        role: 'viewer'  },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(`
        INSERT INTO users (username, password_hash, display_name, role, active)
        VALUES ($1,$2,$3,$4,true)
        ON CONFLICT (username) DO NOTHING
      `, [u.username, hash, u.display_name, u.role]);
    }

    // Categories
    const cats = [
      { name: 'Consumables',          icon: 'ti-droplet',  color: '#E6F1FB', tc: '#0C447C' },
      { name: 'Spare Parts',           icon: 'ti-tool',     color: '#FAEEDA', tc: '#633806' },
      { name: 'Genset',                icon: 'ti-bolt',     color: '#EAF3DE', tc: '#27500A' },
      { name: 'Technical Equipment',   icon: 'ti-settings', color: '#EEEDFE', tc: '#3C3489' },
      { name: 'Office Supplies',       icon: 'ti-pencil',   color: '#FBEAF0', tc: '#72243E' },
      { name: 'Safety Equipment',      icon: 'ti-shield',   color: '#FCEBEB', tc: '#791F1F' },
    ];
    for (const c of cats) {
      await client.query(`
        INSERT INTO categories (name, icon, color, text_color)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING
      `, [c.name, c.icon, c.color, c.tc]);
    }

    const catRows = await client.query('SELECT id FROM categories ORDER BY id LIMIT 6');
    const [c1,c2,c3,c4,c5,c6] = catRows.rows.map(r => r.id);

    // Products
    const prods = [
      { name: 'Engine Oil 5L',     sku: 'OIL-5L',  cid: c1, price: 18,   cost: 11,   stock: 60,  low: 10, unit: 'bottle', shelf: 'A-01' },
      { name: 'Air Filter',        sku: 'FLT-01',  cid: c2, price: 25,   cost: 14,   stock: 4,   low: 8,  unit: 'pcs',    shelf: 'B-02' },
      { name: 'Generator 10kW',    sku: 'GEN-10K', cid: c3, price: 2800, cost: 2100, stock: 2,   low: 1,  unit: 'unit',   shelf: 'C-01' },
      { name: 'Digital Multimeter',sku: 'DMM-01',  cid: c4, price: 45,   cost: 28,   stock: 10,  low: 3,  unit: 'pcs',    shelf: 'D-02' },
      { name: 'A4 Paper Ream',     sku: 'A4-500',  cid: c5, price: 5.5,  cost: 3.2,  stock: 120, low: 20, unit: 'ream',   shelf: 'E-01' },
      { name: 'Safety Helmet',     sku: 'HLM-01',  cid: c6, price: 12,   cost: 7,    stock: 3,   low: 5,  unit: 'pcs',    shelf: 'F-01' },
    ];
    for (const p of prods) {
      await client.query(`
        INSERT INTO products (name, sku, category_id, price, cost, stock, low_stock_at, unit, shelf)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [p.name, p.sku, p.cid, p.price, p.cost, p.stock, p.low, p.unit, p.shelf]);
    }
    const pRows = await client.query('SELECT id FROM products ORDER BY id LIMIT 6');
    const [p1,p2,p3,p4,p5,p6] = pRows.rows.map(r => r.id);

    // Suppliers
    for (const s of [
      { name: 'Vietnam Supply Co.', contact: 'Mr.Nguyen', phone: '+84-28-1234', email: 'vn@supply.vn', products: 'Oils, Consumables' },
      { name: 'KH Tech Import',     contact: 'Mr.Dara',   phone: '023-456-789', email: 'kh@tech.kh',  products: 'Genset, Equipment'  },
    ]) {
      await client.query(`
        INSERT INTO suppliers (name, contact, phone, email, products)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING
      `, [s.name, s.contact, s.phone, s.email, s.products]);
    }
    const sRows = await client.query('SELECT id FROM suppliers ORDER BY id LIMIT 2');
    const [s1, s2] = sRows.rows.map(r => r.id);

    // Customers
    for (const c of [
      { name: 'Makara Supermarket',  phone: '012-345-678', email: 'order@makara.kh', address: 'St.271, Phnom Penh' },
      { name: 'Bunna Trading Co.',   phone: '089-234-567', email: 'buy@bunna.kh',    address: 'Siem Reap'         },
    ]) {
      await client.query(`
        INSERT INTO customers (name, phone, email, address)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [c.name, c.phone, c.email, c.address]);
    }
    const custRows = await client.query('SELECT id FROM customers ORDER BY id LIMIT 2');
    const [cust1, cust2] = custRows.rows.map(r => r.id);

    // Stock movements
    const movs = [
      { type: 'in',  pid: p1, qty: 80, date: '2026-05-01', sid: s1,   ref: 'PO-001', note: 'Initial stock', shelf: 'A-01' },
      { type: 'in',  pid: p3, qty: 5,  date: '2026-05-05', sid: s2,   ref: 'PO-002', note: '',              shelf: 'C-01' },
      { type: 'out', pid: p1, qty: 20, date: '2026-05-10', sid: null, ref: 'INV-001', note: 'Customer order',shelf: 'A-01' },
      { type: 'out', pid: p5, qty: 30, date: '2026-05-12', sid: null, ref: 'INV-001', note: 'Customer order',shelf: 'E-01' },
      { type: 'in',  pid: p2, qty: 20, date: '2026-05-15', sid: s1,   ref: 'PO-003', note: 'Restock',       shelf: 'B-02' },
      { type: 'out', pid: p2, qty: 16, date: '2026-05-18', sid: null, ref: 'INV-002', note: '',              shelf: 'B-02' },
    ];
    for (const m of movs) {
      await client.query(`
        INSERT INTO stock_movements (type, product_id, qty, date, supplier_id, ref, note, shelf)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [m.type, m.pid, m.qty, m.date, m.sid, m.ref, m.note, m.shelf]);
    }

    // Quotations
    await client.query(`INSERT INTO quotations (id,date,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ('QT-001','2026-05-20',$1,'converted',0,'pct','') ON CONFLICT DO NOTHING`, [cust1]);
    await client.query(`INSERT INTO quotation_items (quotation_id,product_id,qty,price,disc) VALUES ('QT-001',$1,10,18,5),('QT-001',$2,20,5.5,0) ON CONFLICT DO NOTHING`, [p1,p5]);
    await client.query(`INSERT INTO quotations (id,date,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ('QT-002','2026-05-22',$1,'pending',0,'pct','Urgent') ON CONFLICT DO NOTHING`, [cust2]);
    await client.query(`INSERT INTO quotation_items (quotation_id,product_id,qty,price,disc,remark) VALUES ('QT-002',$1,2,45,10,'Latest model') ON CONFLICT DO NOTHING`, [p4]);

    // Invoices
    await client.query(`INSERT INTO invoices (id,date,quotation_id,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ('INV-001','2026-05-21','QT-001',$1,'partial',0,'pct','') ON CONFLICT DO NOTHING`, [cust1]);
    await client.query(`INSERT INTO invoice_items (invoice_id,product_id,qty,price,disc) VALUES ('INV-001',$1,10,18,5),('INV-001',$2,20,5.5,0) ON CONFLICT DO NOTHING`, [p1,p5]);
    await client.query(`INSERT INTO invoice_payments (invoice_id,date,amount,method,ref,note) VALUES ('INV-001','2026-05-22',100,'cash','REC-001','Partial') ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO invoices (id,date,customer_id,status,overall_disc,overall_disc_type,notes) VALUES ('INV-002','2026-05-23',$1,'unpaid',0,'pct','') ON CONFLICT DO NOTHING`, [cust2]);
    await client.query(`INSERT INTO invoice_items (invoice_id,product_id,qty,price,disc) VALUES ('INV-002',$1,2,45,10) ON CONFLICT DO NOTHING`, [p4]);

    // Deliveries
    await client.query(`INSERT INTO deliveries (id,date,invoice_id,customer_id,address,driver,vehicle,status,notes) VALUES ('DS-001','2026-05-22','INV-001',$1,'St.271, Phnom Penh','Dara Sok','PP-1234A','delivered','') ON CONFLICT DO NOTHING`, [cust1]);
    await client.query(`INSERT INTO delivery_items (delivery_id,product_id,product_name,qty,note) VALUES ('DS-001',$1,'Engine Oil 5L',10,''),('DS-001',$2,'A4 Paper Ream',20,'') ON CONFLICT DO NOTHING`, [p1,p5]);

    // Reset sequences
    await client.query(`SELECT setval('quotation_seq', 3)`);
    await client.query(`SELECT setval('invoice_seq', 3)`);
    await client.query(`SELECT setval('delivery_seq', 2)`);

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
