import os
import time
import hmac
import json
import logging
import threading
from collections import defaultdict, deque
from functools import wraps
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import razorpay

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import (
    init_db,
    seed_products,
    seed_rental_products,
    seed_locations,
    get_connection,
    is_postgres,
)
from notifications import create_notification
from agent import (
    ask_agent,
    create_order,
    mark_order_paid,
    search_products as search_book_products,
)
from auth import hash_password, hash_session_token, verify_password


load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"


# --------------------------------------------------
# RAZORPAY
# --------------------------------------------------

RAZORPAY_KEY_ID = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
RAZORPAY_KEY_SECRET = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in production.")
    print("WARNING: Razorpay keys are missing from the environment")

if IS_PRODUCTION and not RAZORPAY_KEY_ID.startswith("rzp_live_"):
    raise RuntimeError("Production requires a Razorpay live key ID (rzp_live_ prefix).")

razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)
rental_logger = logging.getLogger("bookvision.rental")
rental_logger.setLevel(logging.INFO)
if not rental_logger.handlers:
    rental_handler = logging.StreamHandler()
    rental_handler.setFormatter(
        logging.Formatter("%(levelname)s:%(name)s:%(message)s")
    )
    rental_logger.addHandler(rental_handler)
rental_logger.propagate = False


# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(title="BookVision API")


CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
configured_origins = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",") if origin.strip()]
development_origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
allowed_origins = configured_origins if IS_PRODUCTION else list(dict.fromkeys([*development_origins, *configured_origins]))
if IS_PRODUCTION:
    for origin in allowed_origins:
        parsed_origin = urlparse(origin)
        if (
            "*" in origin
            or parsed_origin.scheme not in {"http", "https"}
            or not parsed_origin.netloc
            or parsed_origin.path != ""
            or parsed_origin.query
            or parsed_origin.fragment
            or parsed_origin.username
            or parsed_origin.password
        ):
            raise RuntimeError("CORS_ORIGINS must contain explicit scheme and host origins in production.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=None if IS_PRODUCTION else r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def validate_browser_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin_host = urlparse(origin)
        forwarded_scheme = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
        request_scheme = forwarded_scheme or request.url.scheme
        same_origin = (
            origin_host.scheme == request_scheme
            and origin_host.netloc.lower() == request.headers.get("host", "").lower()
            and origin_host.path in {"", "/"}
            and not origin_host.query
            and not origin_host.fragment
        )
        local_development_origin = (
            not IS_PRODUCTION
            and re.fullmatch(r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?", origin) is not None
        )
        if not same_origin and origin not in allowed_origins and not local_development_origin:
            return JSONResponse(
                status_code=403,
                content={"detail": "Request origin is not allowed."},
            )
    return await call_next(request)


init_db()
seed_products()
seed_rental_products()
seed_locations()


# --------------------------------------------------
# PAYMENT SESSION TABLE
# --------------------------------------------------

def init_payment_table():
    if is_postgres():
        return
    conn = get_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS razorpay_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            razorpay_order_id TEXT UNIQUE NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'CREATED',
            razorpay_payment_id TEXT,
            combo_items TEXT
        )
        """
    )

    conn.commit()
    columns = {
        column["name"]
        for column in conn.execute("PRAGMA table_info(razorpay_payments)").fetchall()
    }
    if "combo_items" not in columns:
        conn.execute("ALTER TABLE razorpay_payments ADD COLUMN combo_items TEXT")
        conn.commit()
    conn.close()


init_payment_table()

# --------------------------------------------------
# RENTAL PAYMENT TABLE
# --------------------------------------------------

def init_rental_payment_table():
    if is_postgres():
        return
    conn = get_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rental_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            razorpay_order_id TEXT UNIQUE NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            membership_fee REAL NOT NULL,
            rental_fee REAL NOT NULL,
            total_amount REAL NOT NULL,
            reader_type TEXT DEFAULT 'REGULAR_READER',
            status TEXT DEFAULT 'CREATED',
            razorpay_payment_id TEXT
        )
        """
    )

    conn.commit()
    conn.close()


init_rental_payment_table()


def init_user_columns():
    if is_postgres():
        return
    conn = get_connection()
    for table_name in ("razorpay_payments", "rental_payments"):
        columns = {
            column["name"]
            for column in conn.execute(
                f"PRAGMA table_info({table_name})"
            ).fetchall()
        }
        if "user_id" not in columns:
            conn.execute(
                f"ALTER TABLE {table_name} ADD COLUMN user_id INTEGER REFERENCES users(id)"
            )
        if "reader_type" not in columns:
            conn.execute(
                f"ALTER TABLE {table_name} ADD COLUMN reader_type TEXT DEFAULT 'REGULAR_READER'"
            )
    for table_name, column_name, column_type in (
        ("memberships", "reader_type", "TEXT DEFAULT 'REGULAR_READER'"),
        ("memberships", "membership_fee", "REAL DEFAULT 500"),
        ("memberships", "membership_expires_at", "TIMESTAMP"),
        ("rentals", "reader_type", "TEXT DEFAULT 'REGULAR_READER'"),
    ):
        columns = {
            column["name"]
            for column in conn.execute(
                f"PRAGMA table_info({table_name})"
            ).fetchall()
        }
        if column_name not in columns:
            conn.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            )
    conn.commit()
    conn.close()


init_user_columns()


READER_TYPE_OPTIONS = {
    "REGULAR_READER",
    "SPECIFIC_BOOK_READER",
}


def normalize_reader_type(reader_type: str | None) -> str:
    value = (reader_type or "REGULAR_READER").strip().upper()
    if value not in READER_TYPE_OPTIONS:
        return "REGULAR_READER"
    return value


def normalize_product_id(value: int | str | None, *, field_name: str = "product_id") -> int:
    if value is None:
        raise HTTPException(status_code=422, detail=f"{field_name} is required.")

    if isinstance(value, int):
        if value <= 0:
            raise HTTPException(status_code=422, detail=f"{field_name} must be a positive integer.")
        return value

    text = str(value).strip()
    if text.isdigit():
        product_id = int(text)
        if product_id <= 0:
            raise HTTPException(status_code=422, detail=f"{field_name} must be a positive integer.")
        return product_id

    match = re.search(r"(\d+)", text)
    if match:
        product_id = int(match.group(1))
        if product_id <= 0:
            raise HTTPException(status_code=422, detail=f"{field_name} must be a positive integer.")
        return product_id

    raise HTTPException(status_code=422, detail=f"Invalid {field_name} value.")


def get_reader_refund_amount(reader_type: str | None) -> int:
    return 300 if normalize_reader_type(reader_type) == "SPECIFIC_BOOK_READER" else 0


def get_membership_expiry(reader_type: str | None):
    if normalize_reader_type(reader_type) == "REGULAR_READER":
        return datetime.utcnow() + timedelta(days=365)
    return datetime.utcnow() + timedelta(days=30)


def backfill_rental_payment_links():
    conn = get_connection()

    rentals_without_payment = conn.execute(
        """
        SELECT id, product_id, rental_fee, membership_fee
        FROM rentals
        WHERE rental_payment_id IS NULL
        ORDER BY id
        """
    ).fetchall()

    for rental in rentals_without_payment:
        matching_payments = conn.execute(
            """
            SELECT rental_payments.id
            FROM rental_payments
            WHERE rental_payments.product_id = ?
            AND rental_payments.rental_fee = ?
            AND rental_payments.membership_fee = ?
            AND rental_payments.status = 'PAID'
            AND rental_payments.razorpay_payment_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1
                FROM rentals AS linked_rental
                WHERE linked_rental.rental_payment_id = rental_payments.id
            )
            """,
            (
                rental["product_id"],
                rental["rental_fee"],
                rental["membership_fee"]
            )
        ).fetchall()

        if len(matching_payments) == 1:
            conn.execute(
                """
                UPDATE rentals
                SET rental_payment_id = ?
                WHERE id = ?
                AND rental_payment_id IS NULL
                """,
                (
                    matching_payments[0]["id"],
                    rental["id"]
                )
            )

    conn.commit()
    conn.close()


backfill_rental_payment_links()


def backfill_refund_history():
    conn = get_connection()
    conn.execute(
        """
        INSERT OR IGNORE INTO refunds
            (user_id, rental_id, payment_id, amount, status, razorpay_refund_id)
        SELECT
            rentals.user_id,
            rentals.id,
            rentals.rental_payment_id,
            rentals.refund_amount,
            rentals.refund_status,
            rentals.refund_payment_id
        FROM rentals
        WHERE rentals.refund_status = 'PROCESSED'
        AND rentals.refund_payment_id IS NOT NULL
        """
    )
    conn.commit()
    conn.close()


backfill_refund_history()


SESSION_COOKIE_NAME = "bookvision_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 14
PASSWORD_MIN_LENGTH = 8
DUMMY_PASSWORD_HASH = hash_password("BookVision invalid account timing guard")


class RegistrationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=7, max_length=24)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class AddressRequest(BaseModel):
    label: str = Field(default="Home", max_length=40)
    recipient_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=7, max_length=24)
    address_line1: str = Field(min_length=1, max_length=200)
    address_line2: str = Field(default="", max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=3, max_length=16)
    country: str = Field(default="India", min_length=2, max_length=80)
    is_default: bool = False


ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
}


def public_user(user):
    user_dict = dict(user) if hasattr(user, "keys") else user
    role = str(user_dict.get("role", "CUSTOMER") or "CUSTOMER").upper()
    email = str(user_dict.get("email") or "").lower()
    return {
        "id": user_dict["id"],
        "name": user_dict["name"],
        "email": user_dict["email"],
        "phone": user_dict["phone"],
        "role": role,
        "is_admin": role in ("ADMIN", "DEVELOPER") or email in ADMIN_EMAILS,
        "created_at": user_dict["created_at"],
    }


def is_admin_user(user) -> bool:
    if not user:
        return False
    user_dict = dict(user) if hasattr(user, "keys") else user
    role = str(user_dict.get("role") or "").upper()
    if role in ("ADMIN", "DEVELOPER"):
        return True
    email = str(user_dict.get("email") or "").lower()
    return email in ADMIN_EMAILS


def require_admin_user(request: Request):
    user = require_current_user(request)
    if not is_admin_user(user):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin access required."
        )
    return user


def set_session_cookie(response: Response, user_id: int, request: Request):
    token = secrets.token_urlsafe(32)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE)
    ).strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    conn.execute(
        "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, hash_session_token(token), expires_at)
    )
    conn.commit()
    conn.close()

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=IS_PRODUCTION or request.url.scheme == "https",
        samesite="lax",
        path="/",
    )


