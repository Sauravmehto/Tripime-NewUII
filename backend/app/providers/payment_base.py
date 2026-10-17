"""Interface for a future payment gateway (Razorpay, Cashfree, …).

Not used yet: Tripime has no gateway, so bookings are requests whose payment
is verified manually by an admin. A real provider must:
  * create the order/checkout server-side for the booking's server-priced total,
  * confirm payment only from the gateway's API or a signature-verified webhook,
  * be idempotent per gateway payment ID, and handle pending/failed/cancelled.
Secrets come from server environment variables only.
"""

from abc import ABC, abstractmethod


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_checkout(self, booking_id: str, amount: int, currency: str) -> dict:
        """Return what the frontend needs to open the gateway's checkout (no secrets)."""
        raise NotImplementedError

    @abstractmethod
    def verify_payment(self, payload: dict, signature: str) -> dict:
        """Verify a webhook/callback with the gateway; return {payment_id, status, amount}."""
        raise NotImplementedError
