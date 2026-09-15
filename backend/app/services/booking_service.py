from __future__ import annotations

import json
import random
import string
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.models.booking import (
    Booking,
    BookingContact,
    BookingCreateRequest,
    BookingFare,
    BookingPassenger,
    BookingPayment,
    BookingSeat,
)
from app.providers.base import FlightProvider
from app.services.flight_service import get_flight_provider

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
BOOKINGS_PATH = DATA_DIR / "bookings.json"


def _normalize_contact(value: str) -> str:
    """Lowercase + strip for emails, digits-only for phone numbers, so
    "+91 98765-43210" and "9876543210" (or mismatched email casing) still match."""
    value = value.strip().lower()
    digits = "".join(ch for ch in value if ch.isdigit())
    # If it looks like a phone number (mostly digits), compare digits only.
    if digits and len(digits) >= 7 and len(digits) >= len(value) - 2:
        return digits
    return value


class BookingService:
    def __init__(
        self,
        provider: FlightProvider | None = None,
        path: Path = BOOKINGS_PATH,
    ) -> None:
        self.provider = provider or get_flight_provider()
        self._path = path
        self._lock = Lock()
        self._bookings = self._load()
        self._processed_payments: set[str] = {
            b.payment.paymentId for b in self._bookings if b.payment
        }

    def _load(self) -> list[Booking]:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("[]", encoding="utf-8")
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        bookings: list[Booking] = []
        for item in raw:
            # Skip legacy bookings that lack the new fields
            if "payment" not in item or "seats" not in item:
                continue
            bookings.append(Booking.model_validate(item))
        return bookings

    def _save(self) -> None:
        payload = [booking.model_dump() for booking in self._bookings]
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _next_booking_id(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        seq = 10001 + len(self._bookings)
        return f"BK-{today}-{seq}"

    @staticmethod
    def _generate_pnr() -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "".join(random.choices(alphabet, k=6))

    def create_booking(self, payload: BookingCreateRequest) -> Booking:
        if payload.payment.paymentId in self._processed_payments:
            existing = next(
                (b for b in self._bookings if b.payment.paymentId == payload.payment.paymentId),
                None,
            )
            if existing:
                return existing
            raise HTTPException(status_code=409, detail="This payment was already used.")

        if payload.payment.status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Payment must be successful before booking.")

        passenger_count = len(payload.passengers)
        if len(payload.seats) != passenger_count:
            raise HTTPException(
                status_code=400,
                detail="Number of seats must match number of passengers.",
            )

        seat_numbers = [s.seatNumber for s in payload.seats]
        if len(set(seat_numbers)) != len(seat_numbers):
            raise HTTPException(status_code=400, detail="Duplicate seat selections are not allowed.")

        indices = sorted(s.passengerIndex for s in payload.seats)
        if indices != list(range(passenger_count)):
            raise HTTPException(status_code=400, detail="Seat passenger indices are invalid.")

        flight = self.provider.get_by_id(payload.flightId)
        if flight is None:
            raise HTTPException(status_code=404, detail=f"Flight '{payload.flightId}' not found.")

        if flight.availableSeats < passenger_count:
            raise HTTPException(status_code=400, detail="Not enough seats available on this flight.")

        updated_flight = self.provider.decrement_seats(payload.flightId, passenger_count)

        seat_by_index = {s.passengerIndex: s for s in payload.seats}
        seat_charges = sum(s.price for s in payload.seats)
        fare = BookingFare(
            baseFare=updated_flight.fare.baseFare * passenger_count,
            taxes=updated_flight.fare.taxes * passenger_count,
            totalFare=updated_flight.fare.totalFare * passenger_count,
            currency=updated_flight.fare.currency,
        )
        total_amount = fare.totalFare + seat_charges

        if payload.payment.amount != total_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Payment amount {payload.payment.amount} does not match total {total_amount}.",
            )

        now = datetime.now(timezone.utc).isoformat()
        booking = Booking(
            bookingId=self._next_booking_id(),
            pnr=self._generate_pnr(),
            status="PROCESSING",
            createdAt=now,
            confirmedAt=None,
            flight=updated_flight,
            passengers=[
                BookingPassenger(
                    **passenger.model_dump(),
                    seatNumber=seat_by_index[index].seatNumber,
                )
                for index, passenger in enumerate(payload.passengers)
            ],
            contact=BookingContact(**payload.contact.model_dump()),
            passengerCount=passenger_count,
            seats=[BookingSeat(**seat.model_dump()) for seat in payload.seats],
            fare=fare,
            seatCharges=seat_charges,
            totalAmount=total_amount,
            payment=BookingPayment(**payload.payment.model_dump()),
        )

        with self._lock:
            self._bookings.append(booking)
            self._processed_payments.add(payload.payment.paymentId)
            self._save()

        return booking

    def get_booking(self, booking_id: str) -> Booking | None:
        for booking in self._bookings:
            if booking.bookingId == booking_id:
                return booking
        return None

    def find_booking_by_reference(self, reference: str, contact: str) -> Booking | None:
        """Look up a booking by booking ID or PNR, verified against the email/phone
        on file. Used by the public "My Booking" page — deliberately requires both
        pieces of information so booking IDs (which are sequential, not secret)
        can't be enumerated to read other travellers' details."""
        ref_normalized = reference.strip().upper()
        contact_normalized = _normalize_contact(contact)
        if not ref_normalized or not contact_normalized:
            return None

        for booking in self._bookings:
            if ref_normalized not in {booking.bookingId.upper(), booking.pnr.upper()}:
                continue
            booking_email = _normalize_contact(booking.contact.email)
            booking_phone = _normalize_contact(booking.contact.phone)
            if contact_normalized in {booking_email, booking_phone}:
                return booking
        return None

    def list_bookings(self) -> list[Booking]:
        return sorted(self._bookings, key=lambda b: b.createdAt, reverse=True)

    def confirm_booking(self, booking_id: str) -> tuple[Booking, bool]:
        """Confirm a PROCESSING booking. Returns (booking, newly_confirmed)."""
        booking = self.get_booking(booking_id)
        if booking is None:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")

        if booking.status == "CONFIRMED":
            return booking, False

        now = datetime.now(timezone.utc).isoformat()
        confirmed = booking.model_copy(update={"status": "CONFIRMED", "confirmedAt": now})

        with self._lock:
            for index, existing in enumerate(self._bookings):
                if existing.bookingId == booking_id:
                    self._bookings[index] = confirmed
                    self._save()
                    return confirmed, True

        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")


_booking_service: BookingService | None = None


def get_booking_service() -> BookingService:
    global _booking_service
    if _booking_service is None:
        _booking_service = BookingService()
    return _booking_service
