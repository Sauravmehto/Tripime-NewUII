"""Customer accounts: email + password, stored hashed.

Accounts live in data/customer_accounts.json (git-ignored). Each account uses the same id as
its customer record in admin_ops, so the admin Customers list and booking ownership line up.

Passwords are hashed with scrypt (stdlib) and a random per-account salt; plain passwords are
never stored, returned or logged.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.models.admin_ops import CustomerLogin
from app.services.admin_ops_service import get_admin_ops_service
from app.services.customer_profile_service import new_customer_id, normalize_email, stamp_login

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
ACCOUNTS_PATH = DATA_DIR / "customer_accounts.json"

MIN_PASSWORD = 8
MAX_PASSWORD = 128
# scrypt cost: ~16 MB and a few tens of ms per check — slow for attackers, fine for sign-in.
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1

EMAIL_HAS_BOOKINGS = (
    "This email already has bookings with us. Contact support and we'll set a password for you, "
    "so you keep your existing bookings."
)


class CustomerAccount(BaseModel):
    id: str
    email: str
    name: str = Field("", max_length=120)
    passwordHash: str
    mustChangePassword: bool = False
    createdAt: str
    updatedAt: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest)
        actual = hashlib.scrypt(
            password.encode("utf-8"), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=len(expected)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# Runs scrypt for unknown emails too, so response time doesn't reveal whether an account exists.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def validate_password(password: str) -> None:
    if not (MIN_PASSWORD <= len(password) <= MAX_PASSWORD):
        raise HTTPException(status_code=422, detail=f"Use a password of {MIN_PASSWORD} to {MAX_PASSWORD} characters.")


def temporary_password() -> str:
    """Readable one-time password for admin resets (no look-alike characters)."""
    alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "-".join("".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3))


class CustomerAccountService:
    def __init__(self, path: Path = ACCOUNTS_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._accounts: dict[str, CustomerAccount] = self._load()

    def _load(self) -> dict[str, CustomerAccount]:
        if not self._path.exists():
            return {}
        raw = json.loads(self._path.read_text(encoding="utf-8-sig") or "[]")
        accounts = [CustomerAccount.model_validate(item) for item in raw]
        return {a.email: a for a in accounts}

    def _save(self) -> None:
        """Atomic write: a crash mid-write never leaves a half-written accounts file."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = json.dumps([a.model_dump() for a in self._accounts.values()], indent=2)
        fd, tmp = tempfile.mkstemp(dir=self._path.parent, prefix=".accounts-", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(data)
            os.replace(tmp, self._path)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise

    # ---- lookups ---------------------------------------------------------------

    def find_by_email(self, email: str) -> CustomerAccount | None:
        return self._accounts.get(normalize_email(email))

    def find_by_id(self, customer_id: str) -> CustomerAccount | None:
        return next((a for a in self._accounts.values() if a.id == customer_id), None)

    # ---- customer actions ------------------------------------------------------

    def register(self, name: str, email: str, password: str) -> tuple[CustomerAccount, CustomerLogin]:
        email = normalize_email(email)
        validate_password(password)
        ops = get_admin_ops_service()
        with self._lock:
            if email in self._accounts:
                raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
            if ops.find_customer_by_email(email) is not None:
                # An earlier (email-verified) customer owns this address; an unverified sign-up
                # must not take over their bookings. Support links them via an admin reset.
                raise HTTPException(status_code=409, detail=EMAIL_HAS_BOOKINGS)
            now = _now()
            customer = ops.upsert_customer(
                stamp_login(
                    CustomerLogin(id=new_customer_id(), name=name.strip(), email=email, signupPage="account-register"),
                    signup_page="account-register",
                )
            )
            account = CustomerAccount(
                id=customer.id, email=email, name=name.strip(), passwordHash=hash_password(password), createdAt=now, updatedAt=now
            )
            self._accounts[email] = account
            self._save()
        return account, customer

    def authenticate(self, email: str, password: str) -> tuple[CustomerAccount, CustomerLogin] | None:
        account = self.find_by_email(email)
        if account is None:
            verify_password(password, _DUMMY_HASH)
            return None
        if not verify_password(password, account.passwordHash):
            return None
        ops = get_admin_ops_service()
        existing = ops.find_customer_by_id(account.id) or CustomerLogin(id=account.id, name=account.name, email=account.email)
        customer = ops.upsert_customer(stamp_login(existing, signup_page="account-sign-in"))
        return account, customer

    def change_password(self, customer_id: str, current: str, new: str) -> CustomerAccount:
        validate_password(new)
        with self._lock:
            account = self.find_by_id(customer_id)
            if account is None or not verify_password(current, account.passwordHash):
                raise HTTPException(status_code=400, detail="Your current password isn't right.")
            if current == new:
                raise HTTPException(status_code=422, detail="Choose a password different from your current one.")
            updated = account.model_copy(update={"passwordHash": hash_password(new), "mustChangePassword": False, "updatedAt": _now()})
            self._accounts[updated.email] = updated
            self._save()
        return updated

    # ---- admin -----------------------------------------------------------------

    def admin_set_temporary_password(self, customer: CustomerLogin) -> str:
        """Give an existing customer a one-time password; creates the account if needed."""
        email = normalize_email(customer.email)
        if not email:
            raise HTTPException(status_code=422, detail="This customer has no email address, so they can't sign in.")
        password = temporary_password()
        with self._lock:
            clash = self._accounts.get(email)
            if clash is not None and clash.id != customer.id:
                raise HTTPException(status_code=409, detail="A different account already uses this email.")
            now = _now()
            self._accounts[email] = CustomerAccount(
                id=customer.id,
                email=email,
                name=(clash.name if clash else customer.name) or customer.name,
                passwordHash=hash_password(password),
                mustChangePassword=True,
                createdAt=clash.createdAt if clash else now,
                updatedAt=now,
            )
            self._save()
        return password


_service: CustomerAccountService | None = None


def get_customer_account_service() -> CustomerAccountService:
    global _service
    if _service is None:
        _service = CustomerAccountService()
    return _service
