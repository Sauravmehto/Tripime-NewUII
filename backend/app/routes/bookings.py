"""Customer booking-request endpoints. All but `requirements` need a signed-in
customer (email + password session) and only expose that customer's bookings."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.booking import Booking, BookingDraftRequest, BookingReviewRequest, DocumentRequirements
from app.services.booking_rules import document_requirements
from app.services.booking_service import get_booking_service
from app.services.customer_auth_service import CustomerSession, require_session
from app.services.flight_service import get_flight_provider
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf
from app.services.notification_service import notify_booking_event
from app.services.rate_limit import IpRateLimiter

router = APIRouter()
draft_limiter = IpRateLimiter(max_calls=30, window_seconds=600.0)
submit_limiter = IpRateLimiter(max_calls=5, window_seconds=600.0)


class ReviewResult(BaseModel):
    booking: Booking
    priceChanged: bool


@router.get("/requirements", response_model=DocumentRequirements)
def get_requirements(
    flightId: str = Query(..., max_length=200),
    returnFlightId: str | None = Query(None, max_length=200),
) -> DocumentRequirements:
    """Traveller documents the itinerary needs (public, no personal data)."""
    provider = get_flight_provider()
    flight = provider.get_by_id(flightId)
    return_flight = provider.get_by_id(returnFlightId) if returnFlightId else None
    if flight is None or (returnFlightId and return_flight is None):
        raise HTTPException(status_code=404, detail="That flight is no longer available. Please search again.")
    return document_requirements(flight, return_flight)


@router.get("", response_model=list[Booking])
def my_bookings(session: CustomerSession = Depends(require_session)) -> list[Booking]:
    return [b.public_view() for b in get_booking_service().list_for_customer(session)]


@router.post("", response_model=Booking)
def save_draft(payload: BookingDraftRequest, session: CustomerSession = Depends(require_session)) -> Booking:
    """Create or update this checkout's draft with validated traveller details (state PASSENGERS_COMPLETED)."""
    draft_limiter.check(session.customer_id)
    return get_booking_service().save_draft(payload, session).public_view()


@router.get("/{booking_id}", response_model=Booking)
def get_booking(booking_id: str, session: CustomerSession = Depends(require_session)) -> Booking:
    return get_booking_service().get_for_customer(booking_id, session).public_view()


@router.post("/{booking_id}/review", response_model=ReviewResult)
def review_booking(
    booking_id: str, payload: BookingReviewRequest, session: CustomerSession = Depends(require_session)
) -> ReviewResult:
    booking, changed = get_booking_service().review(booking_id, session, payload.expectedTotal)
    return ReviewResult(booking=booking.public_view(), priceChanged=changed)


@router.post("/{booking_id}/submit", response_model=Booking)
def submit_booking_request(
    booking_id: str, background_tasks: BackgroundTasks, session: CustomerSession = Depends(require_session)
) -> Booking:
    """Submit the reviewed booking as a request (PAYMENT_PENDING). This does not take
    payment and does not create a ticket; repeating it doesn't re-notify."""
    submit_limiter.check(session.customer_id)
    booking, created = get_booking_service().submit_request(booking_id, session)
    if created:
        background_tasks.add_task(notify_booking_event, booking.bookingId, "booking_requested")
    return booking.public_view()


def _pdf(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.get("/{booking_id}/invoice")
def download_invoice(booking_id: str, session: CustomerSession = Depends(require_session)) -> Response:
    booking = get_booking_service().get_for_customer(booking_id, session)
    if booking.state in {"DRAFT", "PASSENGERS_COMPLETED", "REVIEWED"}:
        raise HTTPException(status_code=409, detail="Submit the booking request first.")
    return _pdf(build_invoice_pdf(booking), f"Invoice-{booking.bookingId}.pdf")


@router.get("/{booking_id}/ticket")
def download_ticket(booking_id: str, session: CustomerSession = Depends(require_session)) -> Response:
    booking = get_booking_service().get_for_customer(booking_id, session)
    try:
        return _pdf(build_ticket_pdf(booking), f"E-ticket-{booking.bookingId}.pdf")
    except ValueError:
        raise HTTPException(status_code=409, detail="No ticket has been issued for this booking yet.") from None
