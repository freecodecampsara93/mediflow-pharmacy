# MediFlow Pharmacy

A full-stack pharmacy / medical store **management and e-commerce system** —
built as a portfolio project to demonstrate clean architecture across a
relational database, a transactional REST API, and a responsive Angular
frontend, plus operational automation via n8n.

> **Scope note:** This is a software management system only. It does not
> perform diagnosis, treatment recommendations, prescription generation, or
> any medical decision-making. Medicines are treated purely as
> catalog/inventory/order data (name, price, stock, expiry, etc.).

## 1. Project overview

MediFlow Pharmacy lets customers browse a medicine catalog, manage a cart and
wishlist, and place orders — while pharmacy staff manage the catalog,
suppliers, stock batches, expiry dates, and incoming orders from an admin
dashboard. Low-stock and expiry conditions, and new orders, trigger
notification workflows in n8n.

## 2. Features

**Customer**
- Browse/search/filter medicines by name, SKU, category, manufacturer, price, stock
- Category browsing, medicine detail pages with stock + manufacturer info
- Cart and wishlist (server-persisted, per account)
- Checkout with server-side price/stock recalculation and a real DB transaction
- Order history and order detail with status tracking
- Registration/login with JWT auth

**Admin**
- Dashboard KPIs (medicines, low stock, expiring/expired, suppliers, customers, orders, revenue)
- Medicine, category, supplier, and batch CRUD
- Inventory view with low-stock detection and manual threshold/stock correction
- Expiry tracking (expiring-soon / expired batch views)
- Order management with status transitions
- Customer list with order counts/totals

**Automation**
- New-order emails (customer confirmation + pharmacy notification) via n8n + Gmail
- Low-stock admin alerts via n8n + Gmail
- Expiry admin alerts via a scheduled n8n workflow + Gmail

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22 (standalone components), TypeScript, Reactive Forms, Angular Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (`pg` driver, connection pool, transactions) |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` password hashing |
| Automation | n8n (Webhook → Edit Fields → Gmail) |
| Security | `helmet`, CORS allow-list, `express-rate-limit`, `express-validator`, parameterized SQL throughout |
| Testing | Jest + Supertest (backend API integration tests against a real, isolated PostgreSQL test database) |

## 4. Architecture

```
Angular (frontend/)
     │  HTTP (JWT bearer)
     ▼
Node.js / Express (backend/)
     │  parameterized SQL, pooled connections, transactions
     ▼
PostgreSQL (mediflow_pharmacy)

Backend ──(fire-and-forget webhook, 3s timeout)──▶ n8n ──▶ Gmail
```

- `frontend/` — Angular app (customer site + `/admin` section), calling the API through typed services.
- `backend/` — Express API: `config/` (env, db pool), `middleware/` (auth, validation, rate limiting, error handling), `controllers/`, `routes/`, `services/` (webhooks), `models/` (shared TS types), `utils/`.
- `database/` — `schema.sql` (DDL) and `seed.ts` (rerunnable demo data).
- `n8n/` — importable workflow JSON + setup docs for the three automation workflows.
- `docs/API_CONTRACT.md` — the single source of truth for every endpoint's request/response shape, used to keep frontend and backend in sync.

## 5. Database structure

12 tables in `mediflow_pharmacy` (see `database/schema.sql` for full DDL with
constraints/indexes):

```
Category ─┬─▶ Medicine ─┬─▶ Batch ──▶ (expiry_date, quantity)
          │             └─▶ Inventory (total_stock, minimum_stock)
          │
Supplier ─┴─▶ Batch

User ─┬─▶ Cart ──▶ CartItem
      ├─▶ Wishlist
      └─▶ Order ─┬─▶ OrderItem
                  └─▶ Payment
