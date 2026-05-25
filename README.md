# WMS — Warehouse Management System

Full-stack web application built with **React + Vite + Tailwind CSS** (frontend) and **Node.js + Express + PostgreSQL** (backend).

---

## Features

- Dashboard with revenue chart & low-stock alerts
- Product catalog with categories, stock bars, SKU/shelf tracking
- Stock In / Stock Out / Adjustment movements
- Quotations → Invoice conversion workflow
- Invoice payments tracking (partial/paid/unpaid)
- Delivery slips with dispatch → delivered workflow
- Digital signatures on documents (draw with mouse/touch)
- Print / PDF / Excel export for all documents
- Role-based access: Admin, Manager, Staff, Viewer
- Company settings, backup/restore JSON
- Reports: Hot Selling, Low Stock, Sales, Quotations, Customers, Suppliers

---

## Quick Start (Local)

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/download/) — running locally

### 1. Create the database

Open **pgAdmin** or **psql** and run:

```sql
CREATE DATABASE wms;
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/wms
JWT_SECRET=any-long-random-string-here
PORT=3001
NODE_ENV=development
```

### 3. Run migrations & seed

```bash
cd backend
npm run migrate
npm run seed
```

### 4. Start the backend

```bash
# In backend/
npm run dev
```

Backend runs at **http://localhost:3001**

### 5. Start the frontend

```bash
# In a new terminal, in frontend/
cd frontend
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## Default Login Accounts

| Username | Password     | Role    |
|----------|-------------|---------|
| admin    | admin123    | Admin   |
| manager  | manager123  | Manager |
| staff    | staff123    | Staff   |
| viewer   | viewer123   | Viewer  |

---

## Deploy to Railway.app

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Deploy from GitHub repo** → connect your repo

### Step 2 — Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **Add PostgreSQL**
2. After it provisions, click the PostgreSQL service → **Variables** tab → copy `DATABASE_URL`

### Step 3 — Set environment variables

In your main service (the Node.js app), go to **Variables** and add:

```
DATABASE_URL=<paste from PostgreSQL service>
JWT_SECRET=your-production-secret-32-chars-minimum
NODE_ENV=production
```

> Railway automatically sets `PORT` — don't set it manually.

### Step 4 — Run migrations & seed (one-time)

In Railway dashboard → your service → **Settings** → **Deploy** section, temporarily set:

**Start Command:** `node backend/src/db/migrate.js && node backend/src/db/seed.js`

Deploy, wait for it to finish, then restore the start command to:

**Start Command:** `node backend/server.js`

> Or use Railway's **one-off commands** feature if available.

### Step 5 — Your app is live!

Railway gives you a URL like `https://wms-production.up.railway.app`

---

## Project Structure

```
wms-project/
├── backend/
│   ├── server.js              # Express entry point
│   ├── .env                   # Local env vars (not committed)
│   ├── .env.example
│   └── src/
│       ├── db/
│       │   ├── pool.js        # PostgreSQL connection pool
│       │   ├── migrate.js     # Create all tables
│       │   └── seed.js        # Insert sample data
│       ├── middleware/
│       │   └── auth.js        # JWT auth + role permissions
│       └── routes/            # One file per resource
│           ├── auth.js
│           ├── settings.js
│           ├── categories.js
│           ├── products.js
│           ├── movements.js
│           ├── customers.js
│           ├── suppliers.js
│           ├── quotations.js
│           ├── invoices.js
│           ├── deliveries.js
│           ├── signatures.js
│           ├── users.js
│           └── reports.js
└── frontend/
    ├── index.html             # Loads Tabler Icons + SheetJS from CDN
    ├── vite.config.js         # Proxies /api → localhost:3001
    └── src/
        ├── App.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── utils/
        │   ├── api.js         # Axios with JWT interceptor
        │   └── helpers.js     # calcTotals, fm, can, xlsExport
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Modal.jsx
        │   ├── Badge.jsx
        │   ├── SignatureCanvas.jsx
        │   ├── DocViewer.jsx
        │   └── SigModal.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Categories.jsx
            ├── Products.jsx
            ├── Movements.jsx
            ├── Customers.jsx
            ├── Suppliers.jsx
            ├── Quotations.jsx
            ├── Invoices.jsx
            ├── Deliveries.jsx
            ├── Reports.jsx
            ├── Users.jsx
            └── Settings.jsx
```

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3  |
| HTTP client| Axios                             |
| Routing    | React Router v6                   |
| Icons      | Tabler Icons (CDN)                |
| Excel      | SheetJS / XLSX (CDN)              |
| Backend    | Node.js, Express 4                |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Database   | PostgreSQL 14+                    |
| DB client  | node-postgres (pg)                |
| Deployment | Railway.app                       |
