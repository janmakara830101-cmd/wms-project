require('dotenv').config();
const pool = require('./pool');

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) DEFAULT '',
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','staff','viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL DEFAULT 'My Trading Co.',
  company_address TEXT DEFAULT '',
  company_phone VARCHAR(50) DEFAULT '',
  company_email VARCHAR(100) DEFAULT '',
  company_logo TEXT DEFAULT '',
  tax_rate NUMERIC(5,2) DEFAULT 10,
  tax_label VARCHAR(20) DEFAULT 'Tax',
  curr_symbol VARCHAR(5) DEFAULT '$',
  invoice_prefix VARCHAR(20) DEFAULT 'INV-',
  quote_prefix VARCHAR(20) DEFAULT 'QT-',
  delivery_prefix VARCHAR(20) DEFAULT 'DS-',
  footer_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'ti-package',
  color VARCHAR(20) DEFAULT '#E6F1FB',
  text_color VARCHAR(20) DEFAULT '#0C447C',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC(12,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  low_stock_at INTEGER DEFAULT 5,
  unit VARCHAR(30) DEFAULT 'pcs',
  shelf VARCHAR(30) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact VARCHAR(100) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  products TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('in','out')),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  date DATE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  shelf VARCHAR(30) DEFAULT '',
  ref VARCHAR(100) DEFAULT '',
  note TEXT DEFAULT '',
  adj_type VARCHAR(10) DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(20) PRIMARY KEY,
  date DATE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','converted')),
  overall_disc NUMERIC(10,2) DEFAULT 0,
  overall_disc_type VARCHAR(10) DEFAULT 'pct',
  notes TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id VARCHAR(20) REFERENCES quotations(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  disc NUMERIC(5,2) DEFAULT 0,
  remark TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(20) PRIMARY KEY,
  date DATE NOT NULL,
  quotation_id VARCHAR(20) REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  overall_disc NUMERIC(10,2) DEFAULT 0,
  overall_disc_type VARCHAR(10) DEFAULT 'pct',
  notes TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id VARCHAR(20) REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  disc NUMERIC(5,2) DEFAULT 0,
  remark TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id SERIAL PRIMARY KEY,
  invoice_id VARCHAR(20) REFERENCES invoices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(30) DEFAULT 'cash',
  ref VARCHAR(100) DEFAULT '',
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id VARCHAR(20) PRIMARY KEY,
  date DATE NOT NULL,
  invoice_id VARCHAR(20) REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  address TEXT DEFAULT '',
  driver VARCHAR(100) DEFAULT '',
  vehicle VARCHAR(100) DEFAULT '',
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','dispatched','delivered')),
  notes TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_items (
  id SERIAL PRIMARY KEY,
  delivery_id VARCHAR(20) REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) DEFAULT '',
  qty INTEGER NOT NULL,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS signatures (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(10) NOT NULL,
  document_id VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL,
  signature_data TEXT NOT NULL,
  signed_by VARCHAR(100) DEFAULT '',
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_id, role)
);

CREATE SEQUENCE IF NOT EXISTS quotation_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS delivery_seq START 1;
`;

// Add new columns to existing tables (safe to run multiple times)
const alterSql = `
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 10;
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 10;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100) DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_qr TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT '';
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    await client.query(alterSql);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
