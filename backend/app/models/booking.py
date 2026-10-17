"""Booking requests and their lifecycle.

Without a payment gateway or ticketing API, a booking is a *request*: the
traveller submits it, the Tripime team verifies availability and price,
arranges and verifies payment, books with the airline, then records the
airline's PNR and ticket numbers. Every state change is audited.
"""

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.flight import Flight

PassengerType = Literal["adult", "child", "infant"]
FlightLeg = Literal["outbound", "return"]

BookingState = Literal[
    "DRAFT",
    "PASSENGERS_COMPLETED",
    "REVIEWED",
    "PAYMENT_PENDING",
    "PAYMENT_CONFIRMED",
    "BOOKING_CONFIRMED",
    "TICKET_ISSUED",
    "PAYMENT_FAILED",
    "BOOKING_FAILED",
    "CANCELLED",
]
# Coarse statuses kept for the admin list and older clients.
PaymentStatus = Literal["pending", "paid", "failed"]
BookingStatus = Literal["pending", "confirmed", "cancelled"]

PAID_STATES = {"PAYMENT_CONFIRMED", "BOOKING_CONFIRMED", "TICKET_ISSUED"}


class PassengerInput(BaseModel):
    type: PassengerType = "adult"
    title: str = Field(..., min_length=1)
    firstName: str = Field(..., min_length=1, max_length=60)
    lastName: str = Field(..., min_length=1, max_length=60)
    gender: str = Field(..., min_length=1)
    dateOfBirth: str = Field(..., min_length=10, max_length=10)
    # Required by the booking service only when the itinerary needs them.
    passportNumber: str | None = Field(None, max_length=20)
    nationality: str | None = Field(None, max_length=60)
    passportExpiry: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        allowed = {"Mr", "Mrs", "Ms", "Miss", "Dr", "Mstr"}
        if value not in allowed:
            raise ValueError(f"title must be one of: {', '.join(sorted(allowed))}")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        allowed = {"Male", "Female", "Other"}
        if value not in allowed:
            raise ValueError(f"gender must be one of: {', '.join(sorted(allowed))}")
        return value

    @field_validator("firstName", "lastName")
    @classmethod
    def validate_name(cls, value: str) -> str:
        # Names must match travel documents: validate, never rewrite.
        if not value.strip():
            raise ValueError("Name is required")
        if any(ch.isdigit() for ch in value):
            raise ValueError("Names can't contain digits")
        return value


class ContactInput(BaseModel):
    email: EmailStr
    countryCode: str = Field("+91", min_length=2, max_length=5, pattern=r"^\+\d{1,4}$")
    phone: str = Field(..., min_length=6, max_length=20)


