from datetime import datetime, timezone
from uuid import uuid4

from app import config
from app.models.payment import ChargeRequest, ChargeResult
from app.providers.payment_base import PaymentProvider


class MockPaymentProvider(PaymentProvider):
    """Test-mode provider: no money moves. Succeeds unless asked to fail."""

    name = "mock"
    test_mode = True

    def __init__(self, payee_vpa: str = config.MOCK_PAYEE_VPA) -> None:
        self.payee_vpa = payee_vpa

    @property
    def can_simulate_failure(self) -> bool:
        return True

    def charge(self, request: ChargeRequest) -> ChargeResult:
        failed = request.simulateFailure
        return ChargeResult(
            paymentId=f"PAY-{uuid4().hex[:12].upper()}",
            transactionId=f"TEST-TXN-{uuid4().hex[:10].upper()}",
            provider=self.name,
            testMode=True,
            method=request.method,
            amount=request.amount,
            currency=request.currency,
            status="FAILED" if failed else "SUCCESS",
            at=datetime.now(timezone.utc).isoformat(),
            payee=self.payee_vpa if request.method in {"upi", "qr"} else None,
            failureReason="Simulated failure (test mode)" if failed else None,
        )
