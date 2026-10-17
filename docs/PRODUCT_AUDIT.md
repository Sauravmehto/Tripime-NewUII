# Tripime — Product Audit

Audit date: 2026-10-17 · Branch `main` @ `c8f81c6` + a large uncommitted working tree · Audit only, no code changed.

## 1. What the product is

Tripime is a travel-agency website: customers search flights, browse holiday packages and send enquiries; staff run everything from an admin console. Flights are **not** bought online — a signed-in customer submits a **booking request** and the agency verifies payment off-platform, books with the airline, and records the PNR/ticket.

**Users:** (1) anonymous visitors, (2) signed-in customers (email one-time code), (3) a single shared admin.

**Stack:** Next.js 16.3 / React 19 / Tailwind 4 (Netlify) · FastAPI 0.128 / pydantic 2 (Render) · **JSON files in `backend/data/` as the database** · SMTP email, optional WhatsApp (CallMeBot / Cloud API) · reportlab PDFs.

## 2. Verified checks (run 2026-10-17)

| Check | Result |
|---|---|
| Backend unit tests (`unittest discover`) | **19/19 pass** |
| `tsc --noEmit` | **Pass** (0 errors) |
| `eslint .` | **Pass** (0 findings) |
| `npm run build` | **Pass**, ~40 routes generated |
| Route auth scan (programmatic) | All `/api/admin/*` routes require admin JWT except `login`; booking routes require customer session |
| Frontend e2e / backend integration tests | **None exist.** Playwright runs earlier in this session were ad-hoc scripts outside the repo |
| CI | **None** (no `.github/`) |
| Live deploy / real SMTP / real WhatsApp | **Unverified** — never configured or run |

## 3. Feature inventory

Status: Complete · Partial · Missing · Broken · Unverified. "V" = verified by running, "A" = assumed from code reading.

| # | Feature | Status | Notes | Pri | V/A |
|---|---|---|---|---|---|
| 1 | Flight search (17 airports, autocomplete, calendar fares, round trip, travellers/cabin) | Partial | Works, but data is **deterministic mock inventory**, not a real supplier | P0 | V |
| 2 | Results page (filters, sort, discounts, 1-stop connections, promo banner) | Partial | Same mock caveat | P0 | V |
| 3 | Customer sign-in (email code → HttpOnly cookie) | Partial | Works with dev fixed PIN; **real email delivery unverified** | P0 | V (dev) / A (prod) |
| 4 | Booking flow: passengers → review → payment page → submit | Complete (as request flow) | Honest state machine; no fake tickets | — | V |
| 5 | Payment | **Missing** | No gateway. Manual UPI ID `tripimetrips@test.upi` is a test value | P0 | V |
| 6 | Admin booking lifecycle (record payment, PNR, tickets, fail/cancel) | Complete | Audit trail in `statusHistory` | — | V |
| 7 | Notifications (email + WhatsApp + customer) | Partial | Logged as sent/failed/not_configured; nothing configured, so nothing delivered | P0 | V (logging) / A (delivery) |
| 8 | Invoice/ticket PDFs | Partial | Generated; ticket only after admin issues. No GST/legal invoice fields reviewed | P1 | V |
| 9 | My bookings / confirmation page | Complete | | — | V |
| 10 | Holiday packages (list, detail, enquiry modal) | Complete | Enquiries now visible in `/admin/packages/itinerary` | — | V |
| 11 | Admin console: bookings, packages, themes, enquiries (5 types), customers, websites CMS, marketing, profile, dashboard | Mostly complete | Modules present and build; only bookings/packages/enquiries exercised end-to-end | P2 | Partial V |
| 12 | Hotels, Buses, Visa pages | Partial/Unverified | Pages exist; booking is not implemented (enquiry-style at most) | P2 | A |
| 13 | Legal pages (privacy, terms, refund) | Partial | Exist; content not reviewed by counsel | P1 | A |
| 14 | Admin authentication | **Weak** | Single shared `admin`/`admin123` default; token in localStorage; no login throttling | P0 | V |
| 15 | Customer Profile register/login (`/api/customer-profile/*`) | Unverified | Legacy second auth path alongside email-code auth; unclear if used | P2 | A |
| 16 | Data persistence | **Not production-grade** | JSON files; Render free disk is ephemeral | P0 | V |

## 4. Defects and risks found

1. **Insecure defaults** — `ADMIN_PASSWORD=admin123`, `ADMIN_JWT_SECRET=dev-only-insecure-secret-change-me` are used if env vars are missing. The same secret signs **customer** sessions, so a known secret forges any customer cookie. *Confirmed in `config.py`.*
2. **No admin login rate limit** — brute-forceable (documented in `SECURITY_CHECKLIST.md`, not fixed).
3. **Data loss / corruption risk** — all bookings, enquiries and PNRs live in JSON files; ephemeral disk on Render; no locking across processes; no backups.
4. **Rate limiters and OTP store are in-memory** — reset on restart, wrong with >1 worker/instance.
5. **Public repo exposure** — a tracked `RENDER_ENV.txt` and tracked `backend/data/*.json` (packages, CMS, admin ops). No secrets seen in them, but verify `admin_ops.json` and `agency_profile.json` contain no personal data. `bookings.json`/`enquiries.json` are correctly ignored.
6. **Docs drift** — root `README.md` still describes the older mock-payment flow; `backend/README.md` calls it a "Mock Flight API"; `SECURITY_CHECKLIST.md` references `frontend/src/lib/adminAuth.ts` (real path: `frontend/lib/admin-auth.ts`).
7. **Large uncommitted tree** — ~70 modified files on `main` not committed; no tag/release.
8. **Admin token in localStorage** — XSS-theft exposure; no CSP configured.
9. **Cookie settings** — cross-site (Netlify ↔ Render) cookies need `SameSite=None; Secure` and a shared parent domain strategy; unverified in a real deployment.
10. **Zero automated frontend tests and no CI.**

## 4a. Update — 2026-10-17, admin authentication hardening

Findings 1, 2 and 8 above are addressed: production refuses weak/default/identical secrets; customer and admin sessions use separate keys; admin login is throttled with expiring progressive lockouts (per IP and per username, spoof-resistant client IP); the admin session is an HttpOnly cookie with CSRF protection and no token in localStorage. Backend tests: 61 passing. Still open: shared store is optional (`REDIS_URL`) and only exercised against a fake Redis; no per-admin accounts, 2FA, CSP or admin audit log; admin login limits are not tested against a real proxy chain.

## 5. What is solid

State machine and honesty rules (no fake payment/ticket/notification), authorization on every route, customer data isolated per user, types/lint/build clean, backend tests cover the core flow, safe-redirect handling, no passport data in browser storage or notifications.
