# ASSET BRIDGE — ROUND 2 IMPLEMENTATION ROADMAP
**Document ID:** `DOC-ASVAND-13`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Focus:** Comprehensive Task Breakdown, Estimates & Team Execution Plan  

---

## GROUP A: MUST FIX (BLOCKERS & PREREQUISITES)

### Task ID: `DEP-01`
- **Task Name:** Install and verify local workspace dependencies.
- **Problem:** `tsc` and `fastapi` are missing; neither client builds nor tests can execute.
- **Desired Result:** Clean `npm install` in `client/` and `.venv` setup in `fastapi-backend/`.
- **Files Involved:** `client/package.json`, `fastapi-backend/requirements.txt`.
- **Dependencies:** None.
- **Responsible:** Asvand (Client) & Sai (Backend).
- **Complexity:** 1/10 | **Priority:** **Critical (Blocker)**
- **Acceptance Criteria:** `cd client && npm run build` compiles with zero errors; backend tests run.
- **Status:** **Planned**

---

### Task ID: `API-01`
- **Task Name:** Port Module 2 (Aggregation, Holdings & Alerts) to FastAPI.
- **Problem:** Routes `/api/consents`, `/api/holdings`, `/api/alerts` return 404 in FastAPI.
- **Desired Result:** Active endpoints in `fastapi-backend/app/module2_aggregation/routers.py`.
- **Files Involved:** `fastapi-backend/app/module2_aggregation/`, legacy `server/src/routes/api.js`.
- **Dependencies:** `DEP-01`.
- **Responsible:** Sai (Backend).
- **Complexity:** 5/10 | **Priority:** **Critical (Blocker)**
- **Acceptance Criteria:** Client `/app/aggregate` and `/app/alerts` fetch and update state.
- **Status:** **Planned**

---

### Task ID: `API-02`
- **Task Name:** Port Module 4 (Succession Engine, Cases & CRS) to FastAPI.
- **Problem:** Routes `/api/crs/death`, `/api/cases`, `/api/cases/:id` return 404 in FastAPI.
- **Desired Result:** Active succession endpoints in `fastapi-backend/app/module4_succession/routers.py`.
- **Files Involved:** `fastapi-backend/app/module4_succession/`, legacy `server/src/data/succession.js`.
- **Dependencies:** `API-01`.
- **Responsible:** Sai (Backend).
- **Complexity:** 5/10 | **Priority:** **Critical (Blocker)**
- **Acceptance Criteria:** Simulating death creates case `AB-XXXX##`; `/heir/:id` loads correctly.
- **Status:** **Planned**

---

### Task ID: `FE-01`
- **Task Name:** Build Document Upload & Validation Dropzone in `CaseBody.tsx`.
- **Problem:** Case tasks are passive checkboxes without file upload or validation.
- **Desired Result:** Drag-and-drop file upload with client-side MIME check, 5MB limit, and SHA-256 duplicate hashing.
- **Files Involved:** `client/src/components/CaseBody.tsx`, `client/src/components/ui.tsx`.
- **Dependencies:** `DEP-01`.
- **Responsible:** Asvand (Frontend).
- **Complexity:** 4/10 | **Priority:** **Critical (Must Do)**
- **Acceptance Criteria:** PDF/image uploads show verified badges; duplicate files flag warnings.
- **Status:** **Planned**

---

### Task ID: `FE-02`
- **Task Name:** Build Client-Side Pre-Filled Claim Dossier PDF Generator.
- **Problem:** No exportable claim packet; families still lack completed forms.
- **Desired Result:** One-click "Generate Claim Dossier" button compiling pre-filled Form 20, Form A, and asset inventories.
- **Files Involved:** `client/src/components/CaseBody.tsx`, new `client/src/lib/pdf.ts`.
- **Dependencies:** `FE-01`.
- **Responsible:** Asvand (Frontend).
- **Complexity:** 5/10 | **Priority:** **Critical (Must Do)**
- **Acceptance Criteria:** Downloaded PDF contains all 16 holdings, deceased PAN, and heir declarations.
- **Status:** **Planned**

---

## GROUP B: IMPORTANT IMPROVEMENTS

