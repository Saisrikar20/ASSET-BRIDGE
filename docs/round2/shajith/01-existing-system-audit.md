# Asset Bridge – Existing System Audit (Round 2)
**Author:** Shajith (Architecture & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Executive Summary & Audit Context

Asset Bridge is a financial twin and automated estate reunification platform engineered for the Indian regulatory landscape. Over ₹94,000+ crore of unclaimed family funds currently sit idle across banks (RBI), employee provident funds (EPFO), life insurance policies (IRDAI), mutual funds/securities (SEBI), and national pension/small savings (PFRDA/India Post). When an asset holder passes away, no national mechanism automatically links death events to asset discovery across these fragmented bureaucracies.

This audit establishes the baseline architectural state, code inventory, and migration progress for **Round 2 of Dexathon 2026**, verifying the transition from the Round 1 hybrid prototype (Node.js Express + Python microservice) toward a unified Python FastAPI backend.

---

## 2. Codebase Inventory & Technology Stack

| Layer | Round 1 Prototype | Current Round 2 State (Inspected Code) | Status |
|---|---|---|---|
| **Frontend Web App** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons | Same React frontend; `/client` clean build, proxies to backend | **Existing** |
| **Legacy Server** | Node.js v20+, Express 5, WebSocket (`ws`), JSON File Store | Pruned in PR #1 (`1d81590` / `55afe26`); legacy routes documented | **Being migrated** |
| **New Unified Backend** | Split microservice (`ai-service` on `:8001` + Node on `:4000`) | `fastapi-backend/` (FastAPI, Pydantic, Starlette WebSockets) | **Being migrated** (Module 1 Merged) |
| **Data Persistence** | `server/data/db.json` file store adapter | `fastapi-backend/app/module1_core/store.py` (In-memory + JSON sync) | **Being migrated** (Supabase planned) |
| **AI / RAG Service** | Python FastAPI (`ai-service/main.py`), 8 Markdown knowledge files | Knowledge files moved to `fastapi-backend/knowledge/`; RAG pipeline in transition | **Being migrated** |
| **Testing Harness** | Ad-hoc manual verification script | `fastapi-backend/test_module1.py` automated test runner | **Existing** (7/7 passing) |
| **Deployment Configuration** | `render.yaml` & `netlify.toml` configured for dual Node/Python services | Stale configs pointing to deleted `server/` and `ai-service/` paths | **Planned** (needs update) |

---

## 3. Node-to-Python Migration Audit: Reality vs. Specification

A primary finding of this audit is verifying the **actual state** of the backend migration versus project roadmaps.

> **Audit Finding:** The Node-to-Python migration is **IN PROGRESS (Partially Complete – Module 1 Only)**.
> - **Sai** has completed and merged **Module 1 Core** (PR #1: `1d81590` / `55afe26`).
> - Legacy Node.js `server/` and `client/src/local/` (browser fallback) were completely deleted in PR #1.
> - **Modules 2 and 3** (Holdings, Alerts, Consents, Case Management, Life Simulation Monte Carlo, Forecasts, and AI RAG) are not yet implemented in Python.

### Migration Status Breakdown by Subsystem

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND MIGRATION STATUS                        │
├────────────────────────────────┬─────────────────┬─────────────────────┤
│ Subsystem / Endpoint Group     │ Implemented In  │ Migration Status    │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ App Config, CORS & Lifespan    │ FastAPI         │ [Implemented]       │
│ Authentication & JWT           │ FastAPI         │ [Implemented]       │
│ Identity & PAN Verification    │ FastAPI         │ [Implemented]       │
│ WebSocket Live Event Manager   │ FastAPI         │ [Implemented]       │
│ Showcase & Meta Catalog        │ FastAPI         │ [Implemented]       │
│ Holdings & Account Aggregation │ Legacy Node     │ [Being Migrated]    │
│ Nominee Gap Alerts Engine      │ Legacy Node     │ [Being Migrated]    │
│ Consent Management             │ Legacy Node     │ [Being Migrated]    │
│ Estate Cases & Succession      │ Legacy Node     │ [Being Migrated]    │
│ Life Plan (Monte Carlo)        │ Legacy Node     │ [Being Migrated]    │
│ Forecast Engine & Options      │ Legacy Node     │ [Being Migrated]    │
│ AI Succession RAG Guide        │ Legacy Py-app   │ [Being Migrated]    │
│ Dual Supabase/Postgres Store   │ .planning spec  │ [Planned]           │
│ CAS Statement Upload Parser    │ .planning spec  │ [Planned]           │
└────────────────────────────────┴─────────────────┴─────────────────────┘
```

---

## 4. Deep-Dive Subsystem Audit

### 4.1 Frontend Architecture (`/client`)
- **Framework:** React 19 + TypeScript + Vite 8.
- **Styling:** Tailwind CSS v4 using modern theme token remapping in `client/src/index.css`.
- **Navigation Flow:**
  - `01 Verify`: Inputs PAN, DOB, state, Aadhaar last-4, and verifies records against 7 regulators.
  - `02 Aggregate`: Consent artifact generation simulating an RBI Account Aggregator flow.
  - `03 Alert`: Real-time WebSocket feed displaying missing nominee, deceased nominee, and minor nominee gaps.
  - `04 Reunite`: Triggers death event simulation via Civil Registration System (CRS) matching by PAN.
  - `05 Transfer`: Generates state-specific legal heir checklists (e.g., Tahsildar succession certificate in Tamil Nadu).
  - `Life Plan` & `Forecast`: Monte Carlo fan chart, detent dials, cash flow Sankey, and Indian income tax slabs.
- **Frontend Issues Identified:**
  - `client/vite.config.ts` still proxies `/api` and `/ws` to `http://localhost:4000` (Node default). As FastAPI is spun up on `:8000` or `:8001`, the proxy must be re-targeted.
  - Client in-browser fallback (`client/src/local/`) was purged in PR #1; the frontend now strictly depends on a live backend server.

### 4.2 FastAPI Backend Architecture (`/fastapi-backend`)
- **Module 1 Core (`app/module1_core/`):**
  - `auth.py`: Token generation (`sign_token`), verification (`verify_token`), and password security (`hash_password` using SHA-256 with salt).
  - `identity.py`: Contains catalog data (`REGULATORS`, `STATES`, `STATE_HEIR_DOC`, `DEMO_IDENTITY`, `NATIONAL_STATS`). Validates PAN with standard pattern `^[A-Z]{5}[0-9]{4}[A-Z]$`. Simulates deterministic lookups for `ABCPI1234K` and returns partial matches ("R. Raghavan" on Canara Bank).
  - `routers.py`: Exposes `/api/meta`, `/api/showcase`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/demo`, `/api/me`, `/api/me/avatar`, `/api/demo/reset`, and `/api/identity`.
  - `live.py`: Maintains `ConnectionManager` for tracking active client WebSocket connections keyed by user ID.
  - `store.py`: Thread-safe dictionary store synchronizing data mutations to a local JSON disk target.

### 4.3 AI / RAG Knowledge Base (`/fastapi-backend/knowledge/`)
8 structured domain manuals cover succession laws, statutory forms, and claim procedures across Indian authorities:
1. `bank-deposits.md`: RBI guidelines, inoperative accounts, deceased depositor claim forms, DEA Fund transfers.
2. `death-certificate.md`: Civil Registration System (CRS) procedures, state-level registrar portals.
3. `epf.md`: EPFO composite claim form, Form 20 (Provident Fund), Form 10D (Pension), Form 5(IF) (EDLI insurance).
4. `heir-certificates.md`: Succession certificate under Indian Succession Act 1925 vs. Tahsildar Legal Heir Certificate.
5. `insurance.md`: IRDAI claim settlement rules, Claim Form A, early vs. non-early death claims.
6. `nps-small-savings.md`: PFRDA exit regulations, India Post deceased claim procedures.
7. `planning.md`: Will drafting, asset register maintenance, family documentation checkups.
8. `securities.md`: SEBI centralized transmission mechanism, ISR forms, demat nominee claiming.

---

## 5. Security & Risk Findings

1. **Unsalted/Simple SHA-256 Hashing:** `app/module1_core/auth.py` hashes passwords with `hashlib.sha256(password.encode()).hexdigest()`. While functional for a hackathon demo, production systems require Argon2id or bcrypt with adaptive work factors.
2. **Plaintext JSON Storage:** User accounts, tokens, and financial mock records are held in plaintext JSON files (`data/db.json`). Missing at-rest encryption (AES-GCM-256) violates DPDP Act 2023 compliance for sensitive financial data.
3. **CORS Wildcard Policy:** `app/main.py` applies `allow_origins=["*"]`. Must be restricted to explicit frontend origins before deployment.
4. **Stale Deployment Declarations:** `render.yaml` declares a Node service build (`cd server && npm install`); triggering a Render build currently fails immediately.

---

## 6. Audit Conclusion & Recommendations

The repository shows excellent engineering ambition and domain depth. With Module 1 stable, the team must prioritize:
1. Maintaining Git branch discipline to avoid collision with Sai's backend modules and Asvand's UI updates.
2. Aligning `vite.config.ts` backend proxy ports to prevent frontend connection timeouts.
3. Rapidly porting Holdings, Alerts, and Case routers into FastAPI Module 2 to re-enable full end-to-end functionality.
