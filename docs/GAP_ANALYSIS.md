# Tripime — Gap Analysis (current state vs. production)

Legend: ✅ ready · ⚠️ partial · ❌ missing

| # | Area | State | Gap |
|---|---|---|---|
| 1 | **Flight supply** | ❌ | Inventory is generated, not real. Needs a GDS/aggregator (Amadeus, Travelport, TBO, etc.) or an explicit "indicative fares, agent confirms" positioning |
| 2 | **Payments** | ❌ | No gateway. Need Razorpay/Cashfree via existing `payment_base.py`, webhook signature verification, idempotency, refunds |
| 3 | **Database** | ❌ | JSON files. Need Postgres (or similar), migrations, backups, transactional state transitions |
| 4 | **Admin security** | ❌ | Shared default creds, localStorage token, no throttling, no per-admin accounts, no admin audit log, no 2FA |
| 5 | **Customer auth** | ⚠️ | Works; needs real SMTP, separate JWT secret from admin, persistent rate-limit/OTP store, session revocation |
| 6 | **Secrets/config** | ⚠️ | Insecure fallbacks should fail startup in production; secrets inventory and rotation plan |
| 7 | **Notifications** | ⚠️ | Nothing configured. Need real SMTP/transactional provider, WhatsApp Cloud API with approved templates, retry queue |
| 8 | **Compliance (India)** | ❌ | GST invoice details, data-privacy consent/retention for passport & ID data, TCS/refund policy alignment, cancellation/refund workflow |
| 9 | **Observability** | ❌ | No structured logging, error tracking (Sentry), uptime checks, alerting |
| 10 | **Testing/CI** | ⚠️ | 19 backend tests; no frontend unit/e2e tests; no CI pipeline |
| 11 | **Deployment** | ⚠️ | `render.yaml` + `netlify.toml` exist; never validated end to end (CORS, cookies, env, build) |
| 12 | **Performance** | ⚠️ | JSON read-per-request is fine at low scale; Lighthouse/CWV not measured |
| 13 | **SEO/analytics** | ❌ | No sitemap/robots/structured data/analytics/consent banner confirmed |
| 14 | **Docs** | ⚠️ | READMEs outdated; no runbook |
| 15 | **Content/legal** | ⚠️ | Legal pages not lawyer-reviewed; UPI ID is a test value; contact numbers need confirmation (two different WhatsApp numbers appeared during the project) |

## Highest-impact gaps

1. No way to take real money (2) and no real supply (1) — the product is an enquiry/request tool today.
2. Data durability and security (3, 4, 6) — blocks any real customer data.
3. Delivery of notifications (7) — admins won't learn about new requests.