def optional_current_user(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    conn = get_connection()
    user = conn.execute(
        """
        SELECT users.id, users.name, users.email, users.phone, users.role, users.created_at
        FROM auth_sessions
        JOIN users ON users.id = auth_sessions.user_id
        WHERE auth_sessions.token_hash = ?
        AND auth_sessions.revoked_at IS NULL
        AND auth_sessions.expires_at > CURRENT_TIMESTAMP
        """,
        (hash_session_token(token),)
    ).fetchone()
    conn.close()

    if user is None:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    return user


def require_current_user(request: Request):
    user = optional_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in to access your account.")
    return user


# Per-process sliding-window limits for sensitive entry points. Deployments with
# multiple workers should also enforce limits at the shared reverse proxy.
_rate_limit_events = defaultdict(deque)
_rate_limit_lock = threading.Lock()


def enforce_rate_limit(request: Request, bucket: str, limit: int, window_seconds: int):
    client_ip = request.client.host if request.client else "unknown"
    key = (bucket, client_ip)
    now = time.monotonic()
    cutoff = now - window_seconds
    with _rate_limit_lock:
        events = _rate_limit_events[key]
        while events and events[0] <= cutoff:
            events.popleft()
        if len(events) >= limit:
            retry_after = max(1, int(window_seconds - (now - events[0])))
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        events.append(now)
        if len(_rate_limit_events) > 10_000:
            expired_cutoff = now - 3600
            for old_key in [
                k for k, value in _rate_limit_events.items()
                if not value or value[-1] <= expired_cutoff
            ]:
                _rate_limit_events.pop(old_key, None)
            while len(_rate_limit_events) > 10_000:
                _rate_limit_events.pop(next(iter(_rate_limit_events)))


def validate_registration_fields(name: str, email: str, phone: str):
    normalized_email = email.strip().lower()
    normalized_phone = phone.strip()
    phone_digits = re.sub(r"\D", "", normalized_phone)

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized_email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if not 7 <= len(phone_digits) <= 15:
        raise HTTPException(status_code=422, detail="Enter a valid phone number.")
    if not name.strip():
        raise HTTPException(status_code=422, detail="Name is required.")

    return name.strip(), normalized_email, normalized_phone


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "BookVision backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/auth/register", status_code=201)
def register_user(
    registration: RegistrationRequest,
    request: Request,
    response: Response
):
    enforce_rate_limit(request, "auth-register", 5, 3600)
    name, email, phone = validate_registration_fields(
        registration.name,
        registration.email,
        registration.phone
    )
    password_hash = hash_password(registration.password)

    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?",
        (email,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    try:
        cursor = conn.execute(
            "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'CUSTOMER')",
            (name, email, phone, password_hash)
        )
        user_id = cursor.lastrowid
        user = conn.execute(
            "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    conn.close()

    # ---- Welcome notification ----
    notif_conn = get_connection()
    create_notification(
        notif_conn,
        user_id,
        "account_welcome",
        "Welcome to BookVision 📚",
        f"Hi {name}, your account is ready. Explore books, rent titles, and track your orders here.",
    )
    notif_conn.commit()
    notif_conn.close()

    set_session_cookie(response, user_id, request)
    return {"success": True, "user": public_user(user)}


@app.post("/auth/login")
def login_user(login: LoginRequest, request: Request, response: Response):
    enforce_rate_limit(request, "auth-login", 10, 60)
    email = login.email.strip().lower()
    conn = get_connection()
    user = conn.execute(
        "SELECT id, name, email, phone, role, password_hash, created_at FROM users WHERE email = ?",
        (email,)
    ).fetchone()
    conn.close()

    password_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(login.password, password_hash)
    if user is None or not valid_password:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    set_session_cookie(response, user["id"], request)
    return {"success": True, "user": public_user(user)}


@app.get("/auth/me")
def get_current_profile(request: Request):
    return {"user": public_user(require_current_user(request))}


@app.get("/admin/customers")
def get_admin_customers(request: Request):
    require_admin_user(request)
    conn = get_connection()
    customers = conn.execute(
        """
        SELECT users.id, users.name, users.email, users.phone, users.created_at,
            (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) AS order_count,
            (SELECT COUNT(*) FROM rentals WHERE rentals.user_id = users.id) AS rental_count,
            (SELECT COUNT(*) FROM razorpay_payments
                WHERE razorpay_payments.user_id = users.id
                AND razorpay_payments.status = 'PAID') AS purchase_count,
            (SELECT COALESCE(SUM(amount), 0) FROM razorpay_payments
                WHERE razorpay_payments.user_id = users.id
                AND razorpay_payments.status = 'PAID') AS purchase_total,
            (SELECT COALESCE(SUM(total_amount), 0) FROM rental_payments
                WHERE rental_payments.user_id = users.id
                AND rental_payments.status = 'PAID') AS rental_total
        FROM users
        WHERE UPPER(COALESCE(users.role, 'CUSTOMER')) NOT IN ('ADMIN', 'DEVELOPER')
        ORDER BY users.created_at DESC, users.id DESC
        """
    ).fetchall()
    conn.close()
    return {"customers": [dict(customer) for customer in customers]}


@app.post("/auth/logout")
def logout_user(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        conn = get_connection()
        conn.execute(
            "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL",
            (hash_session_token(token),)
        )
        conn.commit()
        conn.close()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=IS_PRODUCTION or request.url.scheme == "https",
        samesite="lax",
    )
    return {"success": True}


@app.get("/account/overview")
def get_account_overview(request: Request):
    user = require_current_user(request)
    conn = get_connection()

    orders = conn.execute(
        """
        SELECT orders.id, orders.product_id, products.name AS product_name,
               orders.quantity, orders.total_amount, orders.status,
               orders.payment_status, orders.created_at
        FROM orders
        JOIN products ON products.id = orders.product_id
        WHERE orders.user_id = ?
        ORDER BY orders.id DESC
        """,
        (user["id"],)
    ).fetchall()

    rentals = conn.execute(
        """
        SELECT rentals.id, rentals.product_id, products.name AS product_name,
               rentals.rental_fee, rentals.membership_fee,
               rentals.rental_start_date, rentals.rental_end_date,
               rentals.status, rentals.delivery_status,
               rentals.customer_decision, rentals.payment_status,
               rentals.refund_amount, rentals.refund_status
        FROM rentals
        JOIN products ON products.id = rentals.product_id
        WHERE rentals.user_id = ?
        ORDER BY rentals.id DESC
        """,
        (user["id"],)
    ).fetchall()

    payments = conn.execute(
        """
        SELECT 'purchase' AS kind, razorpay_payments.id,
               products.name AS book_title, razorpay_payments.amount,
               razorpay_payments.status,
               razorpay_payments.razorpay_order_id,
               razorpay_payments.razorpay_payment_id
        FROM razorpay_payments
        JOIN products ON products.id = razorpay_payments.product_id
        WHERE razorpay_payments.user_id = ?
        UNION ALL
        SELECT 'rental' AS kind, rental_payments.id,
               products.name AS book_title, rental_payments.total_amount AS amount,
               rental_payments.status,
               rental_payments.razorpay_order_id,
               rental_payments.razorpay_payment_id
        FROM rental_payments
        JOIN products ON products.id = rental_payments.product_id
        WHERE rental_payments.user_id = ?
        ORDER BY 2 DESC
        """,
        (user["id"], user["id"])
    ).fetchall()

    refunds = conn.execute(
        """
        SELECT refunds.id, refunds.rental_id, products.name AS book_title,
               refunds.amount, refunds.status, refunds.razorpay_refund_id,
               refunds.created_at
        FROM refunds
        JOIN rentals ON rentals.id = refunds.rental_id
        JOIN products ON products.id = rentals.product_id
        WHERE refunds.user_id = ?
        ORDER BY refunds.id DESC
        """,
        (user["id"],)
    ).fetchall()

    addresses = conn.execute(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
        (user["id"],)
    ).fetchall()
    conn.close()

    return {
        "user": public_user(user),
        "orders": [dict(row) for row in orders],
        "rentals": [dict(row) for row in rentals],
        "payments": [dict(row) for row in payments],
        "refunds": [dict(row) for row in refunds],
        "addresses": [dict(row) for row in addresses],
    }


@app.post("/account/addresses", status_code=201)
def create_address(address: AddressRequest, request: Request):
    user = require_current_user(request)
    conn = get_connection()
    address_count = conn.execute(
        "SELECT COUNT(*) AS total FROM addresses WHERE user_id = ?",
        (user["id"],)
    ).fetchone()["total"]
    is_default = address.is_default or address_count == 0
    if is_default:
        conn.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user["id"],))

    cursor = conn.execute(
        """
        INSERT INTO addresses
            (user_id, label, recipient_name, phone, address_line1,
             address_line2, city, state, postal_code, country, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user["id"], address.label.strip() or "Home",
            address.recipient_name.strip(), address.phone.strip(),
            address.address_line1.strip(), address.address_line2.strip(),
            address.city.strip(), address.state.strip(),
            address.postal_code.strip(), address.country.strip(), int(is_default)
        )
    )
    conn.commit()
    saved_address = conn.execute(
        "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
        (cursor.lastrowid, user["id"])
    ).fetchone()
    conn.close()
    return {"success": True, "address": dict(saved_address)}


@app.delete("/account/addresses/{address_id}")
def delete_address(address_id: int, request: Request):
    user = require_current_user(request)
    conn = get_connection()
    cursor = conn.execute(
        "DELETE FROM addresses WHERE id = ? AND user_id = ?",
        (address_id, user["id"])
    )
    conn.commit()
    conn.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"success": True}


def ensure_rental_access(rental, current_user):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Please sign in to access this rental.")
    if rental["user_id"] != current_user["id"] and not is_admin_user(current_user):
        raise HTTPException(status_code=404, detail="Rental not found")


# --------------------------------------------------
# PRODUCTS
# --------------------------------------------------

@app.get("/favorites")
def get_favorites(request: Request):
    user = require_current_user(request)
    conn = get_connection()
    products = conn.execute(
        """
        SELECT products.*
        FROM favorites
        JOIN products ON products.id = favorites.product_id
        WHERE favorites.user_id = ? AND products.is_book = 1
        ORDER BY favorites.created_at DESC, favorites.id DESC
        """,
        (user["id"],)
    ).fetchall()
    conn.close()
    return [dict(product) for product in products]


@app.post("/favorites/{product_id}", status_code=201)
def add_favorite(product_id: str, request: Request):
    product_id = normalize_product_id(product_id, field_name="product_id")
    user = require_current_user(request)
    conn = get_connection()
    product = conn.execute(
        "SELECT id FROM products WHERE id = ? AND is_book = 1",
        (product_id,)
    ).fetchone()
    if product is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Book not found")

    favorite = conn.execute(
        "SELECT id FROM favorites WHERE user_id = ? AND product_id = ?",
        (user["id"], product_id)
    ).fetchone()
    if favorite is None:
        conn.execute(
            "INSERT INTO favorites (user_id, product_id) VALUES (?, ?)",
            (user["id"], product_id)
        )
        conn.commit()

    saved_product = conn.execute(
        "SELECT * FROM products WHERE id = ?",
        (product_id,)
    ).fetchone()
    conn.close()
    return dict(saved_product)


@app.delete("/favorites/{product_id}")
def remove_favorite(product_id: str, request: Request):
    product_id = normalize_product_id(product_id, field_name="product_id")
    user = require_current_user(request)
    conn = get_connection()
    conn.execute(
        "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
        (user["id"], product_id)
    )
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/products")
def get_products():
    conn = get_connection()

    products = conn.execute(
        "SELECT * FROM products WHERE is_book = 1 ORDER BY rating DESC"
    ).fetchall()

    conn.close()

    return [dict(product) for product in products]


@app.get("/products/search")
def search_products(
    q: str = "",
    max_price: float | None = None,
    rentable_only: bool = False
):
    return search_book_products(q, max_price, rentable_only)


# --------------------------------------------------
# AI CATALOG
# --------------------------------------------------

# --------------------------------------------------
# AI CATALOG
# --------------------------------------------------

@app.get("/ai/catalog")
def ai_catalog():
    conn = get_connection()

    products = conn.execute(
        """
        SELECT
            id,
            name,
            author,
            category,
            price,
            rating,
            stock,
            description,
            cover_image,
            is_rentable,
            rental_price,
            ownership_price,
            rental_duration_days
        FROM products
        WHERE is_book = 1
        AND stock > 0
        ORDER BY rating DESC
        """
    ).fetchall()

    conn.close()

    return {
        "merchant": {
            "name": "BookVision Store",
            "currency": "INR"
        },
        "catalog": [
            {
                "product_id": product["id"],
                "name": product["name"],
                "author": product["author"],
                "category": product["category"],
                "price": product["price"],
                "rating": product["rating"],
                "stock": product["stock"],
                "description": product["description"],
                "cover_image": product["cover_image"],
                "is_rentable": product["is_rentable"],
                "rental_price": product["rental_price"],
                "ownership_price": product["ownership_price"],
                "rental_duration_days": product["rental_duration_days"]
            }
            for product in products
        ]
    }

# ==========================================================
# RENTAL LIFECYCLE
# ==========================================================

from pydantic import BaseModel


# ----------------------------------------------------------
# GET RENTAL DETAILS
# ----------------------------------------------------------

@app.get("/rentals/{rental_id}")
def get_rental(rental_id: int, request: Request):
    current_user = require_current_user(request)

    conn = get_connection()

    rental = conn.execute(
        """
        SELECT
            rentals.user_id,
            rentals.id,
            rentals.customer_id,
            rentals.product_id,
            products.name AS product_name,
            rentals.membership_id,
            rentals.rental_fee,
            rentals.ownership_price,
            rentals.rental_start_date,
            rentals.rental_end_date,
            rentals.status,
            rentals.delivery_status,
            rentals.customer_decision,
            rentals.payment_status
        FROM rentals
        JOIN products
            ON rentals.product_id = products.id
        WHERE rentals.id = ?
        """,
        (rental_id,)
    ).fetchone()

    conn.close()

    if rental is None:
        raise HTTPException(
            status_code=404,
            detail="Rental not found"
        )

    ensure_rental_access(rental, current_user)
    rental_data = dict(rental)
    rental_data.pop("user_id", None)

    return {
        "success": True,
        "rental": rental_data
    }


# ----------------------------------------------------------
# UPDATE DELIVERY STATUS
# ----------------------------------------------------------

class DeliveryStatusUpdate(BaseModel):
    delivery_status: str


@app.patch("/rentals/{rental_id}/delivery")
def update_delivery_status(
    rental_id: int,
    update: DeliveryStatusUpdate,
    request: Request
):
    current_user = require_admin_user(request)

    allowed_statuses = {
        "PENDING",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
    }

    new_status = (
        update.delivery_status
        .strip()
        .upper()
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid delivery status. "
                "Use PENDING, OUT_FOR_DELIVERY, "
                "or DELIVERED."
            )
        )

    conn = get_connection()

    rental = conn.execute(
        """
        SELECT *
        FROM rentals
        WHERE id = ?
        """,
        (rental_id,)
    ).fetchone()

    if rental is None:
        conn.close()

        raise HTTPException(
            status_code=404,
            detail="Rental not found"
        )

    ensure_rental_access(rental, current_user)

    # ----------------------------------------------
    # DELIVERY STATE VALIDATION
    # ----------------------------------------------

    current_status = (
        rental["delivery_status"]
        or "PENDING"
    ).upper()

    valid_transition = False

    if (
        current_status == "PENDING"
        and new_status == "OUT_FOR_DELIVERY"
    ):
        valid_transition = True

    elif (
        current_status == "OUT_FOR_DELIVERY"
        and new_status == "DELIVERED"
    ):
        valid_transition = True

    elif (
        current_status == new_status
    ):
        valid_transition = True

    if not valid_transition:

        conn.close()

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid delivery transition: "
                f"{current_status} -> {new_status}"
            )
        )

    # ----------------------------------------------
    # UPDATE
    # ----------------------------------------------

    conn.execute(
        """
        UPDATE rentals
        SET delivery_status = ?
        WHERE id = ?
        """,
        (
            new_status,
            rental_id
        )
    )

    conn.commit()
    conn.close()

    # ---- Delivery notification ----
    notif_user_id = rental["user_id"] if rental["user_id"] else None
    if notif_user_id:
        notif_conn = get_connection()
        if new_status == "OUT_FOR_DELIVERY":
            create_notification(
                notif_conn,
                notif_user_id,
                "rental_dispatched",
                "Rental dispatched 🚚",
                "Your rented book is on its way. It will arrive soon.",
                rental_id=rental_id,
            )
        elif new_status == "DELIVERED":
            create_notification(
                notif_conn,
                notif_user_id,
                "rental_delivered",
                "Rental delivered 📖",
                "Your rented book has been delivered. Enjoy reading!",
                rental_id=rental_id,
            )
        notif_conn.commit()
        notif_conn.close()

    return {
        "success": True,
        "rental_id": rental_id,
        "delivery_status": new_status
    }


# ----------------------------------------------------------
# CUSTOMER DECISION
# ----------------------------------------------------------

class RentalDecisionRequest(BaseModel):
    decision: str


@app.patch("/rentals/{rental_id}/decision")
@app.post("/rentals/{rental_id}/decision")
def rental_customer_decision(
    rental_id: int,
    request: RentalDecisionRequest,
    http_request: Request
):
    current_user = require_current_user(http_request)

    decision = (
        request.decision
        .strip()
        .upper()
    )

    if decision not in {
        "KEEP",
        "RETURN"
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Decision must be "
                "KEEP or RETURN"
            )
        )

    conn = get_connection()

    rental = conn.execute(
        """
        SELECT *
        FROM rentals
        WHERE id = ?
        """,
        (rental_id,)
    ).fetchone()

    if rental is None:

        conn.close()

        raise HTTPException(
            status_code=404,
            detail="Rental not found"
        )

    rental = dict(rental)
    ensure_rental_access(rental, current_user)

    # ----------------------------------------------
    # PAYMENT CHECK
    # ----------------------------------------------

    if (
        rental["payment_status"]
        != "PAID"
    ):

        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Rental payment is not completed"
        )

    # ----------------------------------------------
    # DELIVERY CHECK
    # ----------------------------------------------

    if (
        rental["delivery_status"]
        != "DELIVERED"
    ):

        conn.close()

        raise HTTPException(
            status_code=400,
            detail=(
                "Customer can choose Keep or Return "
                "only after delivery."
            )
        )

    # ----------------------------------------------
    # RENTAL STATUS CHECK
    # ----------------------------------------------

    if rental["status"] not in {
        "ACTIVE",
        "COMPLETED"
    }:

        conn.close()

        raise HTTPException(
            status_code=400,
            detail=(
                f"Rental cannot accept a decision "
                f"while status is {rental['status']}"
            )
        )

    # ----------------------------------------------
    # PREVENT DUPLICATE DECISION
    # ----------------------------------------------

    current_decision = (
        rental["customer_decision"]
        or "PENDING"
    ).upper()

    if current_decision != "PENDING":

        conn.close()

        raise HTTPException(
            status_code=400,
            detail=(
                f"Customer already selected "
                f"{current_decision}"
            )
        )

    # ----------------------------------------------
    # RETURN
    # ----------------------------------------------

    if decision == "RETURN":
        reader_type = normalize_reader_type(rental.get("reader_type"))
        refund_amount = get_reader_refund_amount(reader_type)
        refund_status = "PENDING" if refund_amount > 0 else "NOT_APPLICABLE"

        conn.execute(
            """
            UPDATE rentals
            SET
                customer_decision = ?,
                status = ?,
                delivery_status = ?,
                reader_type = ?,
                refund_amount = ?,
                refund_status = ?
            WHERE id = ?
            """,
            (
                "RETURN",
                "RETURN_REQUESTED",
                "RETURN_REQUESTED",
                reader_type,
                refund_amount,
                refund_status,
                rental_id
            )
        )

        conn.commit()
        conn.close()

        # ---- Return request notification ----
        notif_user_id = rental["user_id"] if rental["user_id"] else None
        if notif_user_id:
            notif_conn = get_connection()
            if refund_amount > 0:
                message = (
                    "We've received your return request. Once the book is received, we will confirm a ₹300 refund for this specific-book membership."
                )
            else:
                message = "We've received your return request. Regular-reader memberships do not carry an early refund."
            create_notification(
                notif_conn,
                notif_user_id,
                "return_requested",
                "Return request created ↩️",
                message,
                rental_id=rental_id,
            )
            notif_conn.commit()
            notif_conn.close()

        return {
            "success": True,
            "rental_id": rental_id,
            "decision": "RETURN",
            "rental_status": "RETURN_REQUESTED",
            "delivery_status": "RETURN_REQUESTED",
            "reader_type": reader_type,
            "refund_amount": refund_amount,
            "refund_status": refund_status,
            "message": (
                "Return request created successfully."
            )
        }

    # ----------------------------------------------
    # KEEP
    # ----------------------------------------------

    if decision == "KEEP":
        product = conn.execute(
            "SELECT price FROM products WHERE id = ?",
            (rental["product_id"],)
        ).fetchone()
        actual_purchase_price = float(product["price"]) if product else float(rental.get("ownership_price") or 0)

        conn.execute(
            """
            UPDATE rentals
            SET
                customer_decision = ?,
                status = ?,
                reader_type = ?,
                ownership_price = ?
            WHERE id = ?
            """,
            (
                "KEEP",
                "OWNED",
                normalize_reader_type(rental.get("reader_type")),
                actual_purchase_price,
                rental_id
            )
        )

        conn.commit()
        conn.close()

        # ---- Keep notification ----
        notif_user_id = rental["user_id"] if rental["user_id"] else None
        if notif_user_id:
            notif_conn = get_connection()
            create_notification(
                notif_conn,
                notif_user_id,
                "book_kept",
                "Book kept successfully 🏠",
                "You've chosen to keep the book. The product's actual purchase price is now recorded against the ownership record.",
                rental_id=rental_id,
            )
            notif_conn.commit()
            notif_conn.close()

        return {
            "success": True,
            "rental_id": rental_id,
            "decision": "KEEP",
            "rental_status": "OWNED",
            "message": "Book kept successfully. Actual purchase price is recorded against the ownership record.",
            "ownership_price": actual_purchase_price
        }


# ----------------------------------------------------------
# LIST ALL RENTALS
# ----------------------------------------------------------

@app.get("/rentals")
def get_all_rentals(request: Request):
    current_user = require_current_user(request)

    conn = get_connection()

    query = """
        SELECT
            rentals.id,
            rentals.customer_id,
            rentals.product_id,
            products.name AS product_name,
            rentals.reader_type,
            rentals.rental_fee,
            rentals.membership_fee,
            rentals.ownership_price,
            rentals.rental_start_date,
            rentals.rental_end_date,
            rentals.status,
            rentals.delivery_status,
            rentals.customer_decision,
            rentals.payment_status,
            rentals.refund_amount,
            rentals.refund_status
        FROM rentals
        JOIN products
            ON rentals.product_id = products.id
    """
    params = ()
    if current_user and not is_admin_user(current_user):
        query += " WHERE rentals.user_id = ?"
        params = (current_user["id"],)
    query += " ORDER BY rentals.id DESC"
    rentals = conn.execute(query, params).fetchall()

    conn.close()

    return {
        "success": True,
        "rentals": [
            dict(rental)
            for rental in rentals
        ]
    }    


# --------------------------------------------------
# AI CHAT
# --------------------------------------------------

@app.get("/ai/chat")
def ai_chat(request: Request, message: str = Query(min_length=1, max_length=2000)):
    enforce_rate_limit(request, "ai-chat", 20, 60)
    return ask_agent(message)


# --------------------------------------------------
# LEGACY ORDER CONFIRM
# --------------------------------------------------

@app.post("/order/confirm")
def confirm_order(
    product_id: int | str,
    quantity: int,
    approved: bool,
    request: Request
):
    product_id = normalize_product_id(product_id, field_name="product_id")
    if not approved:
        return {
            "success": False,
            "status": "CANCELLED",
            "message": "Order was not created because user approval was not given."
        }
    raise HTTPException(
        status_code=409,
        detail="Orders are created only after Razorpay payment is verified. Start checkout using /payment/create.",
    )


# --------------------------------------------------
# CREATE RAZORPAY ORDER
# --------------------------------------------------

@app.post("/payment/create")
def create_razorpay_order(
    product_id: int | str,
    quantity: int,
    request: Request
):
    product_id = normalize_product_id(product_id, field_name="product_id")
    enforce_rate_limit(request, "payment-create", 12, 60)
    current_user = require_current_user(request)

    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    conn = get_connection()

    product = conn.execute(
        """
        SELECT id, name, price, stock
        FROM products
        WHERE id = ? AND is_book = 1
        """,
        (product_id,)
    ).fetchone()

    conn.close()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if product["stock"] < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product['stock']} units available"
        )

    total_amount = product["price"] * quantity

    # Razorpay expects the smallest currency unit.
    # INR -> paise
    amount_paise = int(round(total_amount * 100))

    receipt = f"sp_{product_id}_{int(time.time())}"

    try:
        razorpay_order = razorpay_client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "product_id": str(product_id),
                    "quantity": str(quantity),
                    "product": product["name"]
                }
            }
        )
    except Exception as error:
        logging.getLogger("bookvision.payment").error("Razorpay order creation failed (%s)", type(error).__name__)

        raise HTTPException(
            status_code=500,
            detail="Unable to create Razorpay order"
        )

    conn = get_connection()

    conn.execute(
        """
        INSERT INTO razorpay_payments
        (
            razorpay_order_id,
            product_id,
            quantity,
            amount,
            status,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            razorpay_order["id"],
            product_id,
            quantity,
            total_amount,
            "CREATED",
            current_user["id"] if current_user else None
        )
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "key_id": RAZORPAY_KEY_ID,
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "product_id": product_id,
        "product": product["name"],
        "quantity": quantity,
        "total_amount": total_amount
    }


