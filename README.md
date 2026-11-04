# Asset Bridge
### The Unified Financial Twin and Autonomous Succession Engine for Indian Families
**Dexathon 2026 -- Production Engineering Architecture**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing%20(100%25)-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg?logo=python&logoColor=white)](https://www.python.org)

---

## Executive Overview

**Rs. 94,000+ crore** of Indian families' hard-earned wealth currently lies dormant and unclaimed across banking deposits, provident funds, life insurance policies, mutual fund folios, and post office schemes. Today, this wealth is trapped across disparate statutory silos:
* **RBI** (Unclaimed Bank Deposits and DEA Fund)
* **EPFO** (Inoperative EPF Accounts, Pension Funds and EDLI Insurance)
* **IRDAI** (Private Insurer Unclaimed Balances and 30-Day Claim Mandates)
* **LIC** (Unpaid Matured Policies and Death Claims)
* **SEBI** (Unclaimed Mutual Fund Folios, CDSL/NSDL Demat, and IEPF)
* **PFRDA** (National Pension System Tier-I / Tier-II Corpi)
* **DOP** (India Post Small Savings: PPF, NSC, KVP, POMIS)

When a family member passes away, **nothing connects their death to their money**. Families are forced into a grueling, multi-month bureaucratic chase across courts, revenue offices, and financial institutions.

**Asset Bridge** solves this through a **two-sided financial twin**:
1. **While Alive**: Aggregates institutional holdings under ReBIT-style consent, normalizes multi-regulator data, audits for nominee gaps in real time, generates publication-grade statutory claiming dossiers in PDF format, and runs stochastic life projections.
2. **Upon Death**: Detects death events via the Civil Registration System (CRS), opens an automated succession case, alerts legal heirs, and generates state-specific legal claim roadmaps with an embedded AI legal assistant.

---

## Modular Repository Architecture

The monorepo is cleanly separated into decoupled, dedicated sub-systems:

```
dexathon2026/
├── client/                           # React 19 + TypeScript + Vite + PWA Frontend (:5173)
│   ├── public/                       # Manifest, service worker & static icons
│   ├── src/
│   │   ├── components/               # Domain UI cards, dialogs, charts & modals
│   │   │   ├── CaseBody.tsx          # Estate claim workspace & PDF dossier viewer
│   │   │   ├── EmailDossierModal.tsx # Statutory claiming dossier email dispatch modal
│   │   │   ├── GuideChat.tsx         # Embedded AI statutory guide chat interface
│   │   │   └── ui.tsx                # Design system primitives, toasts & badges
│   │   ├── lib/                      # Typed API clients, WebSocket live sync, auth & formatters
│   │   │   ├── api.ts                # API client with dossier PDF & regulatory feed helpers
│   │   │   └── auth.tsx              # JWT authentication context
│   │   └── pages/                    # 14 Full route views (Verify, Aggregate, Alerts, Reunite, etc.)
│   └── vite.config.ts                # Vite dev server with /api and /ws reverse proxies
│
├── fastapi-backend/                  # High-Throughput Python REST & WebSocket API (:8000)
│   ├── app/
│   │   ├── ai_bot/                   # Dedicated AI Legal Assistant & Knowledge RAG Engine
│   │   │   ├── assistant.py          # NVIDIA NIM / Nemotron & Gemini succession advisors
│   │   │   ├── rag.py                # Dual-corpus BM25 retriever & SQLite FTS5 search
│   │   │   └── __init__.py           # Clean package facade
│   │   ├── email_sender/             # Dedicated Email Dispatch Service
│   │   │   ├── dispatcher.py         # Google App Password SMTP, Twilio Comms & SendGrid APIs
│   │   │   ├── templates.py          # Corporate HTML templates & Indian Rupee formatting
│   │   │   └── __init__.py           # Clean package facade
│   │   ├── pdf_generator/            # Dedicated ReportLab Dossier PDF Engine
│   │   │   ├── generator.py          # Publication-grade legal claiming dossier generator
│   │   │   └── __init__.py           # Clean package facade
│   │   ├── core/                     # Core system infrastructure
│   │   │   ├── auth.py               # Password hashing & JWT token validation
│   │   │   ├── db.py                 # SQLite WAL engine, PRAGMA tuning & backup hooks
│   │   │   ├── identity.py           # Strict PAN validation & fuzzy matching
│   │   │   ├── live.py               # Real-time WebSocket broadcasting
│   │   │   └── store.py              # Thread-safe persistent SQLite data store
│   │   ├── aggregation/              # 7-Step asset pipeline & backward-compatibility bridges
│   │   ├── simulation/               # Monte Carlo wealth forecaster & retirement simulator
│   │   ├── config.py                 # Centralized environment configuration
│   │   └── main.py                   # FastAPI application entrypoint
│   ├── data/                         # Persistent database & outbox directory
│   ├── knowledge/                    # 8 Official statutory regulatory guides (Markdown)
│   ├── scripts/                      # Poller scripts & mock seeders
│   └── tests/                        # 31-suite automated pytest test harness
│
├── scrapers/                         # Scrapy Statutory Regulatory Circular Crawler Suite
│   ├── scrapy.cfg                    # Scrapy project configuration
│   ├── runner.py                     # Programmatic crawler runner (npm run crawl:regulations)
│   └── scrapers/
│       ├── redis_store.py            # Redis storage engine with automatic SQLite fallback
│       ├── pipelines.py              # Dual Redis & SQLite Document Vault pipelines
│       ├── settings.py               # Polite crawling, AutoThrottle & concurrency controls
│       └── spiders/                  # Individual regulatory portal spiders
│           ├── rbi_spider.py         # RBI Notifications & Master Directions spider
│           ├── sebi_spider.py        # SEBI Circulars & Demat Transmission spider
│           ├── epfo_spider.py        # EPFO Form 20 Death Claim Directives spider
│           └── irdai_spider.py       # IRDAI Policyholder Protection Circulars spider
│
├── larp/                             # Archived non-app markdown files, hackathon notes & audit logs
│   ├── README.md                     # Directory manifest and guide
│   ├── future.md                     # Initial roadmap brainstorming document
│   ├── BACKEND_CHANGES_AUDIT.md      # Historical audit trails
│   ├── round2/                       # Round 2 hackathon contribution reports
│   └── round3/                       # Round 3 audit summaries and frontend reviews
│
├── scripts/                          # Cross-platform monorepo diagnostic and execution tools
│   ├── doctor.js                     # Monorepo self-diagnostic verification script
│   └── run-python.js                 # Cross-platform .venv Python resolution runner
├── package.json                      # Monorepo orchestration scripts
└── README.md                         # Architecture documentation
```

---

## Scrapy Regulatory Intelligence & Storage Architecture

Government regulatory portals update asynchronously. Asset Bridge monitors circulars, master directions, and gazette notifications across all target authorities.

### Redis Storage vs. Embedded SQLite Document Vault

| Storage Tier | Technology | Key Capabilities | Best Used For |
| :--- | :--- | :--- | :--- |
| **Tier 1 (In-Memory / Queue)** | **Redis** | Sub-millisecond hashing (`regulation:<sha256>`), O(1) URL deduplication sets (`seen_urls`), and real-time Pub/Sub stream queues. | Multi-worker distributed crawling across several machines; real-time event broadcasting to SSE/WebSocket subscribers. |
| **Tier 2 (Embedded Search)** | **SQLite FTS5 (WAL Mode)** | Zero external daemon requirement, full transactional ACID durability, and built-in BM25 full-text search indexing. | Core AI RAG knowledge retrieval, offline reliability on developer machines, and CI/CD pipelines. |
| **Tier 3 (Audit Archive)** | **JSON Lines (`.jsonl`)** | Append-only plain text log (`scrapers/data/regulations.jsonl`). | Instant inspection via command line tools (`jq`, `grep`, `tail`). |

### Automatic Failover Strategy
The crawler incorporates a self-healing storage pipeline in `scrapers/scrapers/pipelines.py`:
1. If Redis is running and reachable (`REDIS_ENABLED=true`), the spider caches every crawled circular into Redis and pushes to the stream queue.
2. If Redis is offline or not installed, the crawler logs a clean notification and automatically persists the circular into the **SQLite Document Vault** with FTS5 search indexing and appends to `scrapers/data/regulations.jsonl`. No crawl job ever crashes due to missing infrastructure.

---

## Email Dispatch Architecture

Statutory asset claiming dossiers contain confidential legal data and generated PDF attachments. The email system in `fastapi-backend/app/email_sender/` operates a resilient multi-tier delivery strategy:

1. **Primary: Google Workspace / Gmail SMTP with App Password**:
   - Transmits publication-grade MIME multipart HTML with the binary `Asset_Bridge_Claiming_Dossier_*.pdf` attached directly to real inboxes via `smtp.gmail.com:587` with STARTTLS.
2. **Secondary: Twilio Comms Native Email API**:
   - Native integration with `https://comms.twilio.com/v1/Emails` via HTTP Basic Auth (`ACCOUNT_SID:AUTH_TOKEN`).
3. **Tertiary: Twilio SendGrid Web API v3**:
   - Web API delivery via `https://api.sendgrid.com/v3/mail/send` with base64 PDF attachment.
4. **Quaternary: Twilio SMS Alerts**:
   - Real-time SMS dispatch via Twilio Messages API notifying the claimant or heir with a tracking ID upon email dispatch.
5. **Fallback: Local Outbox Mock Mode**:
   - When offline or unconfigured, writes full `.eml` RFC 822 messages to `fastapi-backend/data/outbox/` with a one-click download endpoint.

---

## Quick Start (Monorepo Orchestration)

### Prerequisites
* **Node.js**: 20+ (with npm)
* **Python**: 3.11+ (virtual environment configured in `.venv`)

### 1. Single-Command Launch (Backend + Frontend)

From the project root directory, run:

```bash
# Starts both FastAPI (:8000) and Vite React (:5173) concurrently
npm run dev
```

* **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
* **Backend API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Available Monorepo Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launch both FastAPI backend and Vite frontend concurrently |
| `npm run dev:backend` | Launch FastAPI backend with live reload on `http://127.0.0.1:8000` |
| `npm run dev:frontend` | Launch Vite frontend on `http://localhost:5173` |
| `npm run doctor` | Run monorepo self-diagnostic health check (Python, SQLite, Node, Ports, Env) |
| `npm run test` | Run complete backend pytest suite + frontend typecheck & build |
| `npm run test:backend` | Run 31-suite backend test harness (`pytest fastapi-backend`) |
| `npm run test:frontend` | Build and typecheck React frontend (`tsc -b && vite build`) |
| `npm run poll:regulations` | Run Phase 1 lightweight statutory feed poller (RBI, SEBI, EPFO, IRDAI) |
| `npm run crawl:regulations` | Run Phase 2 Scrapy crawler suite with hybrid Redis & SQLite storage |
| `npm run seed` | Seed all 5 personas, estate cases, documents, and chat sessions |
| `npm run seed:reset` | Reset SQLite tables and reseed all demo personas |
| `npm run seed:raghavan` | Seed primary demo persona (Raghavan Sundaram) |
| `npm run seed:priya` | Seed millennial tech employee persona (Priya Sharma) |

---

## Automated Test Harness & Verification

The backend test suite covers 100% of core operational pathways across 31 automated tests:

```bash
node scripts/run-python.js -m pytest fastapi-backend -v
```

1. **`test_core.py`**: Authentication tokens, bcrypt hashing, public identity resolution.
2. **`test_database.py`**: SQLite WAL mode, foreign keys, transaction rollback, FTS5 full-text indexing.
3. **`test_pipeline.py`**: Deterministic 7-step asset aggregation and duplicate reconciliation.
4. **`test_mock_data.py`**: Persona consistency, procedural PAN generation, seed idempotent verification.
5. **`test_pdf_generator.py`**: Publication-grade vector PDF generation, multi-page canvas, vault indexing.
6. **`test_email_dispatch.py`**: Google App Password SMTP delivery, Twilio Comms native API, Twilio SendGrid payloads, and outbox fallback.
7. **`test_regulations_crawler.py`**: Regulatory circular ingestion, FTS5 search, lightweight pollers, Scrapy pipeline processing, and Redis store failover.

---

## The Core 7-Step Asset Processing Pipeline

All financial records pass through a deterministic, auditable 7-step processing pipeline:

```
[ Step 1: Input Validation ]
      | (Enforce strict PAN regex and 4th-char entity code check; reject malformed input)
      v
[ Step 2: Identity Matching ]
      | (Calculate match confidence; isolate partial matches; tag simulated provenance)
      v
[ Step 3: Asset Discovery ]
      | (Query records across all 7 regulators: RBI, EPFO, IRDAI, SEBI, LIC, PFRDA, DOP)
      v
[ Step 4: Asset Normalization ]
      | (Map diverse feeds into uniform NormalizedAsset Pydantic models with typed enums)
      v
[ Step 5: Duplicate Detection ]
      | (Deterministic rule matching; flag duplicates without destructive deletion)
      v
[ Step 6: Financial Analysis ]
      | (Calculate verifiable clean total strictly on unique assets + audit nominee gaps)
      v
[ Step 7: Report Generation ]
        (Return structured ConsolidatedReport: summary, duplicates, findings, limitations)
```

---

## Legal and Compliance Notice

*Succession checklists and AI-generated guidance provide educational information based on statutory regulations (Hindu Succession Act, Indian Succession Act, EPFO Guidelines, and RBI Master Circulars). Users must confirm specific institutional requirements before submitting formal claim paperwork.*
