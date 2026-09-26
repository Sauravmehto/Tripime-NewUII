from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.models.package import Package, PackageCreate, PackageUpdate

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
PACKAGES_PATH = DATA_DIR / "packages.json"

_service: PackageService | None = None


class PackageService:
    def __init__(self, path: Path = PACKAGES_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._packages = self._load()

    def _load(self) -> list[Package]:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("[]", encoding="utf-8")
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        return [Package.model_validate(item) for item in raw]

    def _save(self) -> None:
        payload = [pkg.model_dump() for pkg in self._packages]
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def list_packages(
        self,
        *,
        category: str | None = None,
        catalog: str | None = None,
        active_only: bool = False,
    ) -> list[Package]:
        items = list(self._packages)
        if active_only:
            items = [p for p in items if p.active]
        if catalog:
            items = [p for p in items if p.catalog == catalog]
        if category:
            items = [p for p in items if p.category == category]
        items.sort(key=lambda p: (p.sortOrder, p.createdAt))
        return items

    def get_package(self, package_id: str, *, active_only: bool = False) -> Package | None:
        for pkg in self._packages:
            if pkg.id == package_id:
                if active_only and not pkg.active:
                    return None
                return pkg
        return None

    def create_package(self, payload: PackageCreate) -> Package:
        now = self._now()
        pkg = Package(
            id=f"pkg_{uuid.uuid4().hex[:10]}",
            createdAt=now,
            updatedAt=now,
            **payload.model_dump(),
        )
        with self._lock:
            self._packages.append(pkg)
            self._save()
        return pkg

    def update_package(self, package_id: str, payload: PackageUpdate) -> Package:
        with self._lock:
            for i, existing in enumerate(self._packages):
                if existing.id != package_id:
                    continue
                updated = Package(
                    id=existing.id,
                    createdAt=existing.createdAt,
                    updatedAt=self._now(),
                    **payload.model_dump(),
                )
                self._packages[i] = updated
                self._save()
                return updated
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")

    def delete_package(self, package_id: str) -> None:
        with self._lock:
            for i, existing in enumerate(self._packages):
                if existing.id == package_id:
                    self._packages.pop(i)
                    self._save()
                    return
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")


def get_package_service() -> PackageService:
    global _service
    if _service is None:
        _service = PackageService()
    return _service
