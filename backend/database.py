"""
database.py — BookVision database connection layer.

Behaviour:
  - If the DATABASE_URL environment variable is set, connects to PostgreSQL
    using psycopg2.
  - If DATABASE_URL is not set, connects to the local SQLite file
    (shoppilot.db), which is the existing development database. This fallback
    is disabled when APP_ENV=production.

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
import re
import sqlite3
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

if APP_ENV == "production":
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be configured in production; SQLite is development-only.")
    if not DATABASE_URL.lower().startswith(("postgres://", "postgresql://")):
        raise RuntimeError("Production DATABASE_URL must use PostgreSQL (postgres:// or postgresql://).")

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
        self._inserted_id = None

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
        # PostgreSQL INSERTs get RETURNING id in _PgConnection.execute.
        if self._inserted_id is None and self._cursor.description:
            row = self._cursor.fetchone()
            self._inserted_id = row.get("id") if row else None
        return self._inserted_id

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
        """Adapt the small set of SQLite SQL forms used by the app."""
        sql = sql.replace("DATE('now', '+1 month')", "(CURRENT_DATE + INTERVAL '1 month')")
        sql = sql.replace("DATE('now', '+' || ? || ' days')", "(CURRENT_DATE + (? * INTERVAL '1 day'))")
        sql = sql.replace("DATE('now')", "CURRENT_DATE")
        return sql.replace("?", "%s")

    def execute(self, sql: str, params=()):
        cursor = self._conn.cursor(cursor_factory=self._cursor_factory)
        statement = sql.strip().rstrip(";")
        if re.match(r"^BEGIN\s+IMMEDIATE\b", statement, re.IGNORECASE):
            statement = re.sub(r"^BEGIN\s+IMMEDIATE\b", "BEGIN", statement, count=1, flags=re.IGNORECASE)
        if re.match(r"^INSERT\s+OR\s+IGNORE\s+INTO\b", statement, re.IGNORECASE):
            statement = re.sub(
                r"^INSERT\s+OR\s+IGNORE\s+INTO\b",
                "INSERT INTO",
                statement,
                count=1,
                flags=re.IGNORECASE,
            )
            statement += " ON CONFLICT DO NOTHING"
        is_insert = bool(re.match(r"^INSERT\s+INTO\b", statement, re.IGNORECASE))
        has_returning = bool(re.search(r"\bRETURNING\b", statement, re.IGNORECASE))
        if is_insert and not has_returning:
            statement += " RETURNING id"
        cursor.execute(self._adapt_sql(statement), params)
        return _PgCursor(cursor)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

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
        from schema import verify_postgresql_schema

        conn = _get_pg_connection()
        try:
            problems = verify_postgresql_schema(conn._conn)
        finally:
            conn.close()
        if problems:
            details = "; ".join(problems)
            raise RuntimeError(
                "PostgreSQL schema is incomplete. Run `python migrate.py` "
                f"before starting BookVision. Details: {details}"
            )
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
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id)
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
            reader_type TEXT DEFAULT 'REGULAR_READER',
            membership_fee REAL DEFAULT 500,
            membership_expires_at TIMESTAMP,
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
            reader_type TEXT DEFAULT 'REGULAR_READER',
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

    # user role
    user_columns = {
        col["name"]
        for col in conn.execute("PRAGMA table_info(users)").fetchall()
    }
    if "role" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'CUSTOMER'")
        # Promote default developer/admin account if present
        conn.execute("UPDATE users SET role = 'ADMIN' WHERE email = 'kiranbasu30@gmail.com'")

    # products — book / rental / inventory columns
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
        "reserved_count": "INTEGER DEFAULT 0",
        "rented_count": "INTEGER DEFAULT 0",
        "sold_count": "INTEGER DEFAULT 0",
        "damaged_count": "INTEGER DEFAULT 0",
        "lost_count": "INTEGER DEFAULT 0",
        "condition": "TEXT DEFAULT 'GOOD'",
        "is_active": "INTEGER DEFAULT 1",
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
        "reader_type": "TEXT DEFAULT 'REGULAR_READER'",
        "refund_amount": "REAL DEFAULT 0",
        "refund_status": "TEXT DEFAULT 'NOT_REQUESTED'",
        "refund_payment_id": "TEXT",
        "condition": "TEXT DEFAULT 'GOOD'",
    }.items():
        if col_name not in rental_columns:
            conn.execute(f"ALTER TABLE rentals ADD COLUMN {col_name} {col_type}")

    membership_columns = {
        col["name"]
        for col in conn.execute("PRAGMA table_info(memberships)").fetchall()
    }
    for col_name, col_type in {
        "reader_type": "TEXT DEFAULT 'REGULAR_READER'",
        "membership_fee": "REAL DEFAULT 500",
        "membership_expires_at": "TIMESTAMP",
    }.items():
        if col_name not in membership_columns:
            conn.execute(f"ALTER TABLE memberships ADD COLUMN {col_name} {col_type}")

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

    # ---- locations table (service / pickup-dropoff points) ----
    conn.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            area TEXT NOT NULL,
            city TEXT NOT NULL DEFAULT 'Hubli',
            pincode TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


# ===========================================================================
# SEED — book catalog
# ===========================================================================

VERIFIED_COVER_IDS = {
    "the power of your subconscious mind": "6553019",
    "india's struggle for independence 1857-1947": "14350157",
    "ikigai": "11300391",
    "deep work": "7988607",
    "psychology of money": "10389354",
    "rich dad poor dad": "8315603",
    "how to win friends and influence people": "13314878",
    "mindset": "746414",
    "grit": "7438753",
    "secret": "845815",
    "psycho cybernetics": "14428293",
    "48 laws of power": "6424160",
    "wings of fire": "9153819",
}


def make_book_cover(title: str, accent: str = "#0c4a3a", highlight: str = "#d9b76f") -> str:
    cover_id = VERIFIED_COVER_IDS.get(title.strip().casefold())
    if cover_id:
        return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

    seed = sum(ord(character) for character in title)
    offset = seed % 90
    stripe_size = 24 + seed % 22
    rotation = seed % 50
    circle_x = 180 + seed % 440
    circle_y = 320 + seed % 390
    circle_radius = 90 + seed % 110
    stripe_width = 3 + seed % 7
    svg = f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100" role="img" aria-label="Cover image unavailable">
          <defs>
            <pattern id="lines" width="{stripe_size}" height="{stripe_size}" patternUnits="userSpaceOnUse" patternTransform="rotate({rotation})">
              <path d="M0 0V1100" stroke="{highlight}" stroke-opacity=".3" stroke-width="{stripe_width}"/>
            </pattern>
          </defs>
          <rect width="800" height="1100" fill="#f5f1e8"/>
          <path d="M0 {180 + offset} Q400 {-80 + offset} 800 {180 + offset} V1100 H0Z" fill="{accent}"/>
          <rect width="800" height="1100" fill="url(#lines)"/>
          <circle cx="{circle_x}" cy="{circle_y}" r="{circle_radius}" fill="{highlight}" fill-opacity=".36"/>
          <rect x="82" y="760" width="636" height="190" rx="8" fill="#f5f1e8" fill-opacity=".96"/>
          <text x="400" y="834" text-anchor="middle" fill="{accent}" font-size="32" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">COVER IMAGE</text>
          <text x="400" y="887" text-anchor="middle" fill="{accent}" font-size="32" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">UNAVAILABLE</text>
        </svg>
    """
    return "data:image/svg+xml;charset=UTF-8," + quote(svg)


