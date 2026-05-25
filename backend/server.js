require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',        require('./src/routes/auth'));
app.use('/api/settings',    require('./src/routes/settings'));
app.use('/api/categories',  require('./src/routes/categories'));
app.use('/api/products',    require('./src/routes/products'));
app.use('/api/movements',   require('./src/routes/movements'));
app.use('/api/customers',   require('./src/routes/customers'));
app.use('/api/suppliers',   require('./src/routes/suppliers'));
app.use('/api/quotations',  require('./src/routes/quotations'));
app.use('/api/invoices',    require('./src/routes/invoices'));
app.use('/api/deliveries',  require('./src/routes/deliveries'));
app.use('/api/signatures',  require('./src/routes/signatures'));
app.use('/api/users',       require('./src/routes/users'));
app.use('/api/reports',     require('./src/routes/reports'));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`WMS server running on port ${PORT}`));
