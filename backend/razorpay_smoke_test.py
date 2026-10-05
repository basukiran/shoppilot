"""Isolated purchase/rental/refund smoke test using a temporary SQLite file.

Razorpay is mocked; no network payment calls are made and no project database
is opened or modified. Run with the backend virtualenv Python executable.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="bookvision-razorpay-smoke-", ignore_cleanup_errors=True) as temp_dir:
        def check(ok: bool, label: str) -> None:
            if not ok:
                raise AssertionError(label)
            print(f"PASS {label}")

        os.environ["DATABASE_URL"] = ""
        os.environ["APP_ENV"] = "development"
        os.environ["RAZORPAY_KEY_ID"] = "rzp_test_bookvision_smoke"
        secret = f"smoke-only-{uuid.uuid4().hex}"
        os.environ["RAZORPAY_KEY_SECRET"] = secret
        sys.path.insert(0, str(Path(__file__).parent))

        import database

        database._SQLITE_PATH = Path(temp_dir) / "smoke.sqlite3"

        production_env = os.environ.copy()
        production_env["APP_ENV"] = "production"
        production_env["RAZORPAY_KEY_ID"] = "rzp_test_production_guard"
        production_env["RAZORPAY_KEY_SECRET"] = "smoke-only-not-a-real-secret"
        # Import-time production guards run before any database connection;
        # give the process a nonconnecting PostgreSQL-shaped URL so this check
        # reaches the Razorpay live-key guard independently.
        production_env["DATABASE_URL"] = "postgresql://smoke.invalid/bookvision_test"
        guard = subprocess.run(
            [sys.executable, "-c", "import main"],
            cwd=Path(__file__).parent,
            env=production_env,
            text=True,
            capture_output=True,
            check=False,
        )
        check(guard.returncode != 0 and "Production requires a Razorpay live key ID" in guard.stderr, "production rejects Razorpay test key IDs")

        import main as app_module
        from fastapi.testclient import TestClient

        class FakeRazorpay:
            def __init__(self):
                self.orders = {}
                self.payment_orders = {}
                self.mismatch_next_amount = False
                self.refund_called = False
                self.capture_called = False
                self.order = self.Order(self)
                self.payment = self.Payment(self)

            class Order:
                def __init__(self, owner):
                    self.owner = owner

                def create(self, data):
                    order_id = f"order_smoke_{uuid.uuid4().hex}"
                    self.owner.orders[order_id] = data
                    return {"id": order_id, **data}

            class Payment:
                def __init__(self, owner):
                    self.owner = owner

                def fetch(self, payment_id):
                    order_id = self.owner.payment_orders[payment_id]
                    order = self.owner.orders[order_id]
                    amount = order["amount"]
                    if self.owner.mismatch_next_amount:
                        self.owner.mismatch_next_amount = False
                        amount += 100
                    return {"id": payment_id, "order_id": order_id, "amount": amount, "status": "authorized"}

                def capture(self, payment_id, amount):
                    self.owner.capture_called = True
                    return {"id": payment_id, "amount": amount, "status": "captured"}

                def refund(self, payment_id, data):
                    self.owner.refund_called = True
                    return {"id": f"rfnd_smoke_{uuid.uuid4().hex}", **data}

            def payment_id(self, order_id):
                payment_id = f"pay_smoke_{uuid.uuid4().hex}"
                self.payment_orders[payment_id] = order_id
                return payment_id

        gateway = FakeRazorpay()
        app_module.razorpay_client = gateway

        def signature(order_id: str, payment_id: str) -> str:
            body = f"{order_id}|{payment_id}".encode()
            return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

        with TestClient(app_module.app) as client:
            health = client.get("/health")
            check(health.status_code == 200 and health.json().get("status") == "healthy", "health endpoint")
            books = client.get("/products")
            check(books.status_code == 200 and bool(books.json()), "book seed data")
            check(client.get("/orders").status_code == 401, "orders require authentication")
            check(client.get("/rentals").status_code == 401, "rentals require authentication")
            check(client.post("/payment/create", params={"product_id": 1, "quantity": 1}).status_code == 401, "checkout requires authentication")
            check(client.post("/auth/logout", headers={"Origin": "https://attacker.example"}).status_code == 403, "cross-origin state changes rejected")
            book = next(item for item in books.json() if int(item.get("stock") or 0) > 0)

            marker = uuid.uuid4().hex
            account = {
                "name": "Smoke Test Customer",
                "email": f"smoke-{marker}@example.invalid",
                "phone": "+919000000001",
                "password": f"Smoke!{marker}",
            }
            check(client.post("/auth/register", json=account).status_code == 201, "user creation")
            client.post("/auth/logout")
            check(client.post("/auth/login", json={"email": account["email"], "password": account["password"]}).status_code == 200, "login")
            check(client.post(f"/favorites/{book['id']}").status_code == 201, "favorite creation")
            check(bool(client.get("/favorites").json()), "favorite retrieval")

            conn = database.get_connection()
            before_orders = conn.execute("SELECT COUNT(*) AS count FROM orders").fetchone()["count"]
            conn.close()
            check(client.post("/order/confirm", params={"product_id": book["id"], "quantity": 1, "approved": "true"}).status_code == 409, "legacy unpaid-order path blocked")

            payment_order = client.post("/payment/create", params={"product_id": book["id"], "quantity": 1})
            check(payment_order.status_code == 200, "Razorpay purchase order creation")
            order_id = payment_order.json()["razorpay_order_id"]
            payment_id = gateway.payment_id(order_id)
            verified = client.post("/payment/verify", json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature(order_id, payment_id),
            })
            check(verified.status_code == 200 and verified.json().get("success"), "signature and amount verification")
            check(gateway.capture_called, "authorized payment capture")
            conn = database.get_connection()
            after_orders = conn.execute("SELECT COUNT(*) AS count FROM orders").fetchone()["count"]
            conn.close()
            check(after_orders == before_orders + 1, "local order created only after successful payment")

            bad_signature_order = client.post("/payment/create", params={"product_id": book["id"], "quantity": 1}).json()["razorpay_order_id"]
            bad_signature_payment = gateway.payment_id(bad_signature_order)
            bad_signature = client.post("/payment/verify", json={
                "razorpay_order_id": bad_signature_order,
                "razorpay_payment_id": bad_signature_payment,
                "razorpay_signature": "invalid-signature",
            })
            check(bad_signature.status_code == 400, "invalid payment signature rejected")

            mismatch_order = client.post("/payment/create", params={"product_id": book["id"], "quantity": 1}).json()["razorpay_order_id"]
            mismatch_payment = gateway.payment_id(mismatch_order)
            gateway.mismatch_next_amount = True
            mismatch = client.post("/payment/verify", json={
                "razorpay_order_id": mismatch_order,
                "razorpay_payment_id": mismatch_payment,
                "razorpay_signature": signature(mismatch_order, mismatch_payment),
            })
            check(mismatch.status_code == 400, "payment amount mismatch rejected")
            conn = database.get_connection()
            final_order_count = conn.execute("SELECT COUNT(*) AS count FROM orders").fetchone()["count"]
            conn.close()
            check(final_order_count == before_orders + 1, "no order created for rejected payments")

            rental_book = next(item for item in books.json() if int(item.get("is_rentable") or 0) == 1 and int(item.get("stock") or 0) > 0)
            rental_order_response = client.post("/rental/payment/create", params={
                "product_id": rental_book["id"], "quantity": 1, "reader_type": "SPECIFIC_BOOK_READER",
            })
            check(rental_order_response.status_code == 200, "rental payment order creation")
            rental_order = rental_order_response.json()["razorpay_order_id"]
            rental_payment = gateway.payment_id(rental_order)
            rental_verified = client.post("/rental/payment/verify", json={
                "razorpay_order_id": rental_order,
                "razorpay_payment_id": rental_payment,
                "razorpay_signature": signature(rental_order, rental_payment),
            })
            check(rental_verified.status_code == 200 and rental_verified.json().get("success"), "rental signature, amount, and capture verification")
            rental_id = rental_verified.json()["rental_id"]
            conn = database.get_connection()
            membership_count = conn.execute("SELECT COUNT(*) AS count FROM memberships").fetchone()["count"]
            conn.execute("UPDATE rentals SET delivery_status = 'DELIVERED' WHERE id = ?", (rental_id,))
            conn.commit()
            conn.close()
            check(membership_count > 0, "membership payment persistence")

            other_account = {
                "name": "Other Smoke Customer",
                "email": f"other-{uuid.uuid4().hex}@example.invalid",
                "phone": "+919000000002",
                "password": f"Other!{uuid.uuid4().hex}",
            }
            with TestClient(app_module.app) as other_client:
                check(other_client.post("/auth/register", json=other_account).status_code == 201, "second customer account")
                check(other_client.get("/orders").json() == [], "customers only see their own orders")
                check(other_client.get("/rentals").json()["rentals"] == [], "customers only see their own rentals")
                other_overview = other_client.get("/account/overview").json()
                check(not other_overview["orders"] and not other_overview["rentals"] and not other_overview["payments"], "account overview is isolated")
                check(other_client.get(f"/rentals/{rental_id}").status_code == 404, "rental details enforce ownership")
                other_verify = other_client.post("/payment/verify", json={
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature(order_id, payment_id),
                })
                check(other_verify.status_code == 404, "payment verification enforces ownership")
                check(other_client.get("/admin/customers").status_code == 403, "customer data requires admin")

            decision = client.patch(f"/rentals/{rental_id}/decision", json={"decision": "RETURN"})
            check(decision.status_code == 200, "rental return request")
            check(client.post(f"/rentals/{rental_id}/return/complete").status_code == 403, "refund completion requires admin")
            conn = database.get_connection()
            conn.execute("UPDATE users SET role = 'ADMIN' WHERE email = ?", (account["email"],))
            conn.commit()
            conn.close()
            refund = client.post(f"/rentals/{rental_id}/return/complete")
            check(refund.status_code == 200 and refund.json().get("refund_status") == "PROCESSED" and gateway.refund_called, "refund request and persistence")

    print("Smoke test completed. Temporary SQLite file removed; no real Razorpay calls made.")


if __name__ == "__main__":
    main()
