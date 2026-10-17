"""Customer sign-in for booking: a one-time code sent to the customer's email.

This upgrades the existing customer profile (same customer records in
admin_ops) with proof of email ownership. Booking endpoints accept only the
session issued here — never the lead-capture profile token, which is not a
security login.

The session is an HttpOnly cookie so browser JavaScript can't read it.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import Lock

import jwt
from fastapi import HTTPException, Request, Response

from app import config
from app.models.admin_ops import CustomerLogin
from app.services.admin_ops_service import get_admin_ops_service
from app.services.customer_profile_service import new_customer_id, normalize_email, stamp_login
from app.services.email_service import send_email
from app.services.rate_limit import IpRateLimiter

logger = logging.getLogger("tripime.auth")

ALGORITHM = "HS256"
SESSION_KIND = "customer_session"
OTP_LENGTH = 6
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 45

# Per-email limits are the real guard against spamming one inbox. The per-address limits
# are generous because many customers can share one address (offices, mobile carriers,
# or a proxy in front of the API).
otp_ip_limiter = IpRateLimiter(max_calls=30, window_seconds=600.0)
otp_email_limiter = IpRateLimiter(max_calls=5, window_seconds=600.0)
verify_ip_limiter = IpRateLimiter(max_calls=60, window_seconds=600.0)


@dataclass
class _PendingCode:
    digest: str
    expires_at: float
    sent_at: float
    attempts: int = 0


@dataclass
class _OtpStore:
    """In-memory, per process. Codes are stored hashed and expire quickly.
    A multi-instance deployment should move this to a shared store (e.g. Redis)."""

    codes: dict[str, _PendingCode] = field(default_factory=dict)
    lock: Lock = field(default_factory=Lock)


_store = _OtpStore()


@dataclass(frozen=True)
class CustomerSession:
    customer_id: str
    email: str


def _digest(email: str, code: str) -> str:
    return hmac.new(config.CUSTOMER_JWT_SECRET.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def fixed_dev_code() -> str | None:
    """The fixed development code, only outside production and without real email."""
    code = config.CUSTOMER_OTP_DEV_CODE
    if code and re.fullmatch(r"\d{6}", code) and not config.IS_PRODUCTION and not config.smtp_is_configured():
        return code
    return None


def request_code(email: str, ip: str) -> str:
    """Send a sign-in code. Returns how it was delivered: "email", "dev_fixed" or "dev_log"."""
    email = normalize_email(email)
    otp_ip_limiter.check(ip)
    otp_email_limiter.check(email)
    now = time.time()
    with _store.lock:
        pending = _store.codes.get(email)
        if pending and now - pending.sent_at < RESEND_COOLDOWN_SECONDS:
            wait = int(RESEND_COOLDOWN_SECONDS - (now - pending.sent_at)) + 1
            raise HTTPException(status_code=429, detail=f"A code was just sent — check your inbox. You can ask for another in {wait} seconds.")

    dev_code = fixed_dev_code()
    if dev_code:
        # No email is sent: the known development code is what the user types.
        logger.warning("DEVELOPMENT ONLY — fixed sign-in code active for %s", email)
        with _store.lock:
            _store.codes[email] = _PendingCode(_digest(email, dev_code), now + config.OTP_TTL_SECONDS, now)
        return "dev_fixed"

    code = f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"
    minutes = config.OTP_TTL_SECONDS // 60
    result = send_email(
        email,
        f"Your Tripime sign-in code: {code}",
        f"Your Tripime sign-in code is {code}. It expires in {minutes} minutes.\n\n"
        "If you didn't ask for this, you can ignore this email.",
        f'<div style="font-family:Arial,sans-serif;color:#0f172a"><p>Your Tripime sign-in code is</p>'
        f'<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{code}</p>'
        f"<p>It expires in {minutes} minutes. If you didn't ask for this, ignore this email.</p></div>",
    )
    if result.status == "sent":
        delivery = "email"
    elif config.CUSTOMER_OTP_DEV_LOG and not config.IS_PRODUCTION:
        # Never in production: the code is only visible to whoever runs the server.
        logger.warning("DEVELOPMENT ONLY — sign-in code for %s: %s (email delivery: %s)", email, code, result.status)
        delivery = "dev_log"
    else:
        logger.error("Sign-in code for %s could not be delivered: %s", email, result.detail)
        raise HTTPException(
            status_code=503,
            detail="We can't send sign-in codes right now. Please try again later or contact us.",
        )

    with _store.lock:
        _store.codes[email] = _PendingCode(_digest(email, code), now + config.OTP_TTL_SECONDS, now)
    return delivery


def verify_code(email: str, code: str, ip: str) -> CustomerLogin:
    email = normalize_email(email)
    verify_ip_limiter.check(ip)
    with _store.lock:
        pending = _store.codes.get(email)
        if pending is None or time.time() > pending.expires_at:
            _store.codes.pop(email, None)
            raise HTTPException(status_code=400, detail="That code has expired. Ask for a new one.")
        pending.attempts += 1
        if pending.attempts > MAX_ATTEMPTS:
            _store.codes.pop(email, None)
            raise HTTPException(status_code=429, detail="Too many wrong codes. Ask for a new one.")
        if not hmac.compare_digest(pending.digest, _digest(email, code.strip())):
            raise HTTPException(status_code=400, detail="That code isn't right. Check the email and try again.")
        _store.codes.pop(email, None)

    service = get_admin_ops_service()
    customer = service.find_customer_by_email(email)
    if customer is None:
        customer = CustomerLogin(id=new_customer_id(), email=email, signupPage="booking-sign-in")
    return service.upsert_customer(stamp_login(customer, signup_page="booking-sign-in"))


def start_session(response: Response, customer: CustomerLogin) -> None:
    expires = datetime.now(timezone.utc) + timedelta(hours=config.CUSTOMER_SESSION_HOURS)
    token = jwt.encode(
        {"sub": customer.id, "email": normalize_email(customer.email), "kind": SESSION_KIND, "exp": expires},
        config.CUSTOMER_JWT_SECRET,
        algorithm=ALGORITHM,
    )
    response.set_cookie(
        config.CUSTOMER_SESSION_COOKIE,
        token,
        max_age=config.CUSTOMER_SESSION_HOURS * 3600,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,  # type: ignore[arg-type]
        path="/api",
    )


def end_session(response: Response) -> None:
    response.delete_cookie(config.CUSTOMER_SESSION_COOKIE, path="/api")


def optional_session(request: Request) -> CustomerSession | None:
    token = request.cookies.get(config.CUSTOMER_SESSION_COOKIE)
    if not token:
        return None
    try:
        payload = jwt.decode(token, config.CUSTOMER_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    if payload.get("kind") != SESSION_KIND or not payload.get("sub") or not payload.get("email"):
        return None
    return CustomerSession(customer_id=payload["sub"], email=payload["email"])


def require_session(request: Request) -> CustomerSession:
    session = optional_session(request)
    if session is None:
        raise HTTPException(status_code=401, detail="Please sign in to continue your booking.")
    return session
