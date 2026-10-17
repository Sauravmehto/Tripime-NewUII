"""Booking requests: drafts → review → submitted request → manual payment
verification → airline confirmation → ticket issued.

Nothing here takes payment or creates a ticket. Customers can only move a
booking up to PAYMENT_PENDING (a submitted request). Every later state is set
by an admin from real-world evidence: a verified payment, the airline's PNR,
the airline's ticket numbers.
"""

from __future__ import annotations

import json
import secrets
from datetime import date, datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.models.booking import (
    AirlineConfirmationRequest,
    Booking,
    BookingContact,
    BookingDraftRequest,
    BookingFare,
    BookingPassenger,
    BookingPayment,
    BookingState,
    FareLine,
    InvoiceDetails,
    InvoiceUpdateRequest,
    ManualPaymentRequest,
    NotificationRecord,
    StatusChange,
    TicketIssueRequest,
)
from app.models.flight import Flight
from app.providers.base import FlightProvider
from app.services.booking_rules import document_requirements, validate_contact, validate_passengers
from app.services.customer_auth_service import CustomerSession
from app.services.flight_service import get_flight_provider, validate_passenger_mix

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
BOOKINGS_PATH = DATA_DIR / "bookings.json"

EDITABLE_STATES = {"DRAFT", "PASSENGERS_COMPLETED", "REVIEWED"}
# Allowed moves; anything else is refused with 409.
TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"PASSENGERS_COMPLETED", "CANCELLED"},
    "PASSENGERS_COMPLETED": {"PASSENGERS_COMPLETED", "REVIEWED", "CANCELLED"},
    "REVIEWED": {"PASSENGERS_COMPLETED", "REVIEWED", "PAYMENT_PENDING", "CANCELLED"},
    "PAYMENT_PENDING": {"PAYMENT_CONFIRMED", "PAYMENT_FAILED", "CANCELLED"},
    "PAYMENT_FAILED": {"PAYMENT_PENDING", "PAYMENT_CONFIRMED", "CANCELLED"},
    "PAYMENT_CONFIRMED": {"BOOKING_CONFIRMED", "BOOKING_FAILED", "CANCELLED"},
    "BOOKING_CONFIRMED": {"TICKET_ISSUED", "BOOKING_FAILED", "CANCELLED"},
    "TICKET_ISSUED": {"CANCELLED"},
    "BOOKING_FAILED": {"CANCELLED"},
    "CANCELLED": set(),
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_ist() -> date:
    from app.providers.mock_provider import today_ist

    return today_ist()


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


def price_booking(flight: Flight, return_flight: Flight | None, adults: int, children: int, infants: int):
    """Server-side price from provider fares. Returns (BookingFare, breakdown lines)."""
    legs: list[tuple[str, Flight]] = [("outbound", flight)]
    if return_flight is not None:
        legs.append(("return", return_flight))
    units = list(_pax_units(legs, adults, children, infants))
    breakdown = [
        FareLine(leg=leg, passengerType=t, count=count, unitFare=unit[2], total=unit[2] * count)  # type: ignore[arg-type]
        for leg, t, count, unit in units
    ]
    fare = BookingFare(
        baseFare=sum(unit[0] * count for _, _, count, unit in units),
        taxes=sum(unit[1] * count for _, _, count, unit in units),
        totalFare=sum(line.total for line in breakdown),
        currency=flight.fare.currency,
    )
    return fare, breakdown


