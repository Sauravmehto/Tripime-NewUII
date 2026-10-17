# Tripime — Implementation Roadmap

Effort: S ≤ 1 day · M 2–5 days · L > 1 week. Nothing here is started; awaiting approval.

## Phase 0 — Stabilize and secure (P0)

| Task | Why | Depends on | Files | Acceptance | Effort |
|---|---|---|---|---|---|
| 0.1 Commit current working tree in logical commits; tag `v0.1-request-flow` | ~70 uncommitted files | — | repo | Clean `git status`; tests/lint/build green | S |
| 0.2 ✅ DONE — Fail startup in production on insecure defaults; separate `CUSTOMER_JWT_SECRET` | Forgeable sessions | — | `config.py`, `admin_auth.py`, `customer_auth_service.py` | App refuses `APP_ENV=production` with default secrets; tests | S |
| 0.3 ✅ DONE — Admin login throttling + lockout | Brute force | — | `routes/admin.py`, `rate_limit.py` | 6th failed attempt in window → 429; test | S |
| 0.4 ✅ DONE (cookie+CSRF); CSP still open — Move admin token to HttpOnly cookie; add CSP headers | XSS exposure | 0.2 | `admin-auth.ts`, `lib/api/client.ts`, `netlify.toml` | No token in localStorage; admin smoke passes | M |
| 0.5 🟡 WORKFLOW WRITTEN, not yet run on GitHub (runs `unittest` — the repo has no pytest — plus tsc, eslint, build; verified locally in a clean clone) — Add GitHub Actions CI | No regression net | — | `.github/workflows/ci.yml` | CI green on PR | S |

## Phase 1 — Real data layer (P0)

| Task | Why | Depends | Acceptance | Effort |
|---|---|---|---|---|
| 1.1 Postgres + SQLAlchemy/Alembic models for bookings, enquiries, packages, CMS, admin ops | Durable, transactional | 0.5 | Migrations apply; JSON→DB import script; all tests pass on DB | L |
| 1.2 Persistent OTP/rate-limit store (DB or Redis) | Multi-instance safety | 1.1 | Limits survive restart | M |
| 1.3 Backups + restore drill | Data safety | 1.1 | Documented restore works | S |

## Phase 2 — Messaging that actually delivers (P0)

| Task | Acceptance | Effort |
|---|---|---|
| 2.1 Configure real SMTP/transactional email; verify SPF/DKIM | Test email received; customer code email works; `sent` status logged | S |
| 2.2 WhatsApp Cloud API with approved templates | Admin alert delivered on new booking request | M |
| 2.3 Retry queue for failed notifications + admin "resend" | Failed attempts retried; resend button works | M |

## Phase 3 — Payments (P0 for revenue)

| Task | Acceptance | Effort |
|---|---|---|
| 3.1 Razorpay/Cashfree provider behind `payment_base.py` | Test-mode payment moves booking to PAYMENT_CONFIRMED only via verified webhook | L |
| 3.2 Idempotency, signature verification, reconciliation view in admin | Replayed webhooks are no-ops; mismatches flagged | M |
| 3.3 Refund/cancellation workflow | Admin can refund; status history updated; customer notified | M |

## Phase 4 — Supply and product depth (P1)

| Task | Acceptance | Effort |
|---|---|---|
| 4.1 Choose supplier (or decide "indicative fares, agent confirms") | Decision recorded | S |
| 4.2 Supplier adapter replacing `mock_provider` behind `flight_network` interface | Live search results; fare re-validation at submit | L |
| 4.3 Per-admin accounts + roles + audit log | Actions attributable; roles enforced | M |
| 4.4 GST-compliant invoice, retention/consent for passport data | Reviewed by accountant/lawyer | M |

## Phase 5 — Quality, SEO, observability (P1/P2)

| Task | Acceptance | Effort |
|---|---|---|
| 5.1 Playwright e2e into repo (search → login → request → admin issue) | Runs in CI | M |
| 5.2 Sentry + structured logs + uptime monitor | Alert on 5xx | S |
| 5.3 Sitemap, robots, metadata, analytics + consent | Lighthouse ≥ 90 SEO | M |
| 5.4 Refresh READMEs, add runbook | Fresh dev can run in 15 min | S |

## Phase 6 — Launch (P0 at the end)

Staging deploy on Render + Netlify with real domain → cookie/CORS verification → load smoke → pilot with real bookings handled manually → go-live. Effort M.

## Suggested order

0.1 → 0.2 → 0.3 → 0.5 → 2.1 → 1.1 → 0.4 → 3.1 → 2.2 → 4.x → 5.x → 6.
