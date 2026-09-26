from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.models.package_theme import PackageTheme, PackageThemeCreate, PackageThemeUpdate

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
THEMES_PATH = DATA_DIR / "package_themes.json"

_service: PackageThemeService | None = None


class PackageThemeService:
    def __init__(self, path: Path = THEMES_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._themes = self._load()

    def _load(self) -> list[PackageTheme]:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("[]", encoding="utf-8")
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        return [PackageTheme.model_validate(item) for item in raw]

    def _save(self) -> None:
        payload = [theme.model_dump() for theme in self._themes]
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def list_themes(self, *, active_only: bool = False) -> list[PackageTheme]:
        items = list(self._themes)
        if active_only:
            items = [theme for theme in items if theme.active]
        items.sort(key=lambda t: (t.sortOrder, t.createdAt))
        return items

    def get_theme(self, theme_id: str) -> PackageTheme | None:
        for theme in self._themes:
            if theme.id == theme_id:
                return theme
        return None

    def create_theme(self, payload: PackageThemeCreate) -> PackageTheme:
        theme = PackageTheme(
            id=f"theme_{uuid.uuid4().hex[:10]}",
            createdAt=datetime.now(timezone.utc).isoformat(),
            **payload.model_dump(),
        )
        with self._lock:
            self._themes.append(theme)
            self._save()
        return theme

    def update_theme(self, theme_id: str, payload: PackageThemeUpdate) -> PackageTheme:
        with self._lock:
            for index, existing in enumerate(self._themes):
                if existing.id != theme_id:
                    continue
                updated = PackageTheme(
                    id=existing.id,
                    createdAt=existing.createdAt,
                    **payload.model_dump(),
                )
                self._themes[index] = updated
                self._save()
                return updated
        raise HTTPException(status_code=404, detail=f"Package theme '{theme_id}' not found.")

    def delete_theme(self, theme_id: str) -> None:
        with self._lock:
            for index, existing in enumerate(self._themes):
                if existing.id == theme_id:
                    self._themes.pop(index)
                    self._save()
                    return
        raise HTTPException(status_code=404, detail=f"Package theme '{theme_id}' not found.")


def get_package_theme_service() -> PackageThemeService:
    global _service
    if _service is None:
        _service = PackageThemeService()
    return _service
