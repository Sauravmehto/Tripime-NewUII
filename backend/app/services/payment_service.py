from fastapi import HTTPException

from app import config
from app.models.payment import PaymentConfig
from app.providers.mock_payment_provider import MockPaymentProvider
from app.providers.payment_base import PaymentProvider

_provider: PaymentProvider | None = None


def get_payment_provider() -> PaymentProvider:
    """Selected by PAYMENT_PROVIDER. Only "mock" exists today; a real gateway is
    added as another PaymentProvider and enabled here once its keys are set."""
    global _provider
    if _provider is None:
        if config.PAYMENT_PROVIDER == "mock":
            _provider = MockPaymentProvider()
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Payment provider '{config.PAYMENT_PROVIDER}' is not available on this server.",
            )
    return _provider


def payment_config() -> PaymentConfig:
    provider = get_payment_provider()
    return PaymentConfig(
        provider=provider.name,
        testMode=provider.test_mode,
        payeeVpa=provider.payee_vpa,
        methods=["upi", "qr", "card"],
        canSimulateFailure=provider.can_simulate_failure,
    )
