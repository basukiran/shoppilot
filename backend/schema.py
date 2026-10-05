"""PostgreSQL schema contract used by migrations and application startup."""

from __future__ import annotations


REQUIRED_COLUMNS = {
    "users": {"id", "name", "email", "phone", "password_hash", "role", "created_at"},
    "products": {
        "id", "name", "category", "price", "rating", "stock", "description",
        "author", "cover_image", "is_book", "is_rentable", "rental_price",
        "ownership_price", "rental_duration_days", "reserved_count", "rented_count",
        "sold_count", "damaged_count", "lost_count", "condition", "is_active",
    },
    "orders": {"id", "product_id", "quantity", "total_amount", "status", "payment_status", "user_id", "created_at"},
    "order_items": {"id", "order_id", "product_id", "quantity", "unit_price", "total_amount", "created_at"},
    "memberships": {
        "id", "customer_id", "plan_name", "monthly_fee", "reader_type", "membership_fee",
        "membership_expires_at", "status", "user_id", "start_date", "next_billing_date", "created_at",
    },
    "rentals": {
        "id", "customer_id", "product_id", "membership_id", "rental_payment_id", "reader_type",
        "rental_fee", "ownership_price", "rental_start_date", "rental_end_date", "status",
        "delivery_status", "customer_decision", "payment_status", "user_id", "created_at",
        "membership_fee", "refund_amount", "refund_status", "refund_payment_id", "condition",
    },
    "razorpay_payments": {
        "id", "razorpay_order_id", "product_id", "quantity", "amount", "status",
        "razorpay_payment_id", "user_id", "combo_items",
    },
    "rental_payments": {
        "id", "razorpay_order_id", "product_id", "quantity", "membership_fee", "rental_fee",
        "total_amount", "reader_type", "status", "razorpay_payment_id", "user_id",
    },
    "refunds": {"id", "user_id", "rental_id", "payment_id", "amount", "status", "razorpay_refund_id", "created_at"},
    "auth_sessions": {"id", "user_id", "token_hash", "expires_at", "revoked_at", "created_at"},
    "addresses": {
        "id", "user_id", "label", "recipient_name", "phone", "address_line1", "address_line2",
        "city", "state", "postal_code", "country", "is_default", "created_at",
    },
    "audit_records": {
        "id", "user_id", "order_id", "rental_id", "purchase_payment_id", "rental_payment_id",
        "action", "details", "created_at",
    },
    "notifications": {
        "id", "user_id", "type", "title", "message", "related_order_id", "related_rental_id",
        "is_read", "created_at",
    },
    "favorites": {"id", "user_id", "product_id", "created_at"},
    "locations": {"id", "name", "area", "city", "pincode", "is_active", "sort_order"},
}


# source table, source column, referenced table, referenced column
REQUIRED_FOREIGN_KEYS = {
    ("orders", "product_id", "products", "id"),
    ("orders", "user_id", "users", "id"),
    ("order_items", "order_id", "orders", "id"),
    ("order_items", "product_id", "products", "id"),
    ("memberships", "user_id", "users", "id"),
    ("rentals", "product_id", "products", "id"),
    ("rentals", "membership_id", "memberships", "id"),
    ("rentals", "rental_payment_id", "rental_payments", "id"),
    ("rentals", "user_id", "users", "id"),
    ("razorpay_payments", "product_id", "products", "id"),
    ("razorpay_payments", "user_id", "users", "id"),
    ("rental_payments", "product_id", "products", "id"),
    ("rental_payments", "user_id", "users", "id"),
    ("refunds", "user_id", "users", "id"),
    ("refunds", "rental_id", "rentals", "id"),
    ("refunds", "payment_id", "rental_payments", "id"),
    ("auth_sessions", "user_id", "users", "id"),
    ("addresses", "user_id", "users", "id"),
    ("audit_records", "user_id", "users", "id"),
    ("audit_records", "order_id", "orders", "id"),
    ("audit_records", "rental_id", "rentals", "id"),
    ("audit_records", "purchase_payment_id", "razorpay_payments", "id"),
    ("audit_records", "rental_payment_id", "rental_payments", "id"),
    ("notifications", "user_id", "users", "id"),
    ("notifications", "related_order_id", "orders", "id"),
    ("notifications", "related_rental_id", "rentals", "id"),
    ("favorites", "user_id", "users", "id"),
    ("favorites", "product_id", "products", "id"),
}


def verify_postgresql_schema(conn) -> list[str]:
    """Return missing tables, columns, or foreign-key relationships."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
            """
        )
        columns: dict[str, set[str]] = {}
        for table_name, column_name in cur.fetchall():
            columns.setdefault(table_name, set()).add(column_name)

        cur.execute(
            """
            SELECT source.relname, source_column.attname,
                   target.relname, target_column.attname, constraint_row.convalidated
            FROM pg_constraint AS constraint_row
            JOIN pg_class AS source ON source.oid = constraint_row.conrelid
            JOIN pg_namespace AS source_schema ON source_schema.oid = source.relnamespace
            JOIN pg_class AS target ON target.oid = constraint_row.confrelid
            JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS source_key(attnum, position) ON TRUE
            JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY AS target_key(attnum, position)
                ON target_key.position = source_key.position
            JOIN pg_attribute AS source_column ON source_column.attrelid = source.oid AND source_column.attnum = source_key.attnum
            JOIN pg_attribute AS target_column ON target_column.attrelid = target.oid AND target_column.attnum = target_key.attnum
            WHERE constraint_row.contype = 'f'
              AND source_schema.nspname = current_schema()
            """
        )
        foreign_keys = {
            (source_table, source_column, target_table, target_column)
            for source_table, source_column, target_table, target_column, validated in cur.fetchall()
            if validated
        }

    problems: list[str] = []
    for table, required_columns in REQUIRED_COLUMNS.items():
        if table not in columns:
            problems.append(f"missing table {table}")
            continue
        missing_columns = sorted(required_columns - columns[table])
        if missing_columns:
            problems.append(f"{table} missing columns: {', '.join(missing_columns)}")
    missing_foreign_keys = sorted(REQUIRED_FOREIGN_KEYS - foreign_keys)
    if missing_foreign_keys:
        problems.append(f"missing or unvalidated foreign keys: {missing_foreign_keys}")
    return problems
