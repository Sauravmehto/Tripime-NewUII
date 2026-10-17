"""Customer sign-in (email one-time code) used before booking."""

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field

from app import config
from app.services.customer_auth_service import (
    CustomerSession,
    fixed_dev_code,
    end_session,
    optional_session,
    request_code,
    start_session,
    verify_code,
)
from app.services.rate_limit import client_ip

router = APIRouter()


class CodeRequest(BaseModel):
    email: EmailStr


class CodeRequestResult(BaseModel):
    # "email" in normal use; "dev_log" only in development without SMTP.
    delivery: str
    expiresInSeconds: int
    # Only set in development with the fixed code, so the sign-in page can say what to type.
    devCode: str | None = None


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class SessionInfo(BaseModel):
    authenticated: bool
    email: str | None = None
    customerId: str | None = None


@router.post("/code", response_model=CodeRequestResult)
def send_code(payload: CodeRequest, request: Request) -> CodeRequestResult:
    delivery = request_code(str(payload.email), client_ip(request))
    return CodeRequestResult(
        delivery=delivery,
        expiresInSeconds=config.OTP_TTL_SECONDS,
        devCode=fixed_dev_code() if delivery == "dev_fixed" else None,
    )


@router.post("/verify", response_model=SessionInfo)
def verify(payload: VerifyRequest, request: Request, response: Response) -> SessionInfo:
    customer = verify_code(str(payload.email), payload.code, client_ip(request))
    start_session(response, customer)
    return SessionInfo(authenticated=True, email=customer.email, customerId=customer.id)


@router.get("/session", response_model=SessionInfo)
def session(current: CustomerSession | None = Depends(optional_session)) -> SessionInfo:
    if current is None:
        return SessionInfo(authenticated=False)
    return SessionInfo(authenticated=True, email=current.email, customerId=current.customer_id)


@router.post("/logout", response_model=SessionInfo)
def logout(response: Response) -> SessionInfo:
    end_session(response)
    return SessionInfo(authenticated=False)
