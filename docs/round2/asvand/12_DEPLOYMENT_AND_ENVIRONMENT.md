# ASSET BRIDGE — DEPLOYMENT & ENVIRONMENT SPECIFICATION
**Document ID:** `DOC-ASVAND-12`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Focus:** Infrastructure Setup, Multi-Environment Configuration & Deployment Diagnostics  

---

## 1. LOCAL DEVELOPMENT RUNBOOK

### Prerequisites
- **Node.js:** Version 20.0.0+ (Local system verified: `v25.9.0`, npm `11.12.1`).
- **Python:** Version 3.11+ (Local system verified: `Python 3.14.6` at `C:\Users\ASVAND\AppData\Local\Python\bin\python.exe`).

### Step-by-Step Local Startup Instructions

```bash
# ----------------------------------------------------------------------
# STEP 1: Unified FastAPI Backend (:8000)
# ----------------------------------------------------------------------
cd fastapi-backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install fastapi uvicorn pydantic httpx
uvicorn app.main:app --port 8000 --reload

# ----------------------------------------------------------------------
# STEP 2: React 19 Frontend Client (:5173) [In a separate terminal]
# ----------------------------------------------------------------------
cd client
npm install
npm run dev

# ----------------------------------------------------------------------
# STEP 3: Browser Verification
# ----------------------------------------------------------------------
# Open: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

---

## 2. PORT MAPPING & SERVICE TOPOLOGY

| Service Name | Technology | Default Port | Internal Proxy Mapping | Purpose |
|---|---|---|---|---|
| **Client Frontend** | React 19 + Vite 8 | `5173` | Proxies `/api` & `/ws` to `:8000` | User Interface, PWA, Claim Packet Generator |
| **Unified Backend** | Python FastAPI | `8000` | Exposes REST & `/ws` | Auth, Identity, Aggregation, LifeSim, Succession, RAG |

---

## 3. ENVIRONMENT VARIABLES SPECIFICATION

Create `.env` in the project root and in `client/` based on `.env.example`:

### Root / Backend `.env`:
```ini
# Server Port & Binding
PORT=8000

# Authentication & Session Security (Replace with random 32-byte hex in production)
AUTH_SECRET=development_hmac_secret_key_32_bytes_min

# Client Origin Whitelist for CORS
CLIENT_ORIGIN=http://localhost:5173,https://asset-bridge-gamma.vercel.app

# Optional AI LLM Keys (Extractive fallback operates automatically if omitted)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

### Client `.env`:
```ini
# Target API URL (Leave blank to use Vite development proxy on :5173)
VITE_API_URL=http://localhost:8000
```

---

## 4. DEPLOYMENT ARCHITECTURE & CONFIGURATION

### A. Vercel / Netlify (Frontend SPA)
- **Root Directory:** `client`
- **Build Command:** `tsc -b && vite build`
- **Output Directory:** `dist`
- **SPA Rewrite Rule (`vercel.json` / `netlify.toml`):**
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### B. Render / Railway (Backend API)
- Defined in `render.yaml`:
  ```yaml
  services:
    - type: web
      name: asset-bridge-api
      env: python
      buildCommand: pip install -r requirements.txt
      startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

---

## 5. PRODUCTION READINESS GAPS & BLOCKERS

1. **Uninstalled Workspace Dependencies:** Neither `client/node_modules` nor `fastapi-backend/.venv` are currently installed in the active folder. Installing them is the immediate prerequisite to building and testing.
2. **Missing Ported Modules (FastAPI):** As established in `DOC-SYNC-00`, routes for Aggregation, LifeSim, Cases, and AI Guide must be ported to `fastapi-backend` so production builds on Render or Vercel succeed without runtime 404 errors.
