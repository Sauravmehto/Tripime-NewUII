"""WhatsApp alerts to the Tripime team when a new enquiry arrives (see whatsapp_service)."""

from __future__ import annotations

import logging

from app.models.enquiry import Enquiry
from app.services.whatsapp_service import send_whatsapp_text

logger = logging.getLogger("tripime.whatsapp")

SOURCE_LABELS = {
    "package": "Package enquiry",
    "group": "Group trip enquiry",
    "itinerary": "Custom itinerary enquiry",
    "contact": "Contact form",
    "service": "Service enquiry",
}


def format_enquiry_alert(enquiry: Enquiry) -> str:
    """WhatsApp text for the team, using WhatsApp's *bold* markup."""
    lines = [
        f"*New {SOURCE_LABELS.get(enquiry.source, 'enquiry')}* ({enquiry.id})",
        "",
    ]
    if enquiry.packageTitle:
        lines.append(f"*Package:* {enquiry.packageTitle}")
    if enquiry.serviceType:
        lines.append(f"*Service:* {enquiry.serviceType}")
    lines += [
        f"*Name:* {enquiry.name}",
        f"*Phone:* {enquiry.phone}",
        f"*Email:* {enquiry.email}",
    ]
    if enquiry.travelMonth:
        lines.append(f"*Travel month:* {enquiry.travelMonth}")
    lines.append(f"*Travellers:* {enquiry.travelers}")
    if enquiry.message:
        lines.append(f"*Message:* {enquiry.message}")
    return "\n".join(lines)


def send_enquiry_alert(enquiry: Enquiry) -> None:
    """Send the alert; meant to run as a background task, so it never raises."""
    result = send_whatsapp_text(format_enquiry_alert(enquiry))
    logger.info("Enquiry %s WhatsApp alert: %s (%s)", enquiry.id, result.status, result.detail)
