# Tripime Mock Flight API

FastAPI backend backed by local JSON inventory.

```bash
py -3.11 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

Regenerate inventory:

```bash
python scripts/generate_flights.py
```

## Deploy on Render

See the root [README.md](../README.md#deploy-github--render--netlify). Blueprint: [`../render.yaml`](../render.yaml).

Required env: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `CORS_ORIGINS` (your Netlify URL). Optional: `SMTP_*` for confirmation emails.

## Before going live

Read [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md) — it covers the admin auth
model, insecure dev defaults you must override, and hardening steps to do before
real users touch this backend.