```

Highlights:
- `CHECK` constraints prevent negative prices/quantities/stock at the DB level (in addition to API-level validation).
- `citext` email columns for case-insensitive uniqueness.
- `updated_at` auto-maintained via triggers.
- Convenience views: `v_low_stock_medicines`, `v_batch_expiry_status`.
- Deletes are guarded at the API layer (e.g. a category in use, or a medicine referenced by past orders, cannot be deleted — only deactivated).

## 6. API endpoints

Full request/response contracts are documented in
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). Summary:

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Categories | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/:id` |
| Medicines | `GET/POST /api/medicines`, `GET/PUT/DELETE /api/medicines/:id` |
| Suppliers | `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id` (admin only) |
| Batches | `GET/POST /api/batches`, `GET/PUT/DELETE /api/batches/:id` (admin only) |
| Inventory | `GET /api/inventory`, `GET /api/inventory/low-stock`, `GET /api/inventory/expiring-soon`, `GET /api/inventory/expired`, `PUT /api/inventory/:medicineId` (admin only) |
| Cart | `GET/DELETE /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/:medicineId` (auth) |
| Wishlist | `GET /api/wishlist`, `POST/DELETE /api/wishlist/:medicineId` (auth) |
| Orders | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` (auth) |
| Admin orders | `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PUT /api/admin/orders/:id/status` |
| Admin dashboard | `GET /api/admin/dashboard` |
| Admin customers | `GET /api/admin/customers`, `GET /api/admin/customers/:id` |
| Admin automation | `POST /api/admin/notify/expiring-batches` (used by the scheduled n8n expiry workflow) |

## 7. Authentication

- Registration hashes passwords with `bcrypt` (never stored/returned in plaintext).
- Login issues a JWT (`JWT_SECRET`/`JWT_EXPIRES_IN` from environment) containing `{ userId, role }`.
- `authenticate` middleware verifies the bearer token on protected routes; `requireAdmin` additionally checks `role === 'admin'`.
- Public GET endpoints (categories, medicines) use `optionalAuthenticate` so admins can request extra fields (e.g. inactive items) without customers ever seeing them.
- All auth endpoints are rate-limited (`express-rate-limit`) against brute-force attempts.
- API responses never include `password_hash`.

## 8. Inventory logic

- Each medicine has one aggregated `inventory` row (`total_stock`, `minimum_stock`).
- Creating/editing a **batch** adjusts `total_stock` accordingly (in a transaction).
- At checkout, stock is re-validated and decremented **server-side** — the frontend's cart total is never trusted.
- Stock deduction is **FEFO (first-expire-first-out)**: an order pulls from the batch with the nearest (non-expired) expiry date first, falling back to the next batch if one is exhausted.
- `GET /api/inventory/low-stock` reports medicines where `total_stock < minimum_stock`; this also triggers the low-stock n8n webhook right after an order commits.

## 9. Expiry tracking

- Every batch carries its own `expiry_date`.
- `GET /api/inventory/expiring-soon?days=30` and `GET /api/inventory/expired` power the admin Expiry Tracking page.
- The warning window defaults to `EXPIRY_WARNING_DAYS` (30) and can be overridden per-request via `?days=`.
- **Expired stock can never be sold**: order creation only pulls from batches where `expiry_date >= CURRENT_DATE`; if the only remaining stock is expired, the order is rejected with `409 INSUFFICIENT_STOCK`.

## 10. Order workflow

1. Customer adds items to their (server-persisted) cart.
2. `POST /api/orders` starts a single PostgreSQL transaction that:
   - Locks and re-reads the cart and current stock (`FOR UPDATE`),
   - Rejects inactive medicines or insufficient non-expired stock,
   - Recomputes the order total from current medicine prices (client-sent totals are ignored),
   - Deducts stock FEFO across batches, updates aggregate inventory,
   - Inserts `orders`, `order_items`, and a `payments` row (`cash_on_delivery` or `mock_payment` — no real card data is ever accepted or stored),
   - Clears the cart,
   - Commits — or **rolls back everything** if any step fails.
3. After a successful commit (never before), the backend fires the order webhook and, per affected medicine, a low-stock webhook if applicable.
4. Admins move orders through `pending → confirmed → processing → ready → delivered` (or `cancelled`) via `PUT /api/admin/orders/:id/status`.

## 11. n8n automation

See [`n8n/README.md`](n8n/README.md) and the importable workflow files in
[`n8n/workflows/`](n8n/workflows/):

1. **Order Notification** — webhook → format → email to customer + pharmacy.
2. **Low Stock Alert** — webhook → format → email to pharmacy admin.
3. **Expiry Alert** — scheduled trigger calls the backend, which webhooks n8n once per expiring batch → email to pharmacy admin.

All webhook calls use a 3-second timeout and are fire-and-forget: a failure
is logged but never rolls back an order or blocks an API response.

## 12. Local setup

Prerequisites: Node.js 20+, PostgreSQL 14+, npm.

```bash
git clone <this-repo>
cd mediflow-pharmacy

