from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from app import config
from app.models.agency_profile import AgencyProfile, AgencyProfileResponse, AgencyProfileUpdate

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
PROFILE_PATH = DATA_DIR / "agency_profile.json"

DEFAULT_PROFILE = AgencyProfile(
    companyName="Tripime",
    agencyName="TRIPIME TRIPS",
    domainName="tripime.com",
    email="tripimetrips@gmail.com",
    contactNo="9899644177",
    panNumber="",
    gstNumber="",
    address=(
        "Building No-3, FFS-11, First Floor, Ansal Chambers-1, "
        "Bhikaji Cama Place, New Delhi - 110066"
    ),
    updatedAt=datetime.now(timezone.utc).isoformat(),
)

_service: AgencyProfileService | None = None


class AgencyProfileService:
    def __init__(self, path: Path = PROFILE_PATH) -> None:
        self._path = path
        self._lock = Lock()
        self._profile = self._load()

    def _load(self) -> AgencyProfile:
        if not self._path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._save(DEFAULT_PROFILE)
            return DEFAULT_PROFILE.model_copy()
        raw = json.loads(self._path.read_text(encoding="utf-8-sig"))
        return AgencyProfile.model_validate(raw)

    def _save(self, profile: AgencyProfile) -> None:
        self._path.write_text(
            json.dumps(profile.model_dump(), indent=2),
            encoding="utf-8",
        )

    def get_profile(self) -> AgencyProfileResponse:
        return AgencyProfileResponse(
            **self._profile.model_dump(),
            username=config.ADMIN_USERNAME,
        )

    def update_profile(self, payload: AgencyProfileUpdate) -> AgencyProfileResponse:
        with self._lock:
            updated = AgencyProfile(
                **payload.model_dump(),
                updatedAt=datetime.now(timezone.utc).isoformat(),
            )
            self._profile = updated
            self._save(updated)
        return self.get_profile()


def get_agency_profile_service() -> AgencyProfileService:
    global _service
    if _service is None:
        _service = AgencyProfileService()
    return _service
