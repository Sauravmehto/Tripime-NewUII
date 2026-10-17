# Admin & security checklist — before going live

This backend currently ships with a **single hardcoded admin account** authenticated
against environment variables, and a few other deliberately simple choices that are
fine for a demo but need attention before real customers or real money are involved.
This doc describes exactly what exists today and what to change before launch.

## How admin auth works today

- One admin identity: `ADMIN_USERNAME` / `ADMIN_PASSWORD` (env vars, compared with
  `secrets.compare_digest` — timing-safe, but there's no per-account hashing since
  there's only one shared password).
- On successful login, the backend issues a JWT (`HS256`, signed with
  `ADMIN_JWT_SECRET`) valid for `ADMIN_TOKEN_TTL_HOURS` (default 12h). See
  `backend/app/services/admin_auth.py`.
- Every `/api/admin/*` route requires the HttpOnly `tripime_admin_session` cookie (plus an `X-CSRF-Token` header on writes) or, for scripts, `Authorization: Bearer <token>` — see
  `backend/app/routes/admin.py`.
- The browser never sees the JWT: it is an HttpOnly cookie (`SameSite`/`Secure` from `COOKIE_SAMESITE`/`COOKIE_SECURE`, path `/api/admin`). The frontend keeps only the CSRF token, in memory, re-read from `GET /api/admin/session` after a reload (`frontend/lib/admin-auth.ts`). Legacy `localStorage` tokens are purged.
- Login is throttled (`backend/app/services/login_throttle.py`): 5 failures per IP / 20 per username in 15 min lock that key for 60 s, doubling per repeat up to 15 min; locks always expire; a successful login clears counters; locked requests are refused before the password is checked; errors are identical for unknown user and wrong password. Client IP comes from the Nth-from-right `X-Forwarded-For` entry (`TRUSTED_PROXY_HOPS`), never the client-controlled left side.

## ⚠️ Must fix before go-live

- [x] **Startup guard (implemented):** with `APP_ENV=production` (or on Render) the app refuses to start if `ADMIN_PASSWORD` is a default or under 12 chars, if `ADMIN_JWT_SECRET`/`CUSTOMER_JWT_SECRET` are defaults or under 32 chars, or if the two secrets are equal. Customer sessions use `CUSTOMER_JWT_SECRET`; admin tokens use `ADMIN_JWT_SECRET`.
- [ ] **Set real secrets on the server.** `backend/app/config.py` falls back to
      `ADMIN_PASSWORD=admin123` and `ADMIN_JWT_SECRET=dev-only-insecure-secret-change-me`
      if the env vars are missing. These defaults are intentionally obvious/insecure —
      confirm `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` are set to strong,
      unique values in every deployed environment (Render, etc.), not just `.env` locally.
- [ ] **Rotate `ADMIN_JWT_SECRET` if it was ever committed, logged, or shared** —
      rotating it invalidates all existing admin sessions, which is expected.
- [x] ~~**Add login rate limiting / lockout.**~~ Done (see above). Remaining: set `REDIS_URL` if you ever run more than one instance (otherwise counters are per process and reset on restart).
- [ ] (old note) **Add login rate limiting / lockout.** `POST /api/admin/login` has no throttling
      today, so it's brute-forceable given enough attempts. Add a rate limiter
      (e.g. `slowapi`, or a reverse-proxy/WAF rule) before launch.
- [ ] **Restrict `CORS_ORIGINS` to your real domain(s).** The default
      `CORS_ORIGIN_REGEX` allows any `*.netlify.app` subdomain plus localhost — fine
      for previews, but set `CORS_ORIGINS` explicitly and consider tightening the regex
      once you're on a custom domain.
- [ ] **Serve everything over HTTPS** (Render/Netlify do this by default) — a bearer
      token sent over plain HTTP can be sniffed.

## Recommended hardening (do soon after launch)

- [x] ~~Move the admin token out of `localStorage`~~ Done: HttpOnly cookie + CSRF. CSP: a Report-Only policy plus baseline headers now ship from `frontend/next.config.ts` (locally validated; **enforcement and staging validation pending** — see `docs/STAGING_VALIDATION_PLAN.md`). Cookie auth and CSRF do not depend on CSP, and CSP does not replace CORS. (old note: or at
      least accept the XSS-token-theft risk knowingly and add a strong
      Content-Security-Policy to reduce it.
- [ ] Add per-admin accounts (instead of one shared username/password) once more than
      one person needs admin access, so actions are attributable and revocable
      individually.
- [ ] Add audit logging for sensitive admin actions (booking confirmations, package
      edits/deletes) — currently these are not logged anywhere.
- [ ] Move booking/package storage off the local JSON files in `backend/data/` to a
      real database. Render's free-tier disk is **ephemeral** — data can be lost on
      redeploy/restart today.
- [ ] Add a short login-attempt alert (e.g. email/Slack) if you want to know about
      brute-force attempts in real time.

## Payments & PII (already true today — keep it that way)

- Card number and CVV entered on the payment step are validated client-side only and
  are **never sent to or stored by the backend** — don't introduce a code path that
  changes this without a compliance review (PCI-DSS applies to *any* real card data
  handling).
- Passenger PII collected (name, gender, date of birth, contact email/phone) is stored
  in `backend/data/bookings.json` today. If you add a database, make sure it's
  encrypted at rest and access is restricted to the backend service only.

## Quick pre-launch pass

```bash
# From backend/, confirm no insecure defaults are in effect:
python -c "from app import config; print(config.ADMIN_PASSWORD, config.ADMIN_JWT_SECRET)"
# Should NOT print 'admin123' or 'dev-only-insecure-secret-change-me'
```

See also: [`backend/README.md`](README.md) for deploy/env-var setup, and the root
[`README.md`](../README.md#deploy-github--render--netlify) for the full Render/Netlify
walkthrough.