# Backend
cd backend
npm install
cp .env.example .env      # then fill in DB_PASSWORD and JWT_SECRET (see below)

# Frontend
cd ../frontend
npm install

# Root (only needed for the seed script)
cd ..
npm install
```

## 13. Environment variables

All configuration lives in `backend/.env` (copy from `backend/.env.example`,
which is committed; `.env` itself is gitignored and must never be committed):

| Variable | Purpose |
|---|---|
| `PORT` | Backend HTTP port |
| `CORS_ORIGIN` | Allowed frontend origin |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing |
| `EXPIRY_WARNING_DAYS` | Default expiry warning window (days) |
| `N8N_ORDER_WEBHOOK_URL`, `N8N_LOW_STOCK_WEBHOOK_URL`, `N8N_EXPIRY_WEBHOOK_URL` | n8n webhook endpoints |
| `NODE_ENV` | `development` / `production` / `test` |

No secret ever appears in source code — everything above is read from
`process.env` only (`backend/src/config/env.ts`).

## 14. Database initialization

```bash
# Create the database (adjust user as needed)
psql -U postgres -c "CREATE DATABASE mediflow_pharmacy"

# Apply the schema
psql -U postgres -d mediflow_pharmacy -f database/schema.sql
```

## 15. Seed commands

```bash
# From the repo root, after backend/.env is configured:
npm run db:seed
```

This is idempotent/rerunnable — it upserts categories, suppliers, 20
medicines with two batches each, an admin account, three demo customers, and
a few demo orders in different statuses. No real patient data, medical
records, or credentials are used.

Demo logins (all use password `Passw0rd!123`):
- Admin: `admin@mediflow.example`
- Customers: `sara.ahmed@example.com`, `mohamed.ali@example.com`, `nourhan.samir@example.com`

## 16. Run commands

```bash
# Backend (http://localhost:3001 by default in this environment)
cd backend
npm run dev        # ts-node-dev, auto-reload
# or: npm run build && npm start

# Frontend (http://localhost:4200)
cd frontend
npx ng serve
```

## 17. Testing

```bash
cd backend
npm test            # Jest + Supertest against a real, isolated <DB_NAME>_test database
npm run typecheck   # tsc --noEmit
npm run build       # tsc -p tsconfig.json
```

The test suite creates and drops its own `<DB_NAME>_test` PostgreSQL
database per run (see `backend/tests/globalSetup.ts` /
`globalTeardown.ts`) — your development database and seed data are never
touched by tests. Coverage includes: health check, registration/login,
duplicate-email handling, JWT auth + admin authorization, medicine/category/
supplier/batch CRUD and validation, low-stock and expiry classification,
cart/wishlist stock validation, order creation, the order transaction
**rollback** path under insufficient stock, expired-stock rejection, admin
order listing/status updates, the dashboard, customer listing, and webhook
failure handling (an unreachable n8n URL never breaks order creation).

## 18. Screenshots

_Add screenshots here once the frontend is running:_

- `docs/screenshots/home.png`
- `docs/screenshots/medicines.png`
- `docs/screenshots/medicine-detail.png`
- `docs/screenshots/cart-checkout.png`
- `docs/screenshots/admin-dashboard.png`
- `docs/screenshots/admin-inventory.png`

## 19. Future improvements

- Real payment gateway integration (currently Cash on Delivery / Mock Payment only, by design).
- Refresh tokens / token rotation (currently a single long-lived JWT).
- Server-side full-text search (currently `LIKE`-based).
- Role-based staff permissions beyond a single `admin` role (e.g. pharmacist vs. inventory clerk).
- Audit log for admin inventory/price changes.
- Multi-warehouse / multi-branch inventory support.
