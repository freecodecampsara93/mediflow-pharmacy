# MediFlow Pharmacy — API Contract

This is the single source of truth for how the Angular frontend and the
Express backend talk to each other. Both sides must conform to this
document exactly (paths, payload shapes, status codes, error format).

Base URL (dev): `http://localhost:3000/api`

## Conventions

- All request/response bodies are JSON.
- Auth: `Authorization: Bearer <jwt>` header. Token returned from
  `/auth/login` and `/auth/register`.
- Roles: `customer`, `admin`. Admin-only routes return `403` for
  non-admins and `401` if unauthenticated.
- Money fields are numbers with 2 decimal places (e.g. `12.50`).
- Dates are ISO-8601 strings (`2026-09-21` for dates, full ISO for timestamps).
- Pagination query params: `page` (default 1), `limit` (default 12, max 100).
  Paginated responses:
  ```json
  { "data": [...], "pagination": { "page": 1, "limit": 12, "total": 57, "totalPages": 5 } }
  ```
- Error response shape (all non-2xx):
  ```json
  { "error": { "message": "human readable message", "code": "OPTIONAL_CODE" } }
  ```
  No stack traces or SQL text ever appear in responses.

## Auth

### POST /auth/register
Body: `{ name, email, password, phone?, address? }`
201 → `{ user: PublicUser, token }`
409 if email already registered.

### POST /auth/login
Body: `{ email, password }`
200 → `{ user: PublicUser, token }`
401 on bad credentials.
Rate-limited (see security section).

### POST /auth/forgot-password
Body: `{ email }`
200 → `{ message }` — identical whether or not the account exists. Emails a single-use link
(`FRONTEND_BASE_URL/reset-password?token=...`, expires after `PASSWORD_RESET_TTL_MINUTES`). Strict rate limit.

### POST /auth/reset-password
Body: `{ token, password }` (password ≥ 8 chars)
200 → `{ message }`; 400 if the token is invalid, expired or already used. Consumes all of the user's outstanding tokens.

### GET /auth/me
Auth required.
200 → `{ user: PublicUser }`

`PublicUser`: `{ id, name, email, role, phone, address, createdAt }` — never includes `passwordHash`.

## Categories

- `GET /categories` — public, list all active categories (admin can pass `?all=true` to include inactive, admin only).
- `GET /categories/:id` — public.
- `POST /categories` — admin. Body `{ name, description?, image? }`.
- `PUT /categories/:id` — admin.
- `DELETE /categories/:id` — admin. Soft-guarded: rejected with 409 if medicines reference it (or set category_id null — implementation picks one and documents it; chosen: block delete with 409 if in use).

## Medicines

- `GET /medicines` — public. Query params: `search`, `category`, `manufacturer`, `minPrice`, `maxPrice`, `inStock` (true/false), `page`, `limit`. Only `active=true` medicines returned to non-admins.
- `GET /medicines/:id` — public. Returns medicine + category + current total_stock.
- `POST /medicines` — admin. Body: `{ name, description, categoryId, manufacturer, sku, price, image, active, prescriptionRequired }`.
- `PUT /medicines/:id` — admin.
- `DELETE /medicines/:id` — admin. Rejected 409 if referenced by existing order_items (preserve order history); otherwise hard delete (cascades batches/inventory).
- Negative price/stock always rejected with 400.

## Suppliers (admin only, all routes)

- `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`
- Body: `{ name, contactPerson, phone, email, address, active }`

## Batches (admin only, all routes)

- `GET /batches` (query: `medicineId`, `supplierId`)
- `GET /batches/:id`
- `POST /batches` — Body: `{ medicineId, supplierId, batchNumber, quantity, expiryDate, purchasePrice, sellingPrice }`. Creating a batch increments `inventory.total_stock` for that medicine (creating the inventory row if missing) inside a transaction.
- `PUT /batches/:id`
- `DELETE /batches/:id`

## Inventory & Expiry (admin only)

