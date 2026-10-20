"""Booking-request flow end to end on temporary data (no network, no real email/WhatsApp).

Run from backend/:  .venv/Scripts/python -m unittest discover -s tests -v
"""

from __future__ import annotations

import asyncio
import shutil
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest import mock

from fastapi import BackgroundTasks, HTTPException, Response
from reportlab import rl_config
from starlette.requests import Request

from app import config
from app.models.admin_ops import CustomerLogin
from app.models.booking import (
    AirlineConfirmationRequest,
    BookingDraftRequest,
    BookingReviewRequest,
    ManualPaymentRequest,
    StateNoteRequest,
    TicketIssueRequest,
)
from app.providers.mock_provider import MockFlightProvider
from app.routes import admin as admin_routes
from app.routes import bookings as booking_routes
from app.routes import flights as flight_routes
from app.services import booking_service as booking_module
from app.services import customer_auth_service as auth
from app.services import notification_service
from app.services.booking_rules import document_requirements
from app.services.customer_auth_service import CustomerSession
from app.services.email_service import EmailResult
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf

rl_config.pageCompression = 0  # keep PDF text searchable in assertions

ME = CustomerSession(customer_id="cust_test01", email="traveller@example.com")
SOMEONE_ELSE = CustomerSession(customer_id="cust_other1", email="other@example.com")


def run_tasks(tasks: BackgroundTasks) -> None:
    asyncio.run(tasks())


def request_with_cookie(cookie: str | None) -> Request:
    headers = [(b"cookie", f"{config.CUSTOMER_SESSION_COOKIE}={cookie}".encode())] if cookie else []
    return Request({"type": "http", "headers": headers, "client": ("127.0.0.1", 1)})


class FlowTestBase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.provider = MockFlightProvider(sales_path=self.tmp / "sales.json")
        self.service = booking_module.BookingService(provider=self.provider, path=self.tmp / "bookings.json")
        self._previous = booking_module._booking_service
        booking_module._booking_service = self.service
        self.patches = [
            mock.patch.object(config, "SMTP_HOST", ""),
            mock.patch.object(config, "WHATSAPP_PROVIDER", ""),
            mock.patch.object(config, "WHATSAPP_CALLMEBOT_APIKEY", ""),
            mock.patch.object(config, "WHATSAPP_CLOUD_TOKEN", ""),
            mock.patch.object(config, "BOOKING_NOTIFICATION_EMAIL", "tripimetrips@gmail.com"),
            mock.patch.object(config, "BOOKING_WHATSAPP_NUMBER", "919899640449"),
            # The routes look the flight up through the module-level provider.
            mock.patch.object(booking_routes, "get_flight_provider", return_value=self.provider),
            # Fresh, generous limiters per test (the real ones are shared module state).
            mock.patch.object(booking_routes, "draft_limiter", booking_routes.IpRateLimiter(max_calls=1000)),
            mock.patch.object(booking_routes, "submit_limiter", booking_routes.IpRateLimiter(max_calls=1000)),
        ]
        for p in self.patches:
            p.start()
        self.day = (date.today() + timedelta(days=12)).isoformat()
        self.domestic = self.provider.search("DEL", "BOM", self.day, 1)[0]
        self.international = next(f for f in self.provider.search("DEL", "DXB", self.day, 1) if f.stops == 0)

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()
        booking_module._booking_service = self._previous
        shutil.rmtree(self.tmp, ignore_errors=True)

    # helpers
    def traveller(self, **extra):
        return {"type": "adult", "title": "Ms", "firstName": "Asha", "lastName": "Rao", "gender": "Female",
                "dateOfBirth": "1991-04-12", **extra}

    def draft(self, flight=None, passengers=None, key="checkout-test-0001", session=ME, phone="9876543210", cc="+91"):
        payload = BookingDraftRequest(
            checkoutKey=key,
            flightId=(flight or self.domestic).id,
            passengers=passengers or [self.traveller()],
            contact={"email": "traveller@example.com", "countryCode": cc, "phone": phone},
        )
        return booking_routes.save_draft(payload, session)

    def reviewed(self, **kw):
        booking = self.draft(**kw)
        result = booking_routes.review_booking(booking.bookingId, BookingReviewRequest(expectedTotal=booking.totalAmount), kw.get("session", ME))
        self.assertFalse(result.priceChanged)
        return result.booking

    def submit(self, booking, session=ME):
        tasks = BackgroundTasks()
        result = booking_routes.submit_booking_request(booking.bookingId, tasks, session)
        run_tasks(tasks)
        return result

    def stored(self, booking_id):
        return self.service.get_booking(booking_id)


