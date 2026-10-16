from __future__ import annotations

import json
import random
import secrets
import string
from datetime import date, datetime, timedelta, timezone
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
    BookingPayRequest,
    BookingSeat,
    FareLine,
    InvoiceDetails,
    NotificationRecord,
    StatusChange,
    InvoiceUpdateRequest,
)
from app.models.flight import Flight
from app.models.payment import ChargeRequest
from app.providers.base import FlightProvider
from app.providers.flight_network import is_international
from app.services.flight_service import get_flight_provider, validate_passenger_mix
from app.services.payment_service import get_payment_provider

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


def _age_on(dob: date, on: date) -> int:
    return on.year - dob.year - ((on.month, on.day) < (dob.month, dob.day))


def _pax_units(legs: list[tuple[str, Flight]], adults: int, children: int, infants: int):
    """Yield (leg, passenger type, count, (base, taxes, total)) per leg and passenger type."""
    for leg, flight in legs:
        fare = flight.fare
        rows = (
            ("adult", adults, (fare.baseFare, fare.taxes, fare.totalFare)),
            ("child", children, (fare.childBaseFare, fare.childTaxes, fare.childTotalFare)),
            ("infant", infants, (fare.infantBaseFare, fare.infantTaxes, fare.infantTotalFare)),
        )
        for pax_type, count, unit in rows:
            if count:
                yield leg, pax_type, count, unit


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

    def _load(self) -> list[Booking]:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("[]", encoding="utf-8")
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        bookings: list[Booking] = []
        migrated = False
        for item in raw:
            # Skip legacy bookings that lack the new fields
            if "seats" not in item or ("payment" not in item and "paymentStatus" not in item):
                continue
            booking = Booking.model_validate(item)
            if not booking.accessToken:
                # Older records predate document access tokens.
                booking = booking.model_copy(update={"accessToken": secrets.token_urlsafe(24)})
                migrated = True
            bookings.append(booking)
        if migrated:
            self._path.write_text(json.dumps([b.model_dump() for b in bookings], indent=2), encoding="utf-8")
        return bookings

    def _save(self) -> None:
        payload = [booking.model_dump() for booking in self._bookings]
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _next_booking_id(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        # Highest sequence so far + 1, so IDs stay unique even if records are removed.
        seqs = [int(b.bookingId.rsplit("-", 1)[-1]) for b in self._bookings if b.bookingId.rsplit("-", 1)[-1].isdigit()]
        return f"BK-{today}-{max(seqs, default=10000) + 1}"

    @staticmethod
    def _generate_pnr() -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "".join(random.choices(alphabet, k=6))

    def create_booking(self, payload: BookingCreateRequest) -> tuple[Booking, bool]:
        """Create a booking awaiting payment and hold its seats.
        Returns (booking, created); a repeated checkout key returns the existing booking."""
        existing = next((b for b in self._bookings if b.checkoutKey == payload.checkoutKey), None)
        if existing is not None:
            if existing.flight.id != payload.flightId or (existing.returnFlight.id if existing.returnFlight else None) != (
                payload.returnFlightId or None
            ):
                raise HTTPException(status_code=409, detail="This checkout was already used for a different trip.")
            return existing, False

        flight, return_flight = self._resolve_flights(payload)
        legs: list[tuple[str, Flight]] = [("outbound", flight)]
        if return_flight is not None:
            legs.append(("return", return_flight))

        types = [p.type for p in payload.passengers]
        adults, children, infants = types.count("adult"), types.count("child"), types.count("infant")
        validate_passenger_mix(adults, children, infants)
        last_travel_date = (return_flight or flight).departureDate
        self._validate_passenger_details(payload, flight.departureDate, last_travel_date)
        if is_international(flight.origin.code, flight.destination.code):
            self._validate_passports(payload, last_travel_date)

        seated = [i for i, p in enumerate(payload.passengers) if p.type != "infant"]
        seats_by_leg = self._validate_seats(
            payload, seated, [(leg, max(1, len(f.segments))) for leg, f in legs]
        )
        for leg, leg_flight in legs:
            if leg_flight.availableSeats < len(seated):
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough seats available on the {leg} flight {leg_flight.flightNumber}.",
                )

        units = list(_pax_units(legs, adults, children, infants))
        breakdown = [
            FareLine(leg=leg, passengerType=pax_type, count=count, unitFare=unit[2], total=unit[2] * count)
            for leg, pax_type, count, unit in units
        ]
        fare = BookingFare(
            baseFare=sum(unit[0] * count for _, _, count, unit in units),
            taxes=sum(unit[1] * count for _, _, count, unit in units),
            totalFare=sum(line.total for line in breakdown),
            currency=flight.fare.currency,
        )
        seat_charges = sum(s.price for s in payload.seats)
        total_amount = fare.totalFare + seat_charges

        # Seats are held once every check above has passed; cancelling releases them.
        updated_flight = self.provider.decrement_seats(flight.id, len(seated))
        updated_return = (
            self.provider.decrement_seats(return_flight.id, len(seated)) if return_flight else None
        )

        now = datetime.now(timezone.utc).isoformat()
        booking_id = self._next_booking_id()
        booking = Booking(
            bookingId=booking_id,
            pnr=self._generate_pnr(),
            createdAt=now,
            confirmedAt=None,
            paymentStatus="pending",
            bookingStatus="pending",
            invoiceNumber=f"INV-{booking_id}",
            accessToken=secrets.token_urlsafe(24),
            checkoutKey=payload.checkoutKey,
            statusHistory=[
                StatusChange(at=now, field="booking", toStatus="pending", actor="customer", note="Booking created; seats held"),
                StatusChange(at=now, field="payment", toStatus="pending", actor="system", note="Awaiting payment"),
            ],
            tripType="round_trip" if updated_return else "one_way",
            flight=updated_flight,
            returnFlight=updated_return,
            passengers=[
                BookingPassenger(
                    **passenger.model_dump(),
                    seatNumber=seats_by_leg["outbound"].get(index),
                    returnSeatNumber=seats_by_leg.get("return", {}).get(index),
                )
                for index, passenger in enumerate(payload.passengers)
            ],
            contact=BookingContact(**payload.contact.model_dump()),
            passengerCount=len(payload.passengers),
            adults=adults,
            children=children,
            infants=infants,
            seats=[BookingSeat(**seat.model_dump()) for seat in payload.seats],
            fare=fare,
            fareBreakdown=breakdown,
            seatCharges=seat_charges,
            totalAmount=total_amount,
        )

        with self._lock:
            self._bookings.append(booking)
            self._save()

        return booking, True

    # ---- payment & status changes ------------------------------------------------

    def get_for_customer(self, booking_id: str, token: str | None) -> Booking:
        """The booking if `token` matches; otherwise a 404 (never reveal that it exists)."""
        booking = self.get_booking(booking_id)
        if booking is None or not token or not secrets.compare_digest(booking.accessToken, token):
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
        return booking

    def pay(self, booking_id: str, token: str | None, request: BookingPayRequest) -> tuple[Booking, BookingPayment | None]:
        """Take payment server-side for the booking's own total. Returns (booking, new attempt);
        the attempt is None when the booking was already paid (idempotent)."""
        booking = self.get_for_customer(booking_id, token)
        if booking.paymentStatus == "paid":
            return booking, None
        if booking.bookingStatus == "cancelled":
            raise HTTPException(status_code=409, detail="This booking was cancelled and can't be paid.")

        provider = get_payment_provider()
        if request.simulateFailure and not provider.can_simulate_failure:
            raise HTTPException(status_code=400, detail="Simulated failures are only available in test mode.")
        result = provider.charge(
            ChargeRequest(
                reference=booking.bookingId,
                amount=booking.totalAmount,
                currency=booking.fare.currency,
                method=request.method,
                customerEmail=booking.contact.email,
                cardLast4=request.cardLast4,
                simulateFailure=request.simulateFailure,
            )
        )
        attempt = BookingPayment(
            paymentId=result.paymentId,
            transactionId=result.transactionId,
            method=result.method,
            amount=result.amount,
            currency=result.currency,
            status=result.status,
            paidAt=result.at,
            provider=result.provider,
            testMode=result.testMode,
            payee=result.payee,
            failureReason=result.failureReason,
        )
        if attempt.amount != booking.totalAmount:
            raise HTTPException(status_code=502, detail="Payment provider returned a mismatched amount.")

        with self._lock:
            current = self._find(booking_id)
            if current.paymentStatus == "paid":  # a concurrent request got there first
                return current, None
            succeeded = attempt.status == "SUCCESS"
            new_status = "paid" if succeeded else "failed"
            mode = " (test mode)" if attempt.testMode else ""
            note = (
                f"{attempt.method.upper()} payment {attempt.transactionId}{mode}"
                if succeeded
                else (attempt.failureReason or "Payment failed")
                + ("" if "test mode" in (attempt.failureReason or "") else mode)
            )
            updated = current.model_copy(
                update={
                    "paymentStatus": new_status,
                    "payment": attempt if succeeded else current.payment,
                    "payments": [*current.payments, attempt],
                    "statusHistory": [
                        *current.statusHistory,
                        StatusChange(at=attempt.paidAt, field="payment", fromStatus=current.paymentStatus,
                                     toStatus=new_status, actor="payment-provider", note=note),
                    ],
                }
            )
            self._replace_locked(updated)
        return updated, attempt

    def cancel_booking(self, booking_id: str, reason: str = "") -> tuple[Booking, bool]:
        """Cancel and release held seats. Returns (booking, newly_cancelled)."""
        with self._lock:
            booking = self._find(booking_id)
            if booking.bookingStatus == "cancelled":
                return booking, False
            # Free the seats on every physical flight of every leg.
            for flight in [booking.flight, booking.returnFlight]:
                if flight is not None:
                    self.provider.release_seats(flight.id, booking.adults + booking.children)
            now = datetime.now(timezone.utc).isoformat()
            note = reason or "Cancelled by admin"
            if booking.paymentStatus == "paid":
                note += " — payment was taken; refund needs to be processed"
            updated = booking.model_copy(
                update={
                    "bookingStatus": "cancelled",
                    "statusHistory": [
                        *booking.statusHistory,
                        StatusChange(at=now, field="booking", fromStatus=booking.bookingStatus,
                                     toStatus="cancelled", actor="admin", note=note),
                    ],
                }
            )
            self._replace_locked(updated)
        return updated, True

    def record_notifications(self, booking_id: str, records: list[NotificationRecord]) -> None:
        """Append notification results, replacing earlier records with the same key (retries)."""
        with self._lock:
            booking = self._find(booking_id)
            keys = {r.key for r in records}
            kept = [r for r in booking.notifications if r.key not in keys]
            self._replace_locked(booking.model_copy(update={"notifications": [*kept, *records]}))

    def _find(self, booking_id: str) -> Booking:
        booking = self.get_booking(booking_id)
        if booking is None:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
        return booking

    def _resolve_flights(self, payload: BookingCreateRequest) -> tuple[Flight, Flight | None]:
        flight = self.provider.get_by_id(payload.flightId)
        if flight is None:
            raise HTTPException(status_code=404, detail=f"Flight '{payload.flightId}' not found.")
        min_date, _ = self.provider.booking_window()
        if flight.departureDate < min_date:
            raise HTTPException(status_code=400, detail="This flight has already departed.")
        if not payload.returnFlightId:
            return flight, None

        return_flight = self.provider.get_by_id(payload.returnFlightId)
        if return_flight is None:
            raise HTTPException(status_code=404, detail=f"Flight '{payload.returnFlightId}' not found.")
        if (
            return_flight.origin.code != flight.destination.code
            or return_flight.destination.code != flight.origin.code
        ):
            raise HTTPException(status_code=400, detail="The return flight must fly the reverse route.")
        arrival = f"{flight.arrivalDate} {flight.arrivalTime}"
        if f"{return_flight.departureDate} {return_flight.departureTime}" <= arrival:
            raise HTTPException(
                status_code=400, detail="The return flight must depart after the outbound flight lands."
            )
        return flight, return_flight

    @staticmethod
    def _validate_passenger_details(
        payload: BookingCreateRequest, first_travel_date: str, last_travel_date: str
    ) -> None:
        for number, pax in enumerate(payload.passengers, start=1):
            try:
                dob = date.fromisoformat(pax.dateOfBirth)
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Passenger {number}: date of birth must be YYYY-MM-DD."
                ) from None
            age = _age_on(dob, date.fromisoformat(first_travel_date))
            if age < 0:
                raise HTTPException(status_code=400, detail=f"Passenger {number}: date of birth is in the future.")
            if pax.type == "adult" and age < 12:
                raise HTTPException(status_code=400, detail=f"Passenger {number}: adults must be 12 or older.")
            if pax.type == "child" and not 2 <= age < 12:
                raise HTTPException(
                    status_code=400,
                    detail=f"Passenger {number}: children must be 2-11 years old on the travel date.",
                )
            if pax.type == "infant" and _age_on(dob, date.fromisoformat(last_travel_date)) >= 2:
                raise HTTPException(
                    status_code=400, detail=f"Passenger {number}: infants must be under 2 for the whole trip."
                )

    @staticmethod
    def _validate_passports(payload: BookingCreateRequest, last_travel_date: str) -> None:
        min_expiry = date.fromisoformat(last_travel_date) + timedelta(days=182)
        for number, pax in enumerate(payload.passengers, start=1):
            passport = (pax.passportNumber or "").strip()
            if not (6 <= len(passport) <= 9 and passport.isalnum()):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Passenger {number}: a valid passport number (6-9 letters/digits) "
                        "is required for international travel."
                    ),
                )
            if not (pax.nationality or "").strip():
                raise HTTPException(status_code=400, detail=f"Passenger {number}: nationality is required.")
            try:
                expiry = date.fromisoformat(pax.passportExpiry or "")
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Passenger {number}: passport expiry date is required."
                ) from None
            if expiry < min_expiry:
                raise HTTPException(
                    status_code=400,
                    detail=f"Passenger {number}: passport must be valid for 6 months after the trip.",
                )

    @staticmethod
    def _validate_seats(
        payload: BookingCreateRequest, seated: list[int], legs: list[tuple[str, int]]
    ) -> dict[str, dict[int, str]]:
        """One seat per seated passenger on every segment of every leg.
        Returns leg -> passenger -> seat label ("2C", or "2C · 14A" across a connection)."""
        expected = {(leg, segment) for leg, count in legs for segment in range(count)}
        if {(s.leg, s.segment) for s in payload.seats} - expected:
            raise HTTPException(status_code=400, detail="Seats were sent for a flight not in this booking.")
        seats_by_leg: dict[str, dict[int, str]] = {}
        for leg, count in legs:
            labels: dict[int, list[str]] = {i: [] for i in seated}
            for segment in range(count):
                segment_seats = [s for s in payload.seats if s.leg == leg and s.segment == segment]
                if sorted(s.passengerIndex for s in segment_seats) != seated:
                    flight_part = f"{leg} flight {segment + 1}" if count > 1 else f"{leg} flight"
                    raise HTTPException(
                        status_code=400,
                        detail=f"Choose a seat on the {flight_part} for every adult and child (infants sit on a lap).",
                    )
                numbers = [s.seatNumber for s in segment_seats]
                if len(set(numbers)) != len(numbers):
                    raise HTTPException(status_code=400, detail="Duplicate seat selections are not allowed.")
                for s in sorted(segment_seats, key=lambda x: x.passengerIndex):
                    labels[s.passengerIndex].append(s.seatNumber)
            seats_by_leg[leg] = {i: " · ".join(parts) for i, parts in labels.items()}
        return seats_by_leg

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
        """Admin confirms (tickets) a paid booking. Returns (booking, newly_confirmed)."""
        with self._lock:
            booking = self._find(booking_id)
            if booking.bookingStatus == "confirmed":
                return booking, False
            if booking.bookingStatus == "cancelled":
                raise HTTPException(status_code=409, detail="A cancelled booking can't be confirmed.")
            if booking.paymentStatus != "paid":
                raise HTTPException(status_code=409, detail="Only paid bookings can be confirmed.")
            now = datetime.now(timezone.utc).isoformat()
            confirmed = booking.model_copy(
                update={
                    "bookingStatus": "confirmed",
                    "confirmedAt": now,
                    "statusHistory": [
                        *booking.statusHistory,
                        StatusChange(at=now, field="booking", fromStatus=booking.bookingStatus,
                                     toStatus="confirmed", actor="admin", note="Ticket issued"),
                    ],
                }
            )
            self._replace_locked(confirmed)
        return confirmed, True

    def update_invoice(self, booking_id: str, payload: InvoiceUpdateRequest) -> Booking:
        """Save admin edits (notes, discount, extra charges) onto a booking's
        invoice. These are layered onto the PDF at generation time — the
        underlying booking/payment record itself is never altered."""
        booking = self.get_booking(booking_id)
        if booking is None:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")

        current_sent = booking.invoice.model_dump(include={"sentAt", "sentTo"})
        invoice = InvoiceDetails(**payload.model_dump(), **current_sent)
        updated = booking.model_copy(update={"invoice": invoice})
        self._replace(updated)
        return updated

    def mark_invoice_sent(self, booking_id: str, sent_to: str) -> Booking:
        booking = self.get_booking(booking_id)
        if booking is None:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")

        now = datetime.now(timezone.utc).isoformat()
        invoice = booking.invoice.model_copy(update={"sentAt": now, "sentTo": sent_to})
        updated = booking.model_copy(update={"invoice": invoice})
        self._replace(updated)
        return updated

    def _replace(self, updated: Booking) -> None:
        with self._lock:
            self._replace_locked(updated)

    def _replace_locked(self, updated: Booking) -> None:
        # Pydantic's model_copy skips validators; re-validate so derived fields stay in sync.
        updated = Booking.model_validate(updated.model_dump())
        for index, existing in enumerate(self._bookings):
            if existing.bookingId == updated.bookingId:
                self._bookings[index] = updated
                self._save()
                return
        raise HTTPException(status_code=404, detail=f"Booking '{updated.bookingId}' not found.")


_booking_service: BookingService | None = None


def get_booking_service() -> BookingService:
    global _booking_service
    if _booking_service is None:
        _booking_service = BookingService()
    return _booking_service
