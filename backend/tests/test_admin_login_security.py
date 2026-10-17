"""Admin login brute-force protection and cookie/CSRF session security."""

from __future__ import annotations

import threading
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import jwt
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.routes import admin as admin_routes
from app.services import login_throttle as lt

USER = "owner"
PASSWORD = "Correct-horse-battery-staple-1"
ADMIN_KEY = "a" * 40
CUSTOMER_KEY = "b" * 40
WRITE_URL = "/api/admin/bookings/NOPE/payment/confirm"  # state-changing, harmless (booking missing)


class Base(unittest.TestCase):
    ip_max = 5
    acct_max = 20
    hops = 0

    def setUp(self):
        self.clock = [1_000_000.0]
        self.throttle = lt.LoginThrottle(lt.MemoryStore())
        patches = [
            mock.patch.object(config, "ADMIN_USERNAME", USER),
            mock.patch.object(config, "ADMIN_PASSWORD", PASSWORD),
            mock.patch.object(config, "ADMIN_JWT_SECRET", ADMIN_KEY),
            mock.patch.object(config, "CUSTOMER_JWT_SECRET", CUSTOMER_KEY),
            mock.patch.object(config, "ADMIN_LOGIN_IP_MAX_FAILURES", self.ip_max),
            mock.patch.object(config, "ADMIN_LOGIN_ACCOUNT_MAX_FAILURES", self.acct_max),
            mock.patch.object(config, "TRUSTED_PROXY_HOPS", self.hops),
            mock.patch.object(config, "ADMIN_RETURN_TOKEN", True),
            mock.patch.object(config, "COOKIE_SECURE", False),
            mock.patch.object(admin_routes, "login_throttle", self.throttle),
            mock.patch.object(lt, "_now", lambda: self.clock[0]),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.client = TestClient(app)

    def login(self, username=USER, password=PASSWORD, **headers):
        return self.client.post("/api/admin/login", json={"username": username, "password": password}, headers=headers)

    def bad(self, n=1, **kw):
        return [self.login(password="wrong-password", **kw) for _ in range(n)][-1]


class LockoutTests(Base):
    def test_wrong_user_and_wrong_password_look_identical(self):
        a = self.login(username="nobody", password="x")
        b = self.login(username=USER, password="x")
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))
        self.assertEqual(a.status_code, 401)

    def test_locks_after_threshold_and_blocks_correct_password(self):
        self.assertTrue(all(r.status_code == 401 for r in [self.bad() for _ in range(5)]))
        locked = self.login()  # right password, but locked
        self.assertEqual(locked.status_code, 429)
        self.assertEqual(locked.headers["retry-after"], "60")
        self.assertNotIn("token", locked.json())

    def test_lock_expires_and_login_works_again(self):
        self.bad(5)
        self.assertEqual(self.login().status_code, 429)
        self.clock[0] += 61
        self.assertEqual(self.login().status_code, 200)

    def test_lock_is_progressive_but_capped(self):
        waits = []
        for _ in range(7):
            self.bad(5)
            waits.append(int(self.login().headers["retry-after"]))
            self.clock[0] += waits[-1] + 1
        self.assertEqual(waits[:4], [60, 120, 240, 480])
        self.assertEqual(max(waits), config.ADMIN_LOGIN_LOCK_MAX_SECONDS)
        self.assertEqual(self.login().status_code, 200)  # never permanent

    def test_success_resets_counter(self):
        self.bad(4)
        self.assertEqual(self.login().status_code, 200)
        self.bad(4)  # would have locked if the earlier four still counted
        self.assertEqual(self.login().status_code, 200)

    def test_strikes_forgotten_after_success(self):
        self.bad(5)
        self.clock[0] += 61
        self.assertEqual(self.login().status_code, 200)
        self.bad(5)
        self.assertEqual(self.login().headers["retry-after"], "60")  # back to the first-strike delay

    def test_spoofed_forwarded_for_does_not_bypass_ip_limit(self):
        for i in range(5):
            self.login(password="bad", **{"X-Forwarded-For": f"10.0.0.{i}"})
        self.assertEqual(self.login(**{"X-Forwarded-For": "10.9.9.9"}).status_code, 429)

    def test_username_case_and_padding_share_one_counter(self):
        with mock.patch.object(config, "ADMIN_LOGIN_IP_MAX_FAILURES", 1000), \
                mock.patch.object(config, "ADMIN_LOGIN_ACCOUNT_MAX_FAILURES", 4):
            for name in ("Owner", "OWNER", " owner ", "owner"):
                self.login(username=name, password="bad")
            self.assertEqual(self.login().status_code, 429)

    def test_oversized_credentials_rejected(self):
        self.assertEqual(self.login(password="x" * 5000).status_code, 422)

    def test_concurrent_failures_trip_exactly_one_lock(self):
        store = lt.MemoryStore()
        barrier = threading.Barrier(5)
        results: list[int] = []

        def hit():
            barrier.wait()
            results.append(store.record_failure("ip:1", 5, 900, 60, 900))

        threads = [threading.Thread(target=hit) for _ in range(5)]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(sorted(results), [0, 0, 0, 0, 60])


