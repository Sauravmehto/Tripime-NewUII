"""Inquiry CRM: capture from every entry point, admin management + audit trail, privacy, WhatsApp webhook."""

from __future__ import annotations

import hashlib
import hmac
import json
import sqlite3
from datetime import timedelta
from types import SimpleNamespace
from unittest import mock

from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.routes import enquiries as enquiry_routes
from app.routes import my_bookings as my_routes
from app.services import enquiry_service as enquiry_module
from app.services import inquiry_service as ins
from app.services.rate_limit import IpRateLimiter
from app.storage.inquiry_db import migrate
from tests.test_customer_accounts import AccountTestBase

MINE = "/api/my-bookings/inquiries"
ADMIN = "/api/admin/inquiries"
APP_SECRET = "s" * 32
VERIFY = "verify-me-123"


class InquiryBase(AccountTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.db = self.tmp / "inquiries.db"
        self.service = ins.InquiryService(path=self.db)
        self.enq_service = enquiry_module.EnquiryService(path=self.tmp / "enquiries.json")
        patches = [
            mock.patch.object(ins, "_service", self.service),
            mock.patch.object(enquiry_module, "_enquiry_service", self.enq_service),
            mock.patch.object(enquiry_routes, "send_enquiry_alert", lambda *a, **k: None),
            mock.patch.object(my_routes, "create_limiter", IpRateLimiter(max_calls=1000)),
            mock.patch.object(enquiry_routes, "enquiry_limiter", IpRateLimiter(max_calls=1000)),
            mock.patch.object(ins.InquiryService, "_customer_record", staticmethod(lambda cid: self.customers.find_customer_by_id(cid))),
            mock.patch.object(config, "WHATSAPP_APP_SECRET", APP_SECRET),
            mock.patch.object(config, "WHATSAPP_VERIFY_TOKEN", VERIFY),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def set_phone(self, email: str, mobile: str) -> None:
        record = self.customers.find_customer_by_email(email)
        self.customers.upsert_customer(record.model_copy(update={"mobile": mobile}))

    def signed_in(self, email="asha@example.com", name="Asha Rao") -> TestClient:
        c = TestClient(app)
        self.assertEqual(self.register(email=email, name=name, client=c).status_code, 200)
        return c

    def admin(self) -> tuple[TestClient, dict]:
        c = TestClient(app)
        login = c.post("/api/admin/login", json={"username": "owner", "password": "Correct-horse-battery-1"})
        self.assertEqual(login.status_code, 200, login.text)
        return c, {"X-CSRF-Token": login.json()["csrfToken"]}

    def make(self, client: TestClient, package="pkg_goa001", source="whatsapp") -> dict:
        r = client.post(MINE, json={"package_id": package, "inquiry_source": source})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()


class CustomerCaptureTests(InquiryBase):
    def test_guests_cannot_use_customer_endpoints(self):
        guest = TestClient(app)
        self.assertEqual(guest.post(MINE, json={"package_id": "pkg_goa001"}).status_code, 401)
        self.assertEqual(guest.get(MINE).status_code, 401)
        self.assertEqual(self.service.stats().total, 0)

    def test_whatsapp_inquiry_is_saved_with_server_side_facts(self):
        body = self.make(self.signed_in())
        inq = body["inquiry"]
        self.assertTrue(body["created"])
        self.assertEqual((inq["package_name"], inq["destination"], inq["package_price"]), ("Goa Beach Escape", "North Goa", 14999))
        self.assertEqual((inq["inquiry_source"], inq["inquiry_type"], inq["inquiry_status"]), ("whatsapp", "package_inquiry", "new"))
        self.assertEqual(inq["whatsapp_message"], 'Hi Tripime, I\'m interested in the "Goa Beach Escape" package.')
        self.assertEqual(inq["booking_confirmation"], "not_confirmed")
        detail = self.service.get_detail(inq["id"])
        full = detail.inquiry
        self.assertEqual((full.customer_name, full.customer_email, full.is_registered), ("Asha Rao", "asha@example.com", True))
        self.assertIsNotNone(full.whatsapp_clicked_at)
        self.assertEqual([a.action for a in detail.activities], ["whatsapp_clicked", "created"])

    def test_customer_view_hides_internal_fields(self):
        body = self.make(self.signed_in())["inquiry"]
        for hidden in ("assigned_to", "admin_notes", "customer_email", "customer_phone", "user_id", "priority", "follow_up_date"):
            self.assertNotIn(hidden, body)

    def test_browser_cannot_set_anything_but_package_and_source(self):
        c = self.signed_in()
        for extra in ({"user_id": "x"}, {"package_price": 1}, {"inquiry_status": "converted"}, {"customer_email": "a@b.com"}, {"assigned_to": "me"}):
            self.assertEqual(c.post(MINE, json={"package_id": "pkg_goa001", **extra}).status_code, 422, extra)
        self.assertEqual(self.service.stats().total, 0)

    def test_unknown_package_and_bad_source_refused(self):
        c = self.signed_in()
        self.assertEqual(c.post(MINE, json={"package_id": "pkg_nope"}).status_code, 404)
        self.assertEqual(c.post(MINE, json={"package_id": ""}).status_code, 422)
        self.assertEqual(c.post(MINE, json={"package_id": "pkg_goa001", "inquiry_source": "contact_form"}).status_code, 422)

    def test_brochure_request_is_its_own_source(self):
        inq = self.make(self.signed_in(), source="brochure_request")["inquiry"]
        self.assertEqual((inq["inquiry_source"], inq["inquiry_type"]), ("brochure_request", "brochure_request"))
        self.assertIn("brochure", self.service.get_detail(inq["id"]).inquiry.inquiry_message)
        self.assertIsNone(self.service.get_detail(inq["id"]).inquiry.whatsapp_clicked_at)

    def test_rapid_repeat_returns_same_record(self):
        c = self.signed_in()
        a, b = self.make(c), self.make(c)
        self.assertTrue(a["created"])
        self.assertFalse(b["created"])
        self.assertEqual(a["inquiry"]["id"], b["inquiry"]["id"])
        self.assertTrue(self.make(c, package="pkg_kerala001")["created"])  # other package = new inquiry
        self.assertTrue(self.make(c, source="brochure_request")["created"])  # other source = new inquiry
        self.assertEqual(self.service.stats().total, 3)

    def test_later_repeat_is_recorded_again(self):
        c = self.signed_in()
        self.make(c)
        later = ins._now() + timedelta(minutes=30)
        with mock.patch.object(ins, "_now", lambda: later):
            self.assertTrue(self.make(c)["created"])

    def test_customers_only_see_their_own(self):
        asha, ravi = self.signed_in("asha@example.com"), self.signed_in("ravi@example.com", "Ravi")
        self.make(asha)
        self.make(ravi, package="pkg_kerala001")
        self.assertEqual([i["package_id"] for i in asha.get(MINE).json()], ["pkg_goa001"])
        self.assertEqual([i["package_id"] for i in ravi.get(MINE).json()], ["pkg_kerala001"])


class FormEntryPointTests(InquiryBase):
    FORM = {"source": "contact", "name": "Meera Shah", "email": "Meera@Example.com", "phone": "+91 98765 43210", "message": "Need a Bali quote", "travelers": 2}

    def test_guest_contact_form_lands_in_the_crm(self):
        r = TestClient(app).post("/api/enquiries", json=self.FORM)
        self.assertEqual(r.status_code, 201, r.text)
        page = self.service.admin_list()
        self.assertEqual(page.total, 1)
        row = page.items[0]
        self.assertEqual((row.inquiry_source, row.inquiry_type, row.is_registered), ("contact_form", "general_contact", False))
        self.assertEqual((row.customer_name, row.customer_email, row.customer_phone), ("Meera Shah", "meera@example.com", "+91 98765 43210"))
        self.assertIn("Need a Bali quote", row.inquiry_message)

    def test_package_booking_form_keeps_package_facts_and_user(self):
        c = self.signed_in()
        form = {"source": "package", "packageId": "pkg_goa001", "packageTitle": "ignored by server", "name": "Asha Rao", "email": "asha@example.com", "phone": "9876543210", "travelMonth": "December 2026", "travelers": 3}
        self.assertEqual(c.post("/api/enquiries", json=form).status_code, 201)
        row = self.service.admin_list().items[0]
        self.assertEqual((row.inquiry_source, row.inquiry_type, row.package_name, row.package_price), ("package_booking", "booking_request", "Goa Beach Escape", 14999))
        self.assertTrue(row.is_registered)
        self.assertIn("Travellers: 3", row.inquiry_message)
        # and the signed-in customer sees it in My Bookings
        self.assertEqual([i["inquiry_source"] for i in c.get(MINE).json()], ["package_booking"])

    def test_group_and_itinerary_forms_are_custom_trips(self):
        for source in ("group", "itinerary"):
            TestClient(app).post("/api/enquiries", json={**self.FORM, "source": source, "message": source})
        self.assertEqual({i.inquiry_source for i in self.service.admin_list().items}, {"custom_trip"})

    def test_double_submit_does_not_duplicate(self):
        guest = TestClient(app)
        guest.post("/api/enquiries", json=self.FORM)
        guest.post("/api/enquiries", json=self.FORM)
        self.assertEqual(self.service.stats().total, 1)

    def test_form_still_succeeds_if_the_crm_fails(self):
        with mock.patch.object(ins.InquiryService, "create_from_enquiry", side_effect=RuntimeError("boom")):
            self.assertEqual(TestClient(app).post("/api/enquiries", json=self.FORM).status_code, 201)

    def test_legacy_enquiries_are_imported_once(self):
        path = self.tmp / "legacy.json"
        path.write_text(json.dumps([{**self.FORM, "id": "ENQ-1", "status": "CONTACTED", "createdAt": "2026-01-05T10:00:00+00:00"}]))
        self.assertEqual(self.service.backfill_legacy_enquiries(path), 1)
        self.assertEqual(self.service.backfill_legacy_enquiries(path), 0)
        row = self.service.admin_list().items[0]
        self.assertEqual((row.inquiry_status, row.created_at[:10]), ("contacted", "2026-01-05"))


class AdminTests(InquiryBase):
    def test_admin_endpoints_need_an_admin(self):
        c = self.signed_in()
        inq = self.make(c)["inquiry"]["id"]
        for method, path in (("get", ADMIN), ("get", f"{ADMIN}/stats"), ("get", f"{ADMIN}/{inq}"), ("get", f"{ADMIN}/team")):
            self.assertEqual(getattr(TestClient(app), method)(path).status_code, 401, path)
            self.assertEqual(getattr(c, method)(path).status_code, 401, f"customer: {path}")  # a customer cookie is not admin
        self.assertEqual(c.patch(f"{ADMIN}/{inq}", json={"inquiry_status": "converted"}).status_code, 401)
        self.assertEqual(self.service.get_detail(inq).inquiry.inquiry_status, "new")

    def test_writes_need_the_csrf_header(self):
        inq = self.make(self.signed_in())["inquiry"]["id"]
        admin, csrf = self.admin()
        self.assertEqual(admin.patch(f"{ADMIN}/{inq}", json={"priority": "high"}).status_code, 403)
        self.assertEqual(admin.patch(f"{ADMIN}/{inq}", json={"priority": "high"}, headers=csrf).status_code, 200)

    def test_admin_sees_customer_contact_details(self):
        c = self.signed_in("phone@example.com", "Phone Person")
        self.set_phone("phone@example.com", "+91 99999 11111")  # a registered customer with a phone on file
        self.make(c)
        admin, _ = self.admin()
        row = admin.get(ADMIN).json()["items"][0]
        self.assertEqual((row["customer_email"], row["customer_phone"], row["is_registered"]), ("phone@example.com", "+91 99999 11111", True))
        self.assertEqual(row["package_url"], "/packages/pkg_goa001")

    def test_list_search_filter_sort_paginate(self):
        asha, ravi = self.signed_in("asha@example.com"), self.signed_in("ravi@example.com", "Ravi Kumar")
        a = self.make(asha)["inquiry"]["id"]
        b = self.make(ravi, package="pkg_kerala001")["inquiry"]["id"]
        self.make(ravi, package="pkg_rajasthan001", source="brochure_request")
        admin, csrf = self.admin()
        admin.patch(f"{ADMIN}/{a}", json={"inquiry_status": "contacted", "assigned_to": "Neha"}, headers=csrf)
        listed = lambda **q: admin.get(ADMIN, params=q).json()
        self.assertEqual(listed()["total"], 3)
        self.assertEqual([i["inquiry_id"] for i in listed(search="kerala")["items"]], [b])
        self.assertEqual(listed(search="RAVI")["total"], 2)
        self.assertEqual(listed(status="contacted")["total"], 1)
        self.assertEqual(listed(source="brochure_request")["total"], 1)
        self.assertEqual(listed(assigned_to="Neha")["total"], 1)
        self.assertEqual(listed(assigned_to="__unassigned__")["total"], 2)
        self.assertEqual(listed(date_from="2999-01-01")["total"], 0)
        self.assertEqual(listed(date_to="2999-01-01")["total"], 3)
        self.assertEqual([i["package_name"] for i in listed(sort="package_name", order="asc")["items"]], sorted(i["package_name"] for i in listed()["items"]))
        page = listed(page_size=2, page=2)
        self.assertEqual((len(page["items"]), page["total"], page["page"]), (1, 3, 2))
        self.assertEqual(admin.get(ADMIN, params={"sort": "password"}).status_code, 422)  # sort is a whitelist
        self.assertEqual(admin.get(ADMIN, params={"status": "bogus"}).status_code, 422)
        # SQL metacharacters in search are just text
        self.assertEqual(listed(search="'; DROP TABLE inquiries; --")["total"], 0)
        self.assertEqual(listed()["total"], 3)

    def test_stats(self):
        c = self.signed_in()
        ids = [self.make(c, package=p)["inquiry"]["id"] for p in ("pkg_goa001", "pkg_kerala001", "pkg_rajasthan001", "pkg_bali001")]
        admin, csrf = self.admin()
        for i, status in zip(ids[1:], ("contacted", "quote_shared", "converted")):
            admin.patch(f"{ADMIN}/{i}", json={"inquiry_status": status}, headers=csrf)
        admin.patch(f"{ADMIN}/{ids[0]}", json={"follow_up_date": "2000-01-01"}, headers=csrf)  # overdue follow-up
        s = admin.get(f"{ADMIN}/stats").json()
        self.assertEqual((s["total"], s["new"], s["contacted"], s["quote_shared"], s["converted"], s["pending_follow_ups"]), (4, 1, 1, 1, 1, 1))

    def test_every_change_is_audited_with_admin_identity(self):
        inq = self.make(self.signed_in())["inquiry"]["id"]
        admin, csrf = self.admin()
        patch = lambda **b: admin.patch(f"{ADMIN}/{inq}", json=b, headers=csrf)
        self.assertEqual(patch(inquiry_status="contacted").status_code, 200)
        self.assertEqual(patch(assigned_to="Neha").status_code, 200)
        self.assertEqual(patch(priority="high").status_code, 200)
        self.assertEqual(patch(follow_up_date="2030-05-01").status_code, 200)
        self.assertEqual(patch(inquiry_status="quote_shared").status_code, 200)
        self.assertEqual(admin.post(f"{ADMIN}/{inq}/notes", json={"note": "Called, wants a villa"}, headers=csrf).status_code, 201)
        self.assertEqual(patch(inquiry_status="contacted").status_code, 200)  # no-op repeat must not log
        patch(priority="high")
        d = admin.get(f"{ADMIN}/{inq}").json()
        actions = [a["action"] for a in d["activities"]]
        self.assertEqual(actions[-2:], ["whatsapp_clicked", "created"])
        by = {}
        for a in d["activities"]:
            by.setdefault(a["action"], []).append(a)
        self.assertEqual(by["status_changed"][-1]["old_value"] + ">" + by["status_changed"][-1]["new_value"], "new>contacted")
        self.assertEqual((by["assigned"][0]["new_value"], by["priority_changed"][0]["new_value"], by["follow_up_scheduled"][0]["new_value"]), ("Neha", "high", "2030-05-01"))
        self.assertEqual(by["note_added"][0]["detail"], "Called, wants a villa")
        self.assertEqual(len(by["status_changed"]), 3)  # new>contacted, contacted>quote_shared, quote_shared>contacted; the no-op repeat is not logged
        for action in ("status_changed", "assigned", "priority_changed", "follow_up_scheduled", "note_added", "quote_shared"):
            self.assertTrue(all(a["actor_type"] == "admin" and a["actor"] == "owner" and a["created_at"] for a in by[action]), action)
        self.assertEqual(d["inquiry"]["admin_notes"], "Called, wants a villa")

    def test_validation_and_unknown_ids(self):
        inq = self.make(self.signed_in())["inquiry"]["id"]
        admin, csrf = self.admin()
        bad = lambda **b: admin.patch(f"{ADMIN}/{inq}", json=b, headers=csrf).status_code
        self.assertEqual(bad(inquiry_status="confirmed"), 422)
        self.assertEqual(bad(priority="urgent"), 422)
        self.assertEqual(bad(follow_up_date="2030-13-45"), 422)
        self.assertEqual(bad(user_id="x"), 422)
        self.assertEqual(bad(), 422)
        self.assertEqual(bad(converted_booking_id="TRQ-DOES-NOT-EXIST"), 404)
        self.assertEqual(admin.get(f"{ADMIN}/INQ-none").status_code, 404)
        self.assertEqual(admin.patch(f"{ADMIN}/INQ-none", json={"priority": "low"}, headers=csrf).status_code, 404)
        self.assertEqual(admin.post(f"{ADMIN}/{inq}/notes", json={"note": "   "}, headers=csrf).status_code, 422)
        self.assertEqual(admin.post(f"{ADMIN}/{inq}/notes", json={"note": "x" * 2001}, headers=csrf).status_code, 422)

    def test_converted_is_not_a_confirmed_booking(self):
        c = self.signed_in()
        inq = self.make(c)["inquiry"]["id"]
        admin, csrf = self.admin()
        admin.patch(f"{ADMIN}/{inq}", json={"inquiry_status": "converted"}, headers=csrf)
        mine = c.get(MINE).json()[0]
        self.assertEqual((mine["inquiry_status"], mine["booking_confirmation"]), ("converted", "not_confirmed"))
        # Linking a real booking: confirmed only once that booking is really confirmed
        states = {"state": "PAYMENT_PENDING"}
        fake = lambda booking_id: SimpleNamespace(state=states["state"]) if booking_id == "TRQ-1" else None
        with mock.patch.object(ins.InquiryService, "_booking", staticmethod(fake)):
            self.assertEqual(admin.patch(f"{ADMIN}/{inq}", json={"converted_booking_id": "TRQ-1"}, headers=csrf).status_code, 200)
            self.assertEqual(c.get(MINE).json()[0]["booking_confirmation"], "not_confirmed")
            states["state"] = "BOOKING_CONFIRMED"
            self.assertEqual(c.get(MINE).json()[0]["booking_confirmation"], "confirmed")
            self.assertEqual(admin.patch(f"{ADMIN}/{inq}", json={"converted_booking_id": ""}, headers=csrf).status_code, 200)
            self.assertEqual(c.get(MINE).json()[0]["booking_confirmation"], "not_confirmed")

    def test_team_list_includes_admin(self):
        admin, _ = self.admin()
        self.assertIn("owner", admin.get(f"{ADMIN}/team").json()["members"])


class WebhookTests(InquiryBase):
    URL = "/api/webhooks/whatsapp"

    def payload(self, wa_id="wamid.1", sender="919999911111", text="Hello, is the Goa trip available?"):
        return {"entry": [{"changes": [{"value": {
            "contacts": [{"wa_id": sender, "profile": {"name": "Phone Person"}}],
            "messages": [{"id": wa_id, "from": sender, "timestamp": "1790000000", "type": "text", "text": {"body": text}}],
        }}]}]}

    def post(self, payload, secret=APP_SECRET, signed=True):
        body = json.dumps(payload).encode()
        headers = {"content-type": "application/json"}
        if signed:
            headers["x-hub-signature-256"] = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return TestClient(app).post(self.URL, content=body, headers=headers)

    def test_verification_handshake(self):
        c = TestClient(app)
        ok = c.get(self.URL, params={"hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "12345"})
        self.assertEqual((ok.status_code, ok.text), (200, "12345"))
        self.assertEqual(c.get(self.URL, params={"hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "1"}).status_code, 403)

    def test_not_configured_is_503(self):
        with mock.patch.object(config, "WHATSAPP_APP_SECRET", ""), mock.patch.object(config, "WHATSAPP_VERIFY_TOKEN", ""):
            self.assertEqual(TestClient(app).post(self.URL, json={}).status_code, 503)
            self.assertEqual(TestClient(app).get(self.URL, params={"hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1"}).status_code, 503)

    def test_unsigned_or_wrongly_signed_deliveries_are_rejected(self):
        self.assertEqual(self.post(self.payload(), signed=False).status_code, 403)
        self.assertEqual(self.post(self.payload(), secret="x" * 32).status_code, 403)
        self.assertEqual(self.count_messages(), 0)

    def count_messages(self) -> int:
        conn = sqlite3.connect(self.db)
        try:
            return conn.execute("SELECT COUNT(*) FROM whatsapp_messages").fetchone()[0]
        finally:
            conn.close()

    def test_message_is_stored_and_linked_by_phone_number(self):
        guest = TestClient(app)
        guest.post("/api/enquiries", json={"source": "contact", "name": "Phone Person", "email": "pp@example.com", "phone": "+91 99999 11111", "message": "Hi", "travelers": 2})
        inq_id = self.service.admin_list().items[0].inquiry_id
        r = self.post(self.payload())
        self.assertEqual((r.status_code, r.json()["stored"], r.json()["linked"]), (200, 1, 1))
        detail = self.service.get_detail(inq_id)
        self.assertEqual(detail.whatsapp_messages[0].body, "Hello, is the Goa trip available?")
        self.assertEqual(detail.whatsapp_messages[0].sender_phone, "919999911111")
        self.assertIn("whatsapp_message_received", [a.action for a in detail.activities])

    def test_duplicate_delivery_is_ignored(self):
        self.post(self.payload())
        again = self.post(self.payload())
        self.assertEqual((again.status_code, again.json()["stored"]), (200, 0))
        self.assertEqual(self.count_messages(), 1)

    def test_unmatched_sender_is_kept_but_not_linked_to_anyone(self):
        c = self.signed_in()
        self.make(c)  # an open inquiry belonging to someone else
        r = self.post(self.payload(sender="911234500000", wa_id="wamid.2"))
        self.assertEqual((r.json()["stored"], r.json()["linked"]), (1, 0))
        self.assertEqual(self.service.get_detail(self.service.admin_list().items[0].inquiry_id).whatsapp_messages, [])

    def test_matches_a_registered_customer_by_their_phone_on_file(self):
        c = self.signed_in("pp@example.com", "Phone Person")
        inq = self.make(c)["inquiry"]["id"]  # saved before we know their number
        self.set_phone("pp@example.com", "099999 11111")  # number later added to their profile
        with mock.patch("app.services.admin_ops_service.get_admin_ops_service", return_value=SimpleNamespace(list_customers=lambda: list(self.customers.rows.values()))):
            r = self.post(self.payload())
        self.assertEqual(r.json()["linked"], 1)
        self.assertEqual(len(self.service.get_detail(inq).whatsapp_messages), 1)


class DatabaseTests(InquiryBase):
    def test_migrations_are_idempotent_and_recorded(self):
        self.assertEqual(migrate(self.db), [])
        conn = sqlite3.connect(self.db)
        try:
            self.assertEqual([r[0] for r in conn.execute("SELECT version FROM schema_migrations")], [1])
            idx = {r[1] for r in conn.execute("SELECT * FROM sqlite_master WHERE type='index'")}
            self.assertTrue({"idx_inquiries_user", "idx_inquiries_status", "idx_inquiries_created", "idx_activity_inquiry"} <= idx)
        finally:
            conn.close()

    def test_foreign_keys_and_checks_are_enforced(self):
        from app.storage.inquiry_db import session

        with self.assertRaises(sqlite3.IntegrityError):
            with session(self.db, write=True) as conn:
                conn.execute("INSERT INTO inquiry_activity (inquiry_id, action, actor_type, created_at) VALUES ('INQ-none','x','admin','now')")
        with self.assertRaises(sqlite3.IntegrityError):
            with session(self.db, write=True) as conn:
                conn.execute(
                    "INSERT INTO inquiries (inquiry_id, inquiry_source, inquiry_type, inquiry_status, created_at, updated_at)"
                    " VALUES ('INQ-x','whatsapp','package_inquiry','bogus','n','n')"
                )

    def test_failed_write_rolls_back_the_whole_inquiry(self):
        c = self.signed_in()
        with mock.patch.object(ins.InquiryService, "_log", side_effect=RuntimeError("audit failed")):
            with self.assertRaises(RuntimeError):
                self.service.create_for_customer(
                    ins.CustomerInquiryCreate(package_id="pkg_goa001"), ins.CustomerSession("cust_x", "x@example.com")
                )
        self.assertEqual(self.service.stats().total, 0)
        self.assertTrue(c)


class FirstVersionImportTests(InquiryBase):
    def test_earlier_json_inquiries_are_kept_with_their_ids_and_not_duplicated(self):
        path = self.tmp / "package_inquiries.json"
        path.write_text(json.dumps([{
            "id": "INQ-20261112-4379F7", "user_id": "cust_x", "user_email": "Admin@Gmail.com", "package_id": "pkg_bali001",
            "package_name": "Bali Luxury Escape", "destination": "Kuta", "package_price": 299990, "inquiry_source": "whatsapp",
            "inquiry_status": "pending", "whatsapp_message": "Hi Tripime", "created_at": "2026-11-12T10:00:00+00:00",
        }]))
        self.assertEqual(self.service.import_first_version_inquiries(path), 1)
        self.assertEqual(self.service.import_first_version_inquiries(path), 0)
        row = self.service.get_detail("INQ-20261112-4379F7").inquiry
        self.assertEqual((row.customer_email, row.inquiry_status, row.inquiry_source, row.package_price), ("admin@gmail.com", "new", "whatsapp", 299990))
        self.assertEqual(row.whatsapp_clicked_at, "2026-11-12T10:00:00+00:00")
