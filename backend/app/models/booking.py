from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.flight import Flight


class PassengerInput(BaseModel):
    title: str = Field(..., min_length=1)
    firstName: str = Field(..., min_length=1)
    lastName: str = Field(..., min_length=1)
    gender: str = Field(..., min_length=1)
    dateOfBirth: str = Field(..., min_length=1)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        allowed = {"Mr", "Mrs", "Ms", "Miss", "Dr"}
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


class PaymentMetaInput(BaseModel):
    paymentId: str
    transactionId: str
    method: str
    amount: int = Field(..., ge=0)
    currency: str = "INR"
    status: str
    paidAt: str

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        allowed = {"upi", "qr", "card"}
        if value not in allowed:
            raise ValueError(f"method must be one of: {', '.join(sorted(allowed))}")
        return value


class BookingCreateRequest(BaseModel):
    flightId: str
    passengers: list[PassengerInput] = Field(..., min_length=1)
    contact: ContactInput
    seats: list[SeatSelectionInput] = Field(..., min_length=1)
    payment: PaymentMetaInput


class BookingLookupRequest(BaseModel):
    reference: str = Field(..., min_length=1, description="Booking ID or PNR")
    contact: str = Field(..., min_length=1, description="Email or phone used to book")


class BookingPassenger(BaseModel):
    title: str
    firstName: str
    lastName: str
    gender: str
    dateOfBirth: str
    seatNumber: str | None = None


class BookingContact(BaseModel):
    email: str
    phone: str


class BookingFare(BaseModel):
    baseFare: int
    taxes: int
    totalFare: int
    currency: str = "INR"


class BookingSeat(BaseModel):
    passengerIndex: int
    seatNumber: str
    seatType: str
    price: int


class BookingPayment(BaseModel):
    paymentId: str
    transactionId: str
    method: str
    amount: int
    currency: str = "INR"
    status: str
    paidAt: str


class Booking(BaseModel):
    bookingId: str
    pnr: str
    status: str
    createdAt: str
    confirmedAt: str | None = None
    flight: Flight
    passengers: list[BookingPassenger]
    contact: BookingContact
    passengerCount: int
    seats: list[BookingSeat]
    fare: BookingFare
    seatCharges: int
    totalAmount: int
    payment: BookingPayment
