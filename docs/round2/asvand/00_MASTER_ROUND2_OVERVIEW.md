# ASSET BRIDGE — DEXATHON 2026 ROUND 2
# MASTER OVERVIEW & SYSTEM SYNCHRONIZATION SPECIFICATION

**Document ID:** `DOC-ASVAND-00`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Team:** FINTASTIC 6 (`DEX26253`)  
**Evaluation:** Round 2 Industrial Mentor Evaluation  
**Date:** November 4, 2026  
**Status:** ACTIVE / AUDITED / MASTER SPECIFICATION  

---

## 1. EXECUTIVE SUMMARY

Asset Bridge is a specialized fintech platform addressing India's **₹94,000+ crore unclaimed financial asset crisis**. The system operates across two core lifecycles:
1. **The Proactive Financial Twin (While Alive):** Ingests identity data (PAN), executes consent-driven aggregation across fragmented institutions (RBI, EPFO, IRDAI, SEBI, PFRDA, DOP), audits accounts for nominee deficiencies and inoperative status, and models life-cycle retirement cash flows with Union Budget 2025 tax calculations.
2. **The Reactive Succession Engine (Post-Death):** Interfaces with death registration feeds (simulating the Civil Registration System - CRS), freezes the financial twin, decompiles holdings into state-specific statutory claim checklists (covering 10 Indian states), facilitates multi-heir collaborative claim tracking, and provides cited legal guidance via a BM25 RAG assistant.

This master document links our comprehensive audit of the real codebase following the **PR #1 unified Python FastAPI migration** executed by backend lead Sai, identifies technical gaps, defines the target architecture, and coordinates task execution across all team members.

---

## 2. TEAM RESPONSIBILITY MATRIX

| Team Member | Share | Branch | Primary Ownership |
|---|---|---|---|
| **ASVAND** | **50%** | `asvand/round2-product-frontend` | Product direction, target user journey, frontend component architecture, UI/UX accessibility, API contract coordination, and final system integration review. |
| **SAI** | **40%** | `sai/round2-backend` | Python FastAPI backend engineering, CAS statement parser, identity matching, asset normalization, duplicate detection, financial analysis APIs, AI service porting, and backend test suites. |
| **SHAJITH** | **10%** | `shajith/round2-documentation` | System audit documentation, official architecture diagrams, processing pipeline specifications, security/risk assessment, testing matrices, and evidence collation. |

---

## 3. MASTER DOCUMENTATION INDEX

Every major subsystem is documented in an isolated, deeply technical report. Reviewers should consult the specific documents below for file-level and function-level breakdowns:

