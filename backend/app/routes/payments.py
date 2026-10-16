from fastapi import APIRouter

from app.models.payment import PaymentConfig
from app.services.payment_service import payment_config

router = APIRouter()


@router.get("/config", response_model=PaymentConfig)
def get_payment_config() -> PaymentConfig:
    """Checkout settings (provider, test mode, payee UPI ID). Payments themselves are
    taken via POST /api/bookings/{booking_id}/pay so the server controls the amount."""
    return payment_config()