- `GET /inventory` — list with medicine name, total_stock, minimum_stock.
- `GET /inventory/low-stock` — total_stock < minimum_stock.
- `GET /inventory/expiring-soon?days=30` — batches expiring within N days (default 30 from `EXPIRY_WARNING_DAYS` env, overridable by query).
- `GET /inventory/expired` — batches with expiry_date < today.
- `PUT /inventory/:medicineId` — Body: `{ minimumStock }` (adjust threshold) or `{ totalStock }` (manual correction). Never allows negative values.

## Cart (auth required, customer)

- `GET /cart` — returns cart with items (medicine snapshot + line totals) and a server-computed `total`.
- `POST /cart/items` — Body `{ medicineId, quantity }`. Validates medicine active + quantity <= available stock.
- `PUT /cart/items/:medicineId` — Body `{ quantity }`.
- `DELETE /cart/items/:medicineId`
- `DELETE /cart` — clears all items.

## Wishlist (auth required, customer)

- `GET /wishlist`
- `POST /wishlist/:medicineId`
- `DELETE /wishlist/:medicineId`

## Orders (auth required, customer)

- `POST /orders` — Body: `{ shippingName, shippingPhone, shippingAddress, paymentMethod }` (`cash_on_delivery` | `mock_payment`). Server reads the user's cart, re-validates stock + active + non-expired batches, computes totals server-side, and in **one DB transaction**: creates order + order_items + payment, decrements inventory, clears cart. Fires webhooks (Phase 17/18) after commit, never inside the transaction. 409 if cart empty or any item now out of stock/expired.
- `GET /orders` — current user's orders (paginated).
- `GET /orders/:id` — current user's order detail (404 if not owner and not admin).

## Admin Orders

- `GET /admin/orders` — all orders, filter by `status`, paginated.
- `GET /admin/orders/:id`
- `PUT /admin/orders/:id/status` — Body `{ status }`, must be a valid forward transition.

## Admin Dashboard

- `GET /admin/dashboard` → 
```json
{
  "totalMedicines": 0, "activeMedicines": 0, "lowStock": 0,
  "expiringSoon": 0, "expired": 0, "totalSuppliers": 0,
  "totalCustomers": 0, "todaysOrders": 0, "totalOrders": 0, "revenue": 0
}
```
`revenue` = sum of `total_amount` for non-cancelled orders.

## Admin Customers

- `GET /admin/customers` — `{ id, name, email, createdAt, orderCount, orderTotal }[]`, paginated.
- `GET /admin/customers/:id` — same shape + recent orders.

## Health

- `GET /api/health` → `{ status: "ok", timestamp }` — public, unauthenticated, used by tests/uptime checks.

## Webhooks (backend → n8n, not exposed to frontend)

- `POST {N8N_ORDER_WEBHOOK_URL}` after committed order: `{ orderId, customerName, customerEmail, totalAmount, status, items: [{ medicineName, quantity, unitPrice }] }`
- `POST {N8N_LOW_STOCK_WEBHOOK_URL}` when post-order/post-adjustment stock < minimum: `{ medicineId, medicineName, remainingStock, minimumStock }`
- Both: 3s timeout, failures logged (not thrown), never roll back or fail the triggering request.

## Frontend routing map (Angular)

Customer (`/`): `/`, `/medicines`, `/medicines/:id`, `/categories`, `/categories/:id`, `/cart`, `/checkout` (auth), `/orders` (auth), `/orders/:id` (auth), `/wishlist` (auth), `/login`, `/register`.

Admin (`/admin`, all behind `adminGuard`): `/admin/login`, `/admin/dashboard`, `/admin/medicines`, `/admin/categories`, `/admin/inventory`, `/admin/suppliers`, `/admin/batches`, `/admin/expiry`, `/admin/orders`, `/admin/customers`, `/admin/reports`.

`authGuard` protects customer routes that need login (cart is guest-friendly via localStorage pre-login is OUT of scope — cart requires auth in this build). `adminGuard` checks `role === 'admin'` in addition to authentication.
