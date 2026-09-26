"""Admin token issuance and verification (single hardcoded admin)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException

from app import config

ALGORITHM = "HS256"


def create_admin_token() -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=config.ADMIN_TOKEN_TTL_HOURS)
    payload = {"sub": "admin", "exp": expires_at}
    token = jwt.encode(payload, config.ADMIN_JWT_SECRET, algorithm=ALGORITHM)
    return token, expires_at


def _decode_token(token: str) -> dict:
    return jwt.decode(token, config.ADMIN_JWT_SECRET, algorithms=[ALGORITHM])


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing admin authorization token.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        _decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin authorization token.")
