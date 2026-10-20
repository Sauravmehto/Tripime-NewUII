"""Email + password customer accounts, sign-in throttling and account-based booking ownership."""

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import jwt
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.models.admin_ops import CustomerLogin
from app.routes import admin as admin_routes
from app.routes import customer_auth as auth_routes
from app.services import booking_service as booking_module
from app.services import customer_account_service as cas
from app.services import login_throttle as lt
from app.services.customer_auth_service import CustomerSession

PASSWORD = "Sunny-beach-42"
ADMIN_KEY = "a" * 40
CUSTOMER_KEY = "b" * 40


class FakeCustomers:
    """Stands in for admin_ops (customer records)."""

    def __init__(self, rows: list[CustomerLogin] | None = None) -> None:
        self.rows = {r.id: r for r in rows or []}

    def find_customer_by_email(self, email):
        return next((r for r in self.rows.values() if r.email.lower() == email.strip().lower()), None)

    def find_customer_by_id(self, customer_id):
        return self.rows.get(customer_id)

    def upsert_customer(self, customer):
        self.rows[customer.id] = customer
        return customer


class AccountTestBase(unittest.TestCase):
    existing: list[CustomerLogin] = []

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.accounts_path = self.tmp / "customer_accounts.json"
        self.customers = FakeCustomers(list(self.existing))
        self.clock = [1_000_000.0]
        self.service = cas.CustomerAccountService(path=self.accounts_path)
        patches = [
            mock.patch.object(cas, "_service", self.service),
            mock.patch.object(cas, "get_admin_ops_service", return_value=self.customers),
            mock.patch.object(admin_routes, "get_admin_ops_service", return_value=self.customers),
            mock.patch.object(
                auth_routes,
                "customer_login_throttle",
                lt.LoginThrottle(lt.MemoryStore(), ip_max_failures=20, account_max_failures=8),
            ),
            mock.patch.object(auth_routes, "register_limiter", auth_routes.IpRateLimiter(max_calls=1000)),
            mock.patch.object(lt, "_now", lambda: self.clock[0]),
            mock.patch.object(config, "ADMIN_USERNAME", "owner"),
            mock.patch.object(config, "ADMIN_PASSWORD", "Correct-horse-battery-1"),
            mock.patch.object(config, "ADMIN_JWT_SECRET", ADMIN_KEY),
            mock.patch.object(config, "CUSTOMER_JWT_SECRET", CUSTOMER_KEY),
            mock.patch.object(config, "COOKIE_SECURE", False),
            mock.patch.object(config, "TRUSTED_PROXY_HOPS", 0),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.client = TestClient(app)

    def register(self, email="asha@example.com", password=PASSWORD, name="Asha Rao", client=None):
        return (client or self.client).post("/api/auth/register", json={"name": name, "email": email, "password": password})

    def login(self, email="asha@example.com", password=PASSWORD, client=None):
        return (client or self.client).post("/api/auth/login", json={"email": email, "password": password})


class RegisterAndLoginTests(AccountTestBase):
    def test_register_signs_in_with_http_only_cookie(self):
        r = self.register()
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual((body["authenticated"], body["email"], body["name"]), (True, "asha@example.com", "Asha Rao"))
        self.assertIn("httponly", r.headers["set-cookie"].lower())
        self.assertTrue(self.client.get("/api/auth/session").json()["authenticated"])
        # The customer record exists, so the admin Customers list still shows them.
        self.assertIsNotNone(self.customers.find_customer_by_email("asha@example.com"))

    def test_email_is_case_insensitive_and_duplicates_are_refused(self):
        self.register(email="Asha@Example.com")
        r = self.register(email="asha@example.COM", client=TestClient(app))
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.login(email="ASHA@example.com", client=TestClient(app)).status_code, 200)

    def test_short_password_rejected(self):
        self.assertEqual(self.register(password="short").status_code, 422)

    def test_wrong_password_and_unknown_email_look_identical(self):
        self.register()
        fresh = TestClient(app)
        a = self.login(password="Wrong-password-1", client=fresh)
        b = self.login(email="nobody@example.com", client=fresh)
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))
        self.assertEqual(a.status_code, 401)

    def test_login_then_logout(self):
        self.register()
        c = TestClient(app)
        self.assertEqual(self.login(client=c).status_code, 200)
        self.assertTrue(c.get("/api/auth/session").json()["authenticated"])
        c.post("/api/auth/logout")
        c.cookies.clear()
        self.assertFalse(c.get("/api/auth/session").json()["authenticated"])

    def test_password_is_stored_hashed_and_never_returned(self):
        r = self.register()
        stored = self.accounts_path.read_text(encoding="utf-8")
        self.assertNotIn(PASSWORD, stored)
        self.assertTrue(json.loads(stored)[0]["passwordHash"].startswith("scrypt$"))
        self.assertNotIn("passwordHash", r.text)
        self.assertNotIn("passwordHash", self.client.get("/api/auth/session").text)

    def test_session_cookie_signed_with_customer_secret(self):
        r = self.register()
        token = r.headers["set-cookie"].split("=", 1)[1].split(";", 1)[0]
        self.assertEqual(jwt.decode(token, CUSTOMER_KEY, algorithms=["HS256"])["kind"], "customer_session")
        with self.assertRaises(jwt.InvalidTokenError):
            jwt.decode(token, ADMIN_KEY, algorithms=["HS256"])


