# Data persistence on Render

Status: the code for both options below is in the repository and tested, but **nothing is switched on
yet**. Until one of them is configured, production data still lives in files on Render's ephemeral
disk and is lost whenever the service restarts or redeploys.

## 1. The problem

Every record the backend stores is a JSON file under `backend/data/`. Render's filesystem is rebuilt
from git on every deploy and restart, so:

- content edited in the admin panel (offers, banners, packages, themes) reverts to the git version;
- bookings, enquiries and customer accounts start empty again.

## 2. Data files and who uses them

| File | Owner module | Used by (routes/services) | In git | Kind |
|---|---|---|---|---|
| `website_cms.json` | `website_cms_service` | `routes/website.py`, `routes/admin.py` | yes | content (offers, banners, homepage) |
| `packages.json` | `package_service` | `routes/packages.py`, `routes/admin.py` | yes | content |
| `package_themes.json` | `package_theme_service` | `routes/package_themes.py`, `routes/admin.py` | yes | content |
| `admin_ops.json` | `admin_ops_service` | `routes/admin.py`, `routes/customer_profile.py`, `booking_service`, `customer_account_service` | yes | content + customer records |
| `agency_profile.json` | `agency_profile_service` | `routes/admin.py` | yes | settings |
| `flights.json` | none (no code reads it) | none | yes | unused, safe to ignore |
| `bookings.json` | `booking_service` | `routes/bookings.py`, `routes/admin.py`, `notification_service` | no (ignored) | customer data |
| `enquiries.json` | `enquiry_service` | `routes/enquiries.py`, `routes/admin.py` | no (ignored) | customer data |
| `flight_seat_sales.json` | `providers/mock_provider` | `booking_service`, `flight_service` | no (ignored) | runtime |
| `customer_accounts.json` | `customer_account_service` | `routes/customer_auth.py`, `routes/admin.py` | no (ignored) | customer data, created on first use |

## 3. What was built

1. **`DATA_DIR` (all ten files).** `app/paths.py` reads `DATA_DIR`; unset means `backend/data`, exactly as
   before. When it points elsewhere, the six git-tracked content files are copied in once if missing
   and **existing files are never overwritten**. Runtime files start empty.
2. **Database storage for the website CMS** (`app/storage/cms_store.py`). Set `DATABASE_URL` and the CMS
   (banners, deals/offers, homepage, SEO, testimonials, blogs and the rest of `website_cms.json`) is
   stored in PostgreSQL instead of the file. Public and admin API responses are identical.
   - `cms_sections`: one row per top-level section (`section_key` primary key, `payload` JSONB,
     `created_at`, `updated_at`, index on `updated_at`).
   - `cms_snapshots`: the previous document is saved before every change (newest 50 kept, index on
     `taken_at`). This is the undo/recovery path.
   - Writes are one transaction and only touch sections whose content changed, so two admins editing
     different sections cannot overwrite each other. A failed save leaves the old content intact.
   - On the first start with an empty database the app imports the JSON file that ships with it, so
     existing content is carried over rather than replaced by defaults.
   - Each instance caches the CMS for `CMS_CACHE_SECONDS` (default 5) and then re-reads, so several
     instances stay consistent.
3. **Migration tool**: `backend/scripts/migrate_cms_to_db.py` (backup, insert-only, verify, idempotent,
   `--dry-run`, `--list-snapshots`, `--restore-snapshot ID`).

Bookings, enquiries, customer accounts and payments are **not** moved to the database in this phase.
They are the next step (see section 6) and should not be migrated without their own plan and tests.

## 4. Choosing the production setup

| | A. Render persistent disk | B. Render PostgreSQL |
|---|---|---|
| Covers | all JSON files, including bookings and enquiries | website CMS only (today) |
| Code change needed | none beyond `DATA_DIR` (done) | none (done) |
| Cost | paid web service plan plus the disk | a paid database plan (check current free-tier terms) |
| Limits | one instance only; deploys restart the service with a short outage | none of those; backups and point-in-time recovery depend on the plan |
| Risk | no transactions, no cross-process locking on JSON files | PostgreSQL itself is not exercised by the automated tests (SQLite is); verify on staging first |

Recommendation: **do A now for everything, then add B for the CMS**, and move bookings and enquiries to
PostgreSQL later. A protects customer records immediately with no data migration; B gives the content
editors a proper database with undo. They do not conflict: `DATABASE_URL` takes precedence for the CMS
only, and `DATA_DIR` still holds the other files.

Do not enable both for the CMS expecting the file to stay in sync. With `DATABASE_URL` set, the database
is the single source of truth for the CMS; the JSON file is only the first-start seed.

## 5. Manual steps (need access to the Render dashboard)

**These need a paid plan and your approval; nothing here has been done.**

A. Persistent disk
1. Render dashboard, the backend service, Disks, add a disk (for example mount path `/var/data`, 1 GB).
2. Environment: add `DATA_DIR=/var/data`.
3. Deploy. The first start copies the git content files onto the disk. From then on **content edits must
   be made in the admin panel, not in git**: a changed `website_cms.json` in git no longer reaches
   production because existing files are never overwritten. Use `DATA_DIR` consistently; do not move it later.

B. PostgreSQL for the CMS
1. Render dashboard, New, PostgreSQL. Copy the **Internal Database URL**.
2. Backend service, Environment: add `DATABASE_URL` (as a secret). The build installs `psycopg`
   automatically when it is present.
3. In the backend shell, from the `backend` folder, rehearse then run:
   `python scripts/migrate_cms_to_db.py --dry-run` then `python scripts/migrate_cms_to_db.py`
   Check the table it prints (every section "inserted, verified" or "already present").
4. Deploy and confirm the admin panel and `/api/website/deals` still show the same content.

## 6. Backup and recovery

- Every CMS change keeps a snapshot. `python scripts/migrate_cms_to_db.py --list-snapshots` then
  `--restore-snapshot ID` restores it (the current state is snapshotted first, so a restore can be undone).
- The migration writes the source JSON and any existing database content to `DATA_DIR/backups/` before it
  changes anything. Copy those off the server; a disk or database is not a backup by itself.
- Turn on the database provider's automatic backups. Test a restore once before relying on it.
- With a persistent disk, take disk snapshots and keep an off-server copy of `DATA_DIR`.

## 7. Next steps (not done)

1. Bookings, enquiries and customer accounts to PostgreSQL: relational tables with unique keys and
   transactions; payments need an audit trail. Plan and test separately.
2. Packages and themes: same document-store approach as the CMS.
3. Admin image upload needs durable object storage (Cloudinary or S3 compatible); files written to the
   web service's disk would be lost on redeploy unless a persistent disk is mounted.
4. Replace `create_all`-style startup DDL with versioned migrations (Alembic) once the schema grows.
