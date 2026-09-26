from fastapi import APIRouter

from app.models.enquiry import Enquiry, EnquiryCreateRequest
from app.services.enquiry_service import get_enquiry_service

router = APIRouter()


@router.post("", response_model=Enquiry, status_code=201)
def create_enquiry(payload: EnquiryCreateRequest) -> Enquiry:
    return get_enquiry_service().create_enquiry(payload)