class AccountLockTests(Base):
    ip_max = 1000
    acct_max = 6
    hops = 1  # trust the rightmost X-Forwarded-For entry (as behind Render)

    def test_distributed_guessing_still_hits_account_limit(self):
        for i in range(6):
            self.login(password="bad", **{"X-Forwarded-For": f"1.1.1.1, 9.9.9.{i}"})
        r = self.login(**{"X-Forwarded-For": "1.1.1.1, 9.9.9.200"})
        self.assertEqual(r.status_code, 429)
        self.clock[0] += 61
        self.assertEqual(self.login(**{"X-Forwarded-For": "1.1.1.1, 9.9.9.200"}).status_code, 200)

    def test_forged_left_entries_do_not_change_identity(self):
        # The attacker rotates the LEFT part; the proxy-added right part is constant, so IP limit still applies.
        with mock.patch.object(config, "ADMIN_LOGIN_IP_MAX_FAILURES", 5), \
                mock.patch.object(config, "ADMIN_LOGIN_ACCOUNT_MAX_FAILURES", 1000):
            for i in range(5):
                self.login(password="bad", **{"X-Forwarded-For": f"6.6.6.{i}, 203.0.113.7"})
            r = self.login(**{"X-Forwarded-For": "7.7.7.7, 203.0.113.7"})
            self.assertEqual(r.status_code, 429)
            # A different address as seen by the proxy is not locked by that IP's failures.
            self.assertEqual(self.login(**{"X-Forwarded-For": "7.7.7.7, 198.51.100.4"}).status_code, 200)


class ClientIpTests(unittest.TestCase):
    def _req(self, xff=None, host="10.1.1.1"):
        headers = {"x-forwarded-for": xff} if xff else {}
        return mock.Mock(headers=headers, client=mock.Mock(host=host))

    def test_header_ignored_without_trusted_proxy(self):
        from app.services.rate_limit import client_ip

        with mock.patch.object(config, "TRUSTED_PROXY_HOPS", 0):
            self.assertEqual(client_ip(self._req("1.2.3.4")), "10.1.1.1")

    def test_rightmost_trusted_entry_used(self):
        from app.services.rate_limit import client_ip

        with mock.patch.object(config, "TRUSTED_PROXY_HOPS", 1):
            self.assertEqual(client_ip(self._req("6.6.6.6, 203.0.113.7")), "203.0.113.7")
        with mock.patch.object(config, "TRUSTED_PROXY_HOPS", 2):
            self.assertEqual(client_ip(self._req("6.6.6.6, 203.0.113.7, 10.0.0.1")), "203.0.113.7")

    def test_missing_header_falls_back_to_socket(self):
        from app.services.rate_limit import client_ip

        with mock.patch.object(config, "TRUSTED_PROXY_HOPS", 1):
            self.assertEqual(client_ip(self._req(None)), "10.1.1.1")