### Task ID: `FE-03`
- **Task Name:** Sidebar Navigation Streamlining & Grouping.
- **Problem:** 12 flat sidebar links overwhelm users and evaluators.
- **Desired Result:** Consolidated navigation into 5 core operational areas.
- **Files Involved:** `client/src/components/Layout.tsx`, `client/src/App.tsx`.
- **Dependencies:** None.
- **Responsible:** Asvand (Frontend).
- **Complexity:** 2/10 | **Priority:** **High Impact**
- **Status:** **Planned**

---

### Task ID: `API-03`
- **Task Name:** Port Module 3 (LifeSim & Tax Engine) to FastAPI.
- **Problem:** `/api/life` and `/api/life/simulate` return 404 in FastAPI.
- **Desired Result:** 1,000-run Monte Carlo and FY 2025-26 tax slabs running in Python.
- **Files Involved:** `fastapi-backend/app/module3_lifesim/`, legacy `lifesim.js`, `tax.js`.
- **Dependencies:** `API-01`.
- **Responsible:** Sai (Backend).
- **Complexity:** 6/10 | **Priority:** **High Impact**
- **Status:** **Planned**

---

### Task ID: `API-04`
- **Task Name:** Port Module 5 (BM25 Knowledge RAG & AI Guide) to FastAPI.
- **Problem:** `/api/assistant` returns 404 in FastAPI.
- **Desired Result:** Native RAG search over `fastapi-backend/knowledge/` with extractive fallback.
- **Files Involved:** `fastapi-backend/app/module5_ai/`, legacy `ai-service/main.py`.
- **Dependencies:** `API-01`.
- **Responsible:** Sai (Backend).
- **Complexity:** 4/10 | **Priority:** **High Impact**
- **Status:** **Planned**

---

### Task ID: `SEC-01`
- **Task Name:** Implement Transparent AES-256-GCM Field Encryption at Rest.
- **Problem:** Plaintext PANs and account balances in `db.json` violate DPDP Act.
- **Desired Result:** Sensitive fields encrypted before disk writes using AES-256-GCM.
- **Files Involved:** `fastapi-backend/app/module1_core/store.py`.
- **Dependencies:** `API-01`.
- **Responsible:** Sai (Backend).
- **Complexity:** 4/10 | **Priority:** **High Impact**
- **Status:** **Planned**

---

## GROUP C: TECHNICAL INNOVATION & POLISH

### Task ID: `PIPE-01`
- **Task Name:** CAMS / KFintech Consolidated Statement (CAS) Upload Parser.
- **Problem:** Discovery currently relies solely on synthetic PRNG generation.
- **Desired Result:** Ingestion endpoint `POST /api/upload/cas` parsing uploaded statements.
- **Files Involved:** `fastapi-backend/app/module2_aggregation/cas_parser.py`, `client/src/pages/Aggregate.tsx`.
- **Dependencies:** `API-01`.
- **Responsible:** Sai (Backend) & Asvand (Upload Dropzone).
- **Complexity:** 7/10 | **Priority:** **Medium**
- **Status:** **Planned**

---

### Task ID: `FE-04`
- **Task Name:** Document-to-Record Heuristic Discrepancy Matching UI.
- **Problem:** Minor name variations ('R. Raghavan' vs 'Raghavan') cause claim rejections.
- **Desired Result:** UI banner warning of name mismatch and recommending an Annexure Indemnity Bond.
- **Files Involved:** `client/src/components/CaseBody.tsx`.
- **Dependencies:** `FE-01`.
- **Responsible:** Asvand (Frontend).
- **Complexity:** 3/10 | **Priority:** **Medium**
- **Status:** **Planned**

---

## GROUP D: OPTIONAL & FUTURE WORK (DEFER FROM ROUND 2)

- `OPT-01`: Supabase PostgreSQL live database migration with Row-Level Security (Defer to Round 3).
- `OPT-02`: OCR Computer Vision model for Death Certificate image parsing (Defer to Round 3).
- `OPT-03`: Mobile PWA standalone service worker caching (Defer to Round 3).
- `OPT-04`: Live Sahamati Account Aggregator mTLS connection (Requires RBI License - Out of Scope).