class ComboPaymentItem(BaseModel):
    product_id: int
    quantity: int = 1


class ComboPaymentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: int = Field(default=1, ge=1, le=20)
    items: list[ComboPaymentItem] = Field(min_length=1, max_length=20)


@app.post("/payment/create-combo")
def create_combo_razorpay_order(
    combo: ComboPaymentRequest,
    request: Request
):
    enforce_rate_limit(request, "payment-create", 12, 60)
    current_user = require_current_user(request)
    if combo.quantity <= 0 or any(item.quantity <= 0 for item in combo.items):
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    conn = get_connection()
    aggregated: dict[int, int] = {}
    for item in combo.items:
        aggregated[item.product_id] = aggregated.get(item.product_id, 0) + item.quantity * combo.quantity

    resolved_items = []
    total_amount = 0
    for product_id, item_quantity in aggregated.items():
        product = conn.execute(
            "SELECT id, name, price, stock FROM products WHERE id = ? AND is_book = 1",
            (product_id,),
        ).fetchone()
        if product is None:
            conn.close()
            raise HTTPException(status_code=404, detail="A book in this combo was not found")
        if product["stock"] < item_quantity:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"Only {product['stock']} copies of {product['name']} are available",
            )
        resolved_items.append({
            "product_id": product["id"],
            "quantity": item_quantity,
            "name": product["name"],
            "unit_price": product["price"],
        })
        total_amount += product["price"] * item_quantity
    conn.close()

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Combo total must be greater than 0")

    amount_paise = int(round(total_amount * 100))
    receipt = f"combo_{int(time.time())}_{secrets.token_hex(3)}"
    try:
        razorpay_order = razorpay_client.order.create(data={
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": {
                "product": combo.name.strip(),
                "quantity": str(combo.quantity),
                "combo": "true",
            },
        })
    except Exception as error:
        logging.getLogger("bookvision.payment").error("Razorpay combo order creation failed (%s)", type(error).__name__)
        raise HTTPException(status_code=500, detail="Unable to create Razorpay order")

    conn = get_connection()
    conn.execute(
        """
        INSERT INTO razorpay_payments
            (razorpay_order_id, product_id, quantity, amount, status, user_id, combo_items)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            razorpay_order["id"],
            resolved_items[0]["product_id"],
            combo.quantity,
            total_amount,
            "CREATED",
            current_user["id"] if current_user else None,
            json.dumps({"name": combo.name.strip(), "items": resolved_items}),
        ),
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "key_id": RAZORPAY_KEY_ID,
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "product": combo.name.strip(),
        "quantity": combo.quantity,
        "total_amount": total_amount,
    }


# --------------------------------------------------
# VERIFY RAZORPAY PAYMENT
# --------------------------------------------------

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@app.post("/payment/verify")
def verify_razorpay_payment(
    payment: PaymentVerification,
    request: Request
):
    enforce_rate_limit(request, "payment-verify", 20, 60)
    current_user = require_current_user(request)
    conn = get_connection()

    payment_record = conn.execute(
        """
        SELECT *
        FROM razorpay_payments
        WHERE razorpay_order_id = ?
        """,
        (payment.razorpay_order_id,)
    ).fetchone()

    conn.close()

    if payment_record is None:
        raise HTTPException(
            status_code=404,
            detail="Razorpay order not found"
        )

    if payment_record["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Razorpay order not found")

    if payment_record["status"] == "PAID":
        return {
            "success": True,
            "message": "Payment already verified"
        }

    # --------------------------------------------------
    # VERIFY SIGNATURE
    # --------------------------------------------------

    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        (
            payment.razorpay_order_id
            + "|"
            + payment.razorpay_payment_id
        ).encode(),
        digestmod="sha256"
    ).hexdigest()

    if not hmac.compare_digest(
        generated_signature,
        payment.razorpay_signature
    ):
        raise HTTPException(
            status_code=400,
            detail="Payment signature verification failed"
        )

    # --------------------------------------------------
    # FETCH PAYMENT FROM RAZORPAY
    # --------------------------------------------------

    try:
        razorpay_payment = razorpay_client.payment.fetch(
            payment.razorpay_payment_id
        )
    except Exception as error:
        logging.getLogger("bookvision.payment").error("Razorpay payment fetch failed (%s)", type(error).__name__)

        raise HTTPException(
            status_code=500,
            detail="Unable to verify payment status"
        )

    # Ensure payment belongs to our Razorpay order.
    if razorpay_payment.get("order_id") != payment.razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="Payment does not belong to this order"
        )

    # Ensure paid amount matches our database amount.
    expected_amount = int(
        round(payment_record["amount"] * 100)
    )

    if razorpay_payment.get("amount") != expected_amount:
        raise HTTPException(
            status_code=400,
            detail="Payment amount mismatch"
        )

    payment_status = razorpay_payment.get("status")

    # --------------------------------------------------
    # CAPTURE IF NECESSARY
    # --------------------------------------------------

    if payment_status == "authorized":
        try:
            razorpay_payment = razorpay_client.payment.capture(
                payment.razorpay_payment_id,
                expected_amount
            )

            payment_status = razorpay_payment.get("status")

        except Exception as error:
            logging.getLogger("bookvision.payment").error("Razorpay payment capture failed (%s)", type(error).__name__)

            raise HTTPException(
                status_code=500,
                detail="Payment authorized but capture failed"
            )

    if payment_status != "captured":
        conn = get_connection()

        conn.execute(
            """
            UPDATE razorpay_payments
            SET
                status = ?,
                razorpay_payment_id = ?
            WHERE razorpay_order_id = ?
            """,
            (
                "FAILED",
                payment.razorpay_payment_id,
                payment.razorpay_order_id
            )
        )

        conn.commit()
        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Payment has not been captured. Please retry checkout or contact support."
        )

    # --------------------------------------------------
    # CREATE OUR LOCAL ORDER ONLY AFTER PAYMENT
    # --------------------------------------------------

    combo_metadata = payment_record["combo_items"]
    if combo_metadata:
        combo_data = json.loads(combo_metadata)
        created_orders = []
        for item in combo_data["items"]:
            order_result = create_order(
                product_id=item["product_id"],
                quantity=item["quantity"],
                user_id=payment_record["user_id"],
            )
            if not order_result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=order_result.get("reason", "Unable to create combo order"),
                )
            created_orders.append(mark_order_paid(
                order_id=order_result["order_id"],
                razorpay_payment_id=payment.razorpay_payment_id,
            ))
        first_order = created_orders[0]
        final_order = {
            "success": True,
            "order_id": first_order["order_id"],
            "product": combo_data["name"],
            "quantity": payment_record["quantity"],
            "unit_price": payment_record["amount"] / payment_record["quantity"],
            "total_amount": payment_record["amount"],
            "status": "CONFIRMED",
            "payment_status": "PAID",
            "razorpay_payment_id": payment.razorpay_payment_id,
            "orders": created_orders,
        }
        notification_order_id = first_order["order_id"]
    else:
        order_result = create_order(
            product_id=payment_record["product_id"],
            quantity=payment_record["quantity"],
            user_id=payment_record["user_id"]
        )

        if not order_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=order_result.get(
                    "reason",
                    "Unable to create local order"
                )
            )

        # Mark local order as paid.
        final_order = mark_order_paid(
            order_id=order_result["order_id"],
            razorpay_payment_id=payment.razorpay_payment_id
        )
        notification_order_id = order_result.get("order_id")

    # Update payment session.
    conn = get_connection()

    conn.execute(
        """
        UPDATE razorpay_payments
        SET
            status = ?,
            razorpay_payment_id = ?
        WHERE razorpay_order_id = ?
        """,
        (
            "PAID",
            payment.razorpay_payment_id,
            payment.razorpay_order_id
        )
    )

    conn.commit()
    conn.close()

    # ---- Payment & order notifications ----
    notif_user_id = payment_record["user_id"]
    if notif_user_id:
        notif_conn = get_connection()
        create_notification(
            notif_conn,
            notif_user_id,
            "payment_success",
            "Payment successful 💳",
            f"Your payment of ₹{payment_record['amount']:,.0f} was verified successfully.",
            order_id=notification_order_id,
        )
        create_notification(
            notif_conn,
            notif_user_id,
            "order_confirmed",
            "Order confirmed ✅",
            f"Your order #{notification_order_id} has been confirmed and is being processed.",
            order_id=notification_order_id,
        )
        notif_conn.commit()
        notif_conn.close()

    return final_order


# --------------------------------------------------
# ORDERS
# --------------------------------------------------

@app.get("/orders")
def get_orders(request: Request):
    current_user = require_current_user(request)
    conn = get_connection()

    query = """
        SELECT
            orders.id,
            orders.product_id,
            products.name AS product_name,
            orders.quantity,
            orders.total_amount,
            orders.status,
            orders.payment_status
        FROM orders
        JOIN products
            ON orders.product_id = products.id
    """
    params = ()
    if current_user and not is_admin_user(current_user):
        query += " WHERE orders.user_id = ?"
        params = (current_user["id"],)
    query += " ORDER BY orders.id DESC"

    orders = conn.execute(
        query,
        params
    ).fetchall()

    conn.close()

    return [dict(order) for order in orders]

# --------------------------------------------------
# CREATE RAZORPAY RENTAL ORDER
# --------------------------------------------------

@app.post("/rental/payment/create")
def create_rental_payment(
    product_id: int | str,
    request: Request,
    quantity: int = 1,
    reader_type: str = "REGULAR_READER"
):
    product_id = normalize_product_id(product_id, field_name="product_id")
    enforce_rate_limit(request, "rental-payment-create", 12, 60)
    current_user = require_current_user(request)
    normalized_reader_type = normalize_reader_type(reader_type)
    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    conn = get_connection()

    product = conn.execute(
        """
        SELECT
            id,
            name,
            price,
            stock,
            is_rentable,
            rental_price,
            ownership_price,
            rental_duration_days
        FROM products
        WHERE id = ? AND is_book = 1
        """,
        (product_id,)
    ).fetchone()

    conn.close()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if int(product["is_rentable"] or 0) != 1:
        raise HTTPException(
            status_code=400,
            detail="This product is not available for rental"
        )

    if product["stock"] < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product['stock']} units available"
        )

    rental_fee = float(product["rental_price"] or 0) * quantity

    # Membership fee is fixed at ₹500 for either reader plan.
    membership_fee = 500.0

    total_amount = membership_fee + rental_fee

    # Razorpay expects paise
    amount_paise = int(
        round(total_amount * 100)
    )

    receipt = (
        f"rental_{product_id}_{int(time.time())}"
    )

    try:
        razorpay_order = razorpay_client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "type": "rental",
                    "product_id": str(product_id),
                    "product": product["name"],
                    "quantity": str(quantity),
                    "reader_type": normalized_reader_type,
                    "membership_fee": str(membership_fee),
                    "rental_fee": str(rental_fee),
                    "rental_duration_days": str(
                        product["rental_duration_days"] or 30
                    )
                }
            }
        )

    except Exception as error:
        logging.getLogger("bookvision.payment").error("Razorpay rental order creation failed (%s)", type(error).__name__)

        raise HTTPException(
            status_code=500,
            detail="Unable to create rental Razorpay order"
        )

    conn = get_connection()

    conn.execute(
        """
        INSERT INTO rental_payments
        (
            razorpay_order_id,
            product_id,
            quantity,
            membership_fee,
            rental_fee,
            total_amount,
            reader_type,
            status,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            razorpay_order["id"],
            product_id,
            quantity,
            membership_fee,
            rental_fee,
            total_amount,
            normalized_reader_type,
            "CREATED",
            current_user["id"]
        )
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "key_id": RAZORPAY_KEY_ID,
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",

        "product_id": product_id,
        "product": product["name"],
        "quantity": quantity,

        "membership_fee": membership_fee,
        "rental_fee": rental_fee,
        "total_amount": total_amount,
        "reader_type": normalized_reader_type,

        "rental_duration_days": (
            product["rental_duration_days"] or 30
        ),

        "ownership_price": (
            product["ownership_price"] or 0
        )
    }
