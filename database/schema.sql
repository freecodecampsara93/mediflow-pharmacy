-- ============================================================
-- MediFlow Pharmacy - PostgreSQL Schema
-- Database: mediflow_pharmacy
--
-- This schema models a pharmacy / medical store INVENTORY and
-- E-COMMERCE ORDERING system. It intentionally contains NO
-- diagnosis, prescription-validation, or medical decision data.
-- Product/medicine rows are treated purely as catalog data.
-- ============================================================

-- Run as: psql -U <user> -d mediflow_pharmacy -f schema.sql

CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- Helper: generic updated_at trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  email           CITEXT NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'admin')),
  phone           VARCHAR(30),
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL UNIQUE,
  slug            VARCHAR(140) NOT NULL UNIQUE,
  description     TEXT,
  image           VARCHAR(500),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  contact_person  VARCHAR(150),
  phone           VARCHAR(30),
  email           CITEXT,
  address         TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- MEDICINES  (catalog / inventory item, NOT medical advice)
-- ============================================================
CREATE TABLE IF NOT EXISTS medicines (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(200) NOT NULL,
  description             TEXT,
  category_id             INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  manufacturer            VARCHAR(150),
  sku                     VARCHAR(64) NOT NULL UNIQUE,
  price                   NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image                   VARCHAR(500),
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  prescription_required   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_medicines_updated_at
  BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category_id);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(active);
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING btree (lower(name));
CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON medicines(manufacturer);

-- ============================================================
-- BATCHES (stock lots received from a supplier, with expiry)
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
  id              SERIAL PRIMARY KEY,
  medicine_id     INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  supplier_id     INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  batch_number    VARCHAR(80) NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity >= 0),
  expiry_date     DATE NOT NULL,
  purchase_price  NUMERIC(10,2) NOT NULL CHECK (purchase_price >= 0),
  selling_price   NUMERIC(10,2) NOT NULL CHECK (selling_price >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medicine_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_medicine ON batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_supplier ON batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);

-- ============================================================
-- INVENTORY (aggregated stock per medicine)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  medicine_id     INTEGER PRIMARY KEY REFERENCES medicines(id) ON DELETE CASCADE,
  total_stock     INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  minimum_stock   INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(total_stock, minimum_stock);

-- ============================================================
-- CART (one active cart per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS cart (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_cart_updated_at
  BEFORE UPDATE ON cart
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cart_items (
  id              SERIAL PRIMARY KEY,
  cart_id         INTEGER NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
  medicine_id     INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, medicine_id)
);

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ============================================================
-- WISHLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id     INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, medicine_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','processing','ready','delivered','cancelled')),
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_name       VARCHAR(150) NOT NULL,
  shipping_phone      VARCHAR(30) NOT NULL,
  shipping_address    TEXT NOT NULL,
  payment_method      VARCHAR(20) NOT NULL DEFAULT 'cash_on_delivery'
                        CHECK (payment_method IN ('cash_on_delivery','mock_payment')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id     INTEGER NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  medicine_name   VARCHAR(200) NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total      NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_medicine ON order_items(medicine_id);

-- ============================================================
-- PAYMENTS  (demo payment methods only - no real card data)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method            VARCHAR(20) NOT NULL
                      CHECK (method IN ('cash_on_delivery','mock_payment')),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','failed','refunded')),
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  transaction_ref   VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Convenience view: low stock medicines
-- ============================================================
CREATE OR REPLACE VIEW v_low_stock_medicines AS
SELECT m.id, m.name, m.sku, i.total_stock, i.minimum_stock
FROM medicines m
JOIN inventory i ON i.medicine_id = m.id
WHERE m.active = TRUE AND i.total_stock < i.minimum_stock;

-- ============================================================
-- Convenience view: expiring / expired batches
-- ============================================================
CREATE OR REPLACE VIEW v_batch_expiry_status AS
SELECT b.*, m.name AS medicine_name,
  CASE
    WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'ok'
  END AS expiry_status
FROM batches b
JOIN medicines m ON m.id = b.medicine_id;