class BookingDraftRequest(BaseModel):
    """Create (or update, for the same checkout) a booking draft with traveller details."""

    # Generated once per checkout by the client; repeating it updates the same draft.
    checkoutKey: str = Field(..., min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    flightId: str = Field(..., max_length=200)
    returnFlightId: str | None = Field(None, max_length=200)
    passengers: list[PassengerInput] = Field(..., min_length=1, max_length=18)
    contact: ContactInput


class BookingReviewRequest(BaseModel):
    """The total the traveller saw; the server re-prices and reports any change."""

    expectedTotal: int = Field(..., ge=0)


class ManualPaymentRequest(BaseModel):
    """Admin records a payment they have verified (e.g. on the bank statement)."""

    reference: str = Field(..., min_length=4, max_length=80)
    method: Literal["upi", "bank_transfer", "card_link", "other"] = "upi"
    amount: int = Field(..., ge=1)
    note: str = Field("", max_length=300)


class StateNoteRequest(BaseModel):
    note: str = Field("", max_length=300)


class AirlineConfirmationRequest(BaseModel):
    airlinePnr: str = Field(..., min_length=5, max_length=8, pattern=r"^[A-Za-z0-9]+$")
    note: str = Field("", max_length=300)


class TicketIssueRequest(BaseModel):
    ticketNumbers: list[str] = Field(..., min_length=1, max_length=18)
    note: str = Field("", max_length=300)

    @field_validator("ticketNumbers")
    @classmethod
    def validate_tickets(cls, value: list[str]) -> list[str]:
        cleaned = [v.strip() for v in value if v.strip()]
        if not cleaned or any(not (6 <= len(v) <= 20) for v in cleaned):
            raise ValueError("Each ticket number must be 6–20 characters")
        return cleaned


class BookingPassenger(BaseModel):
    type: PassengerType = "adult"
    title: str
    firstName: str
    lastName: str
    gender: str
    dateOfBirth: str
    passportNumber: str | None = None
    nationality: str | None = None
    passportExpiry: str | None = None
    # Legacy test bookings had mock seat numbers.
    seatNumber: str | None = None
    returnSeatNumber: str | None = None


class BookingContact(BaseModel):
    email: str
    countryCode: str = "+91"
    phone: str


class BookingFare(BaseModel):
    baseFare: int
    taxes: int
    totalFare: int
    currency: str = "INR"


class FareLine(BaseModel):
    leg: FlightLeg
    passengerType: PassengerType
    count: int
    unitFare: int
    total: int


class BookingSeat(BaseModel):
    leg: FlightLeg = "outbound"
    segment: int = 0
    passengerIndex: int
    seatNumber: str
    seatType: str
    price: int


class BookingPayment(BaseModel):
    """A payment record. New records are manual verifications by an admin;
    older records were mock test payments."""

    paymentId: str
    transactionId: str
    method: str
    amount: int
    currency: str = "INR"
    status: str  # SUCCESS | FAILED
    paidAt: str
    provider: str = "manual"
    testMode: bool = False
    payee: str | None = None
    failureReason: str | None = None
    verifiedBy: str | None = None
    note: str = ""


class DocumentRequirements(BaseModel):
    """Traveller details the itinerary needs, derived from the route's airports."""

    international: bool
    passportRequired: bool
    nationalityRequired: bool
    genderRequired: bool = True
    dateOfBirthRequired: bool = True
    # Countries other than the departure country touched by the trip (incl. transit).
    countries: list[str] = Field(default_factory=list)
    lastTravelDate: str
    # Advice, not a universal rule — shown only for international trips.
    passportValidityAdvice: str | None = None


class StatusChange(BaseModel):
    at: str
    field: Literal["state", "payment", "booking"] = "state"
    fromStatus: str | None = None
    toStatus: str
    actor: Literal["customer", "admin", "system", "payment-provider"]
    note: str = ""


class NotificationRecord(BaseModel):
    """Audit trail for every notification attempt. `status` is only "sent" when the
    provider accepted the message (SMTP server / WhatsApp API), never assumed."""

    key: str  # event[:attempt]:channel:recipient — prevents duplicate sends
    event: str
    channel: Literal["email", "whatsapp"]
    recipient: str
    audience: Literal["admin", "customer"]
    status: Literal["sent", "failed", "not_configured"]
    provider: str
    at: str
    detail: str = ""
    preview: str = ""


class InvoiceExtraCharge(BaseModel):
    label: str = Field(..., min_length=1, max_length=80)
    amount: int = Field(..., ge=0)


class InvoiceDetails(BaseModel):
    """Admin-editable adjustments layered onto the auto-generated invoice PDF.
    Kept separate from the immutable booking/payment record below."""

    notes: str = ""
    discountLabel: str = ""
    discountAmount: int = 0
    extraCharges: list[InvoiceExtraCharge] = Field(default_factory=list)
    sentAt: str | None = None
    sentTo: str | None = None


class InvoiceUpdateRequest(BaseModel):
    notes: str = Field("", max_length=1000)
    discountLabel: str = Field("", max_length=80)
    discountAmount: int = Field(0, ge=0)
    extraCharges: list[InvoiceExtraCharge] = Field(default_factory=list)


def _legacy_state(data: dict) -> str:
    booking_status = data.get("bookingStatus")
    payment_status = data.get("paymentStatus")
    old = data.get("status")
    payment = data.get("payment") or {}
    if booking_status == "cancelled" or old == "CANCELLED":
        return "CANCELLED"
    if booking_status == "confirmed" or old == "CONFIRMED":
        return "BOOKING_CONFIRMED"
    if payment_status == "paid" or str(payment.get("status", "")).upper() == "SUCCESS":
        return "PAYMENT_CONFIRMED"
    if payment_status == "failed":
        return "PAYMENT_FAILED"
    return "PAYMENT_PENDING"


class Booking(BaseModel):
    # Booking-request reference (TRQ-…); legacy test bookings use BK-….
    bookingId: str
    createdAt: str
    updatedAt: str = ""
    state: BookingState = "DRAFT"
    customerId: str | None = None
    customerEmail: str | None = None
    tripType: Literal["one_way", "round_trip"] = "one_way"
    flight: Flight
    returnFlight: Flight | None = None
    passengers: list[BookingPassenger]
    contact: BookingContact
    passengerCount: int
    adults: int = 0
    children: int = 0
    infants: int = 0
    documentRequirements: DocumentRequirements | None = None
    seats: list[BookingSeat] = Field(default_factory=list)
    fare: BookingFare
    fareBreakdown: list[FareLine] = Field(default_factory=list)
    seatCharges: int = 0
    totalAmount: int
    # Airline booking reference — only set from a real airline/provider confirmation.
    pnr: str | None = None
    ticketNumbers: list[str] = Field(default_factory=list)
    confirmedAt: str | None = None
    ticketedAt: str | None = None
    submittedAt: str | None = None
    seatsHeld: bool = False
    invoiceNumber: str = ""
    payment: BookingPayment | None = None
    payments: list[BookingPayment] = Field(default_factory=list)
    statusHistory: list[StatusChange] = Field(default_factory=list)
    notifications: list[NotificationRecord] = Field(default_factory=list)
    checkoutKey: str | None = None
    legacy: bool = False
    invoice: InvoiceDetails = Field(default_factory=InvoiceDetails)
    # Derived for lists/badges; always recomputed from `state`.
    paymentStatus: PaymentStatus = "pending"
    bookingStatus: BookingStatus = "pending"

    @model_validator(mode="before")
    @classmethod
    def _legacy_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        data = dict(data)
        if not data.get("adults"):
            data["adults"] = data.get("passengerCount", 0)
        if "state" not in data:
            # Records from the earlier mock-payment flow: they never had a real
            # payment or airline PNR. Keep them visible but clearly marked.
            data["state"] = _legacy_state(data)
            data["legacy"] = True
            if data.get("pnr"):
                data["statusHistory"] = [
                    *(data.get("statusHistory") or []),
                    {"at": data.get("createdAt", ""), "field": "state", "toStatus": data["state"],
                     "actor": "system", "note": f"Legacy test booking; mock reference {data['pnr']} is not an airline PNR"},
                ]
                data["pnr"] = None
        for key in ("accessToken", "status"):
            data.pop(key, None)
        if not data.get("invoiceNumber") and data.get("bookingId"):
            data["invoiceNumber"] = f"INV-{data['bookingId']}"
        return data

    @model_validator(mode="after")
    def _derive_statuses(self) -> "Booking":
        self.paymentStatus = (
            "paid" if self.state in PAID_STATES else "failed" if self.state == "PAYMENT_FAILED" else "pending"
        )
        self.bookingStatus = (
            "cancelled"
            if self.state in {"CANCELLED", "BOOKING_FAILED"}
            else "confirmed" if self.state in {"BOOKING_CONFIRMED", "TICKET_ISSUED"} else "pending"
        )
        return self

    def public_view(self) -> "Booking":
        """What the owner sees: no internal notification log or idempotency key."""
        return self.model_copy(update={"notifications": [], "checkoutKey": None})
