"""Booking and payment notifications to the Tripime team and the customer.

Every attempt is written to the booking's `notifications` log with what really
happened (sent / failed / not_configured) and a preview of the message, so the
admin panel can show delivery status without anyone having to read server logs.
Each (event, attempt, channel, recipient) is sent at most once automatically;
admins can retry the ones that didn't go out.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from typing import Callable, Literal

from app import config
from app.models.booking import Booking, NotificationRecord
from app.services.booking_service import get_booking_service
from app.services.email_service import send_email
from app.services.invoice_service import build_invoice_pdf, build_ticket_pdf
from app.services.whatsapp_service import send_whatsapp_text

logger = logging.getLogger("tripime.notifications")

Event = Literal["booking_created", "payment_paid", "payment_failed", "booking_confirmed", "booking_cancelled"]

ADMIN_HEADLINES: dict[str, str] = {
    "booking_created": "New booking — awaiting payment",
    "payment_paid": "Payment received — confirm the booking",
    "payment_failed": "Payment failed",
    "booking_confirmed": "Booking confirmed",
    "booking_cancelled": "Booking cancelled",
}
CUSTOMER_SUBJECTS: dict[str, str] = {
    "booking_created": "Booking received — complete your payment",
    "payment_paid": "Payment received — we're issuing your ticket",
    "payment_failed": "Your payment didn't go through",
    "booking_confirmed": "Your booking is confirmed — e-ticket attached",
    "booking_cancelled": "Your booking has been cancelled",
}
CUSTOMER_INTROS: dict[str, str] = {
    "booking_created": "We've received your booking. It's held for you, but it isn't paid yet.",
    "payment_paid": "Thanks — your payment was received. Our team is now issuing your ticket; "
    "you'll get the confirmed e-ticket by email shortly.",
    "payment_failed": "Your payment for this booking didn't go through. Nothing was charged. "
    "You can try again from the payment page.",
    "booking_confirmed": "Your booking is confirmed. Your e-ticket and invoice are attached.",
    "booking_cancelled": "Your booking has been cancelled. If you paid, our team will contact you about the refund.",
}


@dataclass
class _Target:
    key: str
    event: str
    channel: Literal["email", "whatsapp"]
    audience: Literal["admin", "customer"]
    recipient: str
    send: Callable[[], tuple[str, str, str]]  # -> (status, provider, detail)
    preview: str


def _key(event: str, attempt: str | None, channel: str, recipient: str) -> str:
    return f"{event}|{attempt or ''}|{channel}|{recipient.lower()}"


def _parse_key(key: str) -> tuple[str, str | None]:
    event, attempt, *_ = key.split("|")
    return event, attempt or None


def _route(flight) -> str:
    via = f" via {', '.join(l.airport.code for l in flight.layovers)}" if flight.layovers else " non-stop"
    return (
        f"{flight.origin.code} → {flight.destination.code}{via} · {flight.departureDate} {flight.departureTime} · "
        f"{flight.flightNumber}"
    )


def _summary_lines(booking: Booking) -> list[str]:
    lead = booking.passengers[0]
    test = booking.payments[-1].testMode if booking.payments else config.PAYMENT_PROVIDER == "mock"
    lines = [
        f"Booking: {booking.bookingId} (PNR {booking.pnr})",
        f"Departing: {_route(booking.flight)}",
    ]
    if booking.returnFlight:
        lines.append(f"Return: {_route(booking.returnFlight)}")
    lines += [
        f"Passengers: {booking.passengerCount} — {lead.title} {lead.firstName} {lead.lastName}"
        + (f" + {booking.passengerCount - 1} more" if booking.passengerCount > 1 else ""),
        f"Amount: INR {booking.totalAmount:,}",
        f"Payment: {booking.paymentStatus.upper()} · Booking: {booking.bookingStatus.upper()}",
    ]
    if test:
        lines.append("TEST MODE — mock payment, no real money involved.")
    return lines


def _html(heading: str, intro: str, lines: list[str]) -> str:
    rows = "".join(f'<li style="margin:2px 0">{escape(line)}</li>' for line in lines)
    return (
        '<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px">'
        f'<h2 style="color:#1d4ed8;margin-bottom:6px">{escape(heading)}</h2>'
        f'<p style="color:#334155">{escape(intro)}</p>'
        f'<ul style="color:#334155;padding-left:18px">{rows}</ul>'
        '<p style="color:#94a3b8;font-size:12px;margin-top:24px">Automated message from Tripime.</p></div>'
    )


def _targets(booking: Booking, event: str, attempt: str | None) -> list[_Target]:
    lines = _summary_lines(booking)
    if event == "payment_failed" and booking.payments:
        reason = booking.payments[-1].failureReason or "Declined"
        lines.append(f"Failure reason: {reason}")
    targets: list[_Target] = []

    # Team email
    admin = config.ADMIN_NOTIFY_EMAIL
    if admin:
        subject = f"[Tripime] {ADMIN_HEADLINES[event]} — {booking.bookingId}"
        text = "\n".join([ADMIN_HEADLINES[event], "", *lines])
        targets.append(
            _Target(
                key=_key(event, attempt, "email", admin),
                event=event,
                channel="email",
                audience="admin",
                recipient=admin,
                send=lambda s=subject, t=text: _email(admin, s, t, _html(ADMIN_HEADLINES[event], "", lines)),
                preview=f"Subject: {subject}\n\n{text}",
            )
        )

    # Team WhatsApp
    phone = config.WHATSAPP_ALERT_PHONE
    if phone:
        text = "\n".join([f"*Tripime: {ADMIN_HEADLINES[event]}*", *lines])
        targets.append(
            _Target(
                key=_key(event, attempt, "whatsapp", phone),
                event=event,
                channel="whatsapp",
                audience="admin",
                recipient=f"+{phone}",
                send=lambda t=text: _whatsapp(t, phone),
                preview=text,
            )
        )

    # Customer email
    customer = booking.contact.email
    if customer:
        subject = f"Tripime: {CUSTOMER_SUBJECTS[event]} ({booking.bookingId})"
        intro = CUSTOMER_INTROS[event]
        text = "\n".join([intro, "", *lines])
        attachments: list[tuple[str, Callable[[], bytes]]] = []
        if event == "payment_paid":
            attachments.append((f"Invoice-{booking.bookingId}.pdf", lambda: build_invoice_pdf(booking)))
        if event == "booking_confirmed":
            attachments.append((f"E-ticket-{booking.bookingId}.pdf", lambda: build_ticket_pdf(booking)))
            attachments.append((f"Invoice-{booking.bookingId}.pdf", lambda: build_invoice_pdf(booking)))
        targets.append(
            _Target(
                key=_key(event, attempt, "email", customer),
                event=event,
                channel="email",
                audience="customer",
                recipient=customer,
                send=lambda s=subject, t=text, i=intro, a=attachments: _email(
                    customer, s, t, _html(CUSTOMER_SUBJECTS[event], i, lines), [(n, build()) for n, build in a]
                ),
                preview=f"Subject: {subject}\n"
                + (f"Attachments: {', '.join(n for n, _ in attachments)}\n" if attachments else "")
                + f"\n{text}",
            )
        )
    return targets


def _email(to: str, subject: str, text: str, html: str, attachments=None) -> tuple[str, str, str]:
    result = send_email(to, subject, text, html, attachments)
    return result.status, "smtp", result.detail


def _whatsapp(text: str, phone: str) -> tuple[str, str, str]:
    result = send_whatsapp_text(text, phone)
    return result.status, result.provider, result.detail


def notify_booking_event(
    booking_id: str,
    event: Event,
    attempt: str | None = None,
    only_keys: set[str] | None = None,
) -> list[NotificationRecord]:
    """Send notifications for `event`. Without `only_keys`, anything already
    attempted is skipped (no duplicates); with it, just those keys are re-sent.
    Runs as a background task, so it never raises."""
    service = get_booking_service()
    booking = service.get_booking(booking_id)
    if booking is None:
        return []
    already = {r.key for r in booking.notifications}
    records: list[NotificationRecord] = []
    for target in _targets(booking, event, attempt):
        if only_keys is not None:
            if target.key not in only_keys:
                continue
        elif target.key in already:
            continue
        try:
            status, provider, detail = target.send()
        except Exception as exc:  # noqa: BLE001 — a broken channel must not stop the others
            logger.exception("Notification %s failed", target.key)
            status, provider, detail = "failed", target.channel, f"Unexpected error: {exc}"
        records.append(
            NotificationRecord(
                key=target.key,
                event=target.event,
                channel=target.channel,
                recipient=target.recipient,
                audience=target.audience,
                status=status,  # type: ignore[arg-type]
                provider=provider,
                at=datetime.now(timezone.utc).isoformat(),
                detail=detail,
                preview=target.preview[:2000],
            )
        )
    if records:
        service.record_notifications(booking_id, records)
    return records


def retry_undelivered(booking_id: str) -> list[NotificationRecord]:
    """Re-attempt every notification that wasn't accepted by its provider."""
    booking = get_booking_service().get_booking(booking_id)
    if booking is None:
        return []
    pending: dict[tuple[str, str | None], set[str]] = {}
    for record in booking.notifications:
        if record.status != "sent":
            pending.setdefault(_parse_key(record.key), set()).add(record.key)
    results: list[NotificationRecord] = []
    for (event, attempt), keys in pending.items():
        results += notify_booking_event(booking_id, event, attempt, only_keys=keys)  # type: ignore[arg-type]
    return results
