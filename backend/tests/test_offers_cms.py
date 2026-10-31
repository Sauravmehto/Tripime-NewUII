"""Offers CMS: validation, expiry, safe PUT merging and the public /deals endpoint.

Everything runs against a temporary copy of the CMS file, never the tracked data."""

from __future__ import annotations

import shutil
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.website_cms import (
    WebsiteDeals,
    WebsitePromoItem,
    default_deals,
    promo_is_expired,
)
from app.services import admin_auth
from app.services import website_cms_service as cms_module

REAL_CMS = Path(cms_module.__file__).resolve().parents[2] / "data" / "website_cms.json"
IMG = "https://images.example.com/a.jpg"


def item(**overrides) -> dict:
    base = {"id": "deal_x", "category": "holiday", "imageUrl": IMG, "title": "Offer X"}
    base.update(overrides)
    return base


class PromoItemValidationTests(unittest.TestCase):
    def test_coupon_is_trimmed_and_uppercased(self):
        self.assertEqual(WebsitePromoItem(**item(couponCode="  save-10 ")).couponCode, "SAVE-10")

    def test_bad_coupons_rejected(self):
        for bad in ("a b", "ab", "x" * 31, "BAD$CODE", "-LEAD"):
            with self.subTest(bad=bad), self.assertRaises(ValidationError):
                WebsitePromoItem(**item(couponCode=bad))

    def test_valid_until_is_strict_iso(self):
        self.assertEqual(WebsitePromoItem(**item(validUntil="2030-12-31")).validUntil, "2030-12-31")
        self.assertEqual(WebsitePromoItem(**item(validUntil="")).validUntil, "")
        for bad in ("31 Dec 2030", "2030-02-30", "2030-13-01", "2030/12/31", "31-12-2030", "tomorrow"):
            with self.subTest(bad=bad), self.assertRaises(ValidationError):
                WebsitePromoItem(**item(validUntil=bad))

    def test_link_rules_per_type(self):
        WebsitePromoItem(**item(linkType="page", linkUrl="/packages"))
        WebsitePromoItem(**item(linkType="package", linkUrl="pkg_bali001"))
        WebsitePromoItem(**item(linkType="external", linkUrl="https://example.com/x"))
        for bad in (
            dict(linkType="page", linkUrl="packages"),
            dict(linkType="page", linkUrl="//evil.example"),
            dict(linkType="package", linkUrl="/packages/x"),
            dict(linkType="external", linkUrl="http://insecure.example"),
            dict(linkType="external", linkUrl="javascript:alert(1)"),
            dict(linkType="page", linkUrl="/has space"),
        ):
            with self.subTest(bad=bad), self.assertRaises(ValidationError):
                WebsitePromoItem(**item(**bad))

    def test_legacy_external_link_without_type_is_inferred(self):
        parsed = WebsitePromoItem(**item(linkUrl="https://example.com/offer"))
        self.assertEqual(parsed.linkType, "external")

    def test_image_urls_must_be_http_or_site_relative(self):
        WebsitePromoItem(**item(imageUrl="/images/a.jpg"))
        for bad in ("javascript:alert(1)", "data:image/png;base64,AAAA", "//cdn.example/x.jpg", "   "):
            with self.subTest(bad=bad), self.assertRaises(ValidationError):
                WebsitePromoItem(**item(imageUrl=bad))
        with self.assertRaises(ValidationError):
            WebsitePromoItem(**item(bankLogoUrl="ftp://x/y.png"))

    def test_numeric_bounds(self):
        for bad in (dict(minBookingValue=-1), dict(sortOrder=-1), dict(sortOrder=10_000)):
            with self.subTest(bad=bad), self.assertRaises(ValidationError):
                WebsitePromoItem(**item(**bad))


class DealsListValidationTests(unittest.TestCase):
    def test_duplicate_ids_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            WebsiteDeals.model_validate({"items": [item(), item()]})

    def test_unknown_category_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unknown offer category"):
            WebsiteDeals.model_validate({"items": [item(category="cruises")]})

    def test_title_required(self):
        with self.assertRaisesRegex(ValueError, "title"):
            WebsiteDeals.model_validate({"items": [item(title="  ")]})

    def test_all_seven_offer_categories_accepted(self):
        cats = ("holiday", "hotel", "flight", "bus", "bank", "activity", "popup")
        deals = WebsiteDeals.model_validate(
            {"items": [item(id=f"d{i}", category=c) for i, c in enumerate(cats)]}
        )
        self.assertEqual([d.category for d in deals.items], list(cats))


class NoInventedDataTests(unittest.TestCase):
    def test_default_deals_carry_no_offer_claims(self):
        for deal in default_deals():
            with self.subTest(deal=deal.id):
                self.assertEqual(deal.couponCode, "")
                self.assertEqual(deal.discountText, "")
                self.assertEqual(deal.validUntil, "")
                self.assertEqual(deal.minBookingValue, 0)
                self.assertEqual(deal.bankName, "")


class ExpiryTests(unittest.TestCase):
    TODAY = date(2030, 6, 15)

    def test_inclusive_of_end_date(self):
        self.assertFalse(promo_is_expired("2030-06-15", self.TODAY))
        self.assertFalse(promo_is_expired("2030-06-16", self.TODAY))
        self.assertTrue(promo_is_expired("2030-06-14", self.TODAY))

    def test_no_date_never_expires(self):
        self.assertFalse(promo_is_expired("", self.TODAY))

    def test_garbage_is_not_treated_as_expired(self):
        self.assertFalse(promo_is_expired("someday", self.TODAY))


