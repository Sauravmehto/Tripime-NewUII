"""Booking → payment → documents → notifications, end to end on temporary data.

Run from backend/:  .venv/Scripts/python -m unittest discover -s tests -v
No network: SMTP/WhatsApp are unconfigured in tests unless a sender is patched.
"""

from __future__ import annotations

import asyncio
import shutil
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest import mock

from fastapi import BackgroundTasks, HTTPException
from reportlab import rl_config

from app import config
from app.models.booking import BookingCreateRequest, BookingPayRequest
from app.providers.mock_provider import MockFlightProvider
from app.routes import admin as admin_routes
from app.routes import bookings as booking_routes
from app.services import booking_service as booking_module
from app.services import notification_service
from app.services.email_service import EmailResult
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf
from app.services.whatsapp_service import SendResult

rl_config.pageCompression = 0  # keep PDF text searchable in assertions


def run_tasks(tasks: BackgroundTasks) -> None:
    asyncio.run(tasks())


class BookingPaymentFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.provider = MockFlightProvider(sales_path=self.tmp / "sales.json")
        self.service = booking_module.BookingService(provider=self.provider, path=self.tmp / "bookings.json")
        # Routes and the notification service use the module-level singleton.
        self._previous = booking_module._booking_service
        booking_module._booking_service = self.service
        # Never touch real SMTP/WhatsApp from tests.
        self.patches = [
            mock.patch.object(config, "SMTP_HOST", ""),
            mock.patch.object(config, "WHATSAPP_PROVIDER", ""),
            mock.patch.object(config, "WHATSAPP_CALLMEBOT_APIKEY", ""),
            mock.patch.object(config, "WHATSAPP_CLOUD_TOKEN", ""),
            mock.patch.object(config, "ADMIN_NOTIFY_EMAIL", "tripimetrips@gmail.com"),
            mock.patch.object(config, "WHATSAPP_ALERT_PHONE", "919899644177"),
        ]
        for p in self.patches:
            p.start()

        day = (date.today() + timedelta(days=12)).isoformat()
        self.flight = self.provider.search("DEL", "BOM", day, 1)[0]

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()
        booking_module._booking_service = self._previous
        shutil.rmtree(self.tmp, ignore_errors=True)

    # ---- helpers ----------------------------------------------------------------

    def payload(self, key: str = "checkout-test-0001") -> BookingCreateRequest:
        return BookingCreateRequest(
            checkoutKey=key,
            flightId=self.flight.id,
            passengers=[
                {"type": "adult", "title": "Mr", "firstName": "Test", "lastName": "Traveller",
                 "gender": "Male", "dateOfBirth": "1990-05-01"}
            ],
            contact={"email": "customer@example.com", "phone": "9876543210"},
            seats=[{"leg": "outbound", "segment": 0, "passengerIndex": 0, "seatNumber": "7C",
                    "seatType": "standard", "price": 0}],
        )

    def create(self, key: str = "checkout-test-0001"):
        tasks = BackgroundTasks()
        booking = booking_routes.create_booking(self.payload(key), tasks)
        run_tasks(tasks)
        return booking

    def pay(self, booking, fail: bool = False):
        tasks = BackgroundTasks()
        result = booking_routes.pay_booking(
            booking.bookingId, BookingPayRequest(method="upi", simulateFailure=fail), tasks, token=booking.accessToken
        )
        run_tasks(tasks)
        return result

    def stored(self, booking_id: str):
        return self.service.get_booking(booking_id)

    # ---- booking creation -------------------------------------------------------

    def test_create_is_pending_with_token_and_history(self) -> None:
        seats_before = self.flight.availableSeats
        booking = self.create()
        self.assertEqual((booking.paymentStatus, booking.bookingStatus), ("pending", "pending"))
        self.assertEqual(booking.invoiceNumber, f"INV-{booking.bookingId}")
        self.assertGreaterEqual(len(booking.accessToken), 20)
        self.assertEqual([h.toStatus for h in booking.statusHistory], ["pending", "pending"])
        self.assertEqual(booking.notifications, [], "customers never see the notification log")
        self.assertIsNone(booking.checkoutKey, "idempotency key isn't exposed")
        self.assertEqual(self.provider.get_by_id(self.flight.id).availableSeats, seats_before - 1)

    def test_same_checkout_key_returns_same_booking(self) -> None:
        first = self.create("checkout-dup-001")
        second = self.create("checkout-dup-001")
        self.assertEqual(first.bookingId, second.bookingId)
        self.assertEqual(len(self.service.list_bookings()), 1)
        created_notices = [r for r in self.stored(first.bookingId).notifications if r.event == "booking_created"]
        self.assertEqual(len(created_notices), 3, "admin email + admin WhatsApp + customer email, once each")

    def test_wrong_token_is_404(self) -> None:
        booking = self.create()
        with self.assertRaises(HTTPException) as ctx:
            booking_routes.get_booking(booking.bookingId, token="not-the-right-token")
        self.assertEqual(ctx.exception.status_code, 404)

    # ---- payment ---------------------------------------------------------------

    def test_failed_then_successful_payment(self) -> None:
        booking = self.create()
        failed = self.pay(booking, fail=True)
        self.assertEqual((failed.paymentStatus, failed.bookingStatus), ("failed", "pending"))
        self.assertIsNone(failed.payment)
        self.assertEqual(failed.payments[-1].status, "FAILED")

        paid = self.pay(booking)
        self.assertEqual((paid.paymentStatus, paid.bookingStatus), ("paid", "pending"))
        self.assertEqual(paid.payment.amount, paid.totalAmount, "amount comes from the server")
        self.assertTrue(paid.payment.testMode)
        self.assertEqual(paid.payment.payee, "tripimetrips@test.upi")
        self.assertEqual(len(paid.payments), 2)
        self.assertEqual([h.toStatus for h in paid.statusHistory if h.field == "payment"], ["pending", "failed", "paid"])

    def test_paying_twice_is_idempotent(self) -> None:
        booking = self.create()
        self.pay(booking)
        again = self.pay(booking)
        self.assertEqual(len(again.payments), 1)
        paid_notices = [r for r in self.stored(booking.bookingId).notifications if r.event == "payment_paid"]
        self.assertEqual(len(paid_notices), 3)

    def test_simulated_failure_refused_outside_test_mode(self) -> None:
        booking = self.create()
        with mock.patch.object(booking_module, "get_payment_provider") as get_provider:
            get_provider.return_value.can_simulate_failure = False
            with self.assertRaises(HTTPException) as ctx:
                self.pay(booking, fail=True)
        self.assertEqual(ctx.exception.status_code, 400)

    # ---- admin status changes ---------------------------------------------------

    def test_confirm_requires_payment_and_cancel_releases_seats(self) -> None:
        booking = self.create()
        with self.assertRaises(HTTPException):
            admin_routes.confirm_booking(booking.bookingId, BackgroundTasks())
        self.pay(booking)
        tasks = BackgroundTasks()
        confirmed = admin_routes.confirm_booking(booking.bookingId, tasks)
        run_tasks(tasks)
        self.assertEqual(confirmed.bookingStatus, "confirmed")

        seats_held = self.provider.get_by_id(self.flight.id).availableSeats
        tasks = BackgroundTasks()
        cancelled = admin_routes.cancel_booking(booking.bookingId, admin_routes.CancelRequest(reason="Test"), tasks)
        run_tasks(tasks)
        self.assertEqual(cancelled.bookingStatus, "cancelled")
        self.assertIn("refund", cancelled.statusHistory[-1].note)
        self.assertEqual(self.provider.get_by_id(self.flight.id).availableSeats, seats_held + 1)
        # A cancelled, unpaid booking can't be paid.
        other = self.create("checkout-other-2")
        admin_routes.cancel_booking(other.bookingId, admin_routes.CancelRequest(), BackgroundTasks())
        with self.assertRaises(HTTPException) as ctx:
            self.pay(other)
        self.assertEqual(ctx.exception.status_code, 409)

    # ---- documents -------------------------------------------------------------

    def test_documents_reflect_payment_state(self) -> None:
        booking = self.create()
        invoice = build_invoice_pdf(self.stored(booking.bookingId))
        ticket = build_ticket_pdf(self.stored(booking.bookingId))
        self.assertTrue(invoice.startswith(b"%PDF") and ticket.startswith(b"%PDF"))
        self.assertIn(b"PENDING PAYMENT", invoice)
        self.assertIn(b"not valid for travel", ticket)
        self.assertIn(booking.invoiceNumber.encode(), invoice)

        self.pay(booking)
        paid_invoice = build_invoice_pdf(self.stored(booking.bookingId))
        self.assertNotIn(b"PENDING PAYMENT", paid_invoice)
        self.assertIn(b"(PAID)", paid_invoice)
        self.assertIn(b"TEST PAYMENT", paid_invoice)
        self.assertIn(b"ticket being issued", build_ticket_pdf(self.stored(booking.bookingId)))

        admin_routes.confirm_booking(booking.bookingId, BackgroundTasks())
        self.assertIn(b"CONFIRMED", build_ticket_pdf(self.stored(booking.bookingId)))

    def test_customer_download_routes_need_token(self) -> None:
        booking = self.create()
        response = booking_routes.download_ticket(booking.bookingId, token=booking.accessToken)
        self.assertEqual(response.media_type, "application/pdf")
        with self.assertRaises(HTTPException):
            booking_routes.download_invoice(booking.bookingId, token="wrong-token-123")

    # ---- notifications ----------------------------------------------------------

    def test_unconfigured_channels_are_logged_not_claimed(self) -> None:
        booking = self.create()
        records = self.stored(booking.bookingId).notifications
        self.assertEqual({r.status for r in records}, {"not_configured"})
        self.assertEqual(
            {(r.channel, r.recipient) for r in records},
            {("email", "tripimetrips@gmail.com"), ("whatsapp", "+919899644177"), ("email", "customer@example.com")},
        )
        self.assertTrue(all(booking.bookingId in r.preview for r in records))

    def test_failed_attempts_notify_separately_and_retry_updates_status(self) -> None:
        booking = self.create()
        self.pay(booking, fail=True)
        self.pay(booking, fail=True)
        failed = [r for r in self.stored(booking.bookingId).notifications if r.event == "payment_failed"]
        self.assertEqual(len(failed), 6, "two attempts × three recipients")

        with mock.patch.object(notification_service, "send_email", return_value=EmailResult("sent", "ok")), \
                mock.patch.object(notification_service, "send_whatsapp_text", return_value=SendResult("sent", "callmebot", "ok")):
            admin_routes.retry_notifications(booking.bookingId)
        records = self.stored(booking.bookingId).notifications
        self.assertEqual({r.status for r in records}, {"sent"})
        self.assertEqual(len(records), 9, "retries replace records instead of duplicating them")

    def test_smtp_failure_is_reported_as_failed(self) -> None:
        with mock.patch.object(notification_service, "send_email", return_value=EmailResult("failed", "SMTP error: boom")):
            booking = self.create()
        emails = [r for r in self.stored(booking.bookingId).notifications if r.channel == "email"]
        self.assertEqual({r.status for r in emails}, {"failed"})
        self.assertIn("boom", emails[0].detail)


