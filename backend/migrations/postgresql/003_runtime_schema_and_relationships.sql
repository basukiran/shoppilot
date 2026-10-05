-- Additive PostgreSQL schema updates for all currently-used app tables.
-- This migration only adds columns, tables, constraints, and indexes.
-- It never drops or rewrites existing rows.

ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rented_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS damaged_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lost_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'GOOD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS reader_type TEXT DEFAULT 'REGULAR_READER';
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS membership_fee REAL DEFAULT 500;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rental_payment_id INTEGER;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS reader_type TEXT DEFAULT 'REGULAR_READER';
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS membership_fee REAL DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS refund_amount REAL DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NOT_REQUESTED';
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS refund_payment_id TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'GOOD';

ALTER TABLE razorpay_payments ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE razorpay_payments ADD COLUMN IF NOT EXISTS combo_items TEXT;
ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS reader_type TEXT DEFAULT 'REGULAR_READER';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id INTEGER;

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Hubli',
    pincode TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- The original migration creates most foreign keys. These additions complete
-- payment, refund, and audit relationships while preserving existing records.
DO $$
DECLARE
    relation RECORD;
    source_oid OID;
    target_oid OID;
    source_attnum SMALLINT;
    target_attnum SMALLINT;
    constraint_name TEXT;
    constraint_validated BOOLEAN;
BEGIN
    FOR relation IN
        SELECT * FROM (VALUES
            ('orders', 'user_id', 'users', 'id'),
            ('memberships', 'user_id', 'users', 'id'),
            ('rentals', 'user_id', 'users', 'id'),
            ('rentals', 'rental_payment_id', 'rental_payments', 'id'),
            ('razorpay_payments', 'user_id', 'users', 'id'),
            ('rental_payments', 'user_id', 'users', 'id'),
            ('refunds', 'user_id', 'users', 'id'),
            ('refunds', 'payment_id', 'rental_payments', 'id'),
            ('audit_records', 'user_id', 'users', 'id'),
            ('audit_records', 'order_id', 'orders', 'id'),
            ('audit_records', 'rental_id', 'rentals', 'id'),
            ('audit_records', 'purchase_payment_id', 'razorpay_payments', 'id'),
            ('audit_records', 'rental_payment_id', 'rental_payments', 'id')
        ) AS relationships(table_name, column_name, referenced_table, referenced_column)
    LOOP
        source_oid := to_regclass(format('%I.%I', current_schema(), relation.table_name));
        target_oid := to_regclass(format('%I.%I', current_schema(), relation.referenced_table));
        SELECT attnum INTO source_attnum FROM pg_attribute
         WHERE attrelid = source_oid AND attname = relation.column_name AND NOT attisdropped;
        SELECT attnum INTO target_attnum FROM pg_attribute
         WHERE attrelid = target_oid AND attname = relation.referenced_column AND NOT attisdropped;

        IF source_oid IS NULL OR target_oid IS NULL OR source_attnum IS NULL OR target_attnum IS NULL THEN
            RAISE EXCEPTION 'Cannot add required foreign key %.% -> %.%',
                relation.table_name, relation.column_name,
                relation.referenced_table, relation.referenced_column;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint constraint_row
             WHERE constraint_row.contype = 'f'
               AND constraint_row.conrelid = source_oid
               AND constraint_row.confrelid = target_oid
               AND constraint_row.conkey = ARRAY[source_attnum]::SMALLINT[]
               AND constraint_row.confkey = ARRAY[target_attnum]::SMALLINT[]
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (%I) NOT VALID',
                relation.table_name,
                left(relation.table_name || '_' || relation.column_name || '_fk', 63),
                relation.column_name,
                relation.referenced_table,
                relation.referenced_column
            );
        END IF;

        SELECT constraint_row.conname, constraint_row.convalidated
          INTO constraint_name, constraint_validated
          FROM pg_constraint constraint_row
         WHERE constraint_row.contype = 'f'
           AND constraint_row.conrelid = source_oid
           AND constraint_row.confrelid = target_oid
           AND constraint_row.conkey = ARRAY[
               (SELECT attnum FROM pg_attribute WHERE attrelid = source_oid AND attname = relation.column_name AND NOT attisdropped)
           ]::SMALLINT[]
           AND constraint_row.confkey = ARRAY[
               (SELECT attnum FROM pg_attribute WHERE attrelid = target_oid AND attname = relation.referenced_column AND NOT attisdropped)
           ]::SMALLINT[]
         LIMIT 1;
        IF constraint_name IS NOT NULL AND NOT constraint_validated THEN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', relation.table_name, constraint_name);
        END IF;
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_razorpay_payments_order_id_unique
    ON razorpay_payments(razorpay_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_payments_order_id_unique
    ON rental_payments(razorpay_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_rental_id_unique
    ON refunds(rental_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id_unique
    ON refunds(razorpay_refund_id)
    WHERE razorpay_refund_id IS NOT NULL;