class CmsStoreTests(unittest.TestCase):
    """Service + endpoints against a temp copy of the real CMS file."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.path = self.tmp / "website_cms.json"
        shutil.copy(REAL_CMS, self.path)
        self.service = cms_module.WebsiteCmsService(self.path)
        patcher = mock.patch.object(cms_module, "_service", self.service)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(shutil.rmtree, self.tmp, True)
        app.dependency_overrides[admin_auth.require_admin] = lambda: None
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)

    def put(self, items: list[dict]):
        return self.client.put("/api/admin/website/deals", json={"items": items})

    def test_existing_records_still_load_and_are_unchanged(self):
        deals = self.service.get_cms().deals.items
        self.assertGreaterEqual(len(deals), 4)
        self.assertTrue(all(d.couponCode == "" and d.validUntil == "" for d in deals))

    def test_partial_put_keeps_stored_fields(self):
        full = item(
            id="deal_keep", title="Keep me", couponCode="KEEP-5", discountText="5% off",
            validUntil="2099-01-01", terms="T&C text", minBookingValue=1000, bankName="Some Bank",
            sortOrder=4, subtitle="Sub", description="Desc", ctaLabel="Go",
        )
        self.assertEqual(self.put([*self._existing(), full]).status_code, 200)
        # A stale client re-sends the offer with only the old six fields.
        stale = {"id": "deal_keep", "category": "holiday", "imageUrl": IMG, "title": "Renamed", "active": True}
        self.assertEqual(self.put([*self._existing(), stale]).status_code, 200)
        kept = next(d for d in self.service.get_cms().deals.items if d.id == "deal_keep")
        self.assertEqual(kept.title, "Renamed")
        self.assertEqual(
            (kept.couponCode, kept.discountText, kept.validUntil, kept.terms, kept.minBookingValue,
             kept.bankName, kept.sortOrder, kept.subtitle, kept.description, kept.ctaLabel),
            ("KEEP-5", "5% off", "2099-01-01", "T&C text", 1000, "Some Bank", 4, "Sub", "Desc", "Go"),
        )

    def test_explicit_empty_value_clears_a_field(self):
        self.put([*self._existing(), item(id="deal_c", couponCode="CLEAR-ME")])
        self.put([*self._existing(), item(id="deal_c", couponCode="")])
        got = next(d for d in self.service.get_cms().deals.items if d.id == "deal_c")
        self.assertEqual(got.couponCode, "")

    def test_editing_one_offer_does_not_touch_others(self):
        a = item(id="deal_a", couponCode="AAA-1", title="A")
        b = item(id="deal_b", couponCode="BBB-1", title="B")
        self.put([*self._existing(), a, b])
        self.put([*self._existing(), {**a, "title": "A2"}, b])
        deals = {d.id: d for d in self.service.get_cms().deals.items}
        self.assertEqual((deals["deal_a"].title, deals["deal_a"].couponCode), ("A2", "AAA-1"))
        self.assertEqual((deals["deal_b"].title, deals["deal_b"].couponCode), ("B", "BBB-1"))

    def test_removing_an_item_from_the_list_deletes_it(self):
        self.put([*self._existing(), item(id="deal_gone")])
        self.put(self._existing())
        self.assertNotIn("deal_gone", [d.id for d in self.service.get_cms().deals.items])

    def test_invalid_payload_is_422_and_changes_nothing(self):
        before = self.path.read_text(encoding="utf-8")
        for bad in (item(validUntil="31 Dec 2030"), item(couponCode="no spaces!"), item(linkUrl="//x.y")):
            with self.subTest(bad=bad):
                self.assertEqual(self.put([*self._existing(), bad]).status_code, 422)
        self.assertEqual(self.path.read_text(encoding="utf-8"), before)

    def test_public_deals_hide_inactive_and_expired_and_sort(self):
        self.put([
            item(id="live_b", title="B", sortOrder=2, validUntil="2099-01-01"),
            item(id="live_a", title="A", sortOrder=1),
            item(id="expired", title="Old", validUntil="2000-01-01"),
            item(id="off", title="Off", active=False),
        ])
        ids = [d["id"] for d in self.client.get("/api/website/deals").json()]
        self.assertEqual(ids, ["live_a", "live_b"])
        self.assertEqual([d["id"] for d in self.client.get("/api/website/deals?category=holiday").json()], ["live_a", "live_b"])
        self.assertEqual(self.client.get("/api/website/deals?category=bank").json(), [])

    def test_offer_expires_on_the_day_after_its_end_date(self):
        with mock.patch("app.models.website_cms.datetime") as fake:
            fake.now.return_value.date.return_value = date(2030, 6, 15)
            self.put([item(id="ends_today", validUntil="2030-06-15"), item(id="ended", validUntil="2030-06-14")])
            ids = [d["id"] for d in self.client.get("/api/website/deals").json()]
        self.assertEqual(ids, ["ends_today"])

    def _existing(self) -> list[dict]:
        return [d.model_dump() for d in self.service.get_cms().deals.items if d.id.startswith("deal_flight")
                or d.id in {"deal_hotel_1", "deal_popup_1"}]


if __name__ == "__main__":
    unittest.main()
