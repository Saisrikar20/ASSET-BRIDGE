# Roadmap: Asset Bridge (Dexathon 2026)

## Overview

Transforming the Asset Bridge financial twin prototype into a database-backed, upload-capable, demo-hardened MVP ready for live evaluation at Dexathon 2026.

## Phases

- [ ] **Phase 1: Persistence & Statement Ingestion** - Dual-mode Supabase/PostgreSQL adapter, SQL migration schema, and CAMS/KFintech CAS statement upload parser.
- [ ] **Phase 2: Mobile PWA & Experience Polish** - PWA manifest, mobile touch dials, and dropzone UI on the aggregation dashboard.
- [ ] **Phase 3: Automated Verification & Demo Rehearsal** - End-to-end integration test suite, live WebSocket alert verification, and rehearsal check.

## Phase Details

### Phase 1: Persistence & Statement Ingestion

**Goal**: Establish relational persistence with Supabase/PostgreSQL schema while preserving zero-config offline fallback, and add CAS statement upload parsing.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-02, REQ-03, REQ-09, REQ-11
**Success Criteria**:

  1. `server/data/schema.sql` defines complete relational tables with foreign keys and indexes.
  2. Server connects to Supabase when environment variables exist, or defaults to local JSON store without crashing.
  3. Upload endpoint `/api/upload/cas` successfully parses statement records, persists holdings, and recalculates live nominee gap alerts.

**Plans**: 0/1 plans executed

Plans:

- [ ] 01-01-PLAN.md
- [ ] 01-01: Dual-mode Supabase persistence adapter, schema definition, and CAS statement upload parser.

### Phase 2: Mobile PWA & Experience Polish

**Goal**: Implement PWA manifest, service worker registration, and upload UI dropzone for live mobile demonstration.
**Depends on**: Phase 1
**Requirements**: REQ-03, REQ-10
**Success Criteria**:

  1. Web app is installable as a standalone PWA on mobile browsers.
  2. Aggregate page features an interactive CAS statement file upload dropzone.

**Plans**: 1 plan

Plans:

- [ ] 02-01: PWA manifest, standalone mobile styling, and Aggregate page statement dropzone.

### Phase 3: Automated Verification & Demo Rehearsal

**Goal**: Execute comprehensive automated test suite and validate end-to-end demo flow.
**Depends on**: Phase 2
**Requirements**: REQ-01, REQ-04, REQ-05, REQ-07, REQ-08, REQ-11
**Success Criteria**:

  1. Automated test script passes all API sanity checks.
  2. Demo PAN `ABCPI1234K` executes full verify-aggregate-alert-reunite loop flawlessly.

**Plans**: 1 plan

Plans:

- [ ] 03-01: Automated test suite and end-to-end verification.
