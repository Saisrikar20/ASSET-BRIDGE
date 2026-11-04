# ASSET BRIDGE — ROUND 2 COMPLETION TRACKER
**Document ID:** `DOC-ASVAND-14`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Status:** LIVE EXECUTION TRACKER  

---

## 1. ROUND 2 TASK EXECUTION STATUS

| Task ID | Task Description | Subsystem | Owner | Priority | Status | Verification Notes |
|---|---|---|---|---|---|---|
| **DEP-01** | Install & verify local workspace dependencies | Infra | Asvand / Sai | Critical | **Planned** | `npm install` and python `.venv` required. |
| **API-01** | Port Module 2 (Aggregation, Holdings & Alerts) to FastAPI | Backend | Sai | Critical | **Planned** | Restores `/consents`, `/holdings`, `/alerts`. |
| **API-02** | Port Module 4 (Succession Engine & CRS) to FastAPI | Backend | Sai | Critical | **Planned** | Restores `/crs/death`, `/cases`, `/cases/:id`. |
| **FE-01** | Document Upload & Validation Dropzone in `CaseBody.tsx` | Frontend | Asvand | Critical | **Planned** | MIME, 5MB limit, SHA-256 duplicate hashing. |
| **FE-02** | Pre-Filled Claim Dossier PDF Generator | Frontend | Asvand | Critical | **Planned** | One-click export of Form 20, Form A & holdings. |
| **FE-03** | Sidebar Navigation Streamlining & Grouping | Frontend | Asvand | High | **Planned** | Consolidates 12 links to 5 core groups. |
| **API-03** | Port Module 3 (LifeSim & Tax Engine) to FastAPI | Backend | Sai | High | **Planned** | 1000-run Monte Carlo & FY 2025-26 tax slabs. |
| **API-04** | Port Module 5 (BM25 RAG AI Guide) to FastAPI | Backend | Sai | High | **Planned** | Local BM25 search over legal markdown docs. |
| **SEC-01** | Transparent AES-256-GCM Storage Encryption | Security | Sai | High | **Planned** | Encrypts PANs and balances in `db.json`. |
| **PIPE-01** | CAS Statement Upload Parser (CAMS/KFintech) | Ingestion | Sai / Asvand | Medium | **Planned** | Ingests real mutual fund statement files. |
| **FE-04** | Document-to-Record Heuristic Discrepancy Matching UI | Frontend | Asvand | Medium | **Planned** | Flags name spelling mismatches. |
| **TEST-01** | Module 1 Auth & Verification Sanity Test Suite | Testing | Sai | High | **Audited** | Code exists in `test_module1.py`. |
| **TEST-02** | End-to-End Persona Verification (Raghavan `ABCPI1234K`) | Testing | Asvand / Sai | High | **Planned** | Validates full life-to-death demo loop. |
| **DOC-01** | Complete System Audit & Task Documentation Package | Docs | Asvand | Critical | **Verified** | 16 comprehensive specifications created. |
| **OPT-01** | Live Supabase PostgreSQL Migration with RLS | Database | Sai | Low | **Deferred** | Scheduled for Round 3. |
| **OPT-02** | Computer Vision / OCR Model for Death Certificates | AI | Sai | Low | **Deferred** | Scheduled for Round 3/4. |
| **OPT-03** | Mobile PWA Service Worker Offline Caching | Client | Asvand | Low | **Deferred** | Scheduled for Round 3. |
| **OPT-04** | Live Sahamati Account Aggregator mTLS Connection | Regulatory | All | Low | **Deferred** | Requires RBI institutional license. |
