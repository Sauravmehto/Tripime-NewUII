#!/usr/bin/env python3
"""Copy the website CMS from its JSON file into the database named by DATABASE_URL.

Safe by design:
  * backs up the source JSON (and the database content, if any) before touching anything;
  * only inserts sections the database does not already have, so existing database content is
    never overwritten and running it twice changes nothing;
  * verifies afterwards that every inserted section matches the source exactly and prints counts;
  * never deletes, and never prints the database URL.

Usage (from the backend folder, with DATABASE_URL set):
    python scripts/migrate_cms_to_db.py --dry-run          # show what would happen, write nothing
    python scripts/migrate_cms_to_db.py                    # migrate
    python scripts/migrate_cms_to_db.py --list-snapshots   # point-in-time copies kept on every change
    python scripts/migrate_cms_to_db.py --restore-snapshot 12

Exit codes: 0 success, 1 verification failed, 2 configuration error.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def main(argv: list[str] | None = None) -> int:
    from app import paths
    from app.models.website_cms import WebsiteCms
    from app.storage.cms_store import SqlCmsStore, _canonical

    parser = argparse.ArgumentParser(description="Migrate the website CMS JSON into the database.")
    parser.add_argument("--source", type=Path, default=paths.DATA_DIR / "website_cms.json", help="CMS JSON file to import")
    parser.add_argument("--backup-dir", type=Path, default=paths.DATA_DIR / "backups", help="where backups are written")
    parser.add_argument("--dry-run", action="store_true", help="report only; create and write nothing")
    parser.add_argument("--list-snapshots", action="store_true")
    parser.add_argument("--restore-snapshot", type=int, metavar="ID")
    args = parser.parse_args(argv)

    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL is not set. Nothing was changed.", file=sys.stderr)
        return 2
    try:
        store = SqlCmsStore(url)
    except ValueError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    if args.list_snapshots:
        for snap in store.list_snapshots(50):
            print(f"  #{snap['id']:<5} {snap['taken_at']}  {snap['sections']:>2} sections  {snap['reason']}")
        return 0

    if args.restore_snapshot is not None:
        args.backup_dir.mkdir(parents=True, exist_ok=True)
        current = store.read() or {}
        (args.backup_dir / f"db-before-restore-{_stamp()}.json").write_text(json.dumps(current, indent=2), encoding="utf-8")
        try:
            restored = store.restore_snapshot(args.restore_snapshot)
        except KeyError as exc:
            print(exc, file=sys.stderr)
            return 2
        print(f"Restored snapshot #{args.restore_snapshot}: {len(restored)} sections. The previous state was snapshotted first.")
        return 0

    if not args.source.exists():
        print(f"Source file not found: {args.source}", file=sys.stderr)
        return 2
    source_bytes = args.source.read_bytes()
    source = json.loads(source_bytes.decode("utf-8-sig"))
    WebsiteCms.model_validate(source)  # refuse to import something the app could not load
    digest = hashlib.sha256(source_bytes).hexdigest()[:8]
    print(f"Source: {args.source.name} ({len(source)} sections, sha256 {digest}...)")

    if args.dry_run:
        store._ready = True  # do not create tables during a dry run
        try:
            if store._dialect == "sqlite" and not Path(store._target).exists():
                raise FileNotFoundError  # connecting would create an empty file: a dry run writes nothing
            existing = store.read() or {}
            print(f"Database currently holds {len(existing)} sections.")
        except Exception:
            existing = {}
            print("Database tables do not exist yet; they would be created.")
        would_insert = [k for k in source if k not in existing]
        print(f"DRY RUN: would insert {len(would_insert)} section(s), keep {len(source) - len(would_insert)} existing. Nothing written.")
        return 0

    args.backup_dir.mkdir(parents=True, exist_ok=True)
    backup = args.backup_dir / f"website_cms.{_stamp()}.{digest}.json"
    shutil.copyfile(args.source, backup)
    print(f"Backup of the source written to {backup}")
    before = store.read() or {}
    if before:
        db_backup = args.backup_dir / f"db-before-migration-{_stamp()}.json"
        db_backup.write_text(json.dumps(before, indent=2), encoding="utf-8")
        print(f"Backup of existing database content written to {db_backup}")

    inserted, kept = store.import_missing(source)
    after = store.read() or {}

    problems: list[str] = []
    print(f"\n{'section':<18}{'status':<28}{'source items':>13}{'database items':>16}")
    for key in sorted(source):
        s_items = source[key].get("items") if isinstance(source[key], dict) else None
        d_items = after.get(key, {}).get("items") if isinstance(after.get(key), dict) else None
        if key in inserted:
            same = key in after and _canonical(after[key]) == _canonical(source[key])
            status = "inserted, verified" if same else "INSERTED BUT MISMATCH"
            if not same:
                problems.append(key)
        else:
            same = key in after and _canonical(after[key]) == _canonical(source[key])
            status = "already present (identical)" if same else "already present (kept, differs)"
        print(f"{key:<18}{status:<28}{(len(s_items) if isinstance(s_items, list) else '-'):>13}{(len(d_items) if isinstance(d_items, list) else '-'):>16}")
    print(f"\nInserted {len(inserted)}, kept existing {len(kept)}. Existing database sections were not modified.")
    if problems:
        print("VERIFICATION FAILED for: " + ", ".join(problems), file=sys.stderr)
        return 1
    print("Verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