class BookingService:
    def __init__(self, provider: FlightProvider | None = None, path: Path = BOOKINGS_PATH) -> None:
        self.provider = provider or get_flight_provider()
        self._path = path
        self._lock = Lock()
        self._bookings = self._load()

    # ---- storage ----------------------------------------------------------------

    def _load(self) -> list[Booking]:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("[]", encoding="utf-8")
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8-sig") or "[]")
        bookings = [Booking.model_validate(item) for item in raw if "flight" in item]
        if any("state" not in item for item in raw):
            # Persist migrated legacy records (drops old access tokens and mock PNRs).
            self._path.write_text(json.dumps([b.model_dump() for b in bookings], indent=2), encoding="utf-8")
        return bookings

    def _save(self) -> None:
        self._path.write_text(json.dumps([b.model_dump() for b in self._bookings], indent=2), encoding="utf-8")

    def _new_reference(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        existing = {b.bookingId for b in self._bookings}
        while True:
            # Random, so references can't be guessed or enumerated.
            ref = f"TRQ-{today}-{secrets.token_hex(3).upper()}"
            if ref not in existing:
                return ref

    def _find(self, booking_id: str) -> Booking:
        booking = self.get_booking(booking_id)
        if booking is None:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
        return booking

    def _replace_locked(self, updated: Booking) -> Booking:
        updated = Booking.model_validate({**updated.model_dump(), "updatedAt": _now()})
        for index, existing in enumerate(self._bookings):
            if existing.bookingId == updated.bookingId:
                self._bookings[index] = updated
                self._save()
                return updated
        raise HTTPException(status_code=404, detail=f"Booking '{updated.bookingId}' not found.")

    def _move(self, booking: Booking, to: BookingState, actor: str, note: str = "", **changes) -> Booking:
        """Apply a state transition (validated) with an audit entry. Caller holds the lock."""
        if to not in TRANSITIONS[booking.state]:
            raise HTTPException(
                status_code=409, detail=f"A booking in state {booking.state} can't move to {to}."
            )
        history = list(booking.statusHistory)
        if to != booking.state or note:
            history.append(
                StatusChange(at=_now(), field="state", fromStatus=booking.state, toStatus=to, actor=actor, note=note)  # type: ignore[arg-type]
            )
        return self._replace_locked(booking.model_copy(update={"state": to, "statusHistory": history, **changes}))

    # ---- access -----------------------------------------------------------------

    def get_booking(self, booking_id: str) -> Booking | None:
        return next((b for b in self._bookings if b.bookingId == booking_id), None)

    @staticmethod
    def owns(booking: Booking, session: CustomerSession) -> bool:
        if booking.customerId:
            return booking.customerId == session.customer_id
        # Legacy bookings predate accounts: the verified sign-in email must match.
        return booking.contact.email.strip().lower() == session.email

    def get_for_customer(self, booking_id: str, session: CustomerSession) -> Booking:
        booking = self.get_booking(booking_id)
        if booking is None or not self.owns(booking, session):
            # Same answer whether it doesn't exist or isn't theirs.
            raise HTTPException(status_code=404, detail="Booking not found.")
        return booking

    def list_for_customer(self, session: CustomerSession) -> list[Booking]:
        mine = [b for b in self._bookings if self.owns(b, session)]
        return sorted(mine, key=lambda b: b.createdAt, reverse=True)

    def list_bookings(self) -> list[Booking]:
        return sorted(self._bookings, key=lambda b: b.createdAt, reverse=True)

    # ---- customer steps ---------------------------------------------------------

    def _resolve_flights(self, flight_id: str, return_id: str | None) -> tuple[Flight, Flight | None]:
        flight = self.provider.get_by_id(flight_id)
        if flight is None:
            raise HTTPException(status_code=404, detail="That flight is no longer available. Please search again.")
        min_date, _ = self.provider.booking_window()
        if flight.departureDate < min_date:
            raise HTTPException(status_code=400, detail="This flight has already departed.")
        if not return_id:
            return flight, None
        return_flight = self.provider.get_by_id(return_id)
        if return_flight is None:
            raise HTTPException(status_code=404, detail="The return flight is no longer available. Please search again.")
        if (
            return_flight.origin.code != flight.destination.code
            or return_flight.destination.code != flight.origin.code
        ):
            raise HTTPException(status_code=400, detail="The return flight must fly the reverse route.")
        if f"{return_flight.departureDate} {return_flight.departureTime}" <= f"{flight.arrivalDate} {flight.arrivalTime}":
            raise HTTPException(status_code=400, detail="The return flight must depart after the outbound flight lands.")
        return flight, return_flight

    def save_draft(self, payload: BookingDraftRequest, session: CustomerSession) -> Booking:
        """Create or update the draft for this checkout with validated traveller details."""
        flight, return_flight = self._resolve_flights(payload.flightId, payload.returnFlightId)
        types = [p.type for p in payload.passengers]
        adults, children, infants = types.count("adult"), types.count("child"), types.count("infant")
        validate_passenger_mix(adults, children, infants)
        seated = adults + children
        for leg in (flight, return_flight):
            if leg is not None and leg.availableSeats < seated:
                raise HTTPException(status_code=400, detail=f"Not enough seats left on {leg.flightNumber}.")
        requirements = document_requirements(flight, return_flight)
        validate_contact(payload.contact)
        validate_passengers(payload.passengers, flight.departureDate, requirements, _today_ist())

        fare, breakdown = price_booking(flight, return_flight, adults, children, infants)
        passengers = [
            BookingPassenger(
                **p.model_dump(exclude={"passportNumber", "nationality", "passportExpiry"}),
                # Only keep travel-document data the itinerary actually needs.
                passportNumber=p.passportNumber.strip().upper() if requirements.passportRequired and p.passportNumber else None,
                nationality=p.nationality.strip() if requirements.nationalityRequired and p.nationality else None,
                passportExpiry=p.passportExpiry if requirements.passportRequired else None,
            )
            for p in payload.passengers
        ]
        contact = BookingContact(
            email=str(payload.contact.email), countryCode=payload.contact.countryCode, phone=payload.contact.phone.strip()
        )
        fields = dict(
            tripType="round_trip" if return_flight else "one_way",
            flight=flight,
            returnFlight=return_flight,
            passengers=passengers,
            contact=contact,
            passengerCount=len(passengers),
            adults=adults,
            children=children,
            infants=infants,
            documentRequirements=requirements,
            fare=fare,
            fareBreakdown=breakdown,
            seatCharges=0,
            totalAmount=fare.totalFare,
        )

        with self._lock:
            existing = next(
                (b for b in self._bookings if b.checkoutKey == payload.checkoutKey and b.customerId == session.customer_id),
                None,
            )
            if existing is not None:
                if existing.state not in EDITABLE_STATES:
                    raise HTTPException(status_code=409, detail="This booking was already submitted and can't be edited.")
                return self._move(existing, "PASSENGERS_COMPLETED", "customer", "Traveller details updated", **fields)
            now = _now()
            booking_id = self._new_reference()
            booking = Booking(
                bookingId=booking_id,
                createdAt=now,
                updatedAt=now,
                state="PASSENGERS_COMPLETED",
                customerId=session.customer_id,
                customerEmail=session.email,
                checkoutKey=payload.checkoutKey,
                invoiceNumber=f"INV-{booking_id}",
                statusHistory=[
                    StatusChange(at=now, toStatus="DRAFT", actor="customer", note="Draft created"),
                    StatusChange(at=now, fromStatus="DRAFT", toStatus="PASSENGERS_COMPLETED", actor="customer",
                                 note="Traveller details completed"),
                ],
                **fields,
            )
            self._bookings.append(booking)
            self._save()
            return booking

    def _reprice(self, booking: Booking) -> tuple[Flight, Flight | None, BookingFare, list[FareLine]]:
        flight, return_flight = self._resolve_flights(
            booking.flight.id, booking.returnFlight.id if booking.returnFlight else None
        )
        fare, breakdown = price_booking(flight, return_flight, booking.adults, booking.children, booking.infants)
        return flight, return_flight, fare, breakdown

    def review(self, booking_id: str, session: CustomerSession, expected_total: int) -> tuple[Booking, bool]:
        """Re-price from current provider fares. Returns (booking, price_changed).
        A changed price leaves the booking un-reviewed so the traveller sees the new total."""
        booking = self.get_for_customer(booking_id, session)
        if booking.state not in EDITABLE_STATES:
            raise HTTPException(status_code=409, detail="This booking was already submitted.")
        flight, return_flight, fare, breakdown = self._reprice(booking)
        changed = fare.totalFare != expected_total
        update = dict(flight=flight, returnFlight=return_flight, fare=fare, fareBreakdown=breakdown, totalAmount=fare.totalFare)
        with self._lock:
            current = self._find(booking_id)
            if changed:
                return (
                    self._move(current, "PASSENGERS_COMPLETED", "system",
                               f"Fare changed from INR {expected_total:,} to INR {fare.totalFare:,}", **update),
                    True,
                )
            return self._move(current, "REVIEWED", "customer", "Booking reviewed", **update), False

    def submit_request(self, booking_id: str, session: CustomerSession) -> tuple[Booking, bool]:
        """Submit the reviewed booking as a request. No payment is taken and no ticket
        is created. Returns (booking, newly_submitted); repeating is a no-op."""
        booking = self.get_for_customer(booking_id, session)
        if booking.state not in EDITABLE_STATES:
            return booking, False  # already submitted — don't notify twice
        if booking.state != "REVIEWED":
            raise HTTPException(status_code=409, detail="Please review your booking before submitting it.")
        flight, return_flight, fare, breakdown = self._reprice(booking)
        if fare.totalFare != booking.totalAmount:
            with self._lock:
                self._move(self._find(booking_id), "PASSENGERS_COMPLETED", "system",
                           f"Fare changed to INR {fare.totalFare:,} before submission",
                           flight=flight, returnFlight=return_flight, fare=fare, fareBreakdown=breakdown,
                           totalAmount=fare.totalFare)
            raise HTTPException(status_code=409, detail="The fare changed. Please review the new price before submitting.")
        seated = booking.adults + booking.children
        with self._lock:
            current = self._find(booking_id)
            if current.state != "REVIEWED":
                return current, False
            # Hold seats while the team works on the request; released on fail/cancel.
            held = []
            try:
                for leg in (flight, return_flight):
                    if leg is not None:
                        self.provider.decrement_seats(leg.id, seated)
                        held.append(leg.id)
            except HTTPException:
                for leg_id in held:
                    self.provider.release_seats(leg_id, seated)
                raise
            updated = self._move(
                current, "PAYMENT_PENDING", "customer",
                "Booking request submitted — awaiting team verification and payment arrangement",
                seatsHeld=True, submittedAt=_now(),
            )
        return updated, True

    # ---- admin transitions -----------------------------------------------------

    def _release(self, booking: Booking) -> None:
        if booking.seatsHeld:
            for leg in (booking.flight, booking.returnFlight):
                if leg is not None:
                    self.provider.release_seats(leg.id, booking.adults + booking.children)

    def confirm_payment(self, booking_id: str, payload: ManualPaymentRequest, admin: str = "admin") -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            if payload.amount != booking.totalAmount:
                raise HTTPException(
                    status_code=400,
                    detail=f"Verified amount INR {payload.amount:,} doesn't match the booking total INR {booking.totalAmount:,}.",
                )
            if any(p.transactionId == payload.reference for b in self._bookings for p in b.payments):
                raise HTTPException(status_code=409, detail="That payment reference is already recorded on a booking.")
            record = BookingPayment(
                paymentId=f"PAY-{secrets.token_hex(5).upper()}",
                transactionId=payload.reference,
                method=payload.method,
                amount=payload.amount,
                currency=booking.fare.currency,
                status="SUCCESS",
                paidAt=_now(),
                provider="manual",
                verifiedBy=admin,
                note=payload.note,
            )
            return self._move(
                booking, "PAYMENT_CONFIRMED", "admin",
                f"Payment verified manually ({payload.method.upper()} ref {payload.reference}). {payload.note}".strip(),
                payment=record, payments=[*booking.payments, record],
            )

    def fail_payment(self, booking_id: str, note: str) -> Booking:
        with self._lock:
            return self._move(self._find(booking_id), "PAYMENT_FAILED", "admin", note or "Payment not received")

    def reopen_payment(self, booking_id: str, note: str) -> Booking:
        with self._lock:
            return self._move(self._find(booking_id), "PAYMENT_PENDING", "admin", note or "Awaiting payment again")

    def confirm_with_airline(self, booking_id: str, payload: AirlineConfirmationRequest) -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            return self._move(
                booking, "BOOKING_CONFIRMED", "admin",
                f"Airline confirmed — PNR {payload.airlinePnr.upper()}. {payload.note}".strip(),
                pnr=payload.airlinePnr.upper(), confirmedAt=_now(),
            )

    def issue_ticket(self, booking_id: str, payload: TicketIssueRequest) -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            if not booking.pnr:
                raise HTTPException(status_code=409, detail="Record the airline PNR before issuing tickets.")
            return self._move(
                booking, "TICKET_ISSUED", "admin",
                f"Ticket(s) {', '.join(payload.ticketNumbers)} issued by the airline. {payload.note}".strip(),
                ticketNumbers=payload.ticketNumbers, ticketedAt=_now(),
            )

    def fail_booking(self, booking_id: str, note: str) -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            updated = self._move(booking, "BOOKING_FAILED", "admin", note or "Airline booking failed", seatsHeld=False)
            self._release(booking)
            return updated

    def cancel_booking(self, booking_id: str, reason: str = "", actor: str = "admin") -> tuple[Booking, bool]:
        with self._lock:
            booking = self._find(booking_id)
            if booking.state == "CANCELLED":
                return booking, False
            note = reason or "Cancelled"
            if booking.payment is not None and booking.payment.status == "SUCCESS" and not booking.legacy:
                note += " — payment was received; a refund must be processed"
            updated = self._move(booking, "CANCELLED", actor, note, seatsHeld=False)  # type: ignore[arg-type]
            self._release(booking)
        return updated, True

    def record_notifications(self, booking_id: str, records: list[NotificationRecord]) -> None:
        """Append notification results, replacing earlier records with the same key (retries)."""
        with self._lock:
            booking = self._find(booking_id)
            keys = {r.key for r in records}
            kept = [r for r in booking.notifications if r.key not in keys]
            self._replace_locked(booking.model_copy(update={"notifications": [*kept, *records]}))

    # ---- invoice adjustments (admin) -------------------------------------------

    def update_invoice(self, booking_id: str, payload: InvoiceUpdateRequest) -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            current_sent = booking.invoice.model_dump(include={"sentAt", "sentTo"})
            invoice = InvoiceDetails(**payload.model_dump(), **current_sent)
            return self._replace_locked(booking.model_copy(update={"invoice": invoice}))

    def mark_invoice_sent(self, booking_id: str, sent_to: str) -> Booking:
        with self._lock:
            booking = self._find(booking_id)
            invoice = booking.invoice.model_copy(update={"sentAt": _now(), "sentTo": sent_to})
            return self._replace_locked(booking.model_copy(update={"invoice": invoice}))


_booking_service: BookingService | None = None


def get_booking_service() -> BookingService:
    global _booking_service
    if _booking_service is None:
        _booking_service = BookingService()
    return _booking_service
