"""Database-backed CMS storage, tested on SQLite (the SQL is shared with PostgreSQL).

PostgreSQL itself is exercised only in a real deployment; these tests cover the logic: persistence
across restarts, atomic writes, snapshots, idempotent import, and the migration script."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app.services import website_cms_service as cms_module
from app.storage.cms_store import JsonFileCmsStore, SqlCmsStore, build_cms_store

BACKEND = Path(cms_module.__file__).resolve().parents[2]
REAL_CMS = BACKEND / "data" / "website_cms.json"
SCRIPT = BACKEND / "scripts" / "migrate_cms_to_db.py"


def sample() -> dict:
    return {"banners": {"items": [{"id": "a"}, {"id": "b"}]}, "deals": {"items": [{"id": "d1"}]}, "general": {"x": 1}}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.url = "sqlite:///" + str(self.tmp / "cms.db")

    def store(self, **kw) -> SqlCmsStore:
        return SqlCmsStore(self.url, **kw)


class SqlStoreTests(Base):
    def test_empty_database_reads_none(self):
        self.assertIsNone(self.store().read())

    def test_roundtrip_and_survives_a_new_connection_object(self):
        self.store().write(sample())
        self.assertEqual(self.store().read(), sample())  # a brand new store = a restarted process

    def test_only_changed_sections_are_written(self):
        s = self.store()
        s.write(sample())
        changed = s.write({**sample(), "general": {"x": 2}})
        self.assertEqual(changed, ["general"])
        self.assertEqual(s.write({**sample(), "general": {"x": 2}}), [])

    def test_unrelated_sections_survive_a_partial_document(self):
        s = self.store()
        s.write(sample())
        s.write({"general": {"x": 9}})  # a document that omits other sections must not delete them
        self.assertEqual(s.read()["banners"], sample()["banners"])

    def test_write_is_atomic(self):
        s = self.store()
        s.write(sample())
        real = s._upsert
        calls = {"n": 0}

        def flaky(conn, key, value):
            calls["n"] += 1
            if calls["n"] == 2:
                raise RuntimeError("disk full")
            return real(conn, key, value)

        with mock.patch.object(s, "_upsert", flaky):
            with self.assertRaises(RuntimeError):
                s.write({"banners": {"items": []}, "deals": {"items": []}, "general": {"x": 5}})
        self.assertEqual(s.read(), sample(), "a failed save must leave the previous content intact")

    def test_snapshots_are_kept_pruned_and_restorable(self):
        s = self.store(snapshot_keep=3)
        s.write(sample())
        for n in range(6):
            s.write({**sample(), "general": {"x": 100 + n}})
        snaps = s.list_snapshots()
        self.assertEqual(len(snaps), 3)
        oldest_kept = snaps[-1]["id"]
        restored = s.restore_snapshot(oldest_kept)
        self.assertIn("general", restored)
        self.assertEqual(s.read()["general"]["x"], 102)  # state captured just before write #4 (x=103)
        self.assertTrue(any("before restore" in x["reason"] for x in s.list_snapshots()))

    def test_restore_unknown_snapshot_raises(self):
        with self.assertRaises(KeyError):
            self.store().restore_snapshot(999)

    def test_import_missing_never_overwrites_and_is_idempotent(self):
        s = self.store()
        s.write({"general": {"x": "production edit"}})
        inserted, kept = s.import_missing(sample())
        self.assertEqual(sorted(inserted), ["banners", "deals"])
        self.assertEqual(kept, ["general"])
        self.assertEqual(s.read()["general"], {"x": "production edit"})
        self.assertEqual(s.import_missing(sample()), ([], ["banners", "deals", "general"]))

    def test_counts(self):
        s = self.store()
        s.write(sample())
        self.assertEqual(s.counts(), {"banners": 2, "deals": 1, "general": None})

    def test_unicode_and_nested_content_roundtrip(self):
        doc = {"general": {"title": "Zero fee — UPI", "list": [1, 2, {"k": "v"}], "empty": None}}
        s = self.store()
        s.write(doc)
        self.assertEqual(s.read(), doc)

    def test_url_validation(self):
        with self.assertRaises(ValueError):
            SqlCmsStore("mysql://nope")
        self.assertEqual(SqlCmsStore("postgres://u:p@h/db")._dialect, "postgresql")


class FactoryTests(Base):
    def test_json_store_without_database_url(self):
        with mock.patch.dict(os.environ, {"DATABASE_URL": ""}):
            self.assertIsInstance(build_cms_store(self.tmp / "x.json"), JsonFileCmsStore)

    def test_sql_store_when_database_url_is_set(self):
        with mock.patch.dict(os.environ, {"DATABASE_URL": self.url}):
            self.assertIsInstance(build_cms_store(self.tmp / "x.json"), SqlCmsStore)


class ServiceOnDatabaseTests(Base):
    def setUp(self):
        super().setUp()
        self.seed_path = self.tmp / "website_cms.json"
        shutil.copy(REAL_CMS, self.seed_path)

    def service(self) -> cms_module.WebsiteCmsService:
        return cms_module.WebsiteCmsService(store=SqlCmsStore(self.url, seed_path=self.seed_path))

    def test_first_start_imports_the_json_content_instead_of_defaults(self):
        svc = self.service()
        original = json.loads(self.seed_path.read_text(encoding="utf-8-sig"))
        self.assertEqual([d["id"] for d in original["deals"]["items"]], [d.id for d in svc.get_cms().deals.items])
        stored = SqlCmsStore(self.url).read()
        self.assertEqual(len(stored), len(original))

    def test_edits_survive_a_restart(self):
        svc = self.service()
        deals = svc.get_cms().deals
        deals.items[0].title = "Edited in production"
        svc.update_deals(deals)
        restarted = self.service()  # new process, same database
        self.assertEqual(restarted.get_cms().deals.items[0].title, "Edited in production")

    def test_redeploy_with_a_newer_json_file_does_not_overwrite_database_content(self):
        svc = self.service()
        deals = svc.get_cms().deals
        deals.items[0].title = "Edited in production"
        svc.update_deals(deals)
        # a redeploy ships a different seed file
        data = json.loads(self.seed_path.read_text(encoding="utf-8-sig"))
        data["deals"]["items"][0]["title"] = "From the repository"
        self.seed_path.write_text(json.dumps(data), encoding="utf-8")
        self.assertEqual(self.service().get_cms().deals.items[0].title, "Edited in production")

    def test_two_instances_see_each_others_changes_after_the_cache_window(self):
        a, b = self.service(), self.service()
        deals = a.get_cms().deals
        deals.items[0].title = "Changed by instance A"
        a.update_deals(deals)
        with mock.patch.object(cms_module, "CMS_CACHE_SECONDS", 0.0):
            self.assertEqual(b.get_cms().deals.items[0].title, "Changed by instance A")

    def test_unreadable_database_keeps_serving_the_last_good_copy(self):
        svc = self.service()
        before = svc.get_cms().deals.items[0].title
        with mock.patch.object(cms_module, "CMS_CACHE_SECONDS", 0.0), mock.patch.object(svc._store, "read", side_effect=RuntimeError("db down")):
            with self.assertLogs(cms_module.log, "ERROR"):
                self.assertEqual(svc.get_cms().deals.items[0].title, before)

    def test_json_mode_behaviour_is_unchanged(self):
        path = self.tmp / "json-mode.json"
        shutil.copy(REAL_CMS, path)
        svc = cms_module.WebsiteCmsService(path)
        deals = svc.get_cms().deals
        deals.items[0].title = "json edit"
        svc.update_deals(deals)
        self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["deals"]["items"][0]["title"], "json edit")
        self.assertEqual(cms_module.WebsiteCmsService(path).get_cms().deals.items[0].title, "json edit")


class MigrationScriptTests(Base):
    def run_script(self, *args: str, source: Path | None = None, url: str | None = None):
        env = {**os.environ, "DATABASE_URL": self.url if url is None else url, "DATA_DIR": str(self.tmp / "disk")}
        cmd = [sys.executable, str(SCRIPT), "--source", str(source or self.source), "--backup-dir", str(self.tmp / "backups"), *args]
        return subprocess.run(cmd, cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)

    def setUp(self):
        super().setUp()
        self.source = self.tmp / "website_cms.json"
        shutil.copy(REAL_CMS, self.source)
        self.real_hash = REAL_CMS.read_bytes()

    def test_dry_run_writes_nothing(self):
        out = self.run_script("--dry-run")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("DRY RUN", out.stdout)
        self.assertFalse((self.tmp / "cms.db").exists())
        self.assertFalse((self.tmp / "backups").exists())

    def test_migrates_verifies_backs_up_and_is_idempotent(self):
        out = self.run_script()
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertIn("Verification passed", out.stdout)
        self.assertTrue(list((self.tmp / "backups").glob("website_cms.*.json")))
        original = json.loads(self.source.read_text(encoding="utf-8-sig"))
        stored = SqlCmsStore(self.url).read()
        self.assertEqual(set(stored), set(original))
        self.assertEqual(SqlCmsStore(self.url).counts()["deals"], len(original["deals"]["items"]))
        again = self.run_script()
        self.assertEqual(again.returncode, 0)
        self.assertIn("Inserted 0", again.stdout)

    def test_existing_database_content_is_kept_and_backed_up(self):
        SqlCmsStore(self.url).write({"deals": {"items": [{"id": "live", "category": "hotel", "imageUrl": "https://x/y.jpg", "title": "Live"}]}})
        out = self.run_script()
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(SqlCmsStore(self.url).read()["deals"]["items"][0]["id"], "live")
        self.assertIn("already present (kept, differs)", out.stdout)
        self.assertTrue(list((self.tmp / "backups").glob("db-before-migration-*.json")))

    def test_requires_database_url_and_rejects_bad_json(self):
        self.assertEqual(self.run_script(url="").returncode, 2)
        bad = self.tmp / "bad.json"
        bad.write_text('{"deals": {"items": [{"id": "x"}]}}', encoding="utf-8")
        out = self.run_script(source=bad)
        self.assertNotEqual(out.returncode, 0)

    def test_does_not_print_the_database_url(self):
        out = self.run_script("--dry-run")
        self.assertNotIn(self.url, out.stdout + out.stderr)

    def test_snapshot_listing_and_restore(self):
        s = SqlCmsStore(self.url)
        s.write(sample())
        s.write({**sample(), "general": {"x": 2}})
        out = self.run_script("--list-snapshots")
        self.assertEqual(out.returncode, 0)
        self.assertIn("before save", out.stdout)
        snap_id = s.list_snapshots()[0]["id"]
        self.assertEqual(self.run_script("--restore-snapshot", str(snap_id)).returncode, 0)
        self.assertEqual(SqlCmsStore(self.url).read()["general"], {"x": 1})

    def tearDown(self):
        self.assertEqual(REAL_CMS.read_bytes(), self.real_hash, "tests must never modify the tracked CMS file")


if __name__ == "__main__":
    unittest.main()