# --------------------------------------------------
# VERIFY RAZORPAY RENTAL PAYMENT
# --------------------------------------------------

class RentalPaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def rental_verification_response(conn, order_id: str):
    rental = conn.execute(
        """
        SELECT rentals.id AS rental_id, rentals.membership_id,
               products.name AS product, products.rental_duration_days,
               rentals.rental_fee, rentals.membership_fee,
               rentals.ownership_price, rentals.status AS rental_status,
               rentals.delivery_status, rentals.customer_decision,
               rentals.payment_status, rental_payments.quantity,
               rental_payments.total_amount, rental_payments.reader_type,
               rental_payments.razorpay_payment_id
        FROM rental_payments
        JOIN rentals ON rentals.rental_payment_id = rental_payments.id
        JOIN products ON products.id = rentals.product_id
        WHERE rental_payments.razorpay_order_id = ?
        ORDER BY rentals.id DESC
        LIMIT 1
        """,
        (order_id,),
    ).fetchone()
    if rental is None:
        return None

    return {
        "success": True,
        "rental_id": rental["rental_id"],
        "membership_id": rental["membership_id"],
        "product": rental["product"],
        "quantity": rental["quantity"],
        "membership_fee": rental["membership_fee"],
        "rental_fee": rental["rental_fee"],
        "total_amount": rental["total_amount"],
        "reader_type": rental["reader_type"],
        "rental_duration_days": int(rental["rental_duration_days"] or 30),
        "rental_status": rental["rental_status"],
        "delivery_status": rental["delivery_status"],
        "customer_decision": rental["customer_decision"],
        "ownership_price": rental["ownership_price"],
        "payment_status": rental["payment_status"],
        "razorpay_payment_id": rental["razorpay_payment_id"],
    }


