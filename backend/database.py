"""
database.py — BookVision database connection layer.

Behaviour:
  - If the DATABASE_URL environment variable is set, connects to PostgreSQL
    using psycopg2.
  - If DATABASE_URL is not set, connects to the local SQLite file
    (shoppilot.db), which is the existing development database.

The public interface is a single function:

    conn = get_connection()

The returned connection object supports:
    conn.execute(sql, params)   -> cursor / result with dict-like rows
    conn.commit()
    conn.close()

Both the SQLite and PostgreSQL paths return rows that support column-name
access (result["column_name"]), matching the existing usage in agent.py.
"""

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# ---------------------------------------------------------------------------
# Path to the SQLite file — always relative to this file's directory so the
# backend can be started from any working directory.
# ---------------------------------------------------------------------------
_SQLITE_PATH = Path(__file__).parent / "shoppilot.db"


# ===========================================================================
# POSTGRESQL PATH
# ===========================================================================

class _PgCursor:
    """
    Wraps a psycopg2 cursor so that rows are returned as dict-like objects,
    matching the sqlite3.Row interface used throughout agent.py.
    """

    def __init__(self, cursor):
        self._cursor = cursor

    # Allow use as a context manager returned by execute()
    def __iter__(self):
        return self

    def __next__(self):
        row = self._cursor.fetchone()
        if row is None:
            raise StopIteration
        return row

    @property
    def lastrowid(self):
        # psycopg2 does not set lastrowid; we use RETURNING id in the INSERT
        # and fetch it immediately after.  This property is kept for interface
        # compatibility — callers that use it must also use RETURNING.
        return self._cursor.fetchone()[0] if self._cursor.description else None

    @property
    def rowcount(self):
        """Forward psycopg2 cursor rowcount for UPDATE/DELETE affected-row checks."""
        return self._cursor.rowcount

    def fetchone(self):        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()


class _PgConnection:
    """
    Thin wrapper around a psycopg2 connection that:
      - uses a RealDictCursor so all rows are dict-like
      - exposes .execute(), .commit(), .close() to match the SQLite interface
      - translates SQLite ? placeholders to PostgreSQL %s placeholders
    """

    def __init__(self, pg_conn):
        import psycopg2.extras  # imported here to avoid import-time failure
        self._conn = pg_conn
        self._cursor_factory = psycopg2.extras.RealDictCursor

    @staticmethod
    def _adapt_sql(sql: str) -> str:
        """Replace SQLite ? placeholders with PostgreSQL %s placeholders."""
        return sql.replace("?", "%s")

    def execute(self, sql: str, params=()):
        cursor = self._conn.cursor(cursor_factory=self._cursor_factory)
        cursor.execute(self._adapt_sql(sql), params)
        return cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def _get_pg_connection() -> _PgConnection:
    try:
        import psycopg2  # noqa: PLC0415
    except ImportError as exc:
        raise ImportError(
            "psycopg2 is required for PostgreSQL connections. "
            "Install it with:  pip install psycopg2-binary"
        ) from exc

    conn = psycopg2.connect(DATABASE_URL)
    return _PgConnection(conn)


# ===========================================================================
# SQLITE PATH
# ===========================================================================

def _get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ===========================================================================
# PUBLIC API
# ===========================================================================

def get_connection():
    """
    Return a database connection.

    If DATABASE_URL is set in the environment, returns a PostgreSQL connection
    (requires psycopg2 to be installed).

    Otherwise, returns a SQLite connection to the local shoppilot.db file.
    """
    if DATABASE_URL:
        return _get_pg_connection()
    return _get_sqlite_connection()


def is_postgres() -> bool:
    """Return True if the application is configured to use PostgreSQL."""
    return bool(DATABASE_URL)


# ===========================================================================
# INIT / SEED  (called by main.py at startup)
#
# On SQLite: creates all tables and runs column migrations idempotently.
# On PostgreSQL: schema is managed by migrate.py — these are no-ops.
# ===========================================================================

