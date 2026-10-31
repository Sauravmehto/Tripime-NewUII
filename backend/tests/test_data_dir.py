"""DATA_DIR support: default location, safe seeding that never overwrites, and wiring of every consumer."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from app import paths

BACKEND = Path(paths.__file__).resolve().parents[1]

# (module, attribute) for each service that owns a JSON data file.
CONSUMERS = [
    ("app.services.website_cms_service", "CMS_PATH"),
    ("app.services.package_service", "PACKAGES_PATH"),
    ("app.services.package_theme_service", "THEMES_PATH"),
    ("app.services.admin_ops_service", "OPS_PATH"),
    ("app.services.agency_profile_service", "PROFILE_PATH"),
    ("app.services.booking_service", "BOOKINGS_PATH"),
    ("app.services.enquiry_service", "ENQUIRIES_PATH"),
    ("app.services.customer_account_service", "ACCOUNTS_PATH"),
    ("app.providers.mock_provider", "SEAT_SALES_PATH"),
]


class ResolveTests(unittest.TestCase):
    def test_defaults_to_backend_data_when_unset_or_blank(self):
        self.assertEqual(paths.resolve_data_dir({}), paths.REPO_DATA_DIR)
        self.assertEqual(paths.resolve_data_dir({"DATA_DIR": "   "}), paths.REPO_DATA_DIR)
        self.assertEqual(paths.REPO_DATA_DIR, BACKEND / "data")

    def test_env_var_overrides(self):
        got = paths.resolve_data_dir({"DATA_DIR": str(Path(tempfile.gettempdir()) / "tripime-x")})
        self.assertEqual(got, (Path(tempfile.gettempdir()) / "tripime-x").resolve())


class InitTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.seed = self.root / "seed"
        self.data = self.root / "disk" / "data"
        self.seed.mkdir()
        for name in paths.SEED_FILES:
            (self.seed / name).write_text(json.dumps({"from": "repo", "file": name}), encoding="utf-8")
        (self.seed / "bookings.json").write_text("[]", encoding="utf-8")  # runtime file, must never be seeded

    def test_copies_missing_seed_files_and_creates_directory(self):
        copied = paths.init_data_dir(self.data, self.seed)
        self.assertEqual(sorted(copied), sorted(paths.SEED_FILES))
        self.assertTrue(all((self.data / n).is_file() for n in paths.SEED_FILES))

    def test_never_overwrites_existing_files(self):
        self.data.mkdir(parents=True)
        (self.data / "website_cms.json").write_text('{"edited": "in production"}', encoding="utf-8")
        (self.data / "packages.json").write_text("[]", encoding="utf-8")
        copied = paths.init_data_dir(self.data, self.seed)
        self.assertNotIn("website_cms.json", copied)
        self.assertNotIn("packages.json", copied)
        self.assertEqual(json.loads((self.data / "website_cms.json").read_text(encoding="utf-8")), {"edited": "in production"})
        self.assertEqual((self.data / "packages.json").read_text(encoding="utf-8"), "[]")

    def test_second_start_is_a_no_op(self):
        paths.init_data_dir(self.data, self.seed)
        (self.data / "website_cms.json").write_text('{"edited": true}', encoding="utf-8")
        self.assertEqual(paths.init_data_dir(self.data, self.seed), [])
        self.assertEqual(json.loads((self.data / "website_cms.json").read_text(encoding="utf-8")), {"edited": True})

    def test_runtime_records_are_not_seeded(self):
        paths.init_data_dir(self.data, self.seed)
        for runtime in ("bookings.json", "enquiries.json", "customer_accounts.json", "flight_seat_sales.json"):
            self.assertFalse((self.data / runtime).exists(), runtime)

    def test_same_directory_is_a_no_op(self):
        before = sorted(p.name for p in self.seed.iterdir())
        self.assertEqual(paths.init_data_dir(self.seed, self.seed), [])
        self.assertEqual(sorted(p.name for p in self.seed.iterdir()), before)

    def test_missing_seed_file_is_skipped_not_fatal(self):
        (self.seed / "packages.json").unlink()
        copied = paths.init_data_dir(self.data, self.seed)
        self.assertNotIn("packages.json", copied)


class WiringTests(unittest.TestCase):
    def test_every_consumer_lives_under_the_shared_data_dir(self):
        import importlib

        for module, attr in CONSUMERS:
            with self.subTest(module=module):
                path = getattr(importlib.import_module(module), attr)
                self.assertEqual(path.parent, paths.DATA_DIR)

    def test_real_modules_honour_DATA_DIR_without_overwriting_existing_data(self):
        tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, tmp, True)
        data = tmp / "persistent-disk"
        data.mkdir()
        marker = '{"existing": "production record"}'
        (data / "package_themes.json").write_text(marker, encoding="utf-8")
        script = (
            "import importlib, json\n"
            f"mods = {[m for m, _ in CONSUMERS]!r}\n"
            f"attrs = {[a for _, a in CONSUMERS]!r}\n"
            "print(json.dumps({m: str(getattr(importlib.import_module(m), a)) for m, a in zip(mods, attrs)}))\n"
        )
        env = {**os.environ, "DATA_DIR": str(data)}
        out = subprocess.run([sys.executable, "-c", script], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
        self.assertEqual(out.returncode, 0, out.stderr[-600:])
        resolved = json.loads(out.stdout.strip().splitlines()[-1])
        for module, path in resolved.items():
            self.assertEqual(Path(path).parent, data.resolve(), module)
        # Seeded the files that were missing, left the existing one alone.
        self.assertTrue((data / "website_cms.json").is_file())
        self.assertTrue((data / "packages.json").is_file())
        self.assertEqual((data / "package_themes.json").read_text(encoding="utf-8"), marker)
        self.assertFalse((data / "bookings.json").exists())
        # The repository's own data was not modified by any of that.
        self.assertNotEqual(data.resolve(), paths.REPO_DATA_DIR.resolve())


if __name__ == "__main__":
    unittest.main()
