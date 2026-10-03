from fastapi import APIRouter, BackgroundTasks

from app.models.enquiry import Enquiry, EnquiryCreateRequest
from app.services.enquiry_service import get_enquiry_service
from app.services.whatsapp_alert_service import send_enquiry_alert

router = APIRouter()


@router.post("", response_model=Enquiry, status_code=201)
def create_enquiry(payload: EnquiryCreateRequest, background_tasks: BackgroundTasks) -> Enquiry:
    enquiry = get_enquiry_service().create_enquiry(payload)
    # Alert the team on WhatsApp after the response is sent, so a slow or
    # failing WhatsApp API never delays or breaks the visitor's enquiry.
    background_tasks.add_task(send_enquiry_alert, enquiry)
    return enquiry