def init_db():
    """
    Initialise the SQLite database schema.
    Creates all required tables (IF NOT EXISTS) and applies any missing
    column migrations.  Safe to call on every startup — fully idempotent.

    PostgreSQL: no-op.  Run  python migrate.py  once to set up the schema.
    """
    if is_postgres():
        return

    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            phone TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            label TEXT DEFAULT 'Home',
            recipient_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address_line1 TEXT NOT NULL,
            address_line2 TEXT DEFAULT '',
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL DEFAULT 'India',
            is_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            rating REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            description TEXT,
            author TEXT DEFAULT '',
            cover_image TEXT DEFAULT '',
            is_book INTEGER DEFAULT 0,
            is_rentable INTEGER DEFAULT 0,
            rental_price REAL DEFAULT 0,
            ownership_price REAL DEFAULT 0,
            rental_duration_days INTEGER DEFAULT 30
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'PENDING',
            payment_status TEXT DEFAULT 'NOT_PAID',
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            plan_name TEXT NOT NULL,
            monthly_fee REAL NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            user_id INTEGER REFERENCES users(id),
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            next_billing_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            membership_id INTEGER,
            rental_payment_id INTEGER,
            rental_fee REAL NOT NULL,
            ownership_price REAL DEFAULT 0,
            rental_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            rental_end_date TIMESTAMP,
            status TEXT DEFAULT 'PENDING',
            delivery_status TEXT DEFAULT 'ORDERED',
            customer_decision TEXT DEFAULT 'PENDING',
            payment_status TEXT DEFAULT 'NOT_PAID',
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (membership_id) REFERENCES memberships(id)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS refunds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            rental_id INTEGER NOT NULL UNIQUE,
            payment_id INTEGER,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            razorpay_refund_id TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (rental_id) REFERENCES rentals(id)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            related_order_id INTEGER,
            related_rental_id INTEGER,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()

    # -----------------------------------------------------------------------
    # COLUMN MIGRATIONS — add any columns that may be missing from older DBs
    # -----------------------------------------------------------------------

    # refunds.payment_id
    refund_columns = {
        col["name"]
        for col in conn.execute("PRAGMA table_info(refunds)").fetchall()
    }
    if "payment_id" not in refund_columns:
        conn.execute("ALTER TABLE refunds ADD COLUMN payment_id INTEGER")

    # products — book / rental columns
    product_columns = {
        col["name"]
        for col in conn.execute("PRAGMA table_info(products)").fetchall()
    }
    for col_name, col_type in {
        "author": "TEXT DEFAULT ''",
        "cover_image": "TEXT DEFAULT ''",
        "is_book": "INTEGER DEFAULT 0",
        "is_rentable": "INTEGER DEFAULT 0",
        "rental_price": "REAL DEFAULT 0",
        "ownership_price": "REAL DEFAULT 0",
        "rental_duration_days": "INTEGER DEFAULT 30",
    }.items():
        if col_name not in product_columns:
            conn.execute(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}")

    # rentals — extended columns
    rental_columns = {
        col["name"]
        for col in conn.execute("PRAGMA table_info(rentals)").fetchall()
    }
    for col_name, col_type in {
        "rental_payment_id": "INTEGER",
        "membership_fee": "REAL DEFAULT 0",
        "refund_amount": "REAL DEFAULT 0",
        "refund_status": "TEXT DEFAULT 'NOT_REQUESTED'",
        "refund_payment_id": "TEXT",
    }.items():
        if col_name not in rental_columns:
            conn.execute(f"ALTER TABLE rentals ADD COLUMN {col_name} {col_type}")

    # user_id on orders, memberships, rentals
    for table_name in ("orders", "memberships", "rentals"):
        table_columns = {
            col["name"]
            for col in conn.execute(
                f"PRAGMA table_info({table_name})"
            ).fetchall()
        }
        if "user_id" not in table_columns:
            conn.execute(
                f"ALTER TABLE {table_name} "
                f"ADD COLUMN user_id INTEGER REFERENCES users(id)"
            )

    conn.commit()

    # Indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)"
    )

    conn.commit()
    conn.close()


