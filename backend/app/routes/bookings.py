from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models.booking import Booking, BookingCreateRequest, BookingLookupRequest
from app.services.booking_service import get_booking_service
from app.services.invoice_service import build_invoice_pdf

router = APIRouter()


@router.post("", response_model=Booking, status_code=201)
def create_booking(payload: BookingCreateRequest) -> Booking:
    return get_booking_service().create_booking(payload)


@router.post("/lookup", response_model=Booking)
def lookup_booking(payload: BookingLookupRequest) -> Booking:
    """Public 'My Booking' lookup — requires the booking ID/PNR *and* the email or
    phone used to book, so booking IDs (sequential, not secret) can't be enumerated
    to read other travellers' details."""
    booking = get_booking_service().find_booking_by_reference(payload.reference, payload.contact)
    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="No booking found for that reference and email/phone. Double-check both and try again.",
        )
    return booking


@router.get("/{booking_id}", response_model=Booking)
def get_booking(booking_id: str) -> Booking:
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    return booking


@router.get("/{booking_id}/invoice")
def download_invoice(booking_id: str) -> Response:
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")
    pdf_bytes = build_invoice_pdf(booking)
    filename = f"Flight-Invoice-{booking.bookingId}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
