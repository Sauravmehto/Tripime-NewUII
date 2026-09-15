"""Booking confirmation email sending, via generic SMTP."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app import config
from app.models.booking import Booking

logger = logging.getLogger("tripime.email")


def _build_message(booking: Booking) -> MIMEMultipart:
    passenger_lines = "".join(
        f"<li>{p.title} {p.firstName} {p.lastName} — Seat {p.seatNumber or '—'}</li>"
        for p in booking.passengers
    )
    passenger_text = "\n".join(
        f"  - {p.title} {p.firstName} {p.lastName} (Seat {p.seatNumber or '—'})"
        for p in booking.passengers
    )

    subject = f"Booking confirmed — {booking.pnr} ({booking.flight.origin.code} to {booking.flight.destination.code})"

    text_body = f"""Your booking is confirmed!

Booking ID: {booking.bookingId}
PNR: {booking.pnr}
Status: {booking.status}

Flight: {booking.flight.airline.name} {booking.flight.flightNumber}
Route: {booking.flight.origin.city} ({booking.flight.origin.code}) -> {booking.flight.destination.city} ({booking.flight.destination.code})
Travel date: {booking.flight.departureDate}
Departure: {booking.flight.departureTime}  Arrival: {booking.flight.arrivalTime}

Passengers:
{passenger_text}

Total paid: INR {booking.totalAmount:,}

This is an automated message from Tripime. No reply is needed.
"""

    html_body = f"""
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px">
      <h2 style="color:#1d4ed8;margin-bottom:4px">Your booking is confirmed!</h2>
      <p style="color:#475569;margin-top:0">Booking ID: <strong>{booking.bookingId}</strong> &middot; PNR: <strong>{booking.pnr}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:4px 0;color:#64748b">Flight</td><td style="padding:4px 0"><strong>{booking.flight.airline.name} {booking.flight.flightNumber}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Route</td><td style="padding:4px 0">{booking.flight.origin.city} ({booking.flight.origin.code}) &rarr; {booking.flight.destination.city} ({booking.flight.destination.code})</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Travel date</td><td style="padding:4px 0">{booking.flight.departureDate}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Timing</td><td style="padding:4px 0">{booking.flight.departureTime} &ndash; {booking.flight.arrivalTime}</td></tr>
      </table>
      <p style="color:#334155;margin-bottom:4px"><strong>Passengers</strong></p>
      <ul style="color:#334155;margin-top:0">{passenger_lines}</ul>
      <p style="color:#0f172a;font-size:16px"><strong>Total paid: INR {booking.totalAmount:,}</strong></p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Automated message from Tripime — no reply needed.</p>
    </div>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = config.SMTP_FROM_EMAIL
    message["To"] = booking.contact.email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))
    return message


def send_booking_confirmation_email(booking: Booking) -> None:
    """Send the confirmation email. Never raises — logs on failure so booking
    creation is never blocked or rolled back by an email delivery problem."""

    if not config.smtp_is_configured():
        logger.warning(
            "SMTP is not configured — skipping confirmation email for booking %s",
            booking.bookingId,
        )
        return

    message = _build_message(booking)

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_FROM_EMAIL, [booking.contact.email], message.as_string())
        logger.info(
            "Sent booking confirmation email for %s to %s",
            booking.bookingId,
            booking.contact.email,
        )
    except Exception:
        logger.exception(
            "Failed to send booking confirmation email for %s to %s",
            booking.bookingId,
            booking.contact.email,
        )