def _has_product_references(conn, product_id: int) -> bool:
    tables = {
        row["name"]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    for table in ("orders", "order_items", "razorpay_payments", "rental_payments", "rentals"):
        if table in tables and conn.execute(
            f"SELECT 1 FROM {table} WHERE product_id = ? LIMIT 1",
            (product_id,),
        ).fetchone():
            return True
    return False


_POSTGRES_SEED_RENTAL_PRICES = {
    "ZERO TO HERO": 20, "DETOX YOUR EGO": 50,
    "The Power of Your Subconscious Mind": 20, "BADUKUVA DARI": 20,
    "India's Struggle for Independence 1857-1947": 30, "Heli Hogu Kaarana": 20,
    "Why I am an Atheist and Other Writings": 20, "IKIGAI": 20, "DEEP WORK": 20,
    "PSYCHOLOGY OF MONEY": 20, "RICH DAD POOR DAD": 20, "AVALU": 30,
    "HOW TO WIN FRIENDS AND INFLUENCE PEOPLE": 30, "MINDSET": 50,
    "NATION OF IDIORA": 50, "GRIT": 50, "CHALO DILLI ENDU HODAVARELLI": 30,
    "SECRET": 50, "MUKAJJIYA KANASUGALU": 20, "SWARA MATA LAYA PITA": 20,
    "VAKALAT": 20, "VEKTITVA VIKASANA": 20, "THE COURAGE TO BE DISLIKED": 30,
    "PSYCHO CYBERNETICS": 30, "48 LAWS OF POWER": 100, "WINGS OF FIRE": 30,
    "THE BOOK OF ELON": 50, "HERE THERE AND EVERYWHERE": 20, "THINK LIKE CEO": 30,
    "WINNING PEOPLE WITHOUT LOSING YOURSELF": 50, "KAVERI INDA MEKANGIGE": 20,
    "PARIPOORNA PRASHNEGALU PARIPOORNA UTTARAGALU": 20, "KRISHNANA ARASUTTA": 20,
    "BIJAPUR BHAVYA PRAPANCHA": 20, "UPDESHA KATEGALU": 20,
    "PRACHINA BHARATADA MAHARSHIGALU": 20,
}


def seed_products():
    """
    Insert the approved BookVision catalog if it is not already present.
    Idempotent — safe to call on every startup.
    PostgreSQL inserts only missing approved books; existing rows are untouched.
    """
    books = [
        ("ZERO TO HERO", "BookVision", "Personal Growth", 300, 4.8, 16, "A motivating read for personal growth, discipline, and momentum.", "#0c4a3a", "#d9b76f"),
        ("DETOX YOUR EGO", "BookVision", "Self-Help", 493, 4.7, 20, "A practical companion for inner clarity and emotional detachment.", "#173f4f", "#d1a14a"),
        ("The Power of Your Subconscious Mind", "Joseph Murphy", "Psychology", 154, 4.9, 18, "A classic guide to unlocking inner power through conscious thinking.", "#2b3d5b", "#d7b06a"),
        ("BADUKUVA DARI", "Kannada Classic", "Kannada Literature", 200, 4.5, 24, "A reflective Kannada read that celebrates thought and clarity.", "#0e5635", "#d5af5c"),
        ("India's Struggle for Independence 1857-1947", "Bipan Chandra", "History", 269, 4.7, 15, "An essential narrative of India’s long freedom movement.", "#6f3b1d", "#d9b86f"),
        ("Heli Hogu Kaarana", "Kannada Classic", "Kannada Literature", 159, 4.4, 22, "A thoughtful Kannada title exploring conviction and perspective.", "#2a4a4f", "#d3b275"),
        ("Why I am an Atheist and Other Writings", "Bhagat Singh", "Philosophy", 131, 4.8, 14, "Thought-provoking essays on ideology, justice, and inquiry.", "#2d3d54", "#c79f60"),
        ("IKIGAI", "Francesc Miralles & Héctor García", "Lifestyle", 170, 4.9, 19, "A gentle guide to purpose, daily joy, and meaningful living.", "#145b3e", "#d6b76f"),
        ("DEEP WORK", "Cal Newport", "Productivity", 170, 4.8, 17, "A focused, practical book for disciplined attention and creative output.", "#1f4560", "#d9b168"),
        ("PSYCHOLOGY OF MONEY", "Morgan Housel", "Finance", 170, 4.9, 18, "A smart, practical book on money behavior and long-term decision making.", "#2f3c57", "#e0b965"),
        ("RICH DAD POOR DAD", "Robert Kiyosaki", "Finance", 170, 4.8, 20, "A compelling introduction to financial thinking and asset-building.", "#264b52", "#cea15a"),
        ("AVALU", "Kannada Classic", "Kannada Literature", 280, 4.6, 21, "A thoughtful Kannada title that strengthens human perspective.", "#3f5727", "#d0a55d"),
        ("HOW TO WIN FRIENDS AND INFLUENCE PEOPLE", "Dale Carnegie", "Communication", 225, 4.8, 18, "A timeless guide to communication, empathy, and influence.", "#2d4c6a", "#d9b76e"),
        ("MINDSET", "Carol S. Dweck", "Psychology", 400, 4.8, 22, "A foundational read on growth mindset and lasting potential.", "#275d59", "#d7b66a"),
        ("NATION OF IDIORA", "BookVision", "Social Thought", 400, 4.5, 14, "A thoughtful read on identity, culture, and community thinking.", "#3d4a6c", "#d3b17a"),
        ("GRIT", "Angela Duckworth", "Motivation", 478, 4.8, 17, "An engaging study of passion, persistence, and performance.", "#3a5d3a", "#cfb067"),
        ("CHALO DILLI ENDU HODAVARELLI", "Kannada Classic", "Kannada Literature", 275, 4.5, 20, "A vivid Kannada journey of movement, memory, and belonging.", "#374b68", "#d3b36d"),
        ("SECRET", "Rhonda Byrne", "Self-Help", 500, 4.6, 15, "A motivational read on intention, belief, and attention.", "#514981", "#d6ad63"),
        ("MUKAJJIYA KANASUGALU", "Kannada Classic", "Kannada Literature", 250, 4.7, 19, "A reflective Kannada book full of memory, imagination, and warmth.", "#344a3a", "#d7b766"),
        ("SWARA MATA LAYA PITA", "BookVision", "Music & Thought", 120, 4.6, 12, "A musical and reflective read on rhythm, self, and life balance.", "#2c5c52", "#d9ba72"),
        ("VAKALAT", "Kannada Classic", "Kannada Literature", 150, 4.4, 18, "A grounded Kannada title reflecting legal and moral awareness.", "#325b5a", "#d2b06d"),
        ("VEKTITVA VIKASANA", "BookVision", "Development", 150, 4.5, 16, "A grounded read on identity, growth, and social transformation.", "#3c5b42", "#d0ad66"),
        ("THE COURAGE TO BE DISLIKED", "Ichiro Kishimi & Fumitake Koga", "Philosophy", 368, 4.8, 21, "A transformative philosophy on freedom, self-acceptance, and growth.", "#5b3a32", "#d0a25f"),
        ("PSYCHO CYBERNETICS", "Maxwell Maltz", "Psychology", 375, 4.7, 13, "A classic approach to self image, performance, and self-directed change.", "#294b63", "#d9b060"),
        ("48 LAWS OF POWER", "Robert Greene", "Leadership", 1000, 4.7, 16, "A provocative study of influence, power, and strategic thinking.", "#5f3d2f", "#d1a667"),
        ("WINGS OF FIRE", "A. P. J. Abdul Kalam", "Biography", 360, 4.9, 20, "An inspiring autobiography of ambition, discipline, and purpose.", "#294d39", "#d8b66d"),
        ("THE BOOK OF ELON", "Walter Isaacson", "Business", 500, 4.7, 14, "An exploration of the entrepreneurial mind and daring ambition.", "#233c4c", "#d8ae64"),
        ("HERE THERE AND EVERYWHERE", "BookVision", "Essays", 179, 4.5, 12, "A reflective and uplifting collection on curiosity and everyday wonder.", "#275355", "#d7b875"),
        ("THINK LIKE CEO", "BookVision", "Leadership", 400, 4.7, 18, "A practical guide to strategic thinking and entrepreneurial foresight.", "#2d4d63", "#d8b16b"),
        ("WINNING PEOPLE WITHOUT LOSING YOURSELF", "BookVision", "Leadership", 500, 4.6, 17, "A thoughtful read on influence, boundaries, and confident leadership.", "#325a57", "#d0a760"),
        ("KAVERI INDA MEKANGIGE", "Kannada Classic", "Kannada Literature", 200, 4.5, 16, "A literary Kannada read exploring flow, feeling, and rootedness.", "#3c4451", "#d0a666"),
        ("PARIPOORNA PRASHNEGALU PARIPOORNA UTTARAGALU", "BookVision", "Spiritual Growth", 150, 4.7, 14, "A rich, introspective book on self inquiry and complete answers.", "#325b36", "#d8b36b"),
        ("KRISHNANA ARASUTTA", "BookVision", "Wisdom", 150, 4.6, 13, "A reflective read on ethics, learning, and inner wisdom.", "#284b58", "#d7b46d"),
        ("BIJAPUR BHAVYA PRAPANCHA", "Kannada Classic", "Kannada Literature", 200, 4.4, 19, "A literary journey through place, beauty, and cultural memory.", "#4f4b3b", "#cca964"),
        ("UPDESHA KATEGALU", "BookVision", "Wisdom", 100, 4.6, 17, "A concise and wise collection of guidance and everyday reflection.", "#2a5349", "#d5b66a"),
        ("PRACHINA BHARATADA MAHARSHIGALU", "BookVision", "History", 200, 4.7, 15, "A biography-rich exploration of India’s great sages and thinkers.", "#54433b", "#d7b172"),
    ]

    if is_postgres():
        conn = get_connection()
        conn.execute("SELECT pg_advisory_xact_lock(0, hashtext(?))", ("bookvision_catalog_seed",))
        for book in books:
            title, author, category, price, rating, stock, description, accent, highlight = book
            existing = conn.execute(
                "SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_book = 1 LIMIT 1",
                (title,),
            ).fetchone()
            if existing:
                continue
            if author.casefold() in {"bookvision", "kannada classic"} or title == "THE BOOK OF ELON":
                author = "Author unavailable"
            cover_image = make_book_cover(title, accent, highlight)
            conn.execute(
                """
                INSERT INTO products
                    (name, author, category, price, rating, stock, description, cover_image,
                     is_book, is_rentable, rental_price, ownership_price, rental_duration_days)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 0, 30)
                """,
                (
                    title, author, category, price, rating, stock, description, cover_image,
                    _POSTGRES_SEED_RENTAL_PRICES.get(title, 0),
                ),
            )
        conn.commit()
        conn.close()
        return

    conn = get_connection()
    approved_names = {book[0].strip().casefold() for book in books}
    seen_names = set()
    for product in conn.execute(
        "SELECT id, name FROM products WHERE is_book = 1 ORDER BY id"
    ).fetchall():
        normalized_name = product["name"].strip().casefold()
        if normalized_name in approved_names and normalized_name not in seen_names:
            seen_names.add(normalized_name)
            continue
        if _has_product_references(conn, product["id"]):
            conn.execute(
                "UPDATE products SET is_book = 0 WHERE id = ?",
                (product["id"],),
            )
        else:
            conn.execute("DELETE FROM products WHERE id = ?", (product["id"],))

    for book in books:
        title, author, category, price, rating, stock, description, accent, highlight = book
        if author.casefold() in {"bookvision", "kannada classic"} or title == "THE BOOK OF ELON":
            author = "Author unavailable"
        if title.strip().casefold() == "india's struggle for independence 1857-1947":
            author = "Bipan Chandra"
        cover_image = make_book_cover(title, accent, highlight)
        existing = conn.execute(
            "SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_book = 1 ORDER BY id LIMIT 1",
            (title,)
        ).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE products
                SET name = ?, author = ?, category = ?, price = ?, rating = ?, stock = ?, description = ?,
                    cover_image = ?, is_book = 1
                WHERE id = ?
                """,
                (
                    title, author, category, price, rating, stock, description, cover_image,
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
                (title, author, category, price, rating, stock, description, cover_image)
            )

    rental_prices = {
        "ZERO TO HERO": 20,
        "DETOX YOUR EGO": 50,
        "The Power of Your Subconscious Mind": 20,
        "BADUKUVA DARI": 20,
        "India's Struggle for Independence 1857-1947": 30,
        "Heli Hogu Kaarana": 20,
        "Why I am an Atheist and Other Writings": 20,
        "IKIGAI": 20,
        "DEEP WORK": 20,
        "PSYCHOLOGY OF MONEY": 20,
        "RICH DAD POOR DAD": 20,
        "AVALU": 30,
        "HOW TO WIN FRIENDS AND INFLUENCE PEOPLE": 30,
        "MINDSET": 50,
        "NATION OF IDIORA": 50,
        "GRIT": 50,
        "CHALO DILLI ENDU HODAVARELLI": 30,
        "SECRET": 50,
        "MUKAJJIYA KANASUGALU": 20,
        "SWARA MATA LAYA PITA": 20,
        "VAKALAT": 20,
        "VEKTITVA VIKASANA": 20,
        "THE COURAGE TO BE DISLIKED": 30,
        "PSYCHO CYBERNETICS": 30,
        "48 LAWS OF POWER": 100,
        "WINGS OF FIRE": 30,
        "THE BOOK OF ELON": 50,
        "HERE THERE AND EVERYWHERE": 20,
        "THINK LIKE CEO": 30,
        "WINNING PEOPLE WITHOUT LOSING YOURSELF": 50,
        "KAVERI INDA MEKANGIGE": 20,
        "PARIPOORNA PRASHNEGALU PARIPOORNA UTTARAGALU": 20,
        "KRISHNANA ARASUTTA": 20,
        "BIJAPUR BHAVYA PRAPANCHA": 20,
        "UPDESHA KATEGALU": 20,
        "PRACHINA BHARATADA MAHARSHIGALU": 20,
    }
    for title, rental_price in rental_prices.items():
        conn.execute(
            """
            UPDATE products
            SET rental_price = ?, is_rentable = 1, ownership_price = 0, rental_duration_days = 30
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
            """,
            (rental_price, title),
        )

    conn.commit()
    conn.close()


# ===========================================================================
# SEED — rental pricing
# ===========================================================================

def seed_rental_products():
    """
    Apply the approved book-by-book rental pricing model while keeping the
    existing membership deposit and 30-day return window unchanged.
    Idempotent — safe to call on every startup.
    PostgreSQL: no-op.
    """
    if is_postgres():
        return

    conn = get_connection()
    rental_prices = {
        "ZERO TO HERO": 20,
        "DETOX YOUR EGO": 50,
        "The Power of Your Subconscious Mind": 20,
        "BADUKUVA DARI": 20,
        "India's Struggle for Independence 1857-1947": 30,
        "Heli Hogu Kaarana": 20,
        "Why I am an Atheist and Other Writings": 20,
        "IKIGAI": 20,
        "DEEP WORK": 20,
        "PSYCHOLOGY OF MONEY": 20,
        "RICH DAD POOR DAD": 20,
        "AVALU": 30,
        "HOW TO WIN FRIENDS AND INFLUENCE PEOPLE": 30,
        "MINDSET": 50,
        "NATION OF IDIORA": 50,
        "GRIT": 50,
        "CHALO DILLI ENDU HODAVARELLI": 30,
        "SECRET": 50,
        "MUKAJJIYA KANASUGALU": 20,
        "SWARA MATA LAYA PITA": 20,
        "VAKALAT": 20,
        "VEKTITVA VIKASANA": 20,
        "THE COURAGE TO BE DISLIKED": 30,
        "PSYCHO CYBERNETICS": 30,
        "48 LAWS OF POWER": 100,
        "WINGS OF FIRE": 30,
        "THE BOOK OF ELON": 50,
        "HERE THERE AND EVERYWHERE": 20,
        "THINK LIKE CEO": 30,
        "WINNING PEOPLE WITHOUT LOSING YOURSELF": 50,
        "KAVERI INDA MEKANGIGE": 20,
        "PARIPOORNA PRASHNEGALU PARIPOORNA UTTARAGALU": 20,
        "KRISHNANA ARASUTTA": 20,
        "BIJAPUR BHAVYA PRAPANCHA": 20,
        "UPDESHA KATEGALU": 20,
        "PRACHINA BHARATADA MAHARSHIGALU": 20,
    }

    for title, rental_price in rental_prices.items():
        conn.execute(
            """
            UPDATE products
            SET
                is_book = 1,
                is_rentable = 1,
                rental_price = ?,
                ownership_price = 0,
                rental_duration_days = 30
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
            """,
            (rental_price, title),
        )

    conn.commit()
    conn.close()


# ===========================================================================
# SEED — service locations (Hubli pickup / drop-off points)
# ===========================================================================

_LOCATIONS = [
    {
        "name": "Unkal Cross",
        "area": "Unkal Cross",
        "city": "Hubli",
        "pincode": "580031",
        "sort_order": 1,
    },
    {
        "name": "Vidyanagar Cross",
        "area": "Vidyanagar Cross",
        "city": "Hubli",
        "pincode": "580021",
        "sort_order": 2,
    },
    {
        "name": "BVB College",
        "area": "BVB College, Near Hubli",
        "city": "Hubli",
        "pincode": "580031",
        "sort_order": 3,
    },
    {
        "name": "Inorbit Mall",
        "area": "Inorbit Mall, Near Hubli",
        "city": "Hubli",
        "pincode": "580030",
        "sort_order": 4,
    },
    {
        "name": "Urban Oasis Mall",
        "area": "Urban Oasis Mall, Near Hubli",
        "city": "Hubli",
        "pincode": "580030",
        "sort_order": 5,
    },
    {
        "name": "Dharwad New Bus Stand",
        "area": "New Bus Stand",
        "city": "Dharwad",
        "pincode": "580008",
        "sort_order": 6,
    },
]


def seed_locations() -> None:
    """
    Insert the five authorised Jnana Nidhi Hubballi service locations.
    Idempotent — skips locations already present by name.
    PostgreSQL inserts missing locations without overwriting existing rows.
    """
    conn = get_connection()

    if is_postgres():
        conn.execute("SELECT pg_advisory_xact_lock(0, hashtext(?))", ("bookvision_location_seed",))

    for loc in _LOCATIONS:
        existing = conn.execute(
            "SELECT id FROM locations WHERE name = ?", (loc["name"],)
        ).fetchone()
        if not existing:
            conn.execute(
                """
                INSERT INTO locations (name, area, city, pincode, is_active, sort_order)
                VALUES (?, ?, ?, ?, 1, ?)
                """,
                (loc["name"], loc["area"], loc["city"], loc["pincode"], loc["sort_order"]),
            )

    conn.commit()
    conn.close()
