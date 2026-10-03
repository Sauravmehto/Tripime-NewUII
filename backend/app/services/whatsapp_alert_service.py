"""WhatsApp alerts to the Tripime team when a new enquiry arrives, via CallMeBot."""

from __future__ import annotations

import logging
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from app import config
from app.models.enquiry import Enquiry

logger = logging.getLogger("tripime.whatsapp")

CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"

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
    if not config.whatsapp_alerts_configured():
        logger.info(
            "WhatsApp alerts are not configured — skipping alert for enquiry %s", enquiry.id
        )
        return

    query = urlencode(
        {
            "phone": config.WHATSAPP_ALERT_PHONE,
            "text": format_enquiry_alert(enquiry),
            "apikey": config.WHATSAPP_CALLMEBOT_APIKEY,
        }
    )
    try:
        with urlopen(f"{CALLMEBOT_URL}?{query}", timeout=20) as response:
            body = response.read(500).decode("utf-8", errors="replace")
        # CallMeBot answers 200 even for some failures; its page text says why.
        if "error" in body.lower() and "queued" not in body.lower():
            logger.warning("WhatsApp alert for enquiry %s was rejected: %s", enquiry.id, body)
        else:
            logger.info("WhatsApp alert sent for enquiry %s", enquiry.id)
    except (URLError, TimeoutError, OSError) as exc:
        logger.warning("WhatsApp alert for enquiry %s failed: %s", enquiry.id, exc)
