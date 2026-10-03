"""Public customer-profile routes (lead capture greeting / autofill only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from app.models.admin_ops import CustomerLogin
from app.services.admin_ops_service import get_admin_ops_service
from app.services.customer_profile_service import (
    CustomerProfileLoginRequest,
    CustomerProfilePublic,
    CustomerProfileRegisterRequest,
    CustomerProfileSessionResponse,
    create_profile_token,
    new_customer_id,
    normalize_email,
    normalize_mobile,
    require_customer_profile,
    stamp_login,
    to_public,
)
from app.services.rate_limit import client_ip, profile_rate_limiter

router = APIRouter()


def _reject_honeypot(tp_hp: str) -> None:
    if tp_hp and tp_hp.strip():
        raise HTTPException(status_code=400, detail="Unable to process request.")


@router.post("/register", response_model=CustomerProfileSessionResponse)
def register_customer_profile(
    payload: CustomerProfileRegisterRequest,
    request: Request,
) -> CustomerProfileSessionResponse:
    profile_rate_limiter.check(client_ip(request))
    _reject_honeypot(payload.tpHp)
    if not payload.consent:
        raise HTTPException(
            status_code=400,
            detail="Please agree to be contacted by Tripime to continue.",
        )

    email = normalize_email(str(payload.email))
    mobile = normalize_mobile(payload.countryCode, payload.mobile)
    country_code = payload.countryCode.strip() or "+91"
    if not country_code.startswith("+"):
        country_code = f"+{country_code}"

    service = get_admin_ops_service()
    existing_email = service.find_customer_by_email(email)
    existing_mobile = service.find_customer_by_mobile(mobile)

    if existing_email and existing_email.mobile != mobile:
        raise HTTPException(
            status_code=409,
            detail="This email is already registered with a different number.",
        )
    if existing_mobile and normalize_email(existing_mobile.email) != email:
        raise HTTPException(
            status_code=409,
            detail="This phone number is already registered with a different email.",
        )

    if existing_email:
        updated = stamp_login(existing_email, signup_page=payload.signupPage)
        if payload.name.strip() and (not updated.name or updated.name == "----"):
            updated = updated.model_copy(update={"name": payload.name.strip()})
        customer = service.upsert_customer(updated)
    else:
        now_customer = CustomerLogin(
            id=new_customer_id(),
            name=payload.name.strip(),
            email=email,
            mobile=mobile,
            countryCode=country_code,
            firstLoginAt="",
            consentAt="",
            lastLoginAt="",
            loginCount=0,
            signupPage=payload.signupPage.strip()[:80],
        )
        customer = service.upsert_customer(
            stamp_login(now_customer, signup_page=payload.signupPage)
        )

    token = create_profile_token(customer.id)
    return CustomerProfileSessionResponse(token=token, customer=to_public(customer))


@router.post("/login", response_model=CustomerProfileSessionResponse)
def login_customer_profile(
    payload: CustomerProfileLoginRequest,
    request: Request,
) -> CustomerProfileSessionResponse:
    profile_rate_limiter.check(client_ip(request))
    _reject_honeypot(payload.tpHp)

    email = normalize_email(str(payload.email))
    mobile = normalize_mobile(payload.countryCode, payload.mobile)

    service = get_admin_ops_service()
    customer = service.find_customer_by_email(email)
    if customer is None or customer.mobile != mobile:
        raise HTTPException(
            status_code=401,
            detail="Email and phone don't match our records.",
        )

    customer = service.upsert_customer(stamp_login(customer))
    token = create_profile_token(customer.id)
    return CustomerProfileSessionResponse(token=token, customer=to_public(customer))


@router.get("/me", response_model=CustomerProfilePublic)
def customer_profile_me(
    customer_id: str = Depends(require_customer_profile),
) -> CustomerProfilePublic:
    customer = get_admin_ops_service().find_customer_by_id(customer_id)
    if customer is None:
        raise HTTPException(status_code=401, detail="Profile no longer available.")
    return to_public(customer)
