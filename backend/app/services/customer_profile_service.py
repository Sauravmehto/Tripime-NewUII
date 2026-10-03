"""Customer profile (lead capture) — NOT a security login.

Email + phone identify a greeting/autofill profile only.
Must never unlock My Bookings, invoices, or other personal data.
"""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app import config
from app.models.admin_ops import CustomerLogin

ALGORITHM = "HS256"
PROFILE_TOKEN_DAYS = 90
TOKEN_KIND = "customer_profile"


class CustomerProfileRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    countryCode: str = Field("+91", min_length=1, max_length=8)
    mobile: str = Field(..., min_length=6, max_length=20)
    signupPage: str = Field("", max_length=80)
    consent: bool = True
    # Honeypot — bots fill this; humans leave empty (obscure name avoids browser autofill)
    tpHp: str = Field("", max_length=200)


class CustomerProfileLoginRequest(BaseModel):
    email: EmailStr
    countryCode: str = Field("+91", min_length=1, max_length=8)
    mobile: str = Field(..., min_length=6, max_length=20)
    tpHp: str = Field("", max_length=200)


class CustomerProfilePublic(BaseModel):
    id: str
    name: str
    email: str
    mobile: str
    countryCode: str = "+91"


class CustomerProfileSessionResponse(BaseModel):
    token: str
    customer: CustomerProfilePublic


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_mobile(country_code: str, mobile: str) -> str:
    """Store E.164-ish: +918130699818. Strip leading 0 from national number."""
    cc = country_code.strip() or "+91"
    if not cc.startswith("+"):
        cc = f"+{cc}"
    cc_digits = re.sub(r"\D", "", cc)
    digits = re.sub(r"\D", "", mobile)
    if digits.startswith("0"):
        digits = digits.lstrip("0")
    if not digits:
        raise HTTPException(status_code=400, detail="Enter a valid phone number.")
    # User pasted full international number already
    if digits.startswith(cc_digits) and len(digits) > len(cc_digits) + 5:
        return f"+{digits}"
    return f"+{cc_digits}{digits}"


def to_public(customer: CustomerLogin) -> CustomerProfilePublic:
    return CustomerProfilePublic(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        mobile=customer.mobile,
        countryCode=customer.countryCode or "+91",
    )


def create_profile_token(customer_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=PROFILE_TOKEN_DAYS)
    payload = {
        "sub": customer_id,
        "kind": TOKEN_KIND,
        "exp": expires_at,
    }
    return jwt.encode(payload, config.ADMIN_JWT_SECRET, algorithm=ALGORITHM)


def decode_profile_token(token: str) -> str:
    try:
        payload = jwt.decode(token, config.ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session.")
    if payload.get("kind") != TOKEN_KIND:
        raise HTTPException(status_code=401, detail="Invalid session.")
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(status_code=401, detail="Invalid session.")
    return sub


def require_customer_profile(
    authorization: str | None = Header(default=None),
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing profile session.")
    token = authorization.split(" ", 1)[1].strip()
    return decode_profile_token(token)


def new_customer_id() -> str:
    return f"cust_{secrets.token_hex(5)}"


def stamp_login(customer: CustomerLogin, *, signup_page: str = "") -> CustomerLogin:
    now = _now_iso()
    data = customer.model_dump()
    if not data.get("firstLoginAt"):
        data["firstLoginAt"] = now
    data["lastLoginAt"] = now
    data["loginCount"] = int(data.get("loginCount") or 0) + 1
    if signup_page and not data.get("signupPage"):
        data["signupPage"] = signup_page
    if not data.get("consentAt"):
        data["consentAt"] = now
    return CustomerLogin.model_validate(data)
