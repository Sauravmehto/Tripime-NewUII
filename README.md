# Tripime monorepo — Next.js frontend + FastAPI backend

```text
├── frontend/     Next.js 16 → Netlify
└── backend/      FastAPI     → Render
```

## Local development

**Backend** (`http://127.0.0.1:8002`):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8002 --host 127.0.0.1
```

**Frontend** (`http://localhost:3000`):

```powershell
cd frontend
npm install
# Keep NEXT_PUBLIC_API_BASE_URL empty in .env.local
npm run dev
```

## Deploy checklist

### 1. Render (backend)

| Setting | Value |
|--------|--------|
| Root Directory | `backend` |
| Build | `python scripts/render_build.py` (or `pip install -r requirements.txt`) |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health | `/api/health` |

**Environment variables:**

| Key | Example |
|-----|---------|
| `PYTHON_VERSION` | `3.11.9` |
| `ADMIN_USERNAME` | your admin user |
| `ADMIN_PASSWORD` | strong password |
| `ADMIN_JWT_SECRET` | long random string (or Generate) |
| `CORS_ORIGINS` | `https://YOUR-SITE.netlify.app` |

After deploy, note the URL (e.g. `https://tripime-new.onrender.com`).

### 2. Netlify (frontend)

| Setting | Value |
|--------|--------|
| Base directory | `frontend` |
| Build command | `npm run build` (from `netlify.toml`) |
| Plugin | `@netlify/plugin-nextjs` |

**Environment variable (required — baked in at build time):**

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://tripime-new.onrender.com` (no trailing slash) |

Then trigger a new deploy. Change the API URL later → clear cache & rebuild.

### 3. Connect the two

1. Deploy API on Render first.
2. Set `NEXT_PUBLIC_API_BASE_URL` on Netlify to that Render URL.
3. Set `CORS_ORIGINS` on Render to your Netlify URL.
4. Open the Netlify site → packages / flights / `/admin/login` should hit Render.

## Admin

- Local: http://localhost:3000/admin/login  
- Prod: `https://YOUR-SITE.netlify.app/admin/login`  
- Creds = Render `ADMIN_USERNAME` / `ADMIN_PASSWORD`

See `backend/RENDER_ENV.txt` and `backend/SECURITY_CHECKLIST.md`.
