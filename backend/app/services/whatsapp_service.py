"""WhatsApp text sender behind one interface: CallMeBot or the WhatsApp Business Cloud API.

Returns what actually happened. "sent" means the provider accepted the message
(HTTP success and no error in the response) — WhatsApp delivery receipts are
not tracked, so callers must not claim the message was read or delivered.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app import config

logger = logging.getLogger("tripime.whatsapp")

CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"
CLOUD_API_URL = "https://graph.facebook.com/v20.0/{phone_number_id}/messages"
# Template variables are limited in length; keep alerts comfortably inside it.
CLOUD_PARAM_LIMIT = 1000


@dataclass
class SendResult:
    status: Literal["sent", "failed", "not_configured"]
    provider: str
    detail: str


def _send_callmebot(phone: str, text: str) -> SendResult:
    query = urlencode({"phone": phone, "text": text, "apikey": config.WHATSAPP_CALLMEBOT_APIKEY})
    try:
        with urlopen(f"{CALLMEBOT_URL}?{query}", timeout=20) as response:
            body = response.read(500).decode("utf-8", errors="replace")
    except (URLError, TimeoutError, OSError) as exc:
        return SendResult("failed", "callmebot", f"Request failed: {exc}")
    # CallMeBot answers 200 even for some failures; its page text says why.
    if "error" in body.lower() and "queued" not in body.lower():
        return SendResult("failed", "callmebot", f"Rejected: {body[:200]}")
    return SendResult("sent", "callmebot", "Accepted by CallMeBot")


def _send_cloud_api(phone: str, text: str) -> SendResult:
    # Business-initiated messages must use an approved template; the alert text
    # goes into its single body variable (newlines aren't allowed there).
    param = " | ".join(line.strip() for line in text.splitlines() if line.strip())[:CLOUD_PARAM_LIMIT]
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_CLOUD_TEMPLATE,
            "language": {"code": config.WHATSAPP_CLOUD_TEMPLATE_LANG},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": param}]}],
        },
    }
    request = Request(
        CLOUD_API_URL.format(phone_number_id=config.WHATSAPP_CLOUD_PHONE_NUMBER_ID),
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {config.WHATSAPP_CLOUD_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            body = json.loads(response.read() or b"{}")
    except HTTPError as exc:
        detail = exc.read(300).decode("utf-8", errors="replace")
        return SendResult("failed", "cloud_api", f"HTTP {exc.code}: {detail}")
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        return SendResult("failed", "cloud_api", f"Request failed: {exc}")
    message_id = (body.get("messages") or [{}])[0].get("id", "")
    return SendResult("sent", "cloud_api", f"Accepted by WhatsApp Cloud API (message id {message_id})")


def send_whatsapp_text(text: str, phone: str | None = None) -> SendResult:
    """Send `text` to `phone` (default: the team's alert number). Never raises."""
    phone = (phone or config.WHATSAPP_ALERT_PHONE).lstrip("+")
    provider = config.whatsapp_provider()
    if provider is None:
        logger.info("WhatsApp not configured — message to +%s not sent. Preview:\n%s", phone, text)
        return SendResult(
            "not_configured",
            config.WHATSAPP_PROVIDER or "none",
            "WhatsApp provider credentials are not set (see backend/.env.example).",
        )
    result = _send_cloud_api(phone, text) if provider == "cloud_api" else _send_callmebot(phone, text)
    log = logger.info if result.status == "sent" else logger.warning
    log("WhatsApp to +%s via %s: %s — %s", phone, result.provider, result.status, result.detail)
    return result
