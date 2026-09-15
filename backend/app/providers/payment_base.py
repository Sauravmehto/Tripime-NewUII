from abc import ABC, abstractmethod

from app.models.payment import MockPaymentRequest, PaymentResult


class PaymentProvider(ABC):
    """Abstract payment provider — swap MockPaymentProvider for a real gateway later."""

    @abstractmethod
    def process_payment(self, request: MockPaymentRequest) -> PaymentResult:
        raise NotImplementedError
