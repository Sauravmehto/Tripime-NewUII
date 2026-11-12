import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.models.enquiry import Enquiry, EnquiryCreateRequest
from app.services.customer_auth_service import CustomerSession, optional_session
from app.services.enquiry_service import get_enquiry_service
from app.services.inquiry_service import get_inquiry_service
from app.services.rate_limit import IpRateLimiter, client_ip
from app.services.whatsapp_alert_service import send_enquiry_alert

router = APIRouter()
log = logging.getLogger("tripime.enquiries")
# Public forms: slow down scripted spam without bothering real visitors.
enquiry_limiter = IpRateLimiter(max_calls=20, window_seconds=600.0)


@router.post("", response_model=Enquiry, status_code=201)
def create_enquiry(
    payload: EnquiryCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: CustomerSession | None = Depends(optional_session),
) -> Enquiry:
    enquiry_limiter.check(client_ip(request))
    enquiry = get_enquiry_service().create_enquiry(payload)
    # Mirror it into the central inquiry list (admin CRM). The form submission must succeed even if this fails.
    try:
        get_inquiry_service().create_from_enquiry(enquiry, session)
    except Exception:
        log.exception("Could not mirror enquiry %s into the inquiry CRM", enquiry.id)
    # Alert the team on WhatsApp after the response is sent, so a slow or
    # failing WhatsApp API never delays or breaks the visitor's enquiry.
    background_tasks.add_task(send_enquiry_alert, enquiry)
    return enquiry
