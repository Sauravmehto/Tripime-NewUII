# Tripime — Production Readiness Checklist

Verdict as of 2026-10-17: **Not ready for real customers or real money.** Ready for demo / internal pilot as a request-capture tool.

## Release gates

### Security
- [ ] Strong unique `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` set on Render; startup fails otherwise
- [x] Separate customer-session secret
- [x] Admin login rate limit/lockout (REDIS_URL needed only for multi-instance)
- [x] Admin token out of localStorage (HttpOnly cookie + CSRF)
- [ ] CSP: **Report-Only is implemented** and locally validated (no violations over 17 pages, also when built in enforce mode); NOT enforced in the shipped default and NOT validated on staging — see `docs/STAGING_VALIDATION_PLAN.md`. Baseline headers (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) are enforced.
- [ ] `CUSTOMER_OTP_DEV_CODE` unset and `APP_ENV=production`
- [ ] CORS restricted to real domains
- [ ] Cookies: `Secure`, `SameSite` verified across Netlify↔Render
- [ ] Secrets rotated if ever shared (the dev fixed PIN and `admin123` were used in this project)

### Data
- [ ] Real database with migrations
- [ ] Automated backups and a tested restore
- [ ] Retention/consent policy for passport and ID data
- [ ] No personal data in git (`bookings.json`, `enquiries.json` ignored — keep it so)

### Money
- [ ] Payment gateway live, webhook-verified
- [ ] UPI ID / bank details confirmed real (currently `tripimetrips@test.upi`)
- [ ] Refund and cancellation process
- [ ] GST invoice format approved

### Messaging
- [ ] Real SMTP; customer code email delivered
- [ ] Admin email + WhatsApp alerts delivered; failures visible and retried
- [ ] Confirm the correct WhatsApp number (+91 98996 40449 in code)

### Product
- [ ] Flight supply decision made; fares are real or clearly labelled indicative
- [ ] Hotels/Buses/Visa pages either functional or honest about being enquiry-only
- [ ] Legal pages reviewed

### Quality & Ops
- [ ] CI green (tests, types, lint, build) — workflow `.github/workflows/ci.yml` exists and its commands pass locally from a clean clone; first GitHub run (80b4770): backend job passed, frontend job failed at `npm ci` (Node 22/npm 10 vs npm 11 lockfile); fix committed locally, not yet re-run; tick this once it is green on GitHub and required via branch protection
- [ ] E2E happy path automated
- [ ] Error tracking, uptime monitoring, alerting
- [ ] Staging environment mirrors production
- [ ] Runbook: deploy, rollback, rotate secrets, restore data
- [ ] READMEs updated

## Currently passing
Unit tests 19/19 · tsc clean · eslint clean · production build clean · all admin routes auth-guarded.

## Not verified (blockers to confirm, not guessed)
Real deployment behaviour, SMTP/WhatsApp delivery, cross-site cookies, load behaviour, accessibility audit, Core Web Vitals.

## Local simulation results (2026-10-17) — NOT staging, NOT verification of the real deployment

Run with a production build of the frontend on `http://localhost:3100` calling a separate API origin `http://127.0.0.1:8003` (`COOKIE_SAMESITE=none`, exact-origin `CORS_ORIGINS`, development credentials only):
- Cross-origin admin login, session persistence across reload, CSRF-protected write (200 with header, 403 without), logout clearing the session, CORS preflight accepting only the configured origin: **worked**.
- CSP Report-Only (and enforce-mode build earlier): no violations on ~20 pages; `connect-src` included the API origin. Creator reels in the sample data are photo slideshows, so YouTube/Instagram/MP4 embeds and the admin map iframe were **not exercised**; GTM's real origin needs were **not observed**.
- Lockout: works against a direct connection. Found and documented a bypass when uvicorn is allowed to rewrite the client address from `X-Forwarded-For` (fix: `--no-proxy-headers`; see `backend/SECURITY_CHECKLIST.md`).
- Not tested here: HTTPS, real Netlify/Render, real proxy chain, Safari/Firefox, `TRUSTED_PROXY_HOPS` on the real path.

## `main` branch protection (not configured — needs repository admin rights)

GitHub → Settings → Branches → add rule for `main`:
- Require a pull request before merging.
- Require status checks to pass before merging; select **Backend tests** and **Frontend types, lint, build** (they only appear in the list after the workflow has run once on GitHub), and require branches to be up to date.
- Block force pushes and deletions; apply to administrators if desired.
Tick this only after the rule exists and CI is green. Not done: no GitHub credentials/CLI are available in this environment.
