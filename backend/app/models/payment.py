from pydantic import BaseModel


class PaymentConfig(BaseModel):
    """Public payment settings for the checkout page (no secrets)."""

    # "manual": no gateway — the team arranges payment and verifies it in admin.
    mode: str
    gatewayConfigured: bool
    # Owner-supplied UPI ID. The app has not verified it; shown only as
    # "pay after our team confirms your booking".
    upiId: str
    upiIdVerified: bool
    # Click-to-chat number travellers can message themselves.
    whatsappNumber: str
