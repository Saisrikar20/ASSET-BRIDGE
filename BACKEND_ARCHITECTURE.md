# Asset Bridge: FastAPI Backend Comprehensive Technical Manual

## 1. System Architecture Overview

Asset Bridge backend is built as a high-reliability, asynchronous service powering Indian statutory financial asset aggregation, succession planning, deceased depositor claims processing, and regulatory compliance monitoring.

### Technical Foundation
- **Framework**: FastAPI (0.115+) running on Starlette with Uvicorn ASGI.
- **Python Runtime**: Python 3.14.x running in isolated virtual environment (`.venv`).
- **Primary Data Store**: SQLite 3 with Write-Ahead Logging (`WAL`), strict Foreign Keys, and FTS5 (Full-Text Search) virtual tables.
- **Serialization & Validation**: Pydantic v2 schemas for request validation, domain models, and API responses.
- **Document Intelligence**: RAG (Retrieval-Augmented Generation) pipeline indexing statutory notifications, RBI master directions, SEBI circulars, and EPFO guidelines.
- **Document & PDF Engine**: ReportLab Platypus engine generating institution-ready legal dossiers and claim letters.
- **Communication Tier**: Multi-engine email dispatch (Twilio SendGrid v3, Twilio Comms API, Google App Password SMTP, and Developer Outbox fallback).

---

## 2. Directory Structure & Module Topology

```
fastapi-backend/
├── app/
│   ├── main.py                     # FastAPI application setup, CORS, lifespan, routes
│   ├── config.py                   # Environment settings, filesystem paths, API credentials
│   ├── core/                       # Foundational infrastructure & auth
│   │   ├── auth.py                 # JWT token generation, verification, PBKDF2 hashing
│   │   ├── db.py                   # SQLite connection factory, WAL pragma setup, pool
│   │   ├── identity.py             # Indian identity validation (PAN, Aadhaar, State)
│   │   ├── live.py                 # WebSocket connection manager for live updates
│   │   ├── mailer.py               # Multi-provider email dispatch engine & outbox
│   │   ├── routers.py              # Auth, demo seeding, user profile, and outbox APIs
│   │   ├── schema.sql              # Statutory SQLite DDL schema & FTS5 tables
│   │   ├── seeder.py               # Deterministic multi-persona data generation
│   │   └── store.py                # Thread-safe SQLite key-value & document abstraction
│   ├── aggregation/                # Core business logic & financial pipeline
│   │   ├── assistant.py            # Gemini AI & RAG succession guidance engine
│   │   ├── documents.py            # Regulatory vault, document ingestion, FTS5 queries
│   │   ├── mock_generator.py       # Portfolio generator across 5 Indian personas
│   │   ├── models.py               # Domain schemas (assets, nominees, regulations)
│   │   ├── pdf_generator.py        # ReportLab claiming dossier & claim form generator
│   │   ├── personas.py             # Demographic & portfolio catalog for demo personas
│   │   ├── pipeline.py             # Deduplication, name matching, and risk analysis
│   │   └── routers.py              # Holdings, cases, consents, heirs, and claims APIs
│   ├── ai_bot/                     # Conversational assistant subsystem
│   │   ├── assistant.py            # Radiant orb desktop guide chatbot handler
│   │   └── rag.py                  # Static markdown statutory knowledge base retriever
│   └── simulation/                 # Edge-case & dispute scenario simulation
│       └── routers.py              # Dispute generation & scenario execution
├── data/                           # Persistent runtime data
│   ├── asset_bridge.db             # Primary SQLite relational database & FTS5 store
│   ├── outbox/                     # Mock / fallback RFC 822 MIME email archives (.eml)
│   └── uploads/                    # Physical documents and generated claiming PDFs
├── knowledge/                      # Statutory markdown documents for RAG indexing
│   ├── bank-deposits.md            # RBI 15-day claim settlement rules
│   ├── death-certificate.md        # Municipal death certificate registration
│   ├── epf.md                      # EPFO Form 20, EDLI ceiling rules
│   ├── heir-certificates.md        # Tahsildar vs Court Succession Certificate limits
│   ├── insurance.md                # IRDAI 30-day claim rules & penalty interest
│   ├── nps-small-savings.md        # PFRDA and Post Office savings scheme rules
│   └── securities.md               # SEBI mutual fund & demat transmission thresholds
├── scripts/
│   ├── poll_regulations.py         # Phase 1 lightweight statutory crawler
│   └── seed_mock_data.py           # CLI seed script for resetting demo state
└── tests/                          # Automated Pytest suite (29 tests)
```

