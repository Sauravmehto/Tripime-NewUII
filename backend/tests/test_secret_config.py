"""Production secret validation and admin/customer signing-key separation."""

from __future__ import annotations

import unittest
from unittest import mock

import jwt

from app import config
from app.services import admin_auth, customer_auth_service

GOOD_PASSWORD = "Str0ng-unique-admin-password"
ADMIN_KEY = "a" * 40
CUSTOMER_KEY = "b" * 40


class ProductionConfigTests(unittest.TestCase):
    def errors(self, **kw):
        base = dict(admin_password=GOOD_PASSWORD, admin_secret=ADMIN_KEY, customer_secret=CUSTOMER_KEY)
        base.update(kw)
        return config.production_config_errors(**base)

    def test_valid_distinct_secrets_pass(self):
        self.assertEqual(self.errors(), [])

    def test_default_admin_password_rejected(self):
        self.assertTrue(self.errors(admin_password="admin123"))

    def test_short_admin_password_rejected(self):
        self.assertTrue(self.errors(admin_password="short"))

    def test_default_and_short_secrets_rejected(self):
        self.assertTrue(self.errors(admin_secret="dev-only-insecure-secret-change-me"))
        self.assertTrue(self.errors(customer_secret="dev-only-insecure-customer-secret"))
        self.assertTrue(self.errors(admin_secret="x" * 10))

    def test_identical_secrets_rejected(self):
        self.assertTrue(any("different" in e for e in self.errors(customer_secret=ADMIN_KEY)))

    def test_errors_never_contain_secret_values(self):
        bad = self.errors(admin_password="admin123", admin_secret="short-secret-value", customer_secret="short-secret-value")
        for message in bad:
            self.assertNotIn("short-secret-value", message)
            self.assertNotIn("admin123", message)

    def test_production_startup_fails_closed_with_defaults(self):
        with mock.patch.object(config, "IS_PRODUCTION", True), \
                mock.patch.object(config, "ADMIN_PASSWORD", "admin123"):
            with self.assertRaises(RuntimeError):
                config.validate_production_config()

    def test_production_startup_succeeds_with_valid_config(self):
        with mock.patch.object(config, "IS_PRODUCTION", True), \
                mock.patch.object(config, "ADMIN_PASSWORD", GOOD_PASSWORD), \
                mock.patch.object(config, "ADMIN_JWT_SECRET", ADMIN_KEY), \
                mock.patch.object(config, "CUSTOMER_JWT_SECRET", CUSTOMER_KEY):
            config.validate_production_config()

    def test_development_never_blocked_by_defaults(self):
        with mock.patch.object(config, "IS_PRODUCTION", False), \
                mock.patch.object(config, "ADMIN_PASSWORD", "admin123"):
            config.validate_production_config()


class SecretSeparationTests(unittest.TestCase):
    def setUp(self):
        patches = [
            mock.patch.object(config, "ADMIN_JWT_SECRET", ADMIN_KEY),
            mock.patch.object(config, "CUSTOMER_JWT_SECRET", CUSTOMER_KEY),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def test_admin_token_cannot_be_verified_with_customer_secret(self):
        token, _ = admin_auth.create_admin_token()
        with self.assertRaises(jwt.InvalidTokenError):
            jwt.decode(token, CUSTOMER_KEY, algorithms=["HS256"])
        self.assertEqual(jwt.decode(token, ADMIN_KEY, algorithms=["HS256"])["sub"], "admin")

    def test_customer_session_signed_with_admin_secret_is_rejected(self):
        forged = jwt.encode(
            {"sub": "C1", "email": "a@b.co", "kind": customer_auth_service.SESSION_KIND, "exp": 4102444800},
            ADMIN_KEY,
            algorithm="HS256",
        )
        request = mock.Mock(cookies={config.CUSTOMER_SESSION_COOKIE: forged})
        self.assertIsNone(customer_auth_service.optional_session(request))

    def test_customer_session_signed_with_customer_secret_is_accepted(self):
        good = jwt.encode(
            {"sub": "C1", "email": "a@b.co", "kind": customer_auth_service.SESSION_KIND, "exp": 4102444800},
            CUSTOMER_KEY,
            algorithm="HS256",
        )
        request = mock.Mock(cookies={config.CUSTOMER_SESSION_COOKIE: good})
        self.assertIsNotNone(customer_auth_service.optional_session(request))

    def test_customer_token_is_not_accepted_as_admin(self):
        customer_token = jwt.encode({"sub": "admin", "exp": 4102444800}, CUSTOMER_KEY, algorithm="HS256")
        with self.assertRaises(jwt.InvalidTokenError):
            admin_auth._decode_token(customer_token)


if __name__ == "__main__":
    unittest.main()
