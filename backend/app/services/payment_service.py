from app.models.payment import MockPaymentRequest, PaymentResult
from app.providers.mock_payment_provider import MockPaymentProvider
from app.providers.payment_base import PaymentProvider

_provider: PaymentProvider | None = None


def get_payment_provider() -> PaymentProvider:
    global _provider
    if _provider is None:
        _provider = MockPaymentProvider()
    return _provider


class PaymentService:
    def __init__(self, provider: PaymentProvider | None = None) -> None:
        self.provider = provider or get_payment_provider()

    def process_mock_payment(self, request: MockPaymentRequest) -> PaymentResult:
        return self.provider.process_payment(request)