class PublicSearchAndAuthTest(FlowTestBase):
    def test_guest_can_search_without_signing_in(self) -> None:
        with mock.patch.object(flight_routes.flight_service, "provider", self.provider):
            result = flight_routes.search_flights("DEL", "BOM", self.day, None, 1, 0, 0, "Economy", 1)
        self.assertGreater(result.count, 0)

    def test_booking_endpoints_need_a_session(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            auth.require_session(request_with_cookie(None))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIsNone(auth.optional_session(request_with_cookie("forged.token.value")))

    def test_session_cookie_is_http_only_and_round_trips(self) -> None:
        response = Response()
        auth.start_session(response, CustomerLogin(id="cust_test01", email="Traveller@Example.com"))
        cookie = response.headers["set-cookie"]
        self.assertIn("HttpOnly", cookie)
        token = cookie.split("=", 1)[1].split(";", 1)[0]
        session = auth.optional_session(request_with_cookie(token))
        self.assertEqual((session.customer_id, session.email), ("cust_test01", "traveller@example.com"))


class TravellerValidationTest(FlowTestBase):
    def test_domestic_needs_no_passport(self) -> None:
        req = document_requirements(self.domestic, None)
        self.assertFalse(req.international or req.passportRequired or req.nationalityRequired)
        booking = self.draft(passengers=[self.traveller(passportNumber="Z1234567")])
        self.assertIsNone(booking.passengers[0].passportNumber, "unneeded document data isn't stored")

    def test_international_requires_documents(self) -> None:
        req = document_requirements(self.international, None)
        self.assertTrue(req.passportRequired and req.nationalityRequired)
        self.assertIn("United Arab Emirates", req.countries)
        self.assertIn("6 months", req.passportValidityAdvice)
        with self.assertRaises(HTTPException):
            self.draft(flight=self.international)
        trip_end = date.fromisoformat(req.lastTravelDate)
        with self.assertRaises(HTTPException):  # expires before the trip ends
            self.draft(flight=self.international, passengers=[self.traveller(
                passportNumber="Z1234567", nationality="Indian", passportExpiry=(trip_end - timedelta(days=1)).isoformat())])
        # Valid through the trip but < 6 months after: allowed (advice, not a rule).
        ok = self.draft(flight=self.international, key="checkout-intl-0002", passengers=[self.traveller(
            passportNumber="z1234567", nationality="Indian", passportExpiry=(trip_end + timedelta(days=30)).isoformat())])
        self.assertEqual(ok.passengers[0].passportNumber, "Z1234567")

    def test_invalid_contact_and_traveller_details(self) -> None:
        for kwargs in ({"phone": "123456"}, {"phone": "5876543210"}, {"phone": "98765432", "cc": "+971"}):
            if kwargs.get("cc") == "+971":
                self.draft(key="checkout-ae-0001", **kwargs)  # 8 digits is valid for +971
                continue
            with self.assertRaises(HTTPException):
                self.draft(**kwargs)
        with self.assertRaises(HTTPException):  # child too old
            self.draft(passengers=[self.traveller(), self.traveller(type="child", title="Mstr", firstName="Kid",
                                                                    gender="Male", dateOfBirth="2005-01-01")])
        with self.assertRaises(HTTPException):  # duplicate traveller
            self.draft(passengers=[self.traveller(), self.traveller()])
        with self.assertRaises(HTTPException):  # more infants than adults
            self.draft(passengers=[self.traveller(), self.traveller(type="infant", firstName="Baby", dateOfBirth="2026-01-01"),
                                   self.traveller(type="infant", firstName="Babe", dateOfBirth="2026-02-01")])


class BookingRequestTest(FlowTestBase):
    def test_draft_review_submit_never_pays_or_tickets(self) -> None:
        seats_before = self.provider.get_by_id(self.domestic.id).availableSeats
        booking = self.draft()
        self.assertEqual(booking.state, "PASSENGERS_COMPLETED")
        self.assertTrue(booking.bookingId.startswith("TRQ-"))
        self.assertIsNone(booking.pnr)
        with self.assertRaises(HTTPException):  # can't submit before review
            self.submit(booking)
        booking = self.reviewed(key="checkout-test-0001")
        submitted = self.submit(booking)
        self.assertEqual(submitted.state, "PAYMENT_PENDING")
        self.assertEqual(submitted.paymentStatus, "pending")
        self.assertIsNone(submitted.payment)
        self.assertIsNone(submitted.pnr)
        self.assertEqual(submitted.ticketNumbers, [])
        self.assertEqual(self.provider.get_by_id(self.domestic.id).availableSeats, seats_before - 1, "seats held")
        with self.assertRaises(HTTPException) as ctx:
            booking_routes.download_ticket(submitted.bookingId, ME)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn(b"PAYMENT PENDING", build_invoice_pdf(self.stored(submitted.bookingId)))

    def test_resubmitting_is_idempotent(self) -> None:
        booking = self.reviewed()
        self.submit(booking)
        again = self.submit(booking)
        self.assertEqual(again.state, "PAYMENT_PENDING")
        requested = [r for r in self.stored(booking.bookingId).notifications if r.event == "booking_requested"]
        self.assertEqual(len(requested), 3, "team email + team WhatsApp + traveller email, once each")
        with self.assertRaises(HTTPException):  # submitted bookings can't be edited
            self.draft()

    def test_same_checkout_updates_and_references_are_unique(self) -> None:
        first = self.draft()
        second = self.draft(passengers=[self.traveller(firstName="Asha Devi")])
        self.assertEqual(first.bookingId, second.bookingId)
        self.assertEqual(second.passengers[0].firstName, "Asha Devi")
        refs = {self.draft(key=f"checkout-unique-{i:04d}").bookingId for i in range(15)}
        self.assertEqual(len(refs), 15)

    def test_price_change_sends_traveller_back_to_review(self) -> None:
        booking = self.draft()
        result = booking_routes.review_booking(booking.bookingId, BookingReviewRequest(expectedTotal=booking.totalAmount - 500), ME)
        self.assertTrue(result.priceChanged)
        self.assertEqual(result.booking.state, "PASSENGERS_COMPLETED")

    def test_only_the_owner_can_see_a_booking(self) -> None:
        booking = self.draft()
        with self.assertRaises(HTTPException) as ctx:
            booking_routes.get_booking(booking.bookingId, SOMEONE_ELSE)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(booking_routes.my_bookings(SOMEONE_ELSE), [])
        self.assertEqual(len(booking_routes.my_bookings(ME)), 1)


class AdminLifecycleTest(FlowTestBase):
    def submitted(self):
        return self.submit(self.reviewed())

    def test_manual_payment_airline_confirmation_and_ticket(self) -> None:
        booking = self.submitted()
        tasks = BackgroundTasks()
        with self.assertRaises(HTTPException):  # wrong amount
            admin_routes.confirm_payment(booking.bookingId, ManualPaymentRequest(reference="UPI123456", amount=1), tasks)
        with self.assertRaises(HTTPException):  # can't confirm with airline before payment
            admin_routes.confirm_booking(booking.bookingId, AirlineConfirmationRequest(airlinePnr="ABC123"), tasks)
        paid = admin_routes.confirm_payment(
            booking.bookingId, ManualPaymentRequest(reference="UPI123456", amount=booking.totalAmount), tasks)
        self.assertEqual(paid.state, "PAYMENT_CONFIRMED")
        self.assertEqual(paid.payment.verifiedBy, "admin")
        other = self.submit(self.reviewed(key="checkout-second-01"))
        with self.assertRaises(HTTPException):  # same bank reference twice
            admin_routes.confirm_payment(other.bookingId, ManualPaymentRequest(reference="UPI123456", amount=other.totalAmount), tasks)
        with self.assertRaises(HTTPException):  # tickets need the airline PNR first
            admin_routes.issue_ticket(booking.bookingId, TicketIssueRequest(ticketNumbers=["0981234567890"]), tasks)
        confirmed = admin_routes.confirm_booking(booking.bookingId, AirlineConfirmationRequest(airlinePnr="abc123"), tasks)
        self.assertEqual((confirmed.state, confirmed.pnr), ("BOOKING_CONFIRMED", "ABC123"))
        issued = admin_routes.issue_ticket(booking.bookingId, TicketIssueRequest(ticketNumbers=["0981234567890"]), tasks)
        run_tasks(tasks)
        self.assertEqual(issued.state, "TICKET_ISSUED")
        ticket = build_ticket_pdf(self.stored(booking.bookingId))
        self.assertIn(b"0981234567890", ticket)
        self.assertEqual(
            [h.toStatus for h in issued.statusHistory],
            ["DRAFT", "PASSENGERS_COMPLETED", "REVIEWED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "BOOKING_CONFIRMED", "TICKET_ISSUED"],
        )

    def test_payment_failure_and_cancellation_release_seats(self) -> None:
        booking = self.submitted()
        held = self.provider.get_by_id(self.domestic.id).availableSeats
        failed = admin_routes.fail_payment(booking.bookingId, StateNoteRequest(note="No payment after 24h"), BackgroundTasks())
        self.assertEqual((failed.state, failed.paymentStatus), ("PAYMENT_FAILED", "failed"))
        cancelled = admin_routes.cancel_booking(booking.bookingId, admin_routes.CancelRequest(reason="Expired"), BackgroundTasks())
        self.assertEqual(cancelled.state, "CANCELLED")
        self.assertEqual(self.provider.get_by_id(self.domestic.id).availableSeats, held + 1)


class NotificationTest(FlowTestBase):
    def test_unconfigured_channels_are_logged_and_never_include_passports(self) -> None:
        booking = self.draft(flight=self.international, passengers=[self.traveller(
            passportNumber="Z9988776", nationality="Indian", passportExpiry="2034-01-01")])
        booking = booking_routes.review_booking(booking.bookingId, BookingReviewRequest(expectedTotal=booking.totalAmount), ME).booking
        self.submit(booking)
        records = self.stored(booking.bookingId).notifications
        self.assertEqual({r.status for r in records}, {"not_configured"})
        self.assertEqual({(r.channel, r.recipient) for r in records}, {
            ("email", "tripimetrips@gmail.com"), ("whatsapp", "+919899640449"), ("email", "traveller@example.com")})
        for record in records:
            self.assertIn(booking.bookingId, record.preview)
            self.assertNotIn("Z9988776", record.preview)
            self.assertIn("NOT confirmed" if record.audience == "customer" else "verify availability", record.preview)

    def test_email_success_and_failure_are_recorded_honestly(self) -> None:
        with mock.patch.object(notification_service, "send_email", return_value=EmailResult("sent", "accepted")):
            ok = self.submit(self.reviewed())
        emails = [r for r in self.stored(ok.bookingId).notifications if r.channel == "email"]
        self.assertEqual({r.status for r in emails}, {"sent"})
        whatsapp = [r for r in self.stored(ok.bookingId).notifications if r.channel == "whatsapp"]
        self.assertEqual({r.status for r in whatsapp}, {"not_configured"}, "no WhatsApp API configured")

        with mock.patch.object(notification_service, "send_email", return_value=EmailResult("failed", "SMTP error: boom")):
            bad = self.submit(self.reviewed(key="checkout-fail-0001"))
        emails = [r for r in self.stored(bad.bookingId).notifications if r.channel == "email"]
        self.assertEqual({r.status for r in emails}, {"failed"})


class LegacyMigrationTest(unittest.TestCase):
    def test_old_mock_bookings_are_marked_and_lose_fake_pnr(self) -> None:
        from app.models.booking import Booking

        raw = {
            "bookingId": "BK-20260804-10001", "pnr": "ABC123", "status": "CONFIRMED",
            "createdAt": "2026-08-04T05:00:00+00:00", "accessToken": "old-token",
            "flight": {"id": "FL-1", "airline": {"name": "IndiGo", "code": "6E"}, "flightNumber": "6E 1",
                       "origin": {"city": "Delhi", "airport": "DEL", "code": "DEL"},
                       "destination": {"city": "Mumbai", "airport": "BOM", "code": "BOM"},
                       "departureDate": "2026-08-20", "departureTime": "06:00", "arrivalDate": "2026-08-20",
                       "arrivalTime": "08:00", "durationMinutes": 120, "aircraft": "A320",
                       "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "availableSeats": 9,
                       "baggage": {"cabin": "7 KG", "checkIn": "15 KG"}, "refundable": False},
            "passengers": [{"title": "Mr", "firstName": "A", "lastName": "B", "gender": "Male", "dateOfBirth": "1990-01-01"}],
            "contact": {"email": "a@b.com", "phone": "9999999999"}, "passengerCount": 1,
            "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "totalAmount": 4800,
        }
        booking = Booking.model_validate(raw)
        self.assertTrue(booking.legacy)
        self.assertEqual(booking.state, "BOOKING_CONFIRMED")
        self.assertIsNone(booking.pnr)
        self.assertNotIn("accessToken", booking.model_dump())


class RateLimitTest(unittest.TestCase):
    def test_submissions_are_rate_limited(self) -> None:
        limiter = booking_routes.IpRateLimiter(max_calls=2, window_seconds=60)
        limiter.check("cust_x")
        limiter.check("cust_x")
        with self.assertRaises(HTTPException) as ctx:
            limiter.check("cust_x")
        self.assertEqual(ctx.exception.status_code, 429)


if __name__ == "__main__":
    unittest.main()
