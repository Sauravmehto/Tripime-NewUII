from app import config
from app.models.payment import PaymentConfig


def payment_config() -> PaymentConfig:
    return PaymentConfig(
        mode="manual",
        gatewayConfigured=False,
        upiId=config.PAYMENT_UPI_ID,
        upiIdVerified=False,
        whatsappNumber=config.BOOKING_WHATSAPP_NUMBER,
    )