class RedisStoreTests(unittest.TestCase):
    def setUp(self):
        try:
            import fakeredis
        except ImportError:  # dev-only dependency
            self.skipTest("fakeredis not installed")
        self.server = fakeredis.FakeServer()
        self.fakeredis = fakeredis

    def store(self):
        return lt.RedisStore(self.fakeredis.FakeRedis(server=self.server))

    def test_counters_shared_between_instances(self):
        a, b = self.store(), self.store()
        for _ in range(3):
            a.record_failure("ip:1", 5, 900, 60, 900)
        results = [b.record_failure("ip:1", 5, 900, 60, 900) for _ in range(2)]
        self.assertEqual(results, [0, 60])
        self.assertGreater(a.locked_for("ip:1"), 0)  # instance A sees the lock B created

    def test_progressive_cap_and_reset(self):
        s = self.store()
        locks = []
        for _ in range(6):
            locks += [x for x in (s.record_failure("k", 1, 900, 60, 300),) if x]
        self.assertEqual(locks, [60, 120, 240, 300, 300, 300])
        s.reset("k")
        self.assertEqual(s.locked_for("k"), 0)
        self.assertEqual(s.record_failure("k", 1, 900, 60, 300), 60)

    def test_store_outage_degrades_to_memory_not_open(self):
        class Broken:
            def locked_for(self, *a): raise ConnectionError("down")
            def record_failure(self, *a): raise ConnectionError("down")
            def reset(self, *a): raise ConnectionError("down")

        t = lt.LoginThrottle(Broken())
        with mock.patch.object(config, "ADMIN_LOGIN_IP_MAX_FAILURES", 3):
            for _ in range(3):
                t.record_failure("1.1.1.1", "owner")
        self.assertGreater(t.locked_seconds("1.1.1.1", "owner"), 0)


class SessionTests(Base):
    def test_login_sets_httponly_cookie_and_csrf(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        cookie = r.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("samesite=", cookie)
        self.assertIn("path=/api/admin", cookie)
        self.assertTrue(r.json()["csrfToken"])

    def test_token_hidden_when_not_returned(self):
        with mock.patch.object(config, "ADMIN_RETURN_TOKEN", False):
            self.assertIsNone(self.login().json()["token"])

    def test_cookie_secure_flag_follows_config(self):
        with mock.patch.object(config, "COOKIE_SECURE", True):
            self.assertIn("secure", self.login().headers["set-cookie"].lower())

    def test_cookie_authenticates_reads_and_session_endpoint(self):
        csrf = self.login().json()["csrfToken"]
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 200)
        s = self.client.get("/api/admin/session").json()
        self.assertEqual((s["authenticated"], s["csrfToken"]), (True, csrf))

    def test_write_requires_csrf_with_cookie(self):
        csrf = self.login().json()["csrfToken"]
        self.assertEqual(self.client.post(WRITE_URL).status_code, 403)
        self.assertEqual(self.client.post(WRITE_URL, headers={"X-CSRF-Token": "wrong"}).status_code, 403)
        self.assertNotIn(self.client.post(WRITE_URL, headers={"X-CSRF-Token": csrf}).status_code, (401, 403))

    def test_bearer_token_works_without_csrf_and_without_cookie(self):
        token = self.login().json()["token"]
        fresh = TestClient(app)
        self.assertEqual(fresh.get("/api/admin/stats", headers={"Authorization": f"Bearer {token}"}).status_code, 200)
        self.assertNotIn(fresh.post(WRITE_URL, headers={"Authorization": f"Bearer {token}"}).status_code, (401, 403))

    def test_unauthenticated_access_rejected(self):
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 401)
        self.assertEqual(self.client.post(WRITE_URL).status_code, 401)
        s = self.client.get("/api/admin/session").json()
        self.assertEqual(s, {"authenticated": False, "csrfToken": None, "expiresAt": None})

    def test_logout_clears_session(self):
        self.login()
        self.assertEqual(self.client.post("/api/admin/logout").status_code, 204)
        self.client.cookies.clear()  # the browser honours delete-cookie; mirror that
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 401)

    def test_expired_session_rejected(self):
        expired = jwt.encode(
            {"sub": "admin", "kind": "admin", "csrf": "x", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            ADMIN_KEY,
            algorithm="HS256",
        )
        self.client.cookies.set(config.ADMIN_SESSION_COOKIE, expired, path="/api/admin")
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 401)
        self.assertFalse(self.client.get("/api/admin/session").json()["authenticated"])

    def test_cookie_signed_with_customer_secret_rejected(self):
        forged = jwt.encode(
            {"sub": "admin", "kind": "admin", "csrf": "x", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            CUSTOMER_KEY,
            algorithm="HS256",
        )
        self.client.cookies.set(config.ADMIN_SESSION_COOKIE, forged, path="/api/admin")
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 401)

    def test_customer_session_cookie_is_not_admin_access(self):
        self.client.cookies.set(config.CUSTOMER_SESSION_COOKIE, "anything", path="/api")
        self.assertEqual(self.client.get("/api/admin/stats").status_code, 401)


if __name__ == "__main__":
    unittest.main()
