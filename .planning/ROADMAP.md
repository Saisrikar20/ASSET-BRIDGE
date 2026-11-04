# Roadmap: Asset Bridge (Dexathon 2026 - Round 2)

## Overview

Transforming Asset Bridge into a hardened, production-grade financial twin backend. Round 2 establishes the core 7-step asset processing pipeline, Python FastAPI migration, comprehensive automated verification, security hardening, and jury evidence.

## Phases

- [x] **Phase 1: Module 1 Core Backend & Auth Migration** - Unified Python FastAPI service, JWT auth, identity verification, and in-memory/JSON store.
- [ ] **Phase 2: Core Asset Processing Pipeline & System Integration** - 7-step pipeline (Input validation, Identity matching, Asset discovery, Normalization, Deduplication, Financial analysis, Consolidated report), Pydantic contracts, and API integration.
- [ ] **Phase 3: Reliability, Security Hardening & Jury Verification** - Comprehensive automated test suite, security risk mitigation, efficiency optimization, and jury preparation.

## Phase Details

### Phase 2: Core Asset Processing Pipeline & System Integration

**Goal**: Implement the deterministic 7-step Asset Processing Pipeline in Python FastAPI (`app/module2_aggregation`), define clean Pydantic contracts, connect API endpoints, and integrate in-process AI succession guidance.
**Depends on**: Phase 1
**Requirements**: REQ-01, REQ-02, REQ-04, REQ-06, REQ-11
**Success Criteria**:
  1. `validate_input` enforces strict PAN regex and entity code checks.
  2. `normalize_assets` standardizes heterogeneous records across all 7 regulators into `NormalizedAsset` schema.
  3. `detect_duplicates` flags potential duplicates without deleting records.
  4. `analyze_financials` calculates verifiable totals excluding duplicates and generates nominee-gap alerts.
  5. `generate_consolidated_report` outputs structured frontend-ready payload with findings, limitations, and next steps.
  6. Automated test suite passes 100% of pipeline tests.

**Plans**: 1 plan

Plans:
- [x] 02-01: Implement Core Asset Processing Pipeline, Pydantic schemas, and FastAPI routers.
