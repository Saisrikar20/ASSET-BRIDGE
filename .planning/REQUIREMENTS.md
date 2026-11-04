# Requirements: Asset Bridge v1.0

## Functional Requirements
- **REQ-01 (Identity & Verification)**: System must cross-match PAN, Name, and DOB against regulatory schemas with Levenshtein-distance fuzzy matching to flag partial name discrepancies.
- **REQ-02 (Multi-Regulator Aggregation)**: System must simulate or ingest financial holdings across RBI, EPFO, IRDAI, SEBI, and PFRDA via ReBIT-style consent artefacts.
- **REQ-03 (CAS Statement Upload)**: System must support parsing CAMS/KFintech Consolidated Account Statements (CSV/JSON/text) to ingest mutual fund and stock folios.
- **REQ-04 (Real-time Nominee Gap Auditing)**: System must detect missing nominees, minor nominees without appointed guardians, deceased nominees, and dormant/inoperative accounts, streaming alerts via WebSockets.
- **REQ-05 (Civil Registration & Estate Case)**: System must detect/receive death registration events via PAN and automatically instantiate an estate succession case with state-specific checklists.
- **REQ-06 (AI Succession Legal Guide)**: System must provide natural language answers citing relevant Indian succession statutes with fallback to extractive answers when offline.
- **REQ-07 (Life & Monte Carlo Simulator)**: System must run 1,000-path stochastic Monte Carlo simulations calculating financial independence age, success probability, and drawdown across asset classes.
- **REQ-08 (Indian Tax Engine)**: System must calculate tax under Old vs New Tax Regimes for FY 2025-26 slabs.

## Non-Functional & Architecture Requirements
- **REQ-09 (Dual-Mode Persistence)**: System must interface with PostgreSQL / Supabase with Row-Level Security, falling back seamlessly to `db.json` when credentials are absent.
- **REQ-10 (Mobile PWA Support)**: Web app must include PWA manifest and mobile viewport optimizations for smooth touch demonstrations on smartphones.
- **REQ-11 (Demo Fault Tolerance)**: Offline demo operations must work without network latency or external API key dependencies.
