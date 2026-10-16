from abc import ABC, abstractmethod

from app.models.payment import ChargeRequest, ChargeResult


class PaymentProvider(ABC):
    """Server-side payment gateway. Add a Razorpay/Cashfree implementation that
    reads its secrets from the environment and confirms payments via the
    gateway's API or signed webhooks — never from what the browser reports."""

    name: str
    test_mode: bool
    payee_vpa: str

    @abstractmethod
    def charge(self, request: ChargeRequest) -> ChargeResult:
        raise NotImplementedError

    @property
    def can_simulate_failure(self) -> bool:
        """Only test providers may be told to fail on purpose."""
        return False
