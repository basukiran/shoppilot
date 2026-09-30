"""
migrate.py — BookVision PostgreSQL migration runner.

Usage:
    python migrate.py

Requirements:
    - DATABASE_URL must be set in the environment (or in backend/.env).
    - psycopg2 must be installed:  pip install psycopg2-binary

What it does:
    1. Reads DATABASE_URL from the environment.
    2. Connects to the PostgreSQL database.
    3. Creates a _migrations tracking table if it does not exist.
    4. Reads every .sql file from migrations/postgresql/ in numeric order.
    5. Skips files that have already been applied (recorded in _migrations).
    6. Executes each pending file in a single transaction.
    7. Records the filename in _migrations on success.
    8. Prints a clear pass / skip / FAIL line for every file.

Safety rules:
    - Will NOT run if DATABASE_URL is not set (refuses to touch SQLite).
    - Will NOT drop tables or delete data.
    - Each migration runs inside its own transaction; a failure rolls back
      only that file, leaving previously applied migrations intact.
    - Already-applied files are skipped — safe to run multiple times.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

MIGRATIONS_DIR = Path(__file__).parent / "migrations" / "postgresql"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _connect():
    """Return a raw psycopg2 connection."""
    try:
        import psycopg2  # noqa: PLC0415
    except ImportError:
        print(
            "\n  ERROR: psycopg2 is not installed.\n"
            "  Install it with:  pip install psycopg2-binary\n"
        )
        sys.exit(1)

    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as exc:
        print(f"\n  ERROR: Could not connect to PostgreSQL.\n  {exc}\n")
        sys.exit(1)


def _ensure_migrations_table(conn):
    """Create the _migrations tracking table if it does not exist."""
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS _migrations (
                id         SERIAL PRIMARY KEY,
                filename   TEXT        NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    conn.commit()


def _applied_migrations(conn) -> set:
    """Return the set of filenames that have already been applied."""
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM _migrations")
        return {row[0] for row in cur.fetchall()}


def _apply_migration(conn, filepath: Path) -> None:
    """
    Execute a single SQL file inside a transaction.
    Records the filename in _migrations on success.
    Raises on failure (caller handles rollback).
    """
    sql = filepath.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO _migrations (filename) VALUES (%s)",
            (filepath.name,),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("\nBookVision — PostgreSQL migration runner")
    print("=" * 44)

    # Guard: refuse to run without DATABASE_URL
    if not DATABASE_URL:
        print(
            "\n  ERROR: DATABASE_URL is not set.\n"
            "  Set it in backend/.env or as an environment variable:\n\n"
            "      DATABASE_URL=postgresql://username:password@host:5432/bookvision\n"
        )
        sys.exit(1)

    # Mask credentials in log output
    safe_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"\n  Target: ...@{safe_url}")

    # Collect migration files sorted by name (numeric prefix ensures order)
    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print(f"\n  No .sql files found in {MIGRATIONS_DIR}\n")
        sys.exit(0)

    print(f"  Found {len(sql_files)} migration file(s) in {MIGRATIONS_DIR.name}/\n")

    conn = _connect()

    try:
        _ensure_migrations_table(conn)
        already_applied = _applied_migrations(conn)

        applied_count = 0
        skipped_count = 0
        failed_count = 0

        for filepath in sql_files:
            name = filepath.name

            if name in already_applied:
                print(f"  SKIP  {name}  (already applied)")
                skipped_count += 1
                continue

            print(f"  RUN   {name} ...", end="", flush=True)
            try:
                _apply_migration(conn, filepath)
                print("  OK")
                applied_count += 1
            except Exception as exc:
                conn.rollback()
                print(f"  FAIL\n\n        {exc}\n")
                failed_count += 1
                # Stop on first failure to avoid partial state
                break

        print()
        print(f"  Applied : {applied_count}")
        print(f"  Skipped : {skipped_count}")
        print(f"  Failed  : {failed_count}")
        print()

        if failed_count:
            print("  Migration completed with errors. See above.\n")
            sys.exit(1)
        else:
            print("  All migrations applied successfully.\n")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
