# ASSET BRIDGE — PRODUCT AND SYSTEM AUDIT
**Document ID:** `DOC-ASVAND-01`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Scope:** Complete Codebase and Feature Audit across Frontend, Backend, and AI Subsystems  

---

## 1. COMPONENT & PAGE INVENTORY AUDIT

Inspecting `client/src/pages/` and `client/src/components/`:

| Page / Route | File Path | Current Status | Data Source | Primary Dependencies | Evaluation & Findings |
|---|---|---|---|---|---|
| **Landing Page** (`/`) | `client/src/pages/Landing.tsx` | **Working** | `GET /api/showcase` | Aceternity `LampHero`, `Coverflow`, `LiveShowcase`, Kokonut `DetentDial` | Excellent visual fidelity. Uses live stats from `/api/showcase`. Communicates the ₹94,000+ Cr problem immediately. |
| **Authentication** (`/login`, `/signup`) | `client/src/pages/Auth.tsx` | **Working** | `POST /api/auth/*` | `client/src/lib/auth.tsx` | Functional signup, password login, and 1-click Demo Persona launcher (`demo@assetbridge.in`). Uses scrypt password hashing. |
| **Step 01: Verify** (`/app/verify`) | `client/src/pages/Verify.tsx` | **Working** | `POST /api/identity` | `app/module1_core/identity.py` | Allows input of Name, PAN, DOB, State. Matches against 7 regulatory registries. Flags exact, partial, or mismatch. |
| **Step 02: Aggregate** (`/app/aggregate`) | `client/src/pages/Aggregate.tsx` | **Broken (PR #1)** | `POST /api/consents` | `client/src/lib/api.ts` | ReBIT-compliant consent screen. Displays 7 regulators. Fails with 404 because `/api/consents` is not yet ported to FastAPI. |
| **Step 03: Alerts** (`/app/alerts`) | `client/src/pages/Alerts.tsx` | **Broken (PR #1)** | `GET /api/alerts`, `PATCH /api/holdings/:id/nominee` | `client/src/lib/live.tsx` | Lists nominee gaps, inoperative accounts, stale KYC. Fails with 404 pending backend port. |
| **Dashboard** (`/app`) | `client/src/pages/Dashboard.tsx` | **Broken (PR #1)** | `GET /api/holdings`, `GET /api/alerts` | `client/src/components/ui.tsx` | Central wealth workspace showing total assets, amount at risk, regulator breakdown, and live alert ticker. Blocked on `/api/holdings`. |
| **Life Plan** (`/app/plan`) | `client/src/pages/LifePlan.tsx` | **Broken (PR #1)** | `GET/PUT /api/life`, `POST /api/life/simulate` | `LifeTimeline.tsx`, `LifeCharts.tsx` | High mathematical depth. Concentric life dial, Sankey diagram, 1000-run Monte Carlo, FY25-26 Indian tax slabs. Blocked on `/api/life`. |
| **Forecast** (`/app/forecast`) | `client/src/pages/Forecast.tsx` | **Broken (PR #1)** | `POST /api/forecast`, `GET /api/analysis` | `ForecastChart.tsx` | Multi-asset projection, SIP step-up calculator, inflation indexation. Blocked on `/api/forecast`. |
| **Invest Catalog** (`/app/invest`) | `client/src/pages/Invest.tsx` | **Broken (PR #1)** | `GET /api/options`, `PUT /api/plan` | `client/src/components/ui.tsx` | Catalogs 19 Indian savings/investment vehicles (PPF, NPS, SGB, ELSS, FDs). Blocked on `/api/options`. |
| **Avatar Picker** (`/app/avatar`) | `client/src/pages/Avatar.tsx` | **Working** | `PUT /api/me/avatar` | Kokonut `AvatarPicker` | Allows user profile customization with deterministic avatar seeds. Fully ported in Module 1. |
| **Heir Manager** (`/app/heirs`) | `client/src/pages/Heirs.tsx` | **Broken (PR #1)** | `GET/POST /api/heirs` | `client/src/components/ui.tsx` | Registers legal heirs, PANs, relationship, and allocation percentage. Blocked on `/api/heirs`. |
| **Step 04: Reunite** (`/app/reunite`) | `client/src/pages/Reunite.tsx` | **Broken (PR #1)** | `POST /api/crs/death` | `client/src/components/ui.tsx` | Simulates death registration trigger from CRS. Opens an automated estate recovery case. Blocked on `/api/crs/death`. |
| **Cases List** (`/app/cases`) | `client/src/pages/Cases.tsx` | **Broken (PR #1)** | `GET /api/cases` | `client/src/components/ui.tsx` | Displays estate succession cases. Blocked on `/api/cases`. |
| **Case Detail** (`/app/cases/:id`) | `client/src/pages/CaseView.tsx` | **Broken (PR #1)** | `GET /api/cases/:id`, `PATCH /tasks/:id` | `CaseBody.tsx`, `GuideChat.tsx` | Interactive statutory checklist tailored by state jurisdiction. Blocked on `/api/cases/:id`. |
| **Public Heir Portal** (`/heir`) | `client/src/pages/HeirPortal.tsx` | **Broken (PR #1)** | `GET /api/cases/:id` via `x-heir-pan` | `CaseBody.tsx` | Publicly accessible portal for bereaved heirs to track claims using their PAN. Blocked on `/api/cases/:id`. |
| **AI Guide** (`/app/guide`) | `client/src/pages/Guide.tsx` | **Broken (PR #1)** | `POST /api/assistant` | `GuideChat.tsx` | Standalone natural-language query interface over Indian succession law. Blocked on `/api/assistant`. |

---

## 2. FUNCTIONALITY STATUS MATRIX

Strict classification across the required evaluation statuses:

### A. IMPLEMENTED & VERIFIED IN CODE
1. **Password Authentication & Session Management:** `app/module1_core/auth.py` implements salted scrypt hashing, timing-safe HMAC-SHA256 signatures, and FastAPI OAuth2 Bearer token dependencies.
2. **PAN & Identity Verification:** `app/module1_core/identity.py` verifies PAN format via regex and executes multi-tier fuzzy matching (`name_match()`) checking exact match, token sets, and first-initial matches.
3. **Deterministic Multi-Regulator Synthetic Engine:** `app/module1_core/identity.py` generates consistent portfolios for any valid PAN using FNV-1a seeded pseudo-random generation across 7 institutions.
4. **WebSocket Push Infrastructure:** `app/module1_core/live.py` implements an active connection manager pushing duplex messages to connected user sessions.

### B. MOCKED / SIMULATED FUNCTIONALITY
1. **Regulator Registry Ingestion:** External registry records are deterministically generated by PRNG in `identity.py`. No live RBI/EPFO/SEBI API integrations exist.
2. **Account Aggregator Consent Gateway:** Ingestion simulates an RBI-regulated NBFC-AA consent artefact; it does not connect to the live Sahamati gateway.
3. **Civil Registration System (CRS):** Death registration ingestion is triggered via simulated REST calls (`POST /api/crs/death`); real CRS has no public open API.

### C. INCOMPLETE OR BROKEN WORKFLOWS
1. **Temporary Backend Route Severance (PR #1):** As discovered in `DOC-SYNC-00`, backend lead Sai migrated Module 1 to FastAPI and removed the Node server before porting Modules 2–5. As a result, routes `/consents`, `/holdings`, `/alerts`, `/plan`, `/cases`, etc., return 404 until ported.
2. **Missing Document Pipeline:** The original concept promised document validation and claim packet generation. Currently, `CaseBody.tsx` renders static checklist tags (`t.docs`). There is **no file upload dropzone, no MIME validation, no SHA-256 duplicate hashing, and no PDF claim dossier export**.

### D. REDUNDANT OR DISTRACTING FEATURES
1. **Avatar Customization Page (`/app/avatar`):** While visually polished (using Kokonut UI), it adds zero fintech value to an industrial mentor evaluation and can be relegated to a background setting.
2. **Excessive Life Planning Levers:** `LifePlan.tsx` exposes dozens of granular inputs (SWR, surplus equity allocation, multi-child wedding milestones) that overwhelm non-technical evaluators.

---

## 3. USER JOURNEY EVALUATION: CURRENT VS. TARGET

### Current User Journey (Fragmented & Complex)
```
Landing ──► Login/Demo ──► Verify (PAN) ──► Consent ──► Holdings Table
──► Alerts List ──► Forecast Chart ──► Life Timeline Dial ──► Heirs Form
──► CRS Trigger Simulation ──► Case Checklist ──► AI Chat
```
*Critique:* The current journey has 12 separate navigation pages in the sidebar. For elderly users or grieving families, this cognitive load is counterproductive.

### Proposed Target User Journey for Round 2 (Consolidated & Streamlined)
```
Step 1: PAN & Identity Input 
  ▼
Step 2: 1-Click Consent & Ingestion (Synthetic + CAS Statement Upload)
  ▼
Step 3: Automated Normalization & Duplicate Detection (Internal)
  ▼
Step 4: Consolidated Asset Health & Nominee Risk Report
  ▼
Step 5: Estate Resolution / Guided Next Steps (Document Upload & Claim Packet PDF)
```

---

## 4. ACTIONABLE RECOMMENDATIONS FOR ASVAND (FRONTEND LEAD)

1. **Retain & Consolidate:** Keep the Landing Page (`Landing.tsx`), Verify (`Verify.tsx`), Consolidated Dashboard (`Dashboard.tsx`), Case Execution (`CaseView.tsx`), and Heir Portal (`HeirPortal.tsx`).
2. **Simplify & Group:** Merge `/app/aggregate` and `/app/alerts` directly into the Consolidated Dashboard so the user sees asset aggregation and risk analysis in one unified view.
3. **Build the Missing Core:** Implement the file upload dropzone in `CaseBody.tsx`, validate documents client-side, and add a single **"Generate Pre-Filled Claim Dossier"** button that exports an official PDF claim packet.
4. **Coordinate with Sai:** Ensure Sai ports the missing endpoints from `server/src/routes/api.js` (commit `6142819`) to `fastapi-backend/app/module2_...` immediately.