class LegacyBookingMigrationTest(unittest.TestCase):
    def test_old_records_get_split_statuses(self) -> None:
        from app.models.booking import Booking

        raw = {
            "bookingId": "BK-20260804-10001", "pnr": "ABC123", "status": "CONFIRMED",
            "createdAt": "2026-08-04T05:00:00+00:00", "confirmedAt": "2026-08-04T06:00:00+00:00",
            "flight": {"id": "FL-20260820-DEL-BOM-001", "airline": {"name": "IndiGo", "code": "6E"},
                       "flightNumber": "6E 1", "origin": {"city": "Delhi", "airport": "DEL", "code": "DEL"},
                       "destination": {"city": "Mumbai", "airport": "BOM", "code": "BOM"},
                       "departureDate": "2026-08-20", "departureTime": "06:00", "arrivalDate": "2026-08-20",
                       "arrivalTime": "08:00", "durationMinutes": 120, "aircraft": "A320",
                       "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "availableSeats": 9,
                       "baggage": {"cabin": "7 KG", "checkIn": "15 KG"}, "refundable": False},
            "passengers": [{"title": "Mr", "firstName": "A", "lastName": "B", "gender": "Male", "dateOfBirth": "1990-01-01"}],
            "contact": {"email": "a@b.com", "phone": "9999999999"}, "passengerCount": 1, "seats": [],
            "fare": {"baseFare": 4000, "taxes": 800, "totalFare": 4800}, "seatCharges": 0, "totalAmount": 4800,
            "payment": {"paymentId": "PAY-1", "transactionId": "TXN-1", "method": "upi", "amount": 4800,
                        "status": "SUCCESS", "paidAt": "2026-08-04T05:00:00+00:00"},
        }
        booking = Booking.model_validate(raw)
        self.assertEqual((booking.paymentStatus, booking.bookingStatus), ("paid", "confirmed"))
        self.assertEqual(booking.status, "CONFIRMED")
        self.assertEqual(booking.invoiceNumber, "INV-BK-20260804-10001")
        self.assertEqual([h.toStatus for h in booking.statusHistory], ["pending", "paid", "confirmed"])


if __name__ == "__main__":
    unittest.main()
