# Current State: Asset Bridge

## Active Milestone: v2.0 Dexathon 2026 - Round 2
- **Current Phase**: Phase 2: Core Asset Processing Pipeline & System Integration
- **Owner**: Sai (40% - Backend Engineering, System Integration, Reliability & Testing)
- **Status**: Planning & Execution
- **Total Phases**: 3
- **Completed Phases**: 1 (Phase 1: Module 1 Core Backend)
- **Blocked/Waiting**: None

## Phase Progress
- [x] Phase 1: Module 1 Core Backend & Auth Migration
- [ ] Phase 2: Core Asset Processing Pipeline & System Integration
- [ ] Phase 3: Reliability, Security Hardening & Jury Verification

## Decisions & Context
- Migrated legacy Node.js/Express backend into a unified Python FastAPI backend.
- Designed 7-step core asset processing pipeline:
  1. Input validation (strict PAN regex + entity check)
  2. Identity matching (distinguishing simulated vs institutional verified records)
  3. Asset discovery (multi-regulator retrieval across RBI, EPFO, IRDAI, SEBI, LIC, PFRDA, DOP)
  4. Asset normalization (uniform `NormalizedAsset` schema)
  5. Duplicate detection (rule-based flagging without destructive deletion)
  6. Financial analysis (deterministic calculations on unique assets + nominee gap alerts)
  7. Consolidated report generation (structured payload with findings, limitations, and next steps)
- Direct in-process BM25 RAG AI succession guide in FastAPI to eliminate fragile secondary microservice.