class LockoutTests(AccountTestBase):
    def test_repeated_failures_lock_then_expire(self):
        self.register()
        c = TestClient(app)
        for _ in range(8):
            self.assertEqual(self.login(password="Nope-nope-1", client=c).status_code, 401)
        locked = self.login(client=c)  # right password, but locked
        self.assertEqual(locked.status_code, 429)
        self.assertIn("retry-after", locked.headers)
        self.clock[0] += 61
        self.assertEqual(self.login(client=c).status_code, 200)

    def test_success_resets_counter(self):
        self.register()
        c = TestClient(app)
        for _ in range(7):
            self.login(password="Nope-nope-1", client=c)
        self.assertEqual(self.login(client=c).status_code, 200)
        for _ in range(7):
            self.login(password="Nope-nope-1", client=c)
        self.assertEqual(self.login(client=c).status_code, 200)


class ExistingCustomerTests(AccountTestBase):
    existing = [CustomerLogin(id="cust_old001", name="Saurav", email="owner@example.com")]

    def test_signup_with_an_existing_customers_email_is_refused(self):
        r = self.register(email="owner@example.com")
        self.assertEqual(r.status_code, 409)
        self.assertIn("contact support", r.json()["detail"].lower())
        self.assertIsNone(self.service.find_by_email("owner@example.com"))

    def admin_client(self):
        c = TestClient(app)
        login = c.post("/api/admin/login", json={"username": "owner", "password": "Correct-horse-battery-1"})
        self.assertEqual(login.status_code, 200)
        return c, login.json()["csrfToken"]

    def test_admin_reset_then_forced_password_change(self):
        admin, csrf = self.admin_client()
        self.assertEqual(admin.post("/api/admin/customers/cust_old001/password").status_code, 403)  # CSRF required
        reset = admin.post("/api/admin/customers/cust_old001/password", headers={"X-CSRF-Token": csrf})
        self.assertEqual(reset.status_code, 200, reset.text)
        temp = reset.json()["temporaryPassword"]
        self.assertNotIn(temp, self.accounts_path.read_text(encoding="utf-8"))

        c = TestClient(app)
        signed = self.login(email="owner@example.com", password=temp, client=c)
        self.assertEqual(signed.status_code, 200)
        self.assertEqual((signed.json()["customerId"], signed.json()["mustChangePassword"]), ("cust_old001", True))

        bad = c.post("/api/auth/password", json={"currentPassword": "wrong-one-9", "newPassword": "Brand-new-pass-7"})
        self.assertEqual(bad.status_code, 400)
        ok = c.post("/api/auth/password", json={"currentPassword": temp, "newPassword": "Brand-new-pass-7"})
        self.assertEqual(ok.status_code, 200)
        self.assertFalse(ok.json()["mustChangePassword"])
        self.assertEqual(self.login(email="owner@example.com", password=temp, client=TestClient(app)).status_code, 401)
        self.assertEqual(
            self.login(email="owner@example.com", password="Brand-new-pass-7", client=TestClient(app)).status_code, 200
        )

    def test_reset_requires_admin(self):
        self.assertEqual(self.client.post("/api/admin/customers/cust_old001/password").status_code, 401)

    def test_change_password_requires_sign_in(self):
        r = self.client.post("/api/auth/password", json={"currentPassword": "x" * 8, "newPassword": "y" * 8})
        self.assertEqual(r.status_code, 401)


