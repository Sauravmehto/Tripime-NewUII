"""Admin token issuance and verification (single hardcoded admin).

Browsers authenticate with an HttpOnly cookie plus a per-session CSRF token that must be
echoed in the X-CSRF-Token header on every state-changing request. Scripts may still send
`Authorization: Bearer <jwt>` (not CSRF-prone, since a cross-site page cannot set that header).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request, Response

from app import config

ALGORITHM = "HS256"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_HEADER = "x-csrf-token"


def create_admin_token() -> tuple[str, datetime, str]:
    """Returns (jwt, expires_at, csrf_token)."""
    expires_at = datetime.now(timezone.utc) + timedelta(hours=config.ADMIN_TOKEN_TTL_HOURS)
    csrf = secrets.token_urlsafe(32)
    payload = {"sub": "admin", "kind": "admin", "csrf": csrf, "exp": expires_at}
    token = jwt.encode(payload, config.ADMIN_JWT_SECRET, algorithm=ALGORITHM)
    return token, expires_at, csrf


def _decode_token(token: str) -> dict:
    return jwt.decode(token, config.ADMIN_JWT_SECRET, algorithms=[ALGORITHM])


def set_admin_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        config.ADMIN_SESSION_COOKIE,
        token,
        max_age=config.ADMIN_TOKEN_TTL_HOURS * 3600,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,  # type: ignore[arg-type]
        path="/api/admin",
    )


def clear_admin_cookie(response: Response) -> None:
    response.delete_cookie(config.ADMIN_SESSION_COOKIE, path="/api/admin")


def _verify(token: str) -> dict:
    try:
        claims = _decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin authorization token.")
    if claims.get("sub") != "admin":
        raise HTTPException(status_code=401, detail="Invalid admin authorization token.")
    return claims


def admin_claims(request: Request) -> dict:
    """Authenticate the request and enforce CSRF for cookie-authenticated writes."""
    header = request.headers.get("authorization")
    if header and header.lower().startswith("bearer "):
        return _verify(header.split(" ", 1)[1].strip())

    cookie = request.cookies.get(config.ADMIN_SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Missing admin authorization token.")
    claims = _verify(cookie)
    if request.method not in SAFE_METHODS:
        sent = request.headers.get(CSRF_HEADER, "")
        expected = str(claims.get("csrf") or "")
        if not expected or not secrets.compare_digest(sent.encode(), expected.encode()):
            raise HTTPException(status_code=403, detail="Missing or invalid CSRF token.")
    return claims


def require_admin(request: Request) -> None:
    admin_claims(request)
