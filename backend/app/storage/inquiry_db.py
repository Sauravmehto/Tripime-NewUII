"""SQLite storage for the inquiry CRM, with versioned migrations.

SQLite (Python standard library, no new dependency) gives the inquiry system what flat JSON files cannot:
foreign keys, indexes, unique constraints, atomic transactions, filtering and pagination. The SQL is kept
portable so the same schema can move to PostgreSQL later.

Migrations are applied in order, once each, and recorded in ``schema_migrations``. To change the schema, append
a new entry to ``MIGRATIONS``; never edit one that has already shipped.
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

log = logging.getLogger("tripime.inquiries.db")

MIGRATIONS: list[tuple[int, str, str]] = [
    (
        1,
        "inquiry crm tables",
        """
        CREATE TABLE inquiries (
            inquiry_id          TEXT PRIMARY KEY,
            user_id             TEXT,
            customer_name       TEXT NOT NULL DEFAULT '',
            customer_email      TEXT NOT NULL DEFAULT '',
            customer_phone      TEXT NOT NULL DEFAULT '',
            package_id          TEXT,
            package_name        TEXT NOT NULL DEFAULT '',
            destination         TEXT NOT NULL DEFAULT '',
            package_price       INTEGER,
            inquiry_source      TEXT NOT NULL CHECK (inquiry_source IN
                                  ('whatsapp','package_booking','brochure_request','contact_form','custom_trip')),
            inquiry_type        TEXT NOT NULL CHECK (inquiry_type IN
                                  ('package_inquiry','booking_request','brochure_request','general_contact',
                                   'custom_trip','service_request')),
            inquiry_message     TEXT NOT NULL DEFAULT '',
            inquiry_status      TEXT NOT NULL DEFAULT 'new' CHECK (inquiry_status IN
                                  ('new','contacted','follow_up_required','quote_shared','converted',
                                   'not_interested','cancelled')),
            assigned_to         TEXT NOT NULL DEFAULT '',
            priority            TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
            admin_notes         TEXT NOT NULL DEFAULT '',
            follow_up_date      TEXT,
            whatsapp_clicked_at TEXT,
            converted_booking_id TEXT,
            legacy_enquiry_id   TEXT UNIQUE,
            created_at          TEXT NOT NULL,
            updated_at          TEXT NOT NULL
        );
        CREATE INDEX idx_inquiries_user       ON inquiries (user_id);
        CREATE INDEX idx_inquiries_status     ON inquiries (inquiry_status);
        CREATE INDEX idx_inquiries_created    ON inquiries (created_at);
        CREATE INDEX idx_inquiries_package    ON inquiries (package_id);
        CREATE INDEX idx_inquiries_email      ON inquiries (customer_email);
        CREATE INDEX idx_inquiries_phone      ON inquiries (customer_phone);
        CREATE INDEX idx_inquiries_assigned   ON inquiries (assigned_to);
        CREATE INDEX idx_inquiries_followup   ON inquiries (follow_up_date);

        CREATE TABLE inquiry_activity (
            activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
            inquiry_id  TEXT NOT NULL REFERENCES inquiries (inquiry_id) ON DELETE CASCADE,
            action      TEXT NOT NULL,
            actor_type  TEXT NOT NULL CHECK (actor_type IN ('customer','admin','system','whatsapp')),
            actor       TEXT NOT NULL DEFAULT '',
            detail      TEXT NOT NULL DEFAULT '',
            old_value   TEXT NOT NULL DEFAULT '',
            new_value   TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL
        );
        CREATE INDEX idx_activity_inquiry ON inquiry_activity (inquiry_id, activity_id);

        CREATE TABLE whatsapp_messages (
            message_id        TEXT PRIMARY KEY,
            inquiry_id        TEXT REFERENCES inquiries (inquiry_id) ON DELETE SET NULL,
            sender_phone      TEXT NOT NULL,
            sender_name       TEXT NOT NULL DEFAULT '',
            body              TEXT NOT NULL DEFAULT '',
            message_type      TEXT NOT NULL DEFAULT 'text',
            message_timestamp TEXT NOT NULL,
            received_at       TEXT NOT NULL,
            matched_user_id   TEXT
        );
        CREATE INDEX idx_wamsg_inquiry ON whatsapp_messages (inquiry_id);
        CREATE INDEX idx_wamsg_phone   ON whatsapp_messages (sender_phone);
        """,
    ),
]


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=15, isolation_level=None)  # autocommit; transactions are explicit
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def migrate(path: Path) -> list[int]:
    """Apply any migrations that have not run yet. Returns the versions applied."""
    applied: list[int] = []
    conn = _connect(path)
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)"
        )
        done = {row["version"] for row in conn.execute("SELECT version FROM schema_migrations")}
        for version, name, sql in MIGRATIONS:
            if version in done:
                continue
            conn.execute("BEGIN IMMEDIATE")
            try:
                for statement in (s.strip() for s in sql.split(";")):
                    if statement:
                        conn.execute(statement)
                conn.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))",
                    (version, name),
                )
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise
            applied.append(version)
            log.info("Applied inquiry migration %s (%s)", version, name)
    finally:
        conn.close()
    return applied


@contextmanager
def session(path: Path, *, write: bool = False) -> Iterator[sqlite3.Connection]:
    """A connection for one unit of work. ``write=True`` wraps it in a transaction (commit, or roll back on error)."""
    conn = _connect(path)
    try:
        if write:
            conn.execute("BEGIN IMMEDIATE")
        try:
            yield conn
        except Exception:
            if write:
                conn.execute("ROLLBACK")
            raise
        else:
            if write:
                conn.execute("COMMIT")
    finally:
        conn.close()
