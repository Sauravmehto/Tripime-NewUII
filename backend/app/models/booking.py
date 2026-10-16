from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.flight import Flight

PassengerType = Literal["adult", "child", "infant"]
FlightLeg = Literal["outbound", "return"]
PaymentStatus = Literal["pending", "paid", "failed"]
BookingStatus = Literal["pending", "confirmed", "cancelled"]
PaymentMethod = Literal["upi", "qr", "card"]


class PassengerInput(BaseModel):
    type: PassengerType = "adult"
    title: str = Field(..., min_length=1)
    firstName: str = Field(..., min_length=1)
    lastName: str = Field(..., min_length=1)
    gender: str = Field(..., min_length=1)
    dateOfBirth: str = Field(..., min_length=1)
    # Required by the booking service when either leg is international.
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


class ContactInput(BaseModel):
    email: EmailStr
    phone: str = Field(..., min_length=8, max_length=20)


class SeatSelectionInput(BaseModel):
    leg: FlightLeg = "outbound"
    # Index into the leg's flight segments (0 for non-stop flights).
    segment: int = Field(0, ge=0, le=3)
    passengerIndex: int = Field(..., ge=0)
    seatNumber: str = Field(..., min_length=2, max_length=4)
    seatType: str
    price: int = Field(..., ge=0)

    @field_validator("seatType")
    @classmethod
    def validate_seat_type(cls, value: str) -> str:
        allowed = {"standard", "window", "preferred", "extra_legroom"}
        if value not in allowed:
            raise ValueError(f"seatType must be one of: {', '.join(sorted(allowed))}")
        return value


class BookingCreateRequest(BaseModel):
    """Creates a booking awaiting payment. Payment is never sent by the browser:
    it's taken server-side via `POST /api/bookings/{id}/pay`."""

    # Generated once per checkout by the client; repeating it returns the same booking.
    checkoutKey: str = Field(..., min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    flightId: str
    returnFlightId: str | None = None
    passengers: list[PassengerInput] = Field(..., min_length=1)
    contact: ContactInput
    seats: list[SeatSelectionInput] = Field(..., min_length=1)


class BookingPayRequest(BaseModel):
    method: PaymentMethod
    # Safe card metadata only — never the full number or CVV.
    cardLast4: str | None = Field(None, pattern=r"^\d{4}$")
    # Mock mode only: exercise the failure path. Refused when a real gateway is active.
    simulateFailure: bool = False


class BookingLookupRequest(BaseModel):
    reference: str = Field(..., min_length=1, description="Booking ID or PNR")
    contact: str = Field(..., min_length=1, description="Email or phone used to book")


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
    seatNumber: str | None = None
    returnSeatNumber: str | None = None


class BookingContact(BaseModel):
    email: str
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
    """One payment attempt as reported by the server-side payment provider."""

    paymentId: str
    transactionId: str
    method: str
    amount: int
    currency: str = "INR"
    status: str  # SUCCESS | FAILED
    paidAt: str  # time of the attempt (kept name for older records)
    provider: str = "mock"
    testMode: bool = True
    payee: str | None = None
    failureReason: str | None = None


class StatusChange(BaseModel):
    at: str
    field: Literal["payment", "booking"]
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


class Booking(BaseModel):
    bookingId: str
    pnr: str
    createdAt: str
    confirmedAt: str | None = None
    paymentStatus: PaymentStatus = "pending"
    bookingStatus: BookingStatus = "pending"
    # Legacy single status ("PROCESSING"/"CONFIRMED"), mirrored from the fields above.
    status: str = "PENDING"
    tripType: Literal["one_way", "round_trip"] = "one_way"
    flight: Flight
    returnFlight: Flight | None = None
    passengers: list[BookingPassenger]
    contact: BookingContact
    passengerCount: int
    adults: int = 0
    children: int = 0
    infants: int = 0
    seats: list[BookingSeat]
    fare: BookingFare
    fareBreakdown: list[FareLine] = Field(default_factory=list)
    seatCharges: int
    totalAmount: int
    invoiceNumber: str = ""
    # Latest successful payment (None until paid); every attempt is in `payments`.
    payment: BookingPayment | None = None
    payments: list[BookingPayment] = Field(default_factory=list)
    statusHistory: list[StatusChange] = Field(default_factory=list)
    notifications: list[NotificationRecord] = Field(default_factory=list)
    # Secret for customer access to this booking and its documents.
    accessToken: str = ""
    checkoutKey: str | None = None
    invoice: InvoiceDetails = Field(default_factory=InvoiceDetails)

    @model_validator(mode="before")
    @classmethod
    def _legacy_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        data = dict(data)
        # Bookings saved before passenger types existed: everyone was an adult.
        if not data.get("adults"):
            data["adults"] = data.get("passengerCount", 0)
        # Bookings saved before split statuses: payment was taken before creation.
        if "paymentStatus" not in data:
            payment = data.get("payment") or {}
            paid = str(payment.get("status", "")).upper() == "SUCCESS"
            confirmed = data.get("status") == "CONFIRMED"
            data["paymentStatus"] = "paid" if paid else "pending"
            data["bookingStatus"] = "confirmed" if confirmed else "pending"
            history = [
                {"at": data.get("createdAt", ""), "field": "booking", "toStatus": "pending", "actor": "system",
                 "note": "Booking created (migrated record)"},
            ]
            if paid:
                history.append({"at": payment.get("paidAt") or data.get("createdAt", ""), "field": "payment",
                                "fromStatus": "pending", "toStatus": "paid", "actor": "payment-provider",
                                "note": "Mock payment (migrated record)"})
                data.setdefault("payments", [payment])
            if confirmed:
                history.append({"at": data.get("confirmedAt") or data.get("createdAt", ""), "field": "booking",
                                "fromStatus": "pending", "toStatus": "confirmed", "actor": "admin",
                                "note": "Confirmed (migrated record)"})
            data.setdefault("statusHistory", history)
        if not data.get("invoiceNumber") and data.get("bookingId"):
            data["invoiceNumber"] = f"INV-{data['bookingId']}"
        return data

    @model_validator(mode="after")
    def _mirror_status(self) -> "Booking":
        self.status = {"confirmed": "CONFIRMED", "cancelled": "CANCELLED"}.get(
            self.bookingStatus, "PROCESSING" if self.paymentStatus == "paid" else "PENDING_PAYMENT"
        )
        return self

    def public_view(self) -> "Booking":
        """What customers see: no internal notification log or idempotency key."""
        return self.model_copy(update={"notifications": [], "checkoutKey": None})