def rental_verification_guard(handler):
    @wraps(handler)
    def guarded(payment: RentalPaymentVerification, request: Request):
        try:
            return handler(payment, request)
        except HTTPException:
            raise
        except Exception as error:
            stage = getattr(request.state, "rental_verify_stage", "request handling")
            conn = getattr(request.state, "rental_verify_connection", None)
            if conn is not None:
                try:
                    conn.rollback()
                    conn.close()
                except Exception:
                    pass
            rental_logger.error(
                "RENTAL VERIFY failed order_id=%s payment_id=%s stage=%s exception_type=%s",
                payment.razorpay_order_id,
                payment.razorpay_payment_id,
                stage,
                type(error).__name__,
            )
            raise HTTPException(
                status_code=500,
                detail="Unable to verify rental payment. Please contact support if payment was deducted.",
            ) from None

    return guarded


@app.post("/rental/payment/verify")
@rental_verification_guard
def verify_rental_payment(
    payment: RentalPaymentVerification,
    request: Request
):
    order_id = payment.razorpay_order_id
    payment_id = payment.razorpay_payment_id
    request.state.rental_verify_stage = "payment record lookup"
    rental_logger.info(
        "RENTAL VERIFY START order_id=%s payment_id=%s",
        order_id,
        payment_id,
    )
    enforce_rate_limit(request, "rental-payment-verify", 20, 60)
    current_user = require_current_user(request)
    conn = get_connection()

    payment_record = conn.execute(
        """
        SELECT *
        FROM rental_payments
        WHERE razorpay_order_id = ?
        """,
        (payment.razorpay_order_id,)
    ).fetchone()

    conn.close()

    if payment_record is None:
        rental_logger.info(
            "RENTAL VERIFY payment record=not_found order_id=%s",
            order_id,
        )
        raise HTTPException(
            status_code=404,
            detail="Rental Razorpay order not found"
        )

    rental_logger.info(
        "RENTAL VERIFY payment record=found order_id=%s status=%s",
        order_id,
        payment_record["status"],
    )

    if payment_record["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Rental Razorpay order not found")

    if payment_record["status"] == "PAID":
        existing_conn = get_connection()
        try:
            existing_rental = rental_verification_response(existing_conn, order_id)
        finally:
            existing_conn.close()
        if existing_rental is None:
            raise HTTPException(
                status_code=409,
                detail="Rental payment is marked PAID, but its rental record was not found.",
            )
        rental_logger.info(
            "RENTAL VERIFY already_processed order_id=%s rental_id=%s",
            order_id,
            existing_rental["rental_id"],
        )
        return existing_rental

    # --------------------------------------------------
    # VERIFY SIGNATURE
    # --------------------------------------------------

    request.state.rental_verify_stage = "signature verification"
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        (
            payment.razorpay_order_id
            + "|"
            + payment.razorpay_payment_id
        ).encode(),
        digestmod="sha256"
    ).hexdigest()

    signature_valid = hmac.compare_digest(
        generated_signature,
        payment.razorpay_signature
    )
    rental_logger.info(
        "RENTAL VERIFY signature result=%s order_id=%s",
        "valid" if signature_valid else "invalid",
        order_id,
    )
    if not signature_valid:
        raise HTTPException(
            status_code=400,
            detail="Rental payment signature verification failed"
        )

    # --------------------------------------------------
    # FETCH PAYMENT FROM RAZORPAY
    # --------------------------------------------------

    request.state.rental_verify_stage = "Razorpay payment fetch"
    try:
        razorpay_payment = (
            razorpay_client.payment.fetch(
                payment.razorpay_payment_id
            )
        )

    except Exception as error:
        rental_logger.error(
            "RENTAL VERIFY fetch failed order_id=%s payment_id=%s exception_type=%s",
            order_id,
            payment_id,
            type(error).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch the Razorpay payment status.",
        ) from None

    actual_amount = razorpay_payment.get("amount")
    fetched_order_id = razorpay_payment.get("order_id")
    payment_status = razorpay_payment.get("status")
    rental_logger.info(
        "RENTAL VERIFY payment fetch result=success order_id=%s payment_id=%s status=%s",
        order_id,
        payment_id,
        payment_status,
    )

    # --------------------------------------------------
    # CHECK ORDER
    # --------------------------------------------------

    if fetched_order_id != order_id:
        raise HTTPException(
            status_code=400,
            detail="Payment does not belong to this rental order"
        )

    # --------------------------------------------------
    # CHECK AMOUNT
    # --------------------------------------------------

    expected_amount = int(
        round(
            payment_record["total_amount"] * 100
        )
    )
    rental_logger.info(
        "RENTAL VERIFY amount expected=%s actual=%s order_id=%s",
        expected_amount,
        actual_amount,
        order_id,
    )

    if actual_amount != expected_amount:
        raise HTTPException(
            status_code=400,
            detail="Rental payment amount mismatch"
        )

    # --------------------------------------------------
    # CAPTURE PAYMENT IF NECESSARY
    # --------------------------------------------------

    if payment_status == "authorized":
        request.state.rental_verify_stage = "Razorpay payment capture"
        try:
            razorpay_payment = (
                razorpay_client.payment.capture(
                    payment.razorpay_payment_id,
                    expected_amount
                )
            )

            payment_status = (
                razorpay_payment.get("status")
            )

        except Exception as error:
            rental_logger.error(
                "RENTAL VERIFY capture failed order_id=%s payment_id=%s exception_type=%s",
                order_id,
                payment_id,
                type(error).__name__,
            )
            raise HTTPException(
                status_code=502,
                detail="Razorpay authorized the payment, but capture failed.",
            ) from None

        rental_logger.info(
            "RENTAL VERIFY capture result=success order_id=%s payment_id=%s status=%s",
            order_id,
            payment_id,
            payment_status,
        )

    if payment_status != "captured":
        request.state.rental_verify_stage = "recording uncaptured payment"

        conn = get_connection()

        conn.execute(
            """
            UPDATE rental_payments
            SET
                status = ?,
                razorpay_payment_id = ?
            WHERE razorpay_order_id = ?
            """,
            (
                "FAILED",
                payment.razorpay_payment_id,
                payment.razorpay_order_id
            )
        )

        conn.commit()
        conn.close()

        raise HTTPException(
            status_code=400,
            detail=(
                "Rental payment is not captured. "
                f"Current status: {payment_status}"
            )
        )

    # --------------------------------------------------
    # CREATE MEMBERSHIP + RENTAL
    # --------------------------------------------------

    request.state.rental_verify_stage = "rental database transaction"
    conn = get_connection()
    request.state.rental_verify_connection = conn
    conn.execute("BEGIN IMMEDIATE")
    locked_payment = conn.execute(
        "SELECT * FROM rental_payments WHERE razorpay_order_id = ?",
        (order_id,),
    ).fetchone()
    if locked_payment is None:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=404, detail="Rental Razorpay order not found")
    if locked_payment["user_id"] is not None and (
        current_user is None or current_user["id"] != locked_payment["user_id"]
    ):
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=404, detail="Rental Razorpay order not found")
    if locked_payment["status"] == "PAID":
        existing_rental = rental_verification_response(conn, order_id)
        conn.rollback()
        conn.close()
        if existing_rental is None:
            raise HTTPException(
                status_code=409,
                detail="Rental payment is marked PAID, but its rental record was not found.",
            )
        rental_logger.info(
            "RENTAL VERIFY duplicate request order_id=%s rental_id=%s",
            order_id,
            existing_rental["rental_id"],
        )
        return existing_rental

    payment_record = locked_payment
    request.state.rental_verify_stage = "product lookup"

    product = conn.execute(
        """
        SELECT
            id,
            name,
            rental_price,
            ownership_price,
            rental_duration_days
        FROM products
        WHERE id = ?
        """,
        (
            payment_record["product_id"],
        )
    ).fetchone()
    rental_logger.info(
        "RENTAL VERIFY product lookup result=%s product_id=%s order_id=%s",
        "found" if product is not None else "not_found",
        payment_record["product_id"],
        order_id,
    )

    if product is None:
        conn.close()

        raise HTTPException(
            status_code=404,
            detail="Rental product not found"
        )

    reader_type = normalize_reader_type(payment_record["reader_type"])
    user_id = payment_record["user_id"]
    customer_id = f"user_{user_id}" if user_id is not None else "demo_customer"

    # Check existing active membership
    if user_id is not None:
        membership = conn.execute(
            """
            SELECT * FROM memberships
            WHERE user_id = ? AND status = 'ACTIVE'
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,)
        ).fetchone()
    else:
        membership = conn.execute(
            """
            SELECT * FROM memberships
            WHERE customer_id = ? AND user_id IS NULL AND status = 'ACTIVE'
            ORDER BY id DESC LIMIT 1
            """,
            (customer_id,)
        ).fetchone()

    plan_name = "Regular Reader" if reader_type == "REGULAR_READER" else "Specific Book Reader"
    membership_expires_at = get_membership_expiry(reader_type)

    if membership is None:
        request.state.rental_verify_stage = "membership creation"

        membership_cursor = conn.execute(
            """
            INSERT INTO memberships
            (
                customer_id,
                user_id,
                plan_name,
                monthly_fee,
                reader_type,
                membership_fee,
                membership_expires_at,
                status,
                start_date,
                next_billing_date
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                DATE('now'),
                DATE('now', '+1 month')
            )
            """,
            (
                customer_id,
                user_id,
                plan_name,
                payment_record["membership_fee"],
                reader_type,
                payment_record["membership_fee"],
                membership_expires_at.strftime("%Y-%m-%d %H:%M:%S"),
                "ACTIVE"
            )
        )

        membership_id = (
            membership_cursor.lastrowid
        )
        rental_logger.info(
            "RENTAL VERIFY membership created membership_id=%s order_id=%s",
            membership_id,
            order_id,
        )

    else:
        request.state.rental_verify_stage = "membership reuse"
        membership_id = membership["id"]
        conn.execute(
            "UPDATE memberships SET reader_type = ?, plan_name = ?, membership_fee = ?, membership_expires_at = ? WHERE id = ?",
            (
                reader_type,
                plan_name,
                payment_record["membership_fee"],
                membership_expires_at.strftime("%Y-%m-%d %H:%M:%S"),
                membership_id,
            ),
        )
        rental_logger.info(
            "RENTAL VERIFY membership reused membership_id=%s order_id=%s",
            membership_id,
            order_id,
        )

    # Rental duration
    duration_days = int(
        product["rental_duration_days"] or 30
    )

    # Create rental
    request.state.rental_verify_stage = "rental creation"
    rental_cursor = conn.execute(
        """
        INSERT INTO rentals
        (
            user_id,
            customer_id,
            product_id,
            membership_id,
            rental_payment_id,
            reader_type,
            rental_fee,
            ownership_price,
            membership_fee,
            refund_amount,
            refund_status,
            rental_start_date,
            rental_end_date,
            status,
            delivery_status,
            customer_decision,
            payment_status
        )
        VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            DATE('now'),
            DATE('now', '+' || ? || ' days'),
            ?,
            ?,
            ?,
            ?
        )
        """,
        (
            user_id,
            customer_id,
            payment_record["product_id"],
            membership_id,
            payment_record["id"],
            reader_type,
            payment_record["rental_fee"],
            product["ownership_price"] or 0,
            payment_record["membership_fee"],
            0,
            "NOT_REQUESTED",
            duration_days,
            "ACTIVE",
            "PENDING",
            "PENDING",
            "PAID"
        )
    )

    rental_id = rental_cursor.lastrowid
    rental_logger.info(
        "RENTAL VERIFY rental created rental_id=%s membership_id=%s order_id=%s",
        rental_id,
        membership_id,
        order_id,
    )

    # Mark rental payment paid
    conn.execute(
        """
        UPDATE rental_payments
        SET
            status = ?,
            razorpay_payment_id = ?
        WHERE razorpay_order_id = ?
        """,
        (
            "PAID",
            payment.razorpay_payment_id,
            payment.razorpay_order_id
        )
    )

    request.state.rental_verify_stage = "database commit"
    conn.commit()
    conn.close()
    request.state.rental_verify_connection = None
    rental_logger.info(
        "RENTAL VERIFY final database commit order_id=%s rental_id=%s payment_status=PAID",
        order_id,
        rental_id,
    )

    # ---- Rental payment & activation notifications ----
    notif_user_id = payment_record["user_id"]
    if notif_user_id:
        notif_conn = get_connection()
        try:
            create_notification(
                notif_conn,
                notif_user_id,
                "rental_payment",
                "Rental payment successful 💳",
                f"Your rental payment of ₹{payment_record['total_amount']:,.0f} has been verified.",
                rental_id=rental_id,
            )
            create_notification(
                notif_conn,
                notif_user_id,
                "rental_activated",
                "Rental activated 📚",
                f"Your rental of \"{product['name']}\" is now active. We'll deliver it to you shortly.",
                rental_id=rental_id,
            )
            notif_conn.commit()
        except Exception as error:
            notif_conn.rollback()
            rental_logger.error(
                "RENTAL VERIFY notification failed order_id=%s rental_id=%s exception_type=%s",
                order_id,
                rental_id,
                type(error).__name__,
            )
        finally:
            notif_conn.close()

    return {
        "success": True,
        "rental_id": rental_id,
        "membership_id": membership_id,

        "product": product["name"],
        "quantity": payment_record["quantity"],

        "membership_fee": payment_record[
            "membership_fee"
        ],

        "rental_fee": payment_record[
            "rental_fee"
        ],

        "reader_type": reader_type,

        "total_amount": payment_record[
            "total_amount"
        ],

        "rental_duration_days": duration_days,

        "rental_status": "ACTIVE",
        "delivery_status": "PENDING",
        "customer_decision": "PENDING",

        "ownership_price": (
            product["ownership_price"] or 0
        ),

        "payment_status": "PAID",

        "razorpay_payment_id": (
            payment.razorpay_payment_id
        )
    }
# ============================================================
# COMPLETE RETURN + RAZORPAY REFUND
# ============================================================

@app.post("/rentals/{rental_id}/return/complete")
def complete_rental_return(
    rental_id: int,
    request: Request
):
    current_user = require_admin_user(request)
    conn = get_connection()

    rental = conn.execute(
        """
        SELECT
            rentals.*,
            products.name AS product_name
        FROM rentals
        JOIN products
            ON rentals.product_id = products.id
        WHERE rentals.id = ?
        """,
        (rental_id,)
    ).fetchone()

    if rental is None:
        conn.close()

        raise HTTPException(
            status_code=404,
            detail="Rental not found"
        )

    ensure_rental_access(rental, current_user)

    # --------------------------------------------------------
    # Must have requested return
    # --------------------------------------------------------

    if rental["customer_decision"] != "RETURN":
        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Customer has not requested a return"
        )

    reader_type = normalize_reader_type(rental["reader_type"])
    refund_amount = get_reader_refund_amount(reader_type)

    # --------------------------------------------------------
    # Prevent duplicate refund or duplicate completion
    # --------------------------------------------------------

    if rental["refund_status"] == "PROCESSED":
        conn.close()

        return {
            "success": True,
            "message": "Refund has already been processed",
            "rental_id": rental_id,
            "refund_amount": rental["refund_amount"],
            "refund_status": "PROCESSED",
            "refund_payment_id": rental["refund_payment_id"]
        }

    if rental["refund_status"] == "NOT_APPLICABLE":
        conn.execute(
            """
            UPDATE rentals
            SET
                status = ?,
                delivery_status = ?,
                refund_amount = ?,
                refund_status = ?
            WHERE id = ?
            """,
            (
                "RETURNED",
                "RETURN_RECEIVED",
                0,
                "NOT_APPLICABLE",
                rental_id,
            )
        )
        conn.commit()
        conn.close()
        return {
            "success": True,
            "rental_id": rental_id,
            "product": rental["product_name"],
            "status": "RETURNED",
            "refund_amount": 0,
            "refund_status": "NOT_APPLICABLE",
            "message": "Book returned successfully. Regular Reader memberships do not receive a refund.",
        }

    # --------------------------------------------------------
    # Get original Razorpay payment
    # --------------------------------------------------------

    payment = conn.execute(
        """
        SELECT
            rental_payments.id AS payment_id,
            rental_payments.razorpay_payment_id,
            rental_payments.total_amount,
            rental_payments.status
        FROM rental_payments
        JOIN rentals
            ON rentals.rental_payment_id = rental_payments.id
        WHERE rentals.id = ?
        AND rental_payments.status = 'PAID'
        """,
        (rental_id,)
    ).fetchone()

    if payment is None:
        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Original rental payment not found"
        )

    if not payment["razorpay_payment_id"]:
        conn.close()

        raise HTTPException(
            status_code=400,
            detail="Original Razorpay payment ID not available"
        )

    # --------------------------------------------------------
    # Razorpay refund for specific-book readers only
    # --------------------------------------------------------

    refund_id = None
    try:
        if refund_amount > 0:
            refund = razorpay_client.payment.refund(
                payment["razorpay_payment_id"],
                {
                    "amount": refund_amount * 100
                }
            )
            refund_id = refund.get("id")
    except Exception as error:
        logging.getLogger("bookvision.payment").error("Razorpay refund failed (%s)", type(error).__name__)
        conn.close()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to process ₹{refund_amount} refund"
        )

    # --------------------------------------------------------
    # Update rental
    # --------------------------------------------------------

    conn.execute(
        """
        UPDATE rentals
        SET
            status = ?,
            delivery_status = ?,
            refund_amount = ?,
            refund_status = ?,
            refund_payment_id = ?
        WHERE id = ?
        """,
        (
            "RETURNED",
            "RETURN_RECEIVED",
            refund_amount,
            "PROCESSED",
            refund_id,
            rental_id
        )
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO refunds
            (user_id, rental_id, payment_id, amount, status, razorpay_refund_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            rental["user_id"],
            rental_id,
            payment["payment_id"],
            refund_amount,
            "PROCESSED",
            refund_id
        )
    )

    conn.commit()
    conn.close()

    # ---- Return received + refund notifications ----
    notif_user_id = rental["user_id"]
    if notif_user_id:
        notif_conn = get_connection()
        create_notification(
            notif_conn,
            notif_user_id,
            "return_received",
            "Book return received 📦",
            f"We've received your returned copy of \"{rental['product_name']}\". Your refund is being processed.",
            rental_id=rental_id,
        )
        create_notification(
            notif_conn,
            notif_user_id,
            "refund_processed",
            f"Refund processed ₹{refund_amount} ✅",
            f"Your ₹{refund_amount} refund has been successfully processed. It will appear in your account within 5–7 business days.",
            rental_id=rental_id,
        )
        notif_conn.commit()
        notif_conn.close()

    return {
        "success": True,
        "rental_id": rental_id,
        "product": rental["product_name"],
        "status": "RETURNED",
        "refund_amount": refund_amount,
        "refund_status": "PROCESSED",
        "refund_payment_id": refund_id,
        "message": f"Book returned successfully. ₹{refund_amount} has been refunded."
    }


# ===========================================================================
# NOTIFICATIONS
# ===========================================================================

@app.get("/notifications")
def get_notifications(request: Request):
    """
    Return the 50 most recent notifications for the current user.
    Requires a valid session cookie.
    """
    user = require_current_user(request)
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            id,
            type,
            title,
            message,
            related_order_id,
            related_rental_id,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
        """,
        (user["id"],),
    ).fetchall()

    conn.close()

    return {
        "notifications": [dict(row) for row in rows]
    }


