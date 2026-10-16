"""Email sending via generic SMTP (booking notifications and admin invoice emails)."""

from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from typing import Literal
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import HTTPException

from app import config
from app.models.booking import Booking

logger = logging.getLogger("tripime.email")


@dataclass
class EmailResult:
    status: Literal["sent", "failed", "not_configured"]
    detail: str


def send_email(
    to: str,
    subject: str,
    text_body: str,
    html_body: str,
    attachments: list[tuple[str, bytes]] | None = None,
) -> EmailResult:
    """Send one email over SMTP. Never raises. "sent" means the SMTP server
    accepted the message for delivery; bounces later aren't tracked."""
    if not config.smtp_is_configured():
        logger.info("SMTP not configured — email to %s not sent. Subject: %s\n%s", to, subject, text_body)
        return EmailResult("not_configured", "SMTP credentials are not set (see backend/.env.example).")

    message = MIMEMultipart("mixed")
    message["Subject"] = subject
    message["From"] = config.SMTP_FROM_EMAIL
    message["To"] = to
    body = MIMEMultipart("alternative")
    body.attach(MIMEText(text_body, "plain"))
    body.attach(MIMEText(html_body, "html"))
    message.attach(body)
    for filename, data in attachments or []:
        part = MIMEApplication(data, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        message.attach(part)

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            refused = server.sendmail(config.SMTP_FROM_EMAIL, [to], message.as_string())
    except Exception as exc:  # noqa: BLE001 — report any SMTP/network failure to the caller
        logger.warning("Email to %s failed: %s", to, exc)
        return EmailResult("failed", f"SMTP error: {exc}")
    if refused:
        return EmailResult("failed", f"Recipient refused: {refused}")
    logger.info("Email accepted by SMTP server for %s: %s", to, subject)
    return EmailResult("sent", f"Accepted by SMTP server {config.SMTP_HOST}")


def send_invoice_email(booking: Booking, pdf_bytes: bytes) -> None:
    """Email the (possibly admin-edited) invoice PDF to the customer on file.
    Unlike automatic notifications, this is triggered directly by an admin
    action, so failures are raised (as an HTTP error) instead of swallowed —
    the admin needs to know the send didn't go through."""

    if not config.smtp_is_configured():
        raise HTTPException(
            status_code=400,
            detail="SMTP is not configured on the server, so invoices can't be emailed yet.",
        )

    message = MIMEMultipart("mixed")
    message["Subject"] = f"Your Tripime invoice — {booking.bookingId} ({booking.pnr})"
    message["From"] = config.SMTP_FROM_EMAIL
    message["To"] = booking.contact.email

    body = MIMEMultipart("alternative")
    text_body = (
        f"Please find attached the invoice for booking {booking.bookingId} (PNR {booking.pnr}).\n\n"
        "This is an automated message from Tripime. No reply is needed."
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px">
      <p>Please find attached the invoice for booking <strong>{booking.bookingId}</strong>
      (PNR <strong>{booking.pnr}</strong>).</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Automated message from Tripime — no reply needed.</p>
    </div>
    """
    body.attach(MIMEText(text_body, "plain"))
    body.attach(MIMEText(html_body, "html"))
    message.attach(body)

    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header(
        "Content-Disposition", "attachment", filename=f"Invoice-{booking.bookingId}.pdf"
    )
    message.attach(attachment)

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_FROM_EMAIL, [booking.contact.email], message.as_string())
        logger.info("Sent invoice email for %s to %s", booking.bookingId, booking.contact.email)
    except Exception as exc:
        logger.exception(
            "Failed to send invoice email for %s to %s", booking.bookingId, booking.contact.email
        )
        raise HTTPException(status_code=502, detail="Failed to send the invoice email.") from exc