# ===========================================================================
# SEED — book catalog
# ===========================================================================

def seed_products():
    """
    Insert the 7 core BookVision books if they are not already present.
    Idempotent — safe to call on every startup.
    PostgreSQL: no-op (seed data should be applied separately in production).
    """
    if is_postgres():
        return

    conn = get_connection()

    books = [
        (
            "Python Crash Course",
            "Eric Matthes",
            "Software Development",
            499,
            4.8,
            10,
            "A hands-on introduction to Python programming with practical projects.",
            "https://covers.openlibrary.org/b/isbn/9781718502703-M.jpg",
        ),
        (
            "Clean Code: A Handbook of Agile Software Craftsmanship",
            "Robert C. Martin",
            "Software Development",
            2499,
            4.7,
            12,
            "A practical guide to writing readable, maintainable software.",
            "https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg",
        ),
        (
            "The Pragmatic Programmer",
            "Andrew Hunt and David Thomas",
            "Software Development",
            2199,
            4.8,
            15,
            "A guide to practical techniques and habits for professional programmers.",
            "https://covers.openlibrary.org/b/isbn/9780135957059-M.jpg",
        ),
        (
            "Atomic Habits",
            "James Clear",
            "Self-Help",
            599,
            4.8,
            20,
            "A practical framework for building good habits and breaking bad ones.",
            "https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg",
        ),
        (
            "The Alchemist",
            "Paulo Coelho",
            "Fiction",
            399,
            4.6,
            18,
            "A novel about a shepherd's journey in pursuit of a personal legend.",
            "https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg",
        ),
        (
            "The Hobbit",
            "J. R. R. Tolkien",
            "Fantasy",
            499,
            4.7,
            14,
            "A fantasy adventure following Bilbo Baggins on an unexpected journey.",
            "https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg",
        ),
        (
            "Sapiens: A Brief History of Humankind",
            "Yuval Noah Harari",
            "History",
            699,
            4.6,
            11,
            "An exploration of the history and development of humankind.",
            "https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg",
        ),
    ]

    for book in books:
        existing = conn.execute(
            "SELECT id FROM products WHERE name = ? ORDER BY id LIMIT 1",
            (book[0],)
        ).fetchone()

        if not existing and book[0] == "Python Crash Course":
            existing = conn.execute(
                "SELECT id FROM products WHERE name = ? ORDER BY id LIMIT 1",
                ("Programming Book",)
            ).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE products
                SET name = ?, author = ?, category = ?, description = ?,
                    cover_image = ?, is_book = 1
                WHERE id = ?
                """,
                (
                    book[0], book[1], book[2],
                    book[6], book[7],
                    existing["id"]
                )
            )
        else:
            conn.execute(
                """
                INSERT INTO products
                    (name, author, category, price, rating, stock,
                     description, cover_image, is_book)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                book
            )

    conn.commit()
    conn.close()


# ===========================================================================
# SEED — rental pricing
# ===========================================================================

def seed_rental_products():
    """
    Mark Python Crash Course as rentable with the current pricing model:
      Rental fee       : ₹50
      Security deposit : ₹500  (membership_fee)
      Total payment    : ₹550
      Return refund    : ₹400
    Idempotent — safe to call on every startup.
    PostgreSQL: no-op.
    """
    if is_postgres():
        return

    conn = get_connection()

    rental_product = conn.execute(
        """
        SELECT id FROM products
        WHERE name = ?
        ORDER BY id LIMIT 1
        """,
        ("Python Crash Course",)
    ).fetchone()

    if rental_product:
        conn.execute(
            """
            UPDATE products
            SET
                is_book = 1,
                is_rentable = ?,
                rental_price = ?,
                ownership_price = ?,
                rental_duration_days = ?
            WHERE id = ?
            """,
            (1, 50, 0, 30, rental_product["id"])
        )
        conn.commit()

    conn.close()
