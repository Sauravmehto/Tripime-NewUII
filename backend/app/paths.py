"""Where the application's JSON data files live.

By default that is ``backend/data`` next to the code (local development, unchanged). Set the
``DATA_DIR`` environment variable to keep data elsewhere, for example on a Render persistent disk,
so redeploys do not replace it.

When ``DATA_DIR`` points somewhere other than ``backend/data``, any default file that does not yet
exist there is copied in from ``backend/data`` on first start. Existing files are never touched.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Mapping

log = logging.getLogger(__name__)

REPO_DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Content that ships in git and is needed on a first start. Runtime records (bookings, enquiries,
# customer accounts, seat sales) are deliberately absent: they start empty and are created on demand.
SEED_FILES = (
    "admin_ops.json",
    "agency_profile.json",
    "flights.json",
    "package_themes.json",
    "packages.json",
    "website_cms.json",
)


def resolve_data_dir(environ: Mapping[str, str] | None = None) -> Path:
    raw = (environ if environ is not None else os.environ).get("DATA_DIR", "").strip()
    return Path(raw).expanduser().resolve() if raw else REPO_DATA_DIR


def init_data_dir(data_dir: Path, seed_dir: Path = REPO_DATA_DIR) -> list[str]:
    """Create ``data_dir`` and copy in any missing seed file. Never overwrites. Returns names copied."""
    data_dir.mkdir(parents=True, exist_ok=True)
    if data_dir.resolve() == seed_dir.resolve():
        return []
    copied: list[str] = []
    for name in SEED_FILES:
        source = seed_dir / name
        target = data_dir / name
        if not source.is_file() or target.exists():
            continue
        try:
            # "xb" refuses to open an existing file, so two workers starting together cannot clobber each other.
            with open(target, "xb") as out:
                out.write(source.read_bytes())
        except FileExistsError:
            continue
        copied.append(name)
    if copied:
        log.info("DATA_DIR %s initialised with: %s", data_dir, ", ".join(copied))
    return copied


DATA_DIR = resolve_data_dir()
init_data_dir(DATA_DIR)
