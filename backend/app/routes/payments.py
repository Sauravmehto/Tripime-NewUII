from fastapi import APIRouter

from app.models.payment import PaymentConfig
from app.services.payment_service import payment_config

router = APIRouter()


@router.get("/config", response_model=PaymentConfig)
def get_payment_config() -> PaymentConfig:
    """How payment works right now. There is no gateway, so no endpoint takes payment."""
    return payment_config()
