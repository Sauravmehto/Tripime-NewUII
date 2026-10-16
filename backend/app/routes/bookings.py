from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import Response

from app.models.booking import Booking, BookingCreateRequest, BookingLookupRequest, BookingPayRequest
from app.services.booking_service import get_booking_service
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf
from app.services.notification_service import notify_booking_event

router = APIRouter()

TokenQuery = Query(..., min_length=10, description="Booking access token returned at creation / lookup")


@router.post("", response_model=Booking, status_code=201)
def create_booking(payload: BookingCreateRequest, background_tasks: BackgroundTasks) -> Booking:
    """Create a booking awaiting payment (seats held). Repeating the same
    checkoutKey returns the same booking instead of creating a duplicate."""
    booking, created = get_booking_service().create_booking(payload)
    if created:
        background_tasks.add_task(notify_booking_event, booking.bookingId, "booking_created")
    return booking.public_view()


@router.post("/{booking_id}/pay", response_model=Booking)
def pay_booking(
    booking_id: str,
    payload: BookingPayRequest,
    background_tasks: BackgroundTasks,
    token: str = TokenQuery,
) -> Booking:
    """Take payment server-side for the booking's own total via the configured
    payment provider (test mode: mock). The browser never reports the result."""
    booking, attempt = get_booking_service().pay(booking_id, token, payload)
    if attempt is not None:
        event = "payment_paid" if attempt.status == "SUCCESS" else "payment_failed"
        # Each failed attempt notifies once; success notifies once per booking.
        background_tasks.add_task(
            notify_booking_event, booking_id, event, attempt.paymentId if event == "payment_failed" else None
        )
    return booking.public_view()


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
    return booking.public_view()


@router.get("/{booking_id}", response_model=Booking)
def get_booking(booking_id: str, token: str = TokenQuery) -> Booking:
    return get_booking_service().get_for_customer(booking_id, token).public_view()


def _pdf(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.get("/{booking_id}/invoice")
def download_invoice(booking_id: str, token: str = TokenQuery) -> Response:
    booking = get_booking_service().get_for_customer(booking_id, token)
    return _pdf(build_invoice_pdf(booking), f"Invoice-{booking.bookingId}.pdf")


@router.get("/{booking_id}/ticket")
def download_ticket(booking_id: str, token: str = TokenQuery) -> Response:
    booking = get_booking_service().get_for_customer(booking_id, token)
    return _pdf(build_ticket_pdf(booking), f"E-ticket-{booking.bookingId}.pdf")
