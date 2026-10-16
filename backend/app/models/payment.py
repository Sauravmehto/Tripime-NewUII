from typing import Literal

from pydantic import BaseModel


class ChargeRequest(BaseModel):
    """What the booking service asks a payment provider to charge. The amount
    always comes from the server-side booking, never from the browser."""

    reference: str  # booking ID
    amount: int
    currency: str = "INR"
    method: Literal["upi", "qr", "card"]
    customerEmail: str
    cardLast4: str | None = None
    simulateFailure: bool = False


class ChargeResult(BaseModel):
    paymentId: str
    transactionId: str
    provider: str
    testMode: bool
    method: str
    amount: int
    currency: str
    status: Literal["SUCCESS", "FAILED"]
    at: str
    payee: str | None = None
    failureReason: str | None = None


class PaymentConfig(BaseModel):
    """Public payment settings for the checkout page (no secrets)."""

    provider: str
    testMode: bool
    payeeVpa: str
    methods: list[str]
    canSimulateFailure: bool