@app.get("/notifications/unread-count")
def get_unread_count(request: Request):
    """
    Return the count of unread notifications for the current user.
    Returns 0 (not 401) when the user is not authenticated so the
    frontend can safely poll without requiring a login.
    """
    user = optional_current_user(request)
    if user is None:
        return {"unread_count": 0}

    conn = get_connection()
    row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0",
        (user["id"],),
    ).fetchone()
    conn.close()

    return {"unread_count": row["cnt"] if row else 0}


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, request: Request):
    """Mark a single notification as read."""
    user = require_current_user(request)
    conn = get_connection()

    cursor = conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notification_id, user["id"]),
    )
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True}


@app.patch("/notifications/read-all")
def mark_all_notifications_read(request: Request):
    """Mark every unread notification for the current user as read."""
    user = require_current_user(request)
    conn = get_connection()

    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        (user["id"],),
    )
    conn.commit()
    conn.close()

    return {"success": True}


# ===========================================================================
# SERVICE LOCATIONS
# ===========================================================================

@app.get("/locations")
def get_locations():
    """Return all active Jnana Nidhi Hubballi service/pickup locations."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, name, area, city, pincode
        FROM locations
        WHERE is_active = 1
        ORDER BY sort_order, id
        """
    ).fetchall()
    conn.close()
    return {"locations": [dict(r) for r in rows]}
