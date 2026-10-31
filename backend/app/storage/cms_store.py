"""Where the website CMS document is stored.

``JsonFileCmsStore`` is the existing behaviour (one JSON file). ``SqlCmsStore`` keeps the same
document in a database, one row per top-level section, so it survives redeploys and restarts.
It is only used when the ``DATABASE_URL`` environment variable is set; otherwise nothing changes.

The SQL is portable: PostgreSQL in production (``postgresql://...``, needs the optional ``psycopg``
package from requirements-postgres.txt) and SQLite (``sqlite:///path``) for tests and local trials.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

log = logging.getLogger(__name__)

SNAPSHOT_KEEP = 50


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


class JsonFileCmsStore:
    """One JSON file on disk (the original storage)."""

    shared = False

    def __init__(self, path: Path) -> None:
        self.path = Path(path)

    def read(self) -> dict | None:
        if not self.path.exists():
            return None
        return json.loads(self.path.read_text(encoding="utf-8-sig"))

    def write(self, data: dict, reason: str = "save") -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def seed(self) -> dict | None:
        return None


class SqlCmsStore:
    """The CMS document in a database: ``cms_sections`` (one row per section) plus ``cms_snapshots``.

    Writes run in one transaction and only touch sections whose content changed, so editors of
    different sections never overwrite each other. Before each change the previous document is
    kept as a snapshot (newest ``SNAPSHOT_KEEP`` retained) so an accidental edit can be undone.
    """

    shared = True

    def __init__(self, url: str, seed_path: Path | None = None, snapshot_keep: int = SNAPSHOT_KEEP) -> None:
        url = url.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("sqlite:///"):
            self._dialect, self._target = "sqlite", url[len("sqlite:///"):]
        elif url.startswith("postgresql://"):
            self._dialect, self._target = "postgresql", url
        else:
            raise ValueError("DATABASE_URL must start with postgresql:// (or sqlite:/// for tests).")
        self._seed_path = Path(seed_path) if seed_path else None
        self._keep = snapshot_keep
        self._ready = False

    # ---- connection plumbing -------------------------------------------------------------
    @contextmanager
    def _connect(self) -> Iterator[Any]:
        if self._dialect == "sqlite":
            conn = sqlite3.connect(self._target, timeout=15)
        else:
            try:
                import psycopg  # optional dependency, see requirements-postgres.txt
            except ImportError as exc:  # pragma: no cover - depends on deployment
                raise RuntimeError(
                    "DATABASE_URL is set but the 'psycopg' package is not installed. "
                    "Install requirements-postgres.txt (the Render build does this when DATABASE_URL is set)."
                ) from exc
            conn = psycopg.connect(self._target, connect_timeout=10)
        try:
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _sql(self, statement: str) -> str:
        return statement.replace("%s", "?") if self._dialect == "sqlite" else statement

    def _json_param(self) -> str:
        return "CAST(%s AS jsonb)" if self._dialect == "postgresql" else "%s"

    def _run(self, conn: Any, statement: str, params: tuple = ()) -> Any:
        cur = conn.cursor()
        cur.execute(self._sql(statement), params)
        return cur

    @staticmethod
    def _load(value: Any) -> Any:
        return value if isinstance(value, (dict, list)) else json.loads(value)

    def ensure_schema(self) -> None:
        pg = self._dialect == "postgresql"
        payload, stamp = ("JSONB", "TIMESTAMPTZ") if pg else ("TEXT", "TIMESTAMP")
        ident = "BIGSERIAL PRIMARY KEY" if pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
        with self._connect() as conn:
            self._run(conn, f"""CREATE TABLE IF NOT EXISTS cms_sections (
                section_key VARCHAR(80) PRIMARY KEY,
                payload {payload} NOT NULL,
                created_at {stamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at {stamp} NOT NULL DEFAULT CURRENT_TIMESTAMP)""")
            self._run(conn, f"""CREATE TABLE IF NOT EXISTS cms_snapshots (
                id {ident},
                taken_at {stamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reason VARCHAR(120) NOT NULL,
                payload {payload} NOT NULL)""")
            self._run(conn, "CREATE INDEX IF NOT EXISTS ix_cms_sections_updated_at ON cms_sections (updated_at)")
            self._run(conn, "CREATE INDEX IF NOT EXISTS ix_cms_snapshots_taken_at ON cms_snapshots (taken_at)")
        self._ready = True

    def _prepare(self) -> None:
        if not self._ready:
            self.ensure_schema()

    # ---- reads -----------------------------------------------------------------------------
    def _read_sections(self, conn: Any) -> dict[str, Any]:
        cur = self._run(conn, "SELECT section_key, payload FROM cms_sections")
        return {key: self._load(payload) for key, payload in cur.fetchall()}

    def read(self) -> dict | None:
        self._prepare()
        with self._connect() as conn:
            sections = self._read_sections(conn)
        return sections or None

    def seed(self) -> dict | None:
        """Content to start from when the database is empty: the JSON file that ships with the app."""
        if self._seed_path and self._seed_path.exists():
            return json.loads(self._seed_path.read_text(encoding="utf-8-sig"))
        return None

    def counts(self) -> dict[str, int | None]:
        """Item count per section (None for sections that are not lists of items)."""
        document = self.read() or {}
        out: dict[str, int | None] = {}
        for key, value in sorted(document.items()):
            items = value.get("items") if isinstance(value, dict) else None
            out[key] = len(items) if isinstance(items, list) else None
        return out

    # ---- writes ----------------------------------------------------------------------------
    def _upsert(self, conn: Any, key: str, value: Any) -> None:
        self._run(
            conn,
            f"""INSERT INTO cms_sections (section_key, payload) VALUES (%s, {self._json_param()})
                ON CONFLICT (section_key) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP""",
            (key, json.dumps(value)),
        )

    def _snapshot(self, conn: Any, document: dict, reason: str) -> None:
        self._run(
            conn,
            f"INSERT INTO cms_snapshots (reason, payload) VALUES (%s, {self._json_param()})",
            (reason[:120], json.dumps(document)),
        )
        self._run(
            conn,
            "DELETE FROM cms_snapshots WHERE id NOT IN (SELECT id FROM cms_snapshots ORDER BY id DESC LIMIT %s)",
            (self._keep,),
        )

    def write(self, data: dict, reason: str = "save") -> list[str]:
        """Store ``data``. All-or-nothing; returns the section keys that actually changed."""
        self._prepare()
        with self._connect() as conn:
            current = self._read_sections(conn)
            changed = [k for k, v in data.items() if k not in current or _canonical(current[k]) != _canonical(v)]
            if not changed:
                return []
            if current:
                self._snapshot(conn, current, f"before {reason}")
            for key in changed:
                self._upsert(conn, key, data[key])
        return changed

    def import_missing(self, data: dict) -> tuple[list[str], list[str]]:
        """Insert sections the database does not have. Never modifies an existing section.

        Returns ``(inserted, kept)`` where ``kept`` are sections already present (left as they are)."""
        self._prepare()
        inserted: list[str] = []
        kept: list[str] = []
        with self._connect() as conn:
            for key, value in data.items():
                cur = self._run(
                    conn,
                    f"""INSERT INTO cms_sections (section_key, payload) VALUES (%s, {self._json_param()})
                        ON CONFLICT (section_key) DO NOTHING""",
                    (key, json.dumps(value)),
                )
                (inserted if cur.rowcount == 1 else kept).append(key)
        return inserted, kept

    # ---- backup and recovery -----------------------------------------------------------------
    def list_snapshots(self, limit: int = 20) -> list[dict[str, Any]]:
        self._prepare()
        with self._connect() as conn:
            cur = self._run(conn, "SELECT id, taken_at, reason, payload FROM cms_snapshots ORDER BY id DESC LIMIT %s", (limit,))
            return [
                {"id": row[0], "taken_at": str(row[1]), "reason": row[2], "sections": len(self._load(row[3]))}
                for row in cur.fetchall()
            ]

    def restore_snapshot(self, snapshot_id: int) -> list[str]:
        """Make the stored document equal to a snapshot (the current one is snapshotted first)."""
        self._prepare()
        with self._connect() as conn:
            cur = self._run(conn, "SELECT payload FROM cms_snapshots WHERE id = %s", (snapshot_id,))
            row = cur.fetchone()
            if row is None:
                raise KeyError(f"No snapshot with id {snapshot_id}")
            target = self._load(row[0])
            current = self._read_sections(conn)
            self._snapshot(conn, current, f"before restore of snapshot {snapshot_id}")
            for key, value in target.items():
                self._upsert(conn, key, value)
            for key in set(current) - set(target):
                self._run(conn, "DELETE FROM cms_sections WHERE section_key = %s", (key,))
        return sorted(target)


def build_cms_store(json_path: Path):
    """The configured store: a database when DATABASE_URL is set, otherwise the JSON file."""
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        log.info("CMS content is stored in the database (DATABASE_URL is set).")
        return SqlCmsStore(url, seed_path=json_path)
    return JsonFileCmsStore(json_path)