- [00_GIT_SYNCHRONIZATION_REPORT.md](00_GIT_SYNCHRONIZATION_REPORT.md) — Git status, PR #1 inspection, branch reconciliation, and merge logs.
- [01_PRODUCT_AND_SYSTEM_AUDIT.md](01_PRODUCT_AND_SYSTEM_AUDIT.md) — Page-by-page audit, working vs. simulated vs. broken functionality.
- [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) — Current state vs. proposed FastAPI target state with sequence & data-flow diagrams.
- [03_PRODUCT_USER_JOURNEY.md](03_PRODUCT_USER_JOURNEY.md) — 10-step intended user journey with state transitions, failure modes, and accessibility standards.
- [04_FRONTEND_IMPLEMENTATION.md](04_FRONTEND_IMPLEMENTATION.md) — Client component inventory, Vite/Tailwind 4 audit, and dropzone upload integration.
- [05_API_CONTRACT_AND_INTEGRATION.md](05_API_CONTRACT_AND_INTEGRATION.md) — Exact REST & WebSocket schemas, endpoint-by-endpoint diffs, and missing route contracts.
- [06_DATA_MODELS_AND_TYPES.md](06_DATA_MODELS_AND_TYPES.md) — TypeScript interfaces vs. Pydantic schemas, normalization contracts, and field optionality.
- [07_ASSET_PROCESSING_FLOW.md](07_ASSET_PROCESSING_FLOW.md) — Full lifecycle pipeline: Ingestion $\to$ Normalization $\to$ Duplicate Detection $\to$ Analysis $\to$ Case Decomposition.
- [08_TECHNICAL_INNOVATION.md](08_TECHNICAL_INNOVATION.md) — In-depth evaluation of real differentiators vs. superficial features (Monte Carlo, BM25, Tax Slabs, State Checklists).
- [09_SECURITY_AND_PRIVACY.md](09_SECURITY_AND_PRIVACY.md) — DPDP Act 2023 compliance, AES-256-GCM storage hardening, PII masking, and audit logging.
- [10_RELIABILITY_AND_TESTING.md](10_RELIABILITY_AND_TESTING.md) — Test matrix, missing test coverage, synthetic data integrity, and failure recovery.
- [11_PERFORMANCE_AND_EFFICIENCY.md](11_PERFORMANCE_AND_EFFICIENCY.md) — Vectorized Monte Carlo runtime, BM25 indexing latency, and client-side rendering bottlenecks.
- [12_DEPLOYMENT_AND_ENVIRONMENT.md](12_DEPLOYMENT_AND_ENVIRONMENT.md) — Local startup instructions, Render/Vercel blueprints, environment variables, and build checks.
- [13_IMPLEMENTATION_ROADMAP.md](13_IMPLEMENTATION_ROADMAP.md) — Granular tasks with complexity (1-10), priority, owners, and acceptance criteria.
- [14_ROUND2_COMPLETION_TRACKER.md](14_ROUND2_COMPLETION_TRACKER.md) — Live execution tracker covering all tasks from Not Started to Verified.
- [TASK_REGISTER.md](TASK_REGISTER.md) — Compact master table of all tasks with unique IDs.
- [../ASVAND_FINAL_REVIEW_PACKAGE.md](../ASVAND_FINAL_REVIEW_PACKAGE.md) — Unified master report for external evaluation and mentoring.

---

## 4. CURRENT VS. TARGET ARCHITECTURE SUMMARY

```
CURRENT ARCHITECTURE (Post PR #1):
Client (React 19, TS, Vite 8 :5173) ──► FastAPI Backend (Python :8000)
                                          ├── Module 1 Core (Auth, Identity, Meta) [IMPLEMENTED]
                                          ├── Module 2 Aggregation (Holdings, Alerts) [MISSING/DELETED]
                                          ├── Module 3 LifeSim & Tax (Monte Carlo) [MISSING/DELETED]
                                          ├── Module 4 Succession (Cases, Heirs, CRS) [MISSING/DELETED]
                                          └── Module 5 AI Guide (BM25 RAG) [MISSING/DELETED]

TARGET ARCHITECTURE (Round 2 Unified):
Client (React 19, TS, Vite 8 :5173) ──► Unified FastAPI Backend (Python :8000)
  ├── CAS Statement Upload Dropzone        ├── Module 1: Auth & Identity Verification
  ├── Real-Time WebSocket Alerts           ├── Module 2: Aggregation, CAS Ingestion & Normalization
  ├── Downloadable Claim Packet PDF        ├── Module 3: Monte Carlo Life-Cycle & Tax Engine
  └── Authenticated Heir Portal            ├── Module 4: Multi-State Succession & CRS Event Engine
                                           ├── Module 5: BM25 Knowledge RAG & LLM Fallback
                                           └── Storage: JSON Store with AES-256-GCM & Supabase Seam
```

---

## 5. TOP TECHNICAL RISKS & IMMEDIATE PRIORITIES

1. **Backend Route Gap (Blocker):** Because the legacy Node server was removed in PR #1 before Modules 2–5 were ported to Python, frontend navigation beyond `/app/verify` fails. Porting Modules 2–5 to FastAPI is the immediate blocker for Sai.
2. **Missing Document Pipeline (Product Gap):** The original concept promised document validation and claim packet generation. Currently, `CaseBody.tsx` only renders checkboxes. Asvand's frontend team must build the document dropzone, client-side validation, and claim dossier export.
3. **Storage Security (Fintech Requirement):** Plaintext storage in `db.json` must be hardened with AES-256-GCM field encryption for PANs and financial balances to withstand industrial scrutiny.

*All subsequent sections of this specification are broken down into individual sub-documents.*