---

## 3. Core Modules & Component Breakdown

### 3.1 Database & Storage Layer (`app/core/db.py`, `store.py`, `schema.sql`)
- **Connection Engine (`db.py`)**:
  - Connects to `data/asset_bridge.db`.
  - Enforces `PRAGMA journal_mode=WAL` for concurrent read/write throughput.
  - Enforces `PRAGMA foreign_keys=ON` and `PRAGMA busy_timeout=5000`.
  - Custom row factory converts SQLite rows into native Python dictionaries.
- **Store Abstraction (`store.py`)**:
  - Offers atomic, thread-safe CRUD methods (`find`, `all`, `insert`, `update`, `remove`).
  - Supports collision-free primary keys via `uid("prefix_")` generating 128-bit hex UUIDs.
- **Schema DDL (`schema.sql`)**:
  - Tables: `users`, `holdings`, `consents`, `cases`, `heirs`, `alerts`, `snapshots`, `user_documents`, `document_chunks`, `email_transmissions`.
  - FTS5 Virtual Table: `document_chunks_fts` indexing `content`, `regulator`, `circular_no`, `tags` with porter tokenization.

### 3.2 Authentication & Identity Engine (`app/core/auth.py`, `identity.py`)
- **Security (`auth.py`)**:
  - Passwords hashed using PBKDF2-HMAC-SHA256 with 100,000 rounds and unique salt.
  - JWT Tokens signed with HMAC-SHA256 and 30-day default expiration.
  - `get_current_user` FastAPI dependency extracts and validates `Bearer` tokens from request headers.
- **Identity Engine (`identity.py`)**:
  - Enforces statutory formats: Indian PAN (`^[A-Z]{5}[0-9]{4}[A-Z]$`), Aadhaar last 4 digits (`^\d{4}$`).
  - Contains authoritative listings of Indian States and Regulators (RBI, SEBI, IRDAI, EPFO, PFRDA, IEPFA, India Post).
  - Validates heir documents required by state (e.g. Legal Heir Certificate vs Succession Certificate).

### 3.3 Multi-Tier Email Dispatcher (`app/core/mailer.py`)
Provides guaranteed notification delivery for claiming dossiers and institutional notices:
1. **Tier 1 (Twilio SendGrid v3)**:
   - REST API endpoint: `https://api.sendgrid.com/v3/mail/send`.
   - Attaches dossier PDFs as Base64-encoded attachments.
2. **Tier 2 (Twilio Comms Email API)**:
   - REST API endpoint: `https://comms.twilio.com/v1/Emails`.
   - Uses HTTP Basic Authentication with Account SID and Auth Token.
3. **Tier 3 (Google App Password / Direct SMTP)**:
   - Uses Python `smtplib.SMTP_SSL` (Port 465) or `STARTTLS` (Port 587).
   - Authenticates via Gmail / Google Workspace 16-character App Passwords.
4. **Tier 4 (Developer Outbox Fallback)**:
   - When external credentials are not configured or network calls fail in dev/test, writes raw RFC 822 MIME `.eml` messages to `data/outbox/`.
   - Inspectable via `/api/dev/outbox` and downloadable via `/api/dev/outbox/{filename}`.
- **Audit Logging**:
  - Every dispatch attempt writes an entry into the SQLite `email_transmissions` table recording recipient, provider, delivery status, and timestamp.

---

## 4. Financial Asset Aggregation & Succession Processing

### 4.1 Asset Discovery & Pipeline (`app/aggregation/pipeline.py`)
- **Name Matching**:
  - Normalizes Indian names across transliterations (e.g., Sundaram vs Soundaram).
  - Uses Jaro-Winkler distance and phonetic Soundex algorithms to score claimant vs holder matches.
- **Duplicate Detection**:
  - Flags overlapping records returned across multiple account aggregators using account number masking and IFSC/DP-ID patterns.
- **Risk Analysis**:
  - Identifies dormant, unnominated, or contested assets.
  - Flags regulatory thresholds (e.g., bank deposits exceeding 5 Lakhs requiring succession certificates).

