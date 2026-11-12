"""A signed-in customer's own inquiries (shown in /my-booking next to their bookings).

Every route needs the customer session cookie. The customer is taken from that verified session, never from the request body."""

from fastapi import APIRouter, Depends

from app.models.inquiry import CustomerInquiry, CustomerInquiryCreate, CustomerInquiryResult
from app.services.customer_auth_service import CustomerSession, require_session
from app.services.inquiry_service import get_inquiry_service
from app.services.rate_limit import IpRateLimiter

router = APIRouter()
create_limiter = IpRateLimiter(max_calls=20, window_seconds=600.0)


@router.post("/inquiries", response_model=CustomerInquiryResult)
def create_inquiry(
    payload: CustomerInquiryCreate, session: CustomerSession = Depends(require_session)
) -> CustomerInquiryResult:
    create_limiter.check(session.customer_id)
    return get_inquiry_service().create_for_customer(payload, session)


@router.get("/inquiries", response_model=list[CustomerInquiry])
def list_my_inquiries(session: CustomerSession = Depends(require_session)) -> list[CustomerInquiry]:
    return get_inquiry_service().list_for_customer(session)
