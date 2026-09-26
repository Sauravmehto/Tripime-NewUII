from fastapi import APIRouter

from app.models.payment import MockPaymentRequest, PaymentResult
from app.services.payment_service import PaymentService

router = APIRouter()
payment_service = PaymentService()


@router.post("/mock", response_model=PaymentResult)
def create_mock_payment(payload: MockPaymentRequest) -> PaymentResult:
    return payment_service.process_mock_payment(payload)