### 4.2 Document Vault & RAG Search (`app/aggregation/documents.py`)
- **Document Ingestion**:
  - Supports PDFs, TXT, and scanned statutory notices.
  - Automatically extracts text using `pypdf`, chunks content into semantic sections (800-character segments with 150-character overlap), and generates SHA-256 deduplication hashes.
- **Full-Text Search (FTS5)**:
  - Updates the SQLite FTS5 index upon ingestion.
  - Queries return BM25-ranked relevance scores with highlighted match snippets.
- **Regulation Vault**:
  - Stores statutory circulars downloaded by Scrapy or the lightweight poller.

### 4.3 ReportLab PDF Generator (`app/aggregation/pdf_generator.py`)
- Generates publication-grade, court-admissible succession claiming packets:
  - Header with official Asset Bridge branding and institutional metadata.
  - Deceased depositor summary, date of demise, and municipal death certificate details.
  - Schedule of Assets (account numbers, branches, asset values, nominee statuses).
  - Claimant & Legal Heir distribution table with percentage shares.
  - Statutory declarations, indemnities, and notary signing blocks.
  - Automatically saves generated files in `data/uploads/` and links them to claimant cases.

---

## 5. API Route Specification

### 5.1 Core & Authentication Routes (`app/core/routers.py`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/meta` | System metadata (supported regulators, states, and legal heir documents) |
| `GET` | `/api/showcase` | Public demo showcase profile |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate with email and password |
| `POST` | `/api/auth/demo` | Quick demo login with optional persona switching |
| `GET` | `/api/me` | Fetch currently authenticated user profile |
| `PUT` | `/api/me/avatar` | Update user avatar and display settings |
| `POST` | `/api/identity` | Submit and verify PAN, Aadhaar, and state identity |
| `POST` | `/api/demo/seed` | Seed specific persona data into database |
| `POST` | `/api/demo/reset` | Purge user records and reset demo state |
| `GET` | `/api/dev/outbox` | List archived mock emails |
| `GET` | `/api/dev/outbox/{filename}` | Download RFC 822 MIME `.eml` file |
| `POST` | `/api/dev/backup` | Trigger an on-demand SQLite WAL snapshot |

### 5.2 Aggregation & Succession Routes (`app/aggregation/routers.py`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/consents` | List account aggregator consent artefacts |
| `POST` | `/api/consents` | Request new AA consent handle |
| `POST` | `/api/consents/fetch` | Fetch aggregated bank/depository data |
| `GET` | `/api/holdings` | List aggregated financial holdings and risk status |
| `POST` | `/api/holdings/sync` | Force synchronization with upstream AA mocks |
| `GET` | `/api/cases` | List succession and deceased depositor claim cases |
| `POST` | `/api/cases` | Create a new deceased claim case |
| `GET` | `/api/cases/{id}` | Retrieve case details, heir roster, and claim roadmap |
| `POST` | `/api/cases/{id}/pdf` | Generate legal claiming dossier PDF |
| `POST` | `/api/cases/{id}/send-email` | Dispatch claiming dossier PDF to institutional nodal officers |
| `GET` | `/api/cases/{id}/email-history` | View email transmission audit logs for this case |
| `GET` | `/api/heirs` | List registered legal heirs |
| `POST` | `/api/heirs` | Register or invite a legal heir |
| `POST` | `/api/documents/upload` | Upload supporting document to vault |
| `GET` | `/api/documents/{id}/download` | Download vault document |
| `POST` | `/api/documents/regulations/poll`| Trigger statutory crawler / poller |
| `GET` | `/api/documents/regulations` | List and search statutory circulars |

---

## 6. Regulatory Crawler Subsystem (`scrapers/` & `scripts/poll_regulations.py`)

- **Phase 1 Poller (`scripts/poll_regulations.py`)**:
  - Lightweight poller using `httpx` and `BeautifulSoup4`.
  - Directly scrapes RBI, SEBI, EPFO, and IRDAI circular indices.
- **Phase 2 Scrapy Project (`scrapers/`)**:
  - 4 specialized Spiders: `rbi_notifications`, `sebi_circulars`, `epfo_circulars`, `irdai_circulars`.
  - Item Pipeline (`AssetBridgeVaultPipeline`): Automatically routes circulars into SQLite Document Vault via `ingest_regulation_document()` or the HTTP API fallback.
  - Deduplication: Computes circular hashes to prevent duplicate ingestion.

