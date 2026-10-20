"""Customer sessions for booking.

Customers sign in with email + password (see customer_account_service). A successful sign-in
starts the session issued here; booking endpoints accept only this session — never the
lead-capture profile token, which is not a security login.

The session is an HttpOnly cookie so browser JavaScript can't read it.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request, Response

from app import config
from app.models.admin_ops import CustomerLogin
from app.services.customer_profile_service import normalize_email

ALGORITHM = "HS256"
SESSION_KIND = "customer_session"


@dataclass(frozen=True)
class CustomerSession:
    customer_id: str
    email: str


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