class OwnershipTests(unittest.TestCase):
    """Bookings belong to an account id; an email match alone never grants access."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def write_bookings(self, rows):
        path = self.tmp / "bookings.json"
        path.write_text(json.dumps(rows), encoding="utf-8")
        return path

    @staticmethod
    def raw_booking(ref, email, customer_id=None):
        flight = {
            "id": "FL-1", "airline": {"code": "6E", "name": "IndiGo"}, "flightNumber": "6E 1",
            "origin": {"code": "DEL", "city": "Delhi", "airport": "IGI"},
            "destination": {"code": "BOM", "city": "Mumbai", "airport": "CSMIA"},
            "departureDate": "2026-12-01", "departureTime": "06:00", "arrivalDate": "2026-12-01",
            "arrivalTime": "08:00", "durationMinutes": 120, "aircraft": "A320",
            "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "availableSeats": 9,
            "baggage": {"cabin": "7 KG", "checkIn": "15 KG"}, "refundable": False,
        }
        return {
            "bookingId": ref, "createdAt": "2026-10-01T00:00:00+00:00", "flight": flight, "state": "PAYMENT_PENDING",
            "customerId": customer_id,
            "passengers": [{"title": "Mr", "firstName": "A", "lastName": "B", "gender": "Male", "dateOfBirth": "1990-01-01"}],
            "contact": {"email": email, "phone": "9999999999"}, "passengerCount": 1,
            "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "totalAmount": 4800,
        }

    def service(self, rows, customers):
        from app.services import admin_ops_service

        with mock.patch.object(admin_ops_service, "get_admin_ops_service", return_value=customers):
            return booking_module.BookingService(path=self.write_bookings(rows))

    def test_same_email_different_account_sees_nothing(self):
        svc = self.service([self.raw_booking("TRQ-1", "owner@example.com", "cust_owner1")], FakeCustomers())
        intruder = CustomerSession(customer_id="cust_intruder", email="owner@example.com")
        self.assertEqual(svc.list_for_customer(intruder), [])
        owner = CustomerSession(customer_id="cust_owner1", email="owner@example.com")
        self.assertEqual([b.bookingId for b in svc.list_for_customer(owner)], ["TRQ-1"])

    def test_legacy_bookings_link_to_the_existing_customer_record(self):
        customers = FakeCustomers([CustomerLogin(id="cust_old001", email="owner@example.com")])
        svc = self.service(
            [self.raw_booking("BK-OLD-1", "Owner@Example.com"), self.raw_booking("BK-OLD-2", "stranger@example.com")],
            customers,
        )
        self.assertEqual(svc.get_booking("BK-OLD-1").customerId, "cust_old001")
        self.assertIsNone(svc.get_booking("BK-OLD-2").customerId)  # no verified owner: admin-only
        owner = CustomerSession(customer_id="cust_old001", email="owner@example.com")
        self.assertEqual([b.bookingId for b in svc.list_for_customer(owner)], ["BK-OLD-1"])
        stranger = CustomerSession(customer_id="cust_new", email="stranger@example.com")
        self.assertEqual(svc.list_for_customer(stranger), [])
        # The link is persisted, not recomputed from email every time.
        saved = json.loads((self.tmp / "bookings.json").read_text(encoding="utf-8"))
        self.assertEqual(next(b for b in saved if b["bookingId"] == "BK-OLD-1")["customerId"], "cust_old001")


if __name__ == "__main__":
    unittest.main()
