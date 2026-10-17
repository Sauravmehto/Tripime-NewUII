# Tripime — Staging Validation Plan

Nothing in this document has been performed yet. Every box is unchecked on purpose: tick it only after running the step against a real HTTPS staging deployment (Netlify frontend + Render backend), and record who ran it and when. Staging must use its own strong secrets (see `backend/.env.example`) and `APP_ENV=production`.

## 0. Preconditions
- [ ] Backend deployed with `APP_ENV=production`, strong `ADMIN_PASSWORD`, distinct `ADMIN_JWT_SECRET` / `CUSTOMER_JWT_SECRET`; startup succeeded (a bad config must instead fail the deploy).
- [ ] Frontend built with `NEXT_PUBLIC_API_BASE_URL` = the Render URL; `CORS_ORIGINS` on Render = the exact Netlify origin.
- [ ] Decide cookie mode: if the browser calls Render directly from a different site, `COOKIE_SAMESITE=none` (HTTPS only). Preferred alternative: a custom domain so frontend and API are same-site.
- [ ] CI is green on the commit being deployed.

## 1. CSP (shipped as **Report-Only**; nothing is blocked yet)
Header: `Content-Security-Policy-Report-Only`, set in `frontend/next.config.ts`. Switch to enforcement with `CSP_MODE=enforce` at build time **only after this section passes**.
- [ ] Confirm the header is actually present on the deployed Netlify site (`curl -sI https://<site>/`), on HTML pages **and** on `/admin/*`. Netlify's Next.js runtime must apply `next.config` headers; if it does not, move the same policy into `netlify.toml [[headers]]`.
- [ ] Open DevTools console and visit every public page and every admin page; record each "[Report Only] Refused to…" message. Zero unexplained violations required.
- [ ] Verify specifically: home hero and slider images; flight search and results; package detail with images; creator reel modal (YouTube, Instagram, MP4); enquiry modal; admin banners and theme previews (arbitrary https image URLs); admin support-map iframe.
- [ ] If `NEXT_PUBLIC_GTM_ID` is set: confirm GTM loads and note every extra origin it needs (the allow-list for GTM/GA is a guess until observed). Add only origins that are observed and needed.
- [ ] Confirm API calls to Render pass `connect-src` (the Render origin is derived from `NEXT_PUBLIC_API_BASE_URL`).
- [ ] After a clean report-only soak (suggest ≥ 1 week of normal use or a full manual pass), rebuild with `CSP_MODE=enforce`, repeat the full pass, then keep it enforced.
- [ ] Decide whether to tighten later: nonce-based `script-src` (requires dynamic rendering) to remove `'unsafe-inline'`.
- [ ] Consider HSTS (Netlify sends it on its own domains; confirm for the custom domain) and `upgrade-insecure-requests`, which is deliberately not in the policy yet.
- Note: there is deliberately **no** report-collection endpoint. Violations are seen in the browser console. Add one only with auth, rate limits and size caps.

## 2. Login, logout, session reload, CSRF
- [ ] Admin login on staging succeeds; the `tripime_admin_session` cookie is `HttpOnly; Secure; SameSite=<chosen>`; `document.cookie` shows nothing; localStorage holds no admin token.
- [ ] Reload `/admin/bookings` → stays signed in (session endpoint returns the CSRF token).
- [ ] An admin write from the UI (e.g. enquiry status change) succeeds; the same request replayed without `X-CSRF-Token` returns 403.
- [ ] Logout clears the cookie; `/admin/*` redirects to login; API returns 401.
- [ ] Session expiry: with a short `ADMIN_TOKEN_TTL_HOURS` on staging, an expired session redirects to login cleanly.
- [ ] Customer sign-in (real email delivery configured) works, the fixed dev code does **not** (it must be off), and a booking request can be submitted.

