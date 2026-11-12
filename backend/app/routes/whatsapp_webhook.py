"""Incoming WhatsApp messages from the Meta WhatsApp Business Cloud API.

Meta first calls GET to verify the webhook, then POSTs every delivery signed with the app secret. We only trust a
POST whose X-Hub-Signature-256 matches, store each message once (a repeated message id is ignored) and link it to
the customer's open inquiry when the sender's number matches a number we legitimately hold.

Not configured (no WHATSAPP_VERIFY_TOKEN / WHATSAPP_APP_SECRET) => the endpoints answer 503 and nothing is stored."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, Response

from app import config
from app.services.inquiry_service import get_inquiry_service

router = APIRouter()
log = logging.getLogger("tripime.whatsapp.webhook")
MAX_BODY = 1_000_000  # bytes


@router.get("")
def verify(
    mode: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    challenge: str = Query("", alias="hub.challenge"),
) -> Response:
    if not config.WHATSAPP_VERIFY_TOKEN:
        raise HTTPException(status_code=503, detail="WhatsApp webhook is not configured.")
    if mode == "subscribe" and hmac.compare_digest(token.encode(), config.WHATSAPP_VERIFY_TOKEN.encode()):
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed.")


def _signature_ok(body: bytes, header: str | None) -> bool:
    if not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(config.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.split("=", 1)[1].strip())


@router.post("")
async def receive(request: Request) -> dict:
    if not config.WHATSAPP_APP_SECRET:
        raise HTTPException(status_code=503, detail="WhatsApp webhook is not configured.")
    body = await request.body()
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="Payload too large.")
    if not _signature_ok(body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=403, detail="Invalid signature.")
    try:
        payload = json.loads(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON.")

    service = get_inquiry_service()
    stored = linked = 0
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value", {}) or {}
            names = {c.get("wa_id"): (c.get("profile", {}) or {}).get("name", "") for c in value.get("contacts", []) or []}
            for message in value.get("messages", []) or []:
                message_id, sender = message.get("id"), message.get("from")
                if not message_id or not sender:
                    continue
                kind = message.get("type", "text")
                text = (message.get("text", {}) or {}).get("body", "") if kind == "text" else f"[{kind} message]"
                try:
                    at = datetime.fromtimestamp(int(message.get("timestamp")), tz=timezone.utc).isoformat()
                except (TypeError, ValueError, OverflowError, OSError):
                    at = datetime.now(timezone.utc).isoformat()
                is_new, inquiry_id = service.record_incoming_whatsapp(
                    message_id=str(message_id), sender_phone=str(sender), sender_name=names.get(sender, ""),
                    body=text, message_type=kind, timestamp=at,
                )
                stored += int(is_new)
                linked += int(bool(inquiry_id))
    log.info("WhatsApp webhook: %s new message(s), %s linked", stored, linked)
    # Always 200 once the signature is valid so Meta does not keep retrying messages we have already handled.
    return {"ok": True, "stored": stored, "linked": linked}
