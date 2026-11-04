# Asset Bridge – Round 2 Master Technical Documentation
**Author:** Shajith (Architecture, Systems Analysis & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [asvandkanakaraj/ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Executive Summary & Project Overview

**Asset Bridge** is an intelligent financial twin and automated estate reunification platform built specifically for Indian families and institutions. Over ₹94,000+ crore of unclaimed household savings currently sit dormant across banks (RBI), employee provident funds (EPFO), life insurance policies (IRDAI), mutual funds/shares (SEBI), and national pension/small savings (PFRDA/India Post). When an asset holder passes away, no unified system connects death registrations to these fragmented accounts. Surviving families face a distressing, multi-month ordeal across multiple administrative bodies to claim what is rightfully theirs.

Asset Bridge solves this through a six-stage lifecycle:
1. **01 Verify:** Validates identity (PAN, DOB, state, Aadhaar last-4) against 7 financial regulators.
2. **02 Aggregate:** Simulates an RBI Account Aggregator consent handshake to map all family assets into a unified financial twin.
3. **03 Alert:** Detects catastrophic nominee gaps (missing, deceased, minor nominees) in real time over WebSockets.
4. **04 Reunite:** Ingests death events from the Civil Registration System (CRS) by PAN to automatically initiate estate cases.
5. **05 Transfer:** Compiles state-specific legal heir checklists (e.g., Tahsildar succession certificate in Tamil Nadu vs. District Court in Maharashtra) and statutory claim packets (EPFO Form 20/10D/5(IF), LIC Claim Form A).
6. **Life Plan & Forecast:** Models lifetime financial health using a 1,000-path Monte Carlo simulation, Indian income tax calculations (FY 2025-26 slabs), and sequential drawdown planning.

---

## 2. Master Deliverables Index

All Round 2 documentation, architecture diagrams, and verification records are maintained in `docs/round2/`:

| Deliverable | File Path & Format | Scope & Purpose | Status |
|---|---|---|---|
| **System Audit** | [`01-existing-system-audit.md`](01-existing-system-audit.md) | Exhaustive code inventory, subsystem analysis, and Node-to-Python migration audit. | **Completed** |
| **Current Architecture** | [`02-current-architecture.drawio`](02-current-architecture.drawio) · [SVG](02-current-architecture.svg) | Visual architecture of the intermediate Round 2 state (FastAPI Module 1 + pending legacy modules). | **Completed** |
| **Proposed Architecture** | [`03-proposed-architecture.drawio`](03-proposed-architecture.drawio) · [SVG](03-proposed-architecture.svg) | Target production architecture (FastAPI, Supabase PostgreSQL, RAG, Senior-first UI, PWA). | **Completed** |
| **Round Evolution Matrix** | [`04-round-evolution.md`](04-round-evolution.md) | 16-category comprehensive comparative matrix contrasting Round 1 vs. Round 2. | **Completed** |
| **Technology Evaluation** | [`05-technology-evaluation.md`](05-technology-evaluation.md) | Architectural trade-offs across backend frameworks, persistence engines, real-time protocols, and RAG. | **Completed** |
| **Asset Pipeline Spec** | [`06-asset-processing-pipeline.md`](06-asset-processing-pipeline.md) | Complete 6-stage technical pipeline specification from PAN input to estate transfer. | **Completed** |
| **Asset Pipeline Diagram** | [`06-asset-processing-pipeline.drawio`](06-asset-processing-pipeline.drawio) · [SVG](06-asset-processing-pipeline.svg) | Visual flowchart of data transformations, validation checkpoints, and output models. | **Completed** |
| **Security Risk Register** | [`07-security-risk-register.md`](07-security-risk-register.md) | Threat register covering DPDP Act compliance, PAN privacy, JWT security, CORS, and AI hallucination. | **Completed** |
| **Testing & QA Matrix** | [`08-testing-matrix.md`](08-testing-matrix.md) | 18 formal test cases with expected vs. actual outcomes, distinguishing tested vs. pending subsystems. | **Completed** |
| **Verification Evidence** | [`evidence/`](evidence/) | Raw, genuine execution logs, API response payloads, and Git status verification dumps. | **Completed** |

---

## 3. Initial System Audit Summary

### Migration Reality vs. Documentation
A crucial contribution of Shajith's audit was establishing the **exact ground truth** of the codebase:
- **Status of Node-to-Python Migration:** **IN PROGRESS (Module 1 Merged)**.
- **Teammate Contributions:**
  - **Sai** merged PR #1 (`1d81590` / `55afe26`), creating `fastapi-backend/` with Module 1 Core (Auth, Identity verification, Meta, Showcase, Live WebSockets, and in-memory store) while pruning the legacy Node `server/` directory.
  - **Asvand** continues leading frontend presentation, UI components, and client-side page routing.
- **Identified Discrepancies:**
  - Modules 2 and 3 (Holdings, Alerts, Consents, Cases, Life Simulator, and Forecasts) were removed with Node `server/` but are **not yet migrated** into Python FastAPI.
  - `client/vite.config.ts` still points proxy targets to `http://localhost:4000` (Node default) rather than the active FastAPI server port.
  - Deployment configurations (`render.yaml` and `netlify.toml`) reference obsolete directories and require modernization.

For the full detailed breakdown, see [`01-existing-system-audit.md`](01-existing-system-audit.md).

---

## 4. Architectural Synthesis (Current vs. Proposed)

```
CURRENT ROUND 2 INTERMEDIATE ARCHITECTURE:
React 19 Frontend (:5173) ──Proxy mismatch (:4000)──▶ [FastAPI Module 1 Core (:8000)]
                                                            │
                                              ┌─────────────┴─────────────┐
                                              ▼                           ▼
                                    [Module 1 Auth/Identity]     [db.json Local Store]
                                              │
                                              ▼ (Pending Migration)
                                    [Holdings, Alerts, Cases, LifeSim, AI RAG]

PROPOSED TARGET ARCHITECTURE:
┌─────────────────────────────────────────────────────────────┐
│ React 19 Frontend + Senior-First Passbook UI + PWA Manifest │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST & WebSocket (Port 8000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 UNIFIED FASTAPI BACKEND                     │
│  ├── Module 1: Auth (Argon2id + JWT) & PAN Verification     │
│  ├── Module 2: Holdings Aggregation & Nominee-Gap Evaluator │
│  ├── Module 3: Vectorized Monte Carlo & Indian Tax Engine   │
│  ├── Phase 1: CAMS / KFintech CAS Statement Upload Parser   │
│  └── Live WebSocket Hub with Reconnect Management           │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  AI / RAG Succession Guide   │ │  Dual-Mode Storage Engine    │
│  • Gemini 1.5 & OpenAI Router│ │  • Supabase PostgreSQL (RLS) │
│  • 8 Statutory Domain Manuals│ │  • Local JSON Fallback       │
│  • BM25 Zero-API Offline Mode│ │  • Clean Repository Adapter  │
└──────────────────────────────┘ └──────────────────────────────┘
```

- Complete architectural specifications: [`02-current-architecture.drawio`](02-current-architecture.drawio) and [`03-proposed-architecture.drawio`](03-proposed-architecture.drawio).

---

## 5. Round 1 vs. Round 2 Evolution Highlights

Asset Bridge evolved across **16 key architectural dimensions** (detailed in [`04-round-evolution.md`](04-round-evolution.md)):
1. **Runtime Consolidation:** Phased out Node.js in favor of an all-Python FastAPI stack, cutting deployment complexity and startup race conditions.
2. **Real-World Statement Parsing:** Upgraded from purely synthetic mock portfolios to automated CAMS/KFintech CAS statement parsing.
3. **Senior-First UX Transformation:** Designed accessible "Family Passbook" layouts, high-contrast WCAG AAA visual themes, and stepper controls (`+` / `-`) to replace complex circular drag dials.
4. **Hardened Verification:** Replaced client-side mocks with a server-side 7-regulator discovery broker and deterministic test personas (`ABCPI1234K`).
5. **Testing Rigor:** Introduced an automated test harness (`fastapi-backend/test_module1.py`) with 100% pass rates across core routes.

---

## 6. Technology Evaluation Summary

The stack selection matrix (detailed in [`05-technology-evaluation.md`](05-technology-evaluation.md)) validated:
- **FastAPI:** Selected over Node.js Express and Go Gin for its native Pydantic data validation, automated OpenAPI docs, and native integration with Python's AI/financial libraries (NumPy, Pandas, Gemini SDK).
- **Dual-Mode Persistence:** Selected over raw MongoDB or pure SQLite; couples production-grade PostgreSQL with a zero-config JSON fallback (`data/db.json`) for flawless offline judging.
- **Starlette WebSockets:** Selected over Socket.io to eliminate heavy client runtime dependencies while providing low-latency alert broadcasts.
- **Hybrid RAG Router:** Direct Gemini/OpenAI integration with local BM25 extractive fallback, avoiding bloated framework dependencies (e.g., heavy LangChain chains) while maintaining legal precision.

---

## 7. Asset Processing Pipeline Overview

The pipeline (detailed in [`06-asset-processing-pipeline.md`](06-asset-processing-pipeline.md)) governs six distinct operational phases:
1. **Identity & PAN Ingestion:** Enforces PAN regex `^[A-Z]{5}[0-9]{4}[A-Z]$` and masks Aadhaar to 4 digits.
2. **Multi-Regulator Discovery Broker:** Queries 7 institutional record stores (RBI, EPFO, IRDAI, SEBI, PFRDA, India Post, Canara Bank).
3. **Asset Consent & Ingestion:** ReBIT Account Aggregator consent simulation combined with CAS statement parsing.
4. **Nominee-Gap & Vulnerability Evaluator:** Flags missing nominees, deceased nominees, minor nominees without appointed guardians, and inoperative accounts at risk of DEA Fund seizure.
5. **Monte Carlo Life Simulation:** Vectorized 1,000-run stochastic projection, sequential drawdown, and FY 2025-26 Indian tax slab analysis.
6. **Estate Transmission & Heir Collaboration:** CRS death event matching, state-specific legal heir checklists, and multi-heir tracking portal (`/heir`).

---

## 8. Security & Risk Analysis Summary

The threat model (detailed in [`07-security-risk-register.md`](07-security-risk-register.md)) prioritizes 12 vulnerabilities:
- **Critical Risks:** Plaintext JSON storage (`SEC-03`), full Aadhaar storage exposure (`SEC-04` - Mitigated via last-4 regex), and spurious death registration triggers (`SEC-07` - Mitigated via CRS verification).
- **High Risks:** Simple SHA-256 password hashing (`SEC-01` - Upgrade to Argon2id planned), CORS wildcard policy (`SEC-02` - Domain restriction planned), and AI succession hallucination (`SEC-06` - Mitigated via grounded statutory manuals).
- **Compliance:** Aligned with India's **DPDP Act 2023** provisions regarding Purpose Limitation, Right to Erasure (`/api/demo/reset`), and Data Minimization.

---

## 9. Testing & Validation Results

Automated regression execution conducted by Shajith on `fastapi-backend/test_module1.py`:
- **TC-01 (Health Check):** `GET /health` ➔ **PASSED**
- **TC-02 (Metadata Catalog):** `GET /api/meta` ➔ **PASSED**
- **TC-03 (Showcase Feed):** `GET /api/showcase` ➔ **PASSED**
- **TC-04 (Demo Auth):** `POST /api/auth/demo` ➔ **PASSED**
- **TC-05 (User Profile):** `GET /api/me` ➔ **PASSED**
- **TC-06 (Identity & 7 Regulators):** `POST /api/identity` ➔ **PASSED**
- **TC-07 (Demo State Reset):** `POST /api/demo/reset` ➔ **PASSED**

*Unmigrated modules (Holdings, Alerts, Cases, LifeSim, Forecast, and CAS Upload) are marked as **NOT TESTED (Pending Implementation)** in accordance with verification integrity.*  
See [`08-testing-matrix.md`](08-testing-matrix.md) and [`evidence/test_module1_execution.log`](evidence/test_module1_execution.log).

---

## 10. Genuine Evidence & Verification Artifacts

The following raw verification artifacts are captured under `docs/round2/evidence/`:
1. [`test_module1_execution.log`](evidence/test_module1_execution.log): Raw CLI execution log of `test_module1.py` running in the Python 3.14 virtual environment.
2. [`api_endpoints_verification.json`](evidence/api_endpoints_verification.json): Actual JSON response payloads extracted via `TestClient` from `/health`, `/api/meta`, `/api/showcase`, and `/api/auth/demo`.
3. [`git_status_and_history.txt`](evidence/git_status_and_history.txt): Git commit tree confirming the fast-forward update from `origin/main` (`55afe26`).

---

## 11. Work Completed by Shajith

In Round 2, Shajith carried out the following architectural and analytical work without modifying teammate application code:
1. **Git Safety & Isolation:** Enforced strict clean-tree verification, resolved working-tree artifacts with user consent, fast-forwarded to `origin/main`, and established the isolated branch `shajith/round2-documentation`.
2. **Independent Codebase Audit:** Identified the exact migration status of Module 1 vs. Modules 2/3, discovered the Vite proxy port mismatch, and documented deployment drift.
3. **Architecture Diagrams:** Authored complete Draw.io and SVG architecture schematics for both current intermediate and proposed target architectures.
4. **Round Evolution Analysis:** Built the 16-dimension comparative framework detailing the transition from prototype to MVP.
5. **End-to-End Pipeline Formulation:** Documented the technical asset ingestion pipeline from PAN input to estate checklist handover.
6. **Security & Threat Register:** Drafted the 12-point threat register with DPDP Act 2023 compliance mapping.
7. **Test Harness Execution & Verification:** Executed the test suite, generated genuine JSON evidence, and created the transparent testing matrix.
8. **Senior-First UX Architecture:** Formulated the accessibility blueprint (high-contrast themes, stepper inputs, and 1-click printable emergency dossiers) for aging users.

---

## 12. Pending Work & Future Roadmap

### In Progress (Teammate Responsibilities)
- **Sai:** Porting Module 2 (Holdings, Alerts, Consents, Cases) and Module 3 (Life Simulation, Forecasts) to FastAPI.
- **Asvand:** Polishing frontend components, updating Vite proxy configurations, and integrating CAS upload dropzones.

### Planned for Final Round 2 Integration
1. **CAS Upload Parser:** Implement CAMS/KFintech statement ingestion endpoint (`POST /api/upload/cas`).
2. **Supabase Migration:** Execute SQL schema migrations (`server/data/schema.sql`) against live Supabase PostgreSQL.
3. **Deployment Configuration Fix:** Update `render.yaml` to deploy `fastapi-backend` as a single unified service.
4. **End-to-End Test Suite:** Expand `test_module1.py` to cover holdings, alerts, and estate case generation once Module 2 is merged.
