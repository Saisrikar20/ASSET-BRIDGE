# ASSET BRIDGE — MASTER TASK REGISTER
**Document ID:** `DOC-ASVAND-REG`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Status:** ACTIVE REGISTER  

| Task ID | Task Name | Owner | Priority | Complexity (1-10) | Dependencies | Status | Documentation Reference |
|---|---|---|---|---|---|---|---|
| **DEP-01** | Install & verify local workspace dependencies | Asvand / Sai | Critical | 1 | None | Planned | [12_DEPLOYMENT_AND_ENVIRONMENT.md](12_DEPLOYMENT_AND_ENVIRONMENT.md) |
| **API-01** | Port Module 2 (Aggregation, Holdings & Alerts) to FastAPI | Sai | Critical | 5 | DEP-01 | Planned | [05_API_CONTRACT_AND_INTEGRATION.md](05_API_CONTRACT_AND_INTEGRATION.md) |
| **API-02** | Port Module 4 (Succession Engine, Cases & CRS) to FastAPI | Sai | Critical | 5 | API-01 | Planned | [05_API_CONTRACT_AND_INTEGRATION.md](05_API_CONTRACT_AND_INTEGRATION.md) |
| **FE-01** | Document Upload & Validation Dropzone in `CaseBody.tsx` | Asvand | Critical | 4 | DEP-01 | Planned | [04_FRONTEND_IMPLEMENTATION.md](04_FRONTEND_IMPLEMENTATION.md) |
| **FE-02** | Pre-Filled Claim Dossier PDF Generator | Asvand | Critical | 5 | FE-01 | Planned | [04_FRONTEND_IMPLEMENTATION.md](04_FRONTEND_IMPLEMENTATION.md) |
| **FE-03** | Sidebar Navigation Streamlining & Grouping | Asvand | High | 2 | None | Planned | [04_FRONTEND_IMPLEMENTATION.md](04_FRONTEND_IMPLEMENTATION.md) |
| **API-03** | Port Module 3 (LifeSim & Tax Engine) to FastAPI | Sai | High | 6 | API-01 | Planned | [05_API_CONTRACT_AND_INTEGRATION.md](05_API_CONTRACT_AND_INTEGRATION.md) |
| **API-04** | Port Module 5 (BM25 Knowledge RAG & AI Guide) to FastAPI | Sai | High | 4 | API-01 | Planned | [05_API_CONTRACT_AND_INTEGRATION.md](05_API_CONTRACT_AND_INTEGRATION.md) |
| **SEC-01** | Implement Transparent AES-256-GCM Storage Encryption | Sai | High | 4 | API-01 | Planned | [09_SECURITY_AND_PRIVACY.md](09_SECURITY_AND_PRIVACY.md) |
| **PIPE-01**| CAMS / KFintech Consolidated Statement (CAS) Upload Parser | Sai / Asvand | Medium | 7 | API-01 | Planned | [07_ASSET_PROCESSING_FLOW.md](07_ASSET_PROCESSING_FLOW.md) |
| **FE-04** | Document-to-Record Heuristic Discrepancy Matching UI | Asvand | Medium | 3 | FE-01 | Planned | [04_FRONTEND_IMPLEMENTATION.md](04_FRONTEND_IMPLEMENTATION.md) |
| **PERF-01**| Debounced Dirty-Flag Table Persistence in `store.py` | Sai | Medium | 3 | API-01 | Planned | [11_PERFORMANCE_AND_EFFICIENCY.md](11_PERFORMANCE_AND_EFFICIENCY.md) |
| **PERF-02**| 300ms Debounce on LifePlan Interactive Sliders | Asvand | High | 2 | None | Planned | [11_PERFORMANCE_AND_EFFICIENCY.md](11_PERFORMANCE_AND_EFFICIENCY.md) |
| **TEST-01**| End-to-End Persona Verification (Raghavan `ABCPI1234K`) | Asvand / Sai | High | 3 | API-02, FE-02 | Planned | [10_RELIABILITY_AND_TESTING.md](10_RELIABILITY_AND_TESTING.md) |
| **DOC-01** | Complete System Audit & Task Documentation Package | Asvand | Critical | 6 | None | Verified | [00_MASTER_ROUND2_OVERVIEW.md](00_MASTER_ROUND2_OVERVIEW.md) |
| **OPT-01** | Live Supabase PostgreSQL Migration with RLS | Sai | Low | 8 | API-02 | Deferred | [13_IMPLEMENTATION_ROADMAP.md](13_IMPLEMENTATION_ROADMAP.md) |
| **OPT-02** | OCR Computer Vision Model for Death Certificates | Sai | Low | 8 | FE-01 | Deferred | [13_IMPLEMENTATION_ROADMAP.md](13_IMPLEMENTATION_ROADMAP.md) |
| **OPT-03** | Standalone Mobile PWA Manifest & Service Worker Cache | Asvand | Low | 4 | None | Deferred | [13_IMPLEMENTATION_ROADMAP.md](13_IMPLEMENTATION_ROADMAP.md) |

