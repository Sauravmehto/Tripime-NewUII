"""Environment-driven settings for the mock backend."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return int(value)
    except ValueError:
        return default


# Admin auth
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "dev-only-insecure-secret-change-me")
ADMIN_TOKEN_TTL_HOURS = _get_int("ADMIN_TOKEN_TTL_HOURS", 12)

# Mock flight inventory: bookable from today (IST) through today + N days
FLIGHT_BOOKING_WINDOW_DAYS = _get_int("FLIGHT_BOOKING_WINDOW_DAYS", 90)

# SMTP / email
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = _get_int("SMTP_PORT", 587)
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("EMAIL_FROM", os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME))
SMTP_USE_TLS = _get_bool("SMTP_USE_TLS", True)

# CORS — comma-separated production frontend origins (e.g. Netlify URL)
# Example: https://tripime.netlify.app,https://my-custom-domain.com
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

# Localhost + Netlify preview/production default hosts
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"http://(localhost|127\.0\.0\.1):\d+|https://[a-z0-9.-]+\.netlify\.app",
)


def smtp_is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD and SMTP_FROM_EMAIL)


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"

# Payments — no gateway is integrated. Bookings are *requests*; payment is
# arranged by the team and verified manually in admin. A future gateway gets a
# PaymentProvider class with server-side secrets and webhook verification.
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "manual").strip().lower()
# Owner-supplied UPI ID, shown only as "pay after our team confirms". Not verified by the app.
PAYMENT_UPI_ID = os.getenv("PAYMENT_UPI_ID", os.getenv("MOCK_PAYEE_VPA", "tripimetrips@test.upi")).strip()

# Booking-request notifications.
BOOKING_NOTIFICATION_EMAIL = os.getenv(
    "BOOKING_NOTIFICATION_EMAIL", os.getenv("ADMIN_NOTIFY_EMAIL", "tripimetrips@gmail.com")
).strip()
ADMIN_NOTIFY_EMAIL = BOOKING_NOTIFICATION_EMAIL  # older name
# Click-to-chat number for travellers and the booking-alert WhatsApp recipient.
BOOKING_WHATSAPP_NUMBER = os.getenv("BOOKING_WHATSAPP_NUMBER", "919899640449").strip().lstrip("+")

# Customer sign-in (email one-time code) and session cookie.
CUSTOMER_SESSION_HOURS = _get_int("CUSTOMER_SESSION_HOURS", 12)
CUSTOMER_SESSION_COOKIE = "tripime_session"
# "lax" when the site proxies /api (same origin); "none" for a cross-site API (requires HTTPS).
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()
COOKIE_SECURE = _get_bool("COOKIE_SECURE", IS_PRODUCTION or COOKIE_SAMESITE == "none")
OTP_TTL_SECONDS = _get_int("OTP_TTL_SECONDS", 600)
# Development only: when SMTP isn't set, print sign-in codes to the backend log.
CUSTOMER_OTP_DEV_LOG = _get_bool("CUSTOMER_OTP_DEV_LOG", not IS_PRODUCTION)
# Development only: a fixed sign-in code for any email, so login works before email is set up.
# Ignored in production and whenever SMTP is configured. Set empty to turn it off.
CUSTOMER_OTP_DEV_CODE = os.getenv("CUSTOMER_OTP_DEV_CODE", "" if IS_PRODUCTION else "123456").strip()

# WhatsApp alerts to the Tripime team (enquiries + bookings).
#   WHATSAPP_PROVIDER = "callmebot" | "cloud_api" (blank = callmebot if its key is set)
#   CallMeBot: https://www.callmebot.com/blog/free-api-whatsapp-messages/ — free, own number only.
#   Cloud API: Meta WhatsApp Business; needs an access token, phone number ID and an
#   approved template whose body has a single {{1}} variable for the alert text.
WHATSAPP_ALERT_PHONE = os.getenv("WHATSAPP_ALERT_PHONE", "919899644177").strip().lstrip("+")
WHATSAPP_PROVIDER = os.getenv("WHATSAPP_PROVIDER", "").strip().lower()
WHATSAPP_CALLMEBOT_APIKEY = os.getenv("WHATSAPP_CALLMEBOT_APIKEY", "").strip()
WHATSAPP_CLOUD_TOKEN = os.getenv("WHATSAPP_CLOUD_TOKEN", "").strip()
WHATSAPP_CLOUD_PHONE_NUMBER_ID = os.getenv("WHATSAPP_CLOUD_PHONE_NUMBER_ID", "").strip()
WHATSAPP_CLOUD_TEMPLATE = os.getenv("WHATSAPP_CLOUD_TEMPLATE", "").strip()
WHATSAPP_CLOUD_TEMPLATE_LANG = os.getenv("WHATSAPP_CLOUD_TEMPLATE_LANG", "en").strip()


def whatsapp_provider() -> str | None:
    """The WhatsApp provider that is fully configured, or None."""
    choice = WHATSAPP_PROVIDER or ("callmebot" if WHATSAPP_CALLMEBOT_APIKEY else "")
    if choice == "callmebot" and WHATSAPP_ALERT_PHONE and WHATSAPP_CALLMEBOT_APIKEY:
        return "callmebot"
    if (
        choice == "cloud_api"
        and WHATSAPP_ALERT_PHONE
        and WHATSAPP_CLOUD_TOKEN
        and WHATSAPP_CLOUD_PHONE_NUMBER_ID
        and WHATSAPP_CLOUD_TEMPLATE
    ):
        return "cloud_api"
    return None


def whatsapp_alerts_configured() -> bool:
    return whatsapp_provider() is not None
