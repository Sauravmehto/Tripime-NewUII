from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from app.models.payment import MockPaymentRequest, PaymentResult
from app.providers.payment_base import PaymentProvider


class MockPaymentProvider(PaymentProvider):
    def process_payment(self, request: MockPaymentRequest) -> PaymentResult:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

        if request.method == "upi" and not (request.upiId and "@" in request.upiId):
            raise HTTPException(status_code=400, detail="A valid UPI ID is required (e.g. name@upi).")

        if request.method == "card" and request.cardLast4 and len(request.cardLast4) != 4:
            raise HTTPException(status_code=400, detail="cardLast4 must be exactly 4 digits.")

        payment_id = f"PAY-{uuid4().hex[:12].upper()}"
        transaction_id = f"TXN-{uuid4().hex[:10].upper()}"

        return PaymentResult(
            paymentId=payment_id,
            transactionId=transaction_id,
            method=request.method,
            amount=request.amount,
            currency=request.currency,
            status="SUCCESS",
            paidAt=datetime.now(timezone.utc).isoformat(),
        )