## 3. CORS and cross-site cookies over HTTPS
- [ ] Browser requests from the staging Netlify origin succeed with credentials; from any other origin they are rejected.
- [ ] `CORS_ORIGIN_REGEX` default allows any `*.netlify.app`: tighten or remove it for production and confirm only the real origins work.
- [ ] In Safari and Firefox (stricter third-party cookie rules) the admin and customer sessions still work, or the custom-domain/same-site setup is adopted.
- [ ] Cookies are not sent to unrelated paths (`/api/admin` for admin, `/api` for customers).

## 4. `TRUSTED_PROXY_HOPS` and forwarded-header spoofing
- [ ] On Render, inspect what `X-Forwarded-For` really looks like for a request (temporary debug in a throwaway branch, never logging credentials) and set `TRUSTED_PROXY_HOPS` to the real hop count (default on Render is 1). If Netlify proxies `/api` to Render, count that hop too.
- [ ] Send login failures with a forged `X-Forwarded-For: 1.2.3.4` prefix: they must still be counted against the true client IP, not the forged value.
- [ ] Confirm the recorded client IP is the real caller, not the proxy's (otherwise all users share one limit).

## 5. Admin lockouts and recovery
- [ ] Five wrong passwords from one IP → 6th attempt returns 429 with `Retry-After`; the correct password is also refused during the lock.
- [ ] After the lock expires, correct login succeeds; repeat failures show a longer second lock (60 s → 120 s …, capped at 15 min).
- [ ] A successful login resets the counters.
- [ ] A second device on a different IP can still sign in while the first is locked (IP locks only), until the per-username limit (20) is hit.
- [ ] Restart the Render instance during a lock: counters reset unless `REDIS_URL` is set. Decide whether Redis is required before launch.
- [ ] Verify no passwords, tokens or secrets appear in Render logs after all of the above.

## Sign-off
Record environment, commit SHA, date and tester for each section. Do not mark `PRODUCTION_READINESS.md` items complete until the matching section here is fully checked.

## Prerequisite findings (repo inspection, 2026-10-17 — no deployment was touched)

| Item | Status |
|---|---|
| Actual Netlify URL / Render API origin | **Unknown.** Not recorded in the repo (only placeholders such as `YOUR-SITE.netlify.app`; `frontend/.env.example` mentions `tripime-new.onrender.com` as an example). A single unauthenticated GET to that example host returned HTTP 503, so it is not confirmed to be live. Owner must supply both URLs. |
| Does Netlify serve the `next.config.ts` headers? | **Unverified.** Needs `curl -sI` against the deployed site (section 1). Fallback: `[[headers]]` in `netlify.toml`. |
| Netlify Node version | `frontend/netlify.toml` pins `NODE_VERSION = "20"` (npm 10). `package-lock.json` was generated by npm 11, and **npm 10 rejects it** (`Missing: @emnapi/runtime, @emnapi/core from lock file`, reproduced locally and seen in the first CI run). A Netlify build using `npm ci` on Node 20 is likely to fail the same way. Resolve before staging by raising `NODE_VERSION` (to 24) or regenerating the lockfile with npm 10 — a Netlify/config change that has **not** been made. |
| `CORS_ORIGINS` | Must be the exact Netlify (or custom-domain) origin; default regex also allows any `*.netlify.app`. |
| Cookie mode | `COOKIE_SAMESITE=none` + HTTPS if the browser calls Render directly from a different site; otherwise same-site custom domain. Decide with the real URLs. |
| `TRUSTED_PROXY_HOPS` | Default 1 on Render. **Must be measured** on the real request path (browser → Render direct, or via a Netlify proxy). Not guessed. |
| Staging secrets | `ADMIN_USERNAME`, `ADMIN_PASSWORD` (12+ chars), `ADMIN_JWT_SECRET` and `CUSTOMER_JWT_SECRET` (32+ chars, different), `APP_ENV=production` (or Render's `RENDER`). `render.yaml` generates the two JWT secrets; `ADMIN_PASSWORD`/`ADMIN_USERNAME`/`CORS_ORIGINS` are entered by hand. SMTP for real sign-in codes. Optional `REDIS_URL`. |
| CSP mode | Stays **Report-Only** (`CSP_MODE` unset) until section 1 passes. |
