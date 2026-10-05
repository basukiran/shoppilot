"""Safe PostgreSQL integration smoke test for an explicitly disposable database.

Configure BOOKVISION_TEST_DATABASE_URL in backend/.env. The target database
name must contain "test", "sandbox", "disposable", or "smoke". This script
never drops a database or deletes rows. Razorpay is replaced with a local fake.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path
from urllib.parse import unquote, urlsplit

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).parent
load_dotenv(BACKEND_DIR / ".env")


def _target_identity(url: str) -> tuple[str, str, int | None, str]:
    parsed = urlsplit(url)
    return (
        parsed.scheme.casefold(),
        (parsed.hostname or "").casefold(),
        parsed.port,
        unquote(parsed.path.lstrip("/")),
    )


def _test_database_url() -> str:
    test_url = os.getenv("BOOKVISION_TEST_DATABASE_URL", "").strip()
    if not test_url:
        raise RuntimeError("Set BOOKVISION_TEST_DATABASE_URL in backend/.env to a disposable PostgreSQL database.")
    identity = _target_identity(test_url)
    if not re.search(r"test|sandbox|disposable|smoke", identity[3], re.IGNORECASE):
        raise RuntimeError("Refusing to test: database name must include test, sandbox, disposable, or smoke.")
    production_url = os.getenv("DATABASE_URL", "").strip()
    if production_url and identity == _target_identity(production_url):
        raise RuntimeError("Refusing to test: test URL matches DATABASE_URL.")
    if identity[0] not in {"postgres", "postgresql"}:
        raise RuntimeError("BOOKVISION_TEST_DATABASE_URL must be a PostgreSQL URL.")
    return test_url


def _run_migrations(test_url: str) -> None:
    child_env = os.environ.copy()
    child_env["DATABASE_URL"] = test_url
    child_env["APP_ENV"] = "development"
    for arguments in (["migrate.py"], ["migrate.py", "--check"]):
        result = subprocess.run(
            [sys.executable, str(BACKEND_DIR / arguments[0]), *arguments[1:]],
            cwd=BACKEND_DIR,
            env=child_env,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            safe_output = (result.stdout + result.stderr).replace(test_url, "[test database URL redacted]")
            raise RuntimeError(f"Migration command failed ({' '.join(arguments)}):\n{safe_output}")
        print(f"PASS migrations {'applied' if len(arguments) == 1 else 'verified'}")


class _FakeRazorpayOrders:
    def __init__(self, owner):
        self.owner = owner

    def create(self, data):
        order_id = f"order_smoke_{uuid.uuid4().hex}"
        self.owner.orders[order_id] = dict(data)
        return {"id": order_id, **data}


class _FakeRazorpayPayments:
    def __init__(self, owner):
        self.owner = owner

    def fetch(self, payment_id):
        order_id = self.owner.payment_orders[payment_id]
        order = self.owner.orders[order_id]
        return {
            "id": payment_id,
            "order_id": order_id,
            "amount": order["amount"],
            "status": "captured",
        }

    def capture(self, payment_id, amount):
        return {"id": payment_id, "amount": amount, "status": "captured"}

    def refund(self, payment_id, data):
        return {"id": f"rfnd_smoke_{uuid.uuid4().hex}", "payment_id": payment_id, **data}


class _FakeRazorpayClient:
    def __init__(self):
        self.orders = {}
        self.payment_orders = {}
        self.order = _FakeRazorpayOrders(self)
        self.payment = _FakeRazorpayPayments(self)

    def payment_id_for(self, order_id):
        payment_id = f"pay_smoke_{uuid.uuid4().hex}"
        self.payment_orders[payment_id] = order_id
        return payment_id


def _expect(condition: bool, stage: str) -> None:
    if not condition:
        raise AssertionError(f"Verification failed: {stage}")
    print(f"PASS {stage}")


def _sign(order_id: str, payment_id: str, secret: str) -> str:
    message = f"{order_id}|{payment_id}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def main() -> int:
    test_url = _test_database_url()
    _run_migrations(test_url)

    # Use isolated fake credentials and a fake gateway; no external payment is
    # created, captured, or refunded by this test.
    os.environ["DATABASE_URL"] = test_url
    os.environ["APP_ENV"] = "development"
    os.environ["RAZORPAY_KEY_ID"] = "rzp_test_bookvision_smoke"
    test_secret = f"bookvision-smoke-{uuid.uuid4().hex}"
    os.environ["RAZORPAY_KEY_SECRET"] = test_secret
    sys.path.insert(0, str(BACKEND_DIR))

    import database
    import main as app_module
    from fastapi.testclient import TestClient

    fake_razorpay = _FakeRazorpayClient()
    app_module.razorpay_client = fake_razorpay

    with TestClient(app_module.app) as client:
        books_response = client.get("/products")
        _expect(books_response.status_code == 200, "database connection and books endpoint")
        books = books_response.json()
        _expect(bool(books), "PostgreSQL book seed data")

        marker = uuid.uuid4().hex
        account = {
            "name": "PostgreSQL Smoke Test",
            "email": f"pg-smoke-{marker}@example.invalid",
            "phone": "+919000000001",
            "password": f"Smoke!{marker}",
        }
        register = client.post("/auth/register", json=account)
        _expect(register.status_code == 201, "user creation")
        client.post("/auth/logout")
        login = client.post("/auth/login", json={"email": account["email"], "password": account["password"]})
        _expect(login.status_code == 200, "login")
        profile = client.get("/auth/me")
        _expect(profile.status_code == 200 and profile.json()["user"]["email"] == account["email"], "authenticated profile")

        book = books[0]
        favorite = client.post(f"/favorites/{book['id']}")
        _expect(favorite.status_code in {200, 201}, "favorites relationship")
        favorite_list = client.get("/favorites")
        _expect(favorite_list.status_code == 200 and bool(favorite_list.json()), "favorites read")

        purchase_book = next((item for item in books if int(item.get("stock") or 0) > 0), None)
        _expect(purchase_book is not None, "book inventory available")
        purchase = client.post("/payment/create", params={"product_id": purchase_book["id"], "quantity": 1})
        _expect(purchase.status_code == 200, "purchase payment order creation")
        purchase_order = purchase.json()["razorpay_order_id"]
        purchase_payment = fake_razorpay.payment_id_for(purchase_order)
        purchase_verify = client.post("/payment/verify", json={
            "razorpay_order_id": purchase_order,
            "razorpay_payment_id": purchase_payment,
            "razorpay_signature": _sign(purchase_order, purchase_payment, test_secret),
        })
        _expect(purchase_verify.status_code == 200 and purchase_verify.json().get("success"), "backend-verified purchase payment and order")

        rental_book = next((item for item in books if int(item.get("is_rentable") or 0) == 1 and int(item.get("stock") or 0) > 0), None)
        _expect(rental_book is not None, "rental book seed data")
        rental_create = client.post("/rental/payment/create", params={
            "product_id": rental_book["id"], "quantity": 1, "reader_type": "SPECIFIC_BOOK_READER",
        })
        _expect(rental_create.status_code == 200, "rental payment order creation")
        rental_order = rental_create.json()["razorpay_order_id"]
        rental_payment = fake_razorpay.payment_id_for(rental_order)
        rental_verify = client.post("/rental/payment/verify", json={
            "razorpay_order_id": rental_order,
            "razorpay_payment_id": rental_payment,
            "razorpay_signature": _sign(rental_order, rental_payment, test_secret),
        })
        _expect(rental_verify.status_code == 200 and rental_verify.json().get("success"), "backend-verified rental payment")
        rental_id = rental_verify.json()["rental_id"]

        conn = database.get_connection()
        try:
            counts = {}
            for table, condition in (
                ("orders", "user_id = ?"),
                ("razorpay_payments", "user_id = ?"),
                ("rental_payments", "user_id = ?"),
                ("memberships", "user_id = ?"),
                ("rentals", "user_id = ?"),
            ):
                counts[table] = conn.execute(
                    f"SELECT COUNT(*) AS count FROM {table} WHERE {condition}",
                    (profile.json()["user"]["id"],),
                ).fetchone()["count"]
            rental_locations = conn.execute(
                "SELECT COUNT(*) AS count FROM locations"
            ).fetchone()["count"]
            conn.execute("UPDATE rentals SET delivery_status = 'DELIVERED' WHERE id = ?", (rental_id,))
            conn.commit()
        finally:
            conn.close()
        _expect(all(counts[name] > 0 for name in counts), "orders, payments, memberships, and rentals persistence")
        _expect(rental_locations > 0, "service location seed data")

        decision = client.patch(f"/rentals/{rental_id}/decision", json={"decision": "RETURN"})
        _expect(decision.status_code == 200, "return request")
        returned = client.post(f"/rentals/{rental_id}/return/complete")
        _expect(returned.status_code == 200 and returned.json().get("refund_status") == "PROCESSED", "refund processing")

        conn = database.get_connection()
        try:
            refund_count = conn.execute(
                "SELECT COUNT(*) AS count FROM refunds WHERE rental_id = ?", (rental_id,)
            ).fetchone()["count"]
            fk_violations = conn.execute(
                """
                SELECT COUNT(*) AS count
                FROM pg_constraint AS constraint_row
                JOIN pg_class AS source ON source.oid = constraint_row.conrelid
                JOIN pg_namespace AS source_schema ON source_schema.oid = source.relnamespace
                WHERE constraint_row.contype = 'f'
                  AND NOT constraint_row.convalidated
                  AND source_schema.nspname = current_schema()
                """
            ).fetchone()["count"]
        finally:
            conn.close()
        _expect(refund_count == 1, "refund record relationship")
        _expect(fk_violations == 0, "foreign keys validated")

    print("PostgreSQL smoke verification completed. No database or production records were deleted.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"PostgreSQL smoke verification failed: {type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(1)
