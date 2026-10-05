-- =============================================================================
-- BookVision PostgreSQL Migration 001 — Initial Schema
-- =============================================================================
-- Reproduces the complete 13-table schema from the existing SQLite database.
--
-- Safety:
--   Every statement uses CREATE TABLE IF NOT EXISTS.
--   No DROP TABLE statements anywhere in this file.
--   Safe to run against an empty database or an already-migrated database.
--
-- Compatibility notes:
--   - SERIAL replaces SQLite INTEGER PRIMARY KEY AUTOINCREMENT.
--   - TIMESTAMPTZ replaces SQLite TIMESTAMP columns.
--   - INTEGER is kept (rather than BOOLEAN) for is_book / is_rentable /
--     is_default so existing application code (is_book = 1) works unchanged.
--   - REAL is valid in PostgreSQL and is kept to match SQLite column types.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    phone         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'CUSTOMER',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. products  (books)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id                   SERIAL PRIMARY KEY,
    name                 TEXT  NOT NULL,
    category             TEXT  NOT NULL,
    price                REAL  NOT NULL,
    rating               REAL,
    stock                INTEGER,
    description          TEXT,
    is_rentable          INTEGER,
    rental_price         REAL,
    ownership_price      REAL,
    rental_duration_days INTEGER,
    author               TEXT,
    cover_image          TEXT,
    is_book              INTEGER,
    reserved_count       INTEGER DEFAULT 0,
    rented_count         INTEGER DEFAULT 0,
    sold_count           INTEGER DEFAULT 0,
    damaged_count        INTEGER DEFAULT 0,
    lost_count           INTEGER DEFAULT 0,
    condition            TEXT DEFAULT 'GOOD',
    is_active            INTEGER DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- 3. orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL PRIMARY KEY,
    product_id     INTEGER     NOT NULL REFERENCES products(id),
    quantity       INTEGER     NOT NULL,
    total_amount   REAL        NOT NULL,
    status         TEXT,
    payment_status TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id        INTEGER     REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 4. order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER     NOT NULL REFERENCES orders(id),
    product_id   INTEGER     NOT NULL REFERENCES products(id),
    quantity     INTEGER     NOT NULL,
    unit_price   REAL        NOT NULL,
    total_amount REAL        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. memberships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
    id                   SERIAL PRIMARY KEY,
    customer_id          TEXT        NOT NULL,
    plan_name            TEXT        NOT NULL,
    monthly_fee          REAL        NOT NULL,
    reader_type          TEXT        NOT NULL DEFAULT 'REGULAR_READER',
    membership_fee       REAL        NOT NULL DEFAULT 500,
    membership_expires_at TIMESTAMPTZ,
    status               TEXT,
    start_date           TIMESTAMPTZ,
    next_billing_date    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id              INTEGER     REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 6. rentals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rentals (
    id                SERIAL PRIMARY KEY,
    customer_id       TEXT        NOT NULL,
    product_id        INTEGER     NOT NULL REFERENCES products(id),
    membership_id     INTEGER     REFERENCES memberships(id),
    rental_fee        REAL        NOT NULL,
    reader_type       TEXT        NOT NULL DEFAULT 'REGULAR_READER',
    ownership_price   REAL,
    rental_start_date TIMESTAMPTZ,
    rental_end_date   TIMESTAMPTZ,
    status            TEXT,
    delivery_status   TEXT,
    customer_decision TEXT,
    payment_status    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    membership_fee     REAL,
    refund_amount     REAL,
    refund_status     TEXT,
    refund_payment_id TEXT,
    rental_payment_id INTEGER,
    condition         TEXT DEFAULT 'GOOD',
    user_id           INTEGER     REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 7. razorpay_payments  (purchase payments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS razorpay_payments (
    id                  SERIAL PRIMARY KEY,
    razorpay_order_id   TEXT    NOT NULL,
    product_id          INTEGER NOT NULL REFERENCES products(id),
    quantity            INTEGER NOT NULL,
    amount              REAL    NOT NULL,
    status              TEXT,
    razorpay_payment_id TEXT,
    user_id             INTEGER REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 8. rental_payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rental_payments (
    id                  SERIAL PRIMARY KEY,
    razorpay_order_id   TEXT    NOT NULL,
    product_id          INTEGER NOT NULL REFERENCES products(id),
    quantity            INTEGER NOT NULL,
    membership_fee      REAL    NOT NULL,
    rental_fee          REAL    NOT NULL,
    total_amount        REAL    NOT NULL,
    reader_type         TEXT    NOT NULL DEFAULT 'REGULAR_READER',
    status              TEXT,
    razorpay_payment_id TEXT,
    user_id             INTEGER REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 9. refunds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER     REFERENCES users(id),
    rental_id          INTEGER     NOT NULL REFERENCES rentals(id),
    amount             REAL        NOT NULL,
    status             TEXT        NOT NULL,
    razorpay_refund_id TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_id         INTEGER
);

-- ---------------------------------------------------------------------------
-- 10. auth_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id),
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 11. addresses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER     NOT NULL REFERENCES users(id),
    label          TEXT,
    recipient_name TEXT        NOT NULL,
    phone          TEXT        NOT NULL,
    address_line1  TEXT        NOT NULL,
    address_line2  TEXT,
    city           TEXT        NOT NULL,
    state          TEXT        NOT NULL,
    postal_code    TEXT        NOT NULL,
    country        TEXT        NOT NULL,
    is_default     INTEGER,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 12. audit_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_records (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER     REFERENCES users(id),
    order_id            INTEGER     REFERENCES orders(id),
    rental_id           INTEGER     REFERENCES rentals(id),
    purchase_payment_id INTEGER,
    rental_payment_id   INTEGER,
    action              TEXT        NOT NULL,
    details             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 13. notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER     NOT NULL REFERENCES users(id),
    type              TEXT        NOT NULL,
    title             TEXT        NOT NULL,
    message           TEXT        NOT NULL,
    related_order_id  INTEGER     REFERENCES orders(id),
    related_rental_id INTEGER     REFERENCES rentals(id),
    is_read           INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON notifications(user_id, is_read);

-- =============================================================================
-- End of migration 001
-- =============================================================================
