from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from app.models.admin_ops import (
    AdminOps,
    CustomTheme,
    CustomThemesPayload,
    CustomerLogin,
    FlightSearchLog,
    MarketingBanner,
    MarketingBannersPayload,
    MarketingVideo,
    MarketingVideosPayload,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
OPS_PATH = DATA_DIR / "admin_ops.json"

_service: AdminOpsService | None = None


class AdminOpsService:
    def __init__(self, path: Path = OPS_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._ops = self._load()

    def _load(self) -> AdminOps:
        if not self._path.exists():
            raise FileNotFoundError(f"Admin ops store missing: {self._path}")
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        ops = AdminOps.model_validate(raw)
        missing = [
            key
            for key in (
                "themes",
                "marketingBanners",
                "marketingVideos",
                "customers",
                "flightSearches",
            )
            if key not in raw
        ]
        if missing:
            self._save(ops)
        return ops

    def _save(self, ops: AdminOps) -> None:
        """Atomic write: temp file in same dir, then os.replace."""
        payload = json.dumps(ops.model_dump(), indent=2, ensure_ascii=False)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(
            prefix=".admin_ops_",
            suffix=".tmp",
            dir=str(self._path.parent),
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_name, self._path)
        except Exception:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise

    def get_ops(self) -> AdminOps:
        return self._ops.model_copy(deep=True)

    def list_themes(self) -> list[CustomTheme]:
        return list(self._ops.themes)

    def update_themes(self, payload: CustomThemesPayload) -> list[CustomTheme]:
        return self._set("themes", payload.items)

    def list_marketing_banners(self) -> list[MarketingBanner]:
        return list(self._ops.marketingBanners)

    def update_marketing_banners(self, payload: MarketingBannersPayload) -> list[MarketingBanner]:
        return self._set("marketingBanners", payload.items)

    def list_marketing_videos(self) -> list[MarketingVideo]:
        return list(self._ops.marketingVideos)

    def update_marketing_videos(self, payload: MarketingVideosPayload) -> list[MarketingVideo]:
        return self._set("marketingVideos", payload.items)

    def list_customers(self) -> list[CustomerLogin]:
        return list(self._ops.customers)

    def find_customer_by_id(self, customer_id: str) -> CustomerLogin | None:
        for row in self._ops.customers:
            if row.id == customer_id:
                return row.model_copy(deep=True)
        return None

    def find_customer_by_email(self, email: str) -> CustomerLogin | None:
        needle = email.strip().lower()
        for row in self._ops.customers:
            if row.email.strip().lower() == needle:
                return row.model_copy(deep=True)
        return None

    def find_customer_by_mobile(self, mobile: str) -> CustomerLogin | None:
        needle = mobile.strip()
        for row in self._ops.customers:
            if row.mobile.strip() == needle:
                return row.model_copy(deep=True)
        return None

    def upsert_customer(self, customer: CustomerLogin) -> CustomerLogin:
        with self._lock:
            current = self._ops.model_copy(deep=True)
            rows = list(current.customers)
            idx = next((i for i, row in enumerate(rows) if row.id == customer.id), None)
            if idx is None:
                rows.append(customer)
            else:
                rows[idx] = customer
            current.customers = rows
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._ops = current
            self._save(current)
        found = self.find_customer_by_id(customer.id)
        assert found is not None
        return found

    def list_flight_searches(self) -> list[FlightSearchLog]:
        return list(self._ops.flightSearches)

    def _set(self, field: str, items: object) -> object:
        with self._lock:
            current = self._ops.model_copy(deep=True)
            setattr(current, field, items)
            current.updatedAt = datetime.now(timezone.utc).isoformat()
            self._ops = current
            self._save(current)
        return getattr(self.get_ops(), field)


def get_admin_ops_service() -> AdminOpsService:
    global _service
    if _service is None:
        _service = AdminOpsService()
    return _service
