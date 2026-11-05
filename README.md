# Asset Bridge
### Unified Financial Twin and Autonomous Succession Engine for Indian Families
**Dexathon 2026 -- National Finalist Project**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-29%2F29%20Passing%20(100%25)-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg?logo=python&logoColor=white)](https://www.python.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL%20%2B%20FTS5-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org)

---

## 1. Executive Summary

Over **Rs. 94,000 Crore** in financial assets remains dormant and unclaimed across Indian institutions:
* **Reserve Bank of India (RBI)**: Unclaimed bank deposits, dormant savings accounts, and DEA Fund transfers.
* **Securities and Exchange Board of India (SEBI)**: Unclaimed dividends, IEPF transfers, and un-transmitted mutual fund/demat folios.
* **Employees' Provident Fund Organisation (EPFO)**: Inoperative PF accounts, EDLI insurance benefits, and pension holdings.
* **Insurance Regulatory and Development Authority of India (IRDAI)**: Unpaid life and general insurance death claims.
* **Pension Fund Regulatory and Development Authority (PFRDA)**: Unclaimed NPS subscriber accumulations.
* **Department of Posts (India Post)**: Dormant Post Office Savings Bank (POSB), PPF, NSC, and Kisan Vikas Patra certificates.

When an individual passes away in India, **no statutory bridge links civil death registries to institutional wealth**. Bereaved families face fragmented, multi-jurisdictional legal and institutional hurdles across revenue authorities, district courts, and bank branches.

**Asset Bridge** establishes an autonomous, institutional-grade financial twin:
1. **Pre-Loss (Wealth Governance & Risk Prevention)**: Aggregates holdings under ReBIT-style consent architectures, audits nomination coverage across all seven regulators, calculates dormant exposure, and models multi-generational stochastic projections.
2. **Post-Loss (Autonomous Succession Execution)**: Ingests death events from the Civil Registration System (CRS), identifies eligible legal heirs according to the Hindu Succession Act or Indian Succession Act, constructs state-specific probate/heirship roadmaps, and generates official, institution-ready legal claim dossiers in vector PDF format.

---

## 2. System Architecture and Monorepo Layout

Asset Bridge is engineered as a clean, performant monorepo separating client presentation, high-throughput backend services, autonomous regulatory web scrapers, and persistent SQLite storage.

```
dexathon2026/
├── client/                           # React 19 + TypeScript + Vite Frontend (:5173)
│   ├── src/
│   │   ├── components/               # Domain UI cards, dialogs, charts & navigation
│   │   │   ├── EmailDossierModal.tsx # Live nodal officer email dispatch modal
│   │   │   ├── GuideChat.tsx         # AI statutory chatbot with Radiant Orb UI
│   │   │   ├── LogoMark.tsx          # Official Asset Bridge brand geometry
│   │   │   ├── CaseBody.tsx          # Succession roadmap & PDF dossier viewer
│   │   │   └── ui.tsx                # Design system primitives & status indicators
│   │   ├── lib/                      # Type-safe API client, WebSocket hooks & formatters
│   │   │   ├── api.ts                # Client API interface (Cases, Dossiers, Crawlers)
│   │   │   ├── auth.tsx              # JWT context provider and session state
│   │   │   └── format.ts             # Strict INR formatting and date utilities
│   │   ├── pages/                    # 14 Full application views (Verify, Aggregate, Alerts, etc.)
│   │   └── index.css                 # Midnight Navy & Warm White design system
│   └── vite.config.ts                # Reverse-proxy routes for /api and /ws
├── fastapi-backend/                  # High-Throughput FastAPI REST & WebSocket Backend (:8000)
│   ├── app/
│   │   ├── core/                     # Foundational infrastructure & security
│   │   │   ├── auth.py               # PBKDF2 hashing, JWT signing, security dependencies
│   │   │   ├── db.py                 # SQLite WAL connection pool & pragma enforcement
│   │   │   ├── identity.py           # Indian statutory identity verification (PAN, Aadhaar)
│   │   │   ├── live.py               # Real-time WebSocket event broadcaster
│   │   │   ├── mailer.py             # Multi-tier email dispatch engine & audit logger
│   │   │   ├── routers.py            # Authentication, demo seeding, and outbox APIs
│   │   │   ├── schema.sql            # Relational DDL schema + FTS5 full-text index
│   │   │   ├── seeder.py             # Deterministic persona data generator
│   │   │   └── store.py              # Thread-safe ACID document and key-value store
│   │   ├── aggregation/              # Financial pipeline & succession intelligence
│   │   │   ├── assistant.py          # Gemini AI legal assistant with RAG fallback
│   │   │   ├── documents.py          # Regulatory Document Vault, chunking & FTS5 search
│   │   │   ├── mock_generator.py     # Procedural multi-regulator portfolio generator
│   │   │   ├── models.py             # Pydantic domain models for assets and claims
│   │   │   ├── pdf_generator.py      # ReportLab statutory claiming dossier PDF engine
│   │   │   ├── personas.py           # Demographic and financial catalog for 5 Indian personas
│   │   │   ├── pipeline.py           # Deterministic 7-step asset processing pipeline
│   │   │   └── routers.py            # Holdings, cases, consents, heirs, and PDF APIs
│   │   ├── ai_bot/                   # Statutory assistant knowledge retriever
│   │   └── config.py                 # Environment variables and path resolution
│   ├── data/                         # Persistent operational storage
│   │   ├── asset_bridge.db           # SQLite database in Write-Ahead Logging (WAL) mode
│   │   ├── outbox/                   # Local RFC 822 MIME archive (.eml files)
│   │   └── uploads/                  # User evidence, uploaded documents, and generated PDFs
│   ├── knowledge/                    # 8 Authoritative statutory regulatory guides (Markdown)
│   └── tests/                        # 29-suite automated backend test harness
├── scrapers/                         # Autonomous Statutory Crawler Suite
│   ├── scrapers/
│   │   ├── spiders/                  # Twisted/Asyncio spiders (RBI, SEBI, EPFO, IRDAI)
│   │   ├── items.py                  # Scrapy item schemas for circulars & notifications
│   │   ├── pipelines.py              # Ingestion pipeline routing directly to SQLite vault
│   │   └── settings.py               # Throttling, request jitter, and politeness policies
│   ├── runner.py                     # Concurrent multi-spider orchestrator
│   └── scrapy.cfg                    # Scrapy project configuration
├── scripts/                          # Monorepo management and platform runners
│   ├── poll_regulations.py           # Phase 1 lightweight statutory HTTP poller
│   └── run-python.js                 # Cross-platform .venv execution wrapper
├── BACKEND_ARCHITECTURE.md           # In-depth technical architecture and API manual
└── package.json                      # Monorepo workspace commands
```

---

## 3. Core Technical Foundations

### 3.1 The Deterministic 7-Step Asset Pipeline

Every financial asset record entering Asset Bridge undergoes a seven-stage audit pipeline:

```
[ Step 1: Input Validation ]
      | Strict regex validation on PAN format (5 letters, 4 digits, 1 letter) and 4th-character entity type.
      v
[ Step 2: Identity Matching ]
      | Transliteration-resistant matching using Jaro-Winkler distance and Soundex phonetics.
      v
[ Step 3: Multi-Regulator Discovery ]
      | Aggregation across RBI, SEBI, IRDAI, EPFO, PFRDA, IEPFA, and India Post.
      v
[ Step 4: Normalization ]
      | Structured mapping into typed Pydantic models with explicit regulatory categories.
      v
[ Step 5: Duplicate Resolution ]
      | Non-destructive conflict flagging; preserves regulatory audit trails without double-counting.
      v
[ Step 6: Risk and Nominee Auditing ]
      | Identification of missing, invalid, or minor nominees; penalty calculation under Master Directions.
      v
[ Step 7: Consolidated Reporting ]
      | Output of verified clean portfolio total, statutory claim roadmap, and action items.
```

### 3.2 High-Reliability Storage Architecture
* **Write-Ahead Logging (WAL)**: Configured via `PRAGMA journal_mode=WAL`, enabling concurrent unblocked reads while write transactions commit.
* **ACID Transactions**: Atomic rollback protection ensuring document chunking and metadata commits never leave orphaned records.
* **FTS5 Full-Text Search**: The SQLite virtual table `document_chunks_fts` indexes circulars and uploaded evidence with porter-stemmed tokenization for millisecond BM25 retrieval.
* **Collision-Free Identifiers**: Generated using high-entropy 128-bit hexadecimal tokens prefixed by entity type (`u_`, `h_`, `case_`, `doc_`).

### 3.3 Multi-Tier Email Dispatch System
To guarantee delivery of official claiming dossiers to institutional nodal officers, `app/core/mailer.py` implements a 4-tier fallback matrix:
1. **Tier 1 (Twilio SendGrid v3)**: REST dispatch via `POST /v3/mail/send` with Base64-encoded PDF attachments and Bearer authorization.
2. **Tier 2 (Twilio Comms Email API)**: HTTP Basic authentication dispatch via `POST /v1/Emails`.
3. **Tier 3 (Google App Password SMTP)**: Direct connection via `smtplib.SMTP_SSL` (port 465) or `STARTTLS` (port 587) using application passwords.
4. **Tier 4 (Developer Outbox Fallback)**: Transparent local fallback writing standard RFC 822 MIME `.eml` files to `data/outbox/`. These are browsable and downloadable directly via the `/api/dev/outbox` endpoints.
5. **Audit Logging**: Every dispatch attempt is recorded in the SQLite `email_transmissions` table with recipient, provider, status, and transmission timestamp.

### 3.4 Autonomous Regulatory Crawler Suite
Monitors government and regulatory portals for new statutory updates, settlement circulars, and interest penalty guidelines:
* **Phase 1 (Lightweight Poller)**: Rapid HTTP poller in `scripts/poll_regulations.py` using `httpx` and `BeautifulSoup4` for low-overhead checks.
* **Phase 2 (Scrapy Framework)**: Asynchronous crawlers in `scrapers/` targeting:
  - **RBI Notifications**: Master directions on deceased depositor claims and penal interest rules (Bank Rate + 4%).
  - **SEBI Circulars**: Threshold revisions for mutual fund transmission without legal representation.
  - **EPFO Circulars**: Form 20 procedures and EDLI insurance benefits.
  - **IRDAI Guidelines**: 30-day settlement mandates and insurer delay penalties.
* **Deduplication Pipeline**: Automatically skips already indexed circulars using SHA-256 content hashes, routes new PDFs through `pypdf`, extracts text chunks, and updates the SQLite FTS5 index.

---

## 4. Quick Start Guide

### Prerequisites
* **Node.js**: v20 or higher
* **Python**: 3.11 to 3.14 (with virtual environment in `.venv`)
* **Git**: Standard command line tools

### Setup and Execution

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Saisrikar20/ASSET-BRIDGE.git
   cd ASSET-BRIDGE
   ```

2. **Install dependencies**:
   ```bash
   # Install root and client npm dependencies
   npm install
   npm --prefix client install

   # Setup Python virtual environment
   python -m venv .venv
   .venv\Scripts\pip install -r fastapi-backend/requirements.txt
   ```

3. **Start Development Environment**:
   ```bash
   # Runs FastAPI backend (:8000) and Vite frontend (:5173) concurrently
   npm run dev
   ```

   * **Web Application**: `http://localhost:5173`
   * **Swagger API Documentation**: `http://127.0.0.1:8000/docs`
   * **ReDoc API Explorer**: `http://127.0.0.1:8000/redoc`

---

## 5. Available Monorepo Commands

| Command | Target | Action |
|---|---|---|
| `npm run dev` | Full Stack | Runs FastAPI backend and Vite client concurrently |
| `npm run dev:backend` | Backend | Runs Uvicorn development server with live reload on port 8000 |
| `npm run dev:frontend` | Frontend | Runs Vite client development server on port 5173 |
| `npm run test` | Full Stack | Runs 29 backend pytest suites and builds frontend |
| `npm run test:backend` | Backend | Executes 29 automated pytest test suites across all backend components |
| `npm run test:frontend` | Frontend | Typechecks and builds production React bundle (`tsc -b && vite build`) |
| `npm run seed` | Database | Seeds multi-persona financial datasets (Raghavan, Priya, Vikram, Sunita, Rajesh) |
| `npm run seed:reset` | Database | Wipes and reseeds the SQLite database to clean baseline demo state |
| `npm run seed:raghavan` | Database | Seeds primary deceased depositor persona (Raghavan Sundaram) |
| `npm run seed:priya` | Database | Seeds tech professional persona (Priya Sharma) |
| `npm run poll:regulations`| Scrapers | Executes Phase 1 lightweight statutory regulatory poller |
| `npm run crawl:regulations`| Scrapers | Executes Phase 2 concurrent Scrapy crawler framework |

---

## 6. End-to-End Product Walkthrough

### 1. Multi-Regulator Identity Cross-Check (`/app/verify`)
Cross-matches user-entered PAN, Name, and Date of Birth against statutory schemas across all seven regulators. Transliteration-resistant algorithms score identity confidence and flag discrepancies (e.g., scoring `R. Raghavan` vs `Raghavan Sundaram` at 65% match confidence without elevating to confirmed status).

### 2. Account Aggregator Discovery (`/app/aggregate`)
Simulates ReBIT-compliant Account Aggregator consent flows. Upon approval, retrieves portfolio holdings across commercial banks, depository participants, mutual fund houses, and insurance companies.

### 3. Real-Time Nominee Gap Auditing (`/app/alerts`)
Continuously audits holdings against regulatory requirements. Flags critical estate hazards:
* Unnominated accounts at risk of probate.
* Deceased nominees requiring urgent testamentary updates.
* Minor nominees without appointed statutory guardians.
* High-value accounts crossing the state legal heir certificate threshold (e.g. above ₹5 Lakhs).

### 4. Civil Registration System Link (`/app/reunite`)
Simulates ingestion of municipal death certificates from the Civil Registration System (CRS). Automatically instantiates an estate claim case, maps asset schedules, and sends encrypted notification links to designated legal heirs.

### 5. Succession Case Workspace (`/app/cases/:id`)
Presents an actionable state-specific claim roadmap (e.g. Tahsildar Legal Heir Certificate in Tamil Nadu vs Court Succession Certificate in Maharashtra). Features an embedded AI statutory assistant answering legal questions using retrieved regulatory circulars.

### 6. Official PDF Claiming Dossier Generator
Generates a court-ready, institution-specific succession claiming packet using ReportLab:
* Formal claim letter addressed to nodal bank/institution officers.
* Schedule of deceased depositor assets with account numbers and branch identifiers.
* Legal heir distribution table with statutory percentage entitlement shares.
* Indemnity bond and notary signing schedules.

### 7. Instant Dossier Email Dispatch
Enables claimants to send the generated claiming packet and supporting evidence directly to institutional nodal desks via Twilio SendGrid, Twilio Comms, or SMTP, with guaranteed logging and fallback to the developer outbox.

### 8. Dedicated Legal Heir Portal (`/heir`)
Allows legal heirs to log in securely using their Case ID and PAN to review estate distribution, upload requisite verification documents, and monitor institution-by-institution settlement progress.

---

## 7. Verification and Testing Standards

The backend maintains strict verification standards enforced via automated test pipelines:

```
fastapi-backend/tests/
├── test_core.py                 # Core endpoints, JWT auth, and profile operations
├── test_database.py             # SQLite WAL pragmas, ACID rollback, and FTS5 search
├── test_document_rag.py         # Document vault chunking, hashing, and RAG retrieval
├── test_email_dispatch.py       # Multi-tier email dispatch, MIME construction, and audit logging
├── test_mock_data.py            # Persona integrity and deterministic procedural generation
├── test_pdf_generator.py        # ReportLab claiming dossier generation and auto-indexing
├── test_pipeline.py             # 7-step asset processing pipeline and arithmetic checks
└── test_regulations_crawler.py  # Regulatory scrapers, deduplication, and circular ingestion
```

- **Backend Pytest Suite**: 29/29 passing tests.
- **Frontend TypeScript Build**: 0 type errors, production bundle compiled cleanly in under 500ms.
- **Static Type Safety**: Pyright and Pylance configured with 0 errors across core and aggregation routers.

---

## 8. Project Contributors

* **Asvand**: Product Architecture, Design Systems, Frontend Experience, and User Journey.
* **Sai**: Backend Architecture, 7-Step Asset Pipeline, System Integration, Regulatory Crawlers, and Testing Infrastructure.
* **Shajith**: Presentation Visuals, Security Risk Registers, and Statutory Succession Documentation.

---

## 9. Legal & Statutory Disclaimer

*Asset Bridge generates educational guidance, succession roadmaps, and statutory claiming documents based on the Hindu Succession Act, Indian Succession Act, EPFO Guidelines, and RBI/SEBI Master Directions. It does not replace professional legal representation. Users and institutional claimants must verify individual institutional requirements prior to formal paperwork submission.*
