from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MockPaymentRequest(BaseModel):
    amount: int = Field(..., ge=1)
    currency: str = "INR"
    method: Literal["upi", "qr", "card"]
    upiId: str | None = None
    # Safe card metadata only — never accept full PAN or CVV
    cardLast4: str | None = None

    @field_validator("cardLast4")
    @classmethod
    def validate_last4(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.isdigit() or len(value) != 4:
            raise ValueError("cardLast4 must be 4 digits")
        return value


class PaymentResult(BaseModel):
    paymentId: str
    transactionId: str
    method: str
    amount: int
    currency: str
    status: str
    paidAt: str
