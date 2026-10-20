"""Customer sign-in with email + password, used before booking."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from app.services.customer_account_service import MAX_PASSWORD, get_customer_account_service
from app.services.customer_auth_service import (
    CustomerSession,
    end_session,
    optional_session,
    require_session,
    start_session,
)
from app.services.login_throttle import LoginThrottle, build_store
from app.services.rate_limit import IpRateLimiter, client_ip

router = APIRouter()

# Same progressive, always-expiring lockout as admin login, with its own counters. Per address
# it is looser (many customers share office/mobile networks); per email it is tighter.
customer_login_throttle = LoginThrottle(
    build_store("tripime:customer-login"), ip_max_failures=20, account_max_failures=8
)
# Sign-ups per address: generous for shared networks, still stops scripted account spam.
register_limiter = IpRateLimiter(max_calls=10, window_seconds=3600.0)

LOGIN_FAILED = "Email or password is incorrect."


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., max_length=MAX_PASSWORD)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=MAX_PASSWORD)


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(..., max_length=MAX_PASSWORD)
    newPassword: str = Field(..., max_length=MAX_PASSWORD)


class SessionInfo(BaseModel):
    authenticated: bool
    email: str | None = None
    customerId: str | None = None
    name: str | None = None
    # Set after an admin reset: the customer must choose their own password before booking.
    mustChangePassword: bool = False


def _info(customer_id: str, email: str) -> SessionInfo:
    account = get_customer_account_service().find_by_id(customer_id)
    return SessionInfo(
        authenticated=True,
        email=email,
        customerId=customer_id,
        name=account.name if account else None,
        mustChangePassword=bool(account and account.mustChangePassword),
    )


@router.post("/register", response_model=SessionInfo)
def register(payload: RegisterRequest, request: Request, response: Response) -> SessionInfo:
    register_limiter.check(client_ip(request))
    account, customer = get_customer_account_service().register(payload.name, str(payload.email), payload.password)
    start_session(response, customer)
    return _info(account.id, account.email)


@router.post("/login", response_model=SessionInfo)
def login(payload: LoginRequest, request: Request, response: Response) -> SessionInfo:
    ip = client_ip(request)
    email = str(payload.email)
    locked = customer_login_throttle.locked_seconds(ip, email)
    if locked:
        # Checked before the password, so a lockout can't be used to keep guessing.
        raise HTTPException(
            status_code=429,
            detail=f"Too many sign-in attempts. Try again in {max(1, -(-locked // 60))} minute(s).",
            headers={"Retry-After": str(locked)},
        )
    result = get_customer_account_service().authenticate(email, payload.password)
    if result is None:
        customer_login_throttle.record_failure(ip, email)
        raise HTTPException(status_code=401, detail=LOGIN_FAILED)
    customer_login_throttle.record_success(ip, email)
    account, customer = result
    start_session(response, customer)
    return _info(account.id, account.email)


@router.post("/password", response_model=SessionInfo)
def change_password(payload: ChangePasswordRequest, current: CustomerSession = Depends(require_session)) -> SessionInfo:
    get_customer_account_service().change_password(current.customer_id, payload.currentPassword, payload.newPassword)
    return _info(current.customer_id, current.email)


@router.get("/session", response_model=SessionInfo)
def session(current: CustomerSession | None = Depends(optional_session)) -> SessionInfo:
    if current is None:
        return SessionInfo(authenticated=False)
    return _info(current.customer_id, current.email)


@router.post("/logout", response_model=SessionInfo)
def logout(response: Response) -> SessionInfo:
    end_session(response)
    return SessionInfo(authenticated=False)
