# Asset Bridge
### The Unified Financial Twin and Autonomous Succession Engine for Indian Families
**Dexathon 2026 -- Round 2**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-16%2F16%20Passing%20(100%25)-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg?logo=python&logoColor=white)](https://www.python.org)

---

## Executive Overview

**Rs. 94,000+ crore** of Indian families' hard-earned wealth currently lies dormant and unclaimed across banking deposits, provident funds, life insurance policies, mutual fund folios, and post office schemes. Today, this wealth is trapped across disparate statutory silos:
* **RBI** (Unclaimed Bank Deposits and DEA Fund)
* **EPFO** (Inoperative EPF Accounts and Pension Funds)
* **IRDAI** (Private Insurer Unclaimed Balances)
* **LIC** (Unpaid Matured Policies)
* **SEBI** (Unclaimed Mutual Fund Folios, CDSL/NSDL Demat and IEPF)
* **PFRDA** (National Pension System Tier-I / Tier-II Corpi)
* **DOP** (India Post Small Savings: PPF, NSC, KVP, POMIS)

When a family member passes away, **nothing connects their death to their money**. Families are forced into a grueling, multi-month bureaucratic chase across courts, revenue offices, and institutions.

**Asset Bridge** solves this through a **two-sided financial twin**:
1. **While Alive**: Aggregates institutional holdings under ReBIT-style consent, normalizes multi-regulator data, audits for nominee gaps in real time, generates publication-grade statutory claiming dossiers in PDF format, and runs stochastic life projections.
2. **Upon Death**: Detects death events via the Civil Registration System (CRS), opens an automated succession case, alerts legal heirs, and generates state-specific legal claim roadmaps with an embedded AI legal assistant.

---

## Project Structure

The project is structured as a unified, production-grade monorepo:

```
dexathon2026/
├── client/                           # React 19 + TypeScript + Vite Frontend (:5173)
│   ├── public/                       # Static public assets
│   ├── src/
│   │   ├── components/               # Domain UI cards, dialogs, charts & visual widgets
│   │   │   ├── aceternity/           # Visual effects & lamp hero components
│   │   │   ├── kokonutui/            # Dial & avatar controls
│   │   │   ├── landing/              # Landing page interactive showcases
│   │   │   ├── CaseBody.tsx          # Estate claim workspace & PDF dossier viewer
│   │   │   ├── ForecastChart.tsx     # Portfolio growth visualization
│   │   │   ├── GuideChat.tsx         # Embedded AI statutory guide chat
│   │   │   └── ui.tsx                # Design system primitives & badges
│   │   ├── lib/                      # Typed API clients, WebSocket live sync, auth & formatters
│   │   │   ├── api.ts                # API client with dossier PDF & vault helpers
│   │   │   ├── auth.tsx              # JWT authentication context
│   │   │   ├── format.ts             # INR currency & date formatting
│   │   │   └── live.tsx              # Reactive WebSocket subscription hook
│   │   ├── pages/                    # 14 Full route views (Verify, Aggregate, Alerts, Reunite, etc.)
│   │   ├── App.tsx                   # Top-level router & state provider
│   │   └── main.tsx                  # Client entrypoint
│   ├── package.json                  # Client scripts & dependencies
│   └── vite.config.ts                # Vite dev server with /api and /ws reverse proxies
├── fastapi-backend/                  # High-Throughput Python REST & WebSocket API (:8000)
│   ├── app/
│   │   ├── core/                     # Authentication, SQLite engine, store, live WS, seeder
│   │   │   ├── auth.py               # Password hashing & JWT token validation
│   │   │   ├── db.py                 # SQLite WAL engine with FTS5 search
│   │   │   ├── live.py               # WebSocket broadcast manager
│   │   │   ├── routers.py            # Auth, identity & demo routes
│   │   │   ├── seeder.py             # Multi-persona database seeder
│   │   │   └── store.py              # Thread-safe persistent data store
│   │   ├── aggregation/              # 7-step pipeline, RAG assistant, PDF engine & personas
│   │   │   ├── assistant.py          # NVIDIA NIM / BM25 statutory legal guide
│   │   │   ├── documents.py          # Document vault with chunking & FTS5 search
│   │   │   ├── mock_generator.py     # Procedural portfolio generation for any PAN
│   │   │   ├── models.py             # Pydantic schemas for multi-regulator assets
│   │   │   ├── pdf_generator.py      # ReportLab official statutory claiming PDF engine
│   │   │   ├── personas.py           # 5 Comprehensive Indian investor personas
│   │   │   ├── pipeline.py           # Deterministic 7-step asset processing pipeline
│   │   │   └── routers.py            # Holdings, consents, cases, docs & PDF endpoints
│   │   ├── simulation/               # Monte Carlo wealth forecaster & retirement simulator
│   │   │   ├── catalog.py            # 19 Indian investment instruments catalog
│   │   │   ├── life_model.py         # 300-path stochastic life simulator
│   │   │   └── routers.py            # Simulation & forecasting endpoints
│   │   ├── config.py                 # Environment configurations & filesystem paths
│   │   └── main.py                   # FastAPI app instance, CORS & exception handlers
│   ├── data/                         # Persistent storage
│   │   ├── asset_bridge.db           # SQLite database with WAL & FTS5 virtual tables
│   │   ├── sample_documents/         # Statutory claim affidavits & statements
│   │   └── uploads/                  # Ingested user evidence & generated dossiers
│   ├── knowledge/                    # 8 Statutory regulatory guides (Markdown)
│   ├── scripts/                      # Backend administrative scripts
│   │   └── seed_mock_data.py         # Standalone CLI seeder
│   ├── tests/                        # 16-suite automated test harness
│   │   ├── conftest.py               # Pytest path and environment fixtures
│   │   ├── test_core.py              # Core auth, security and JWT tests
│   │   ├── test_database.py          # SQLite WAL, ACID rollback & FTS5 tests
│   │   ├── test_document_rag.py      # Document vault & multi-source RAG tests
│   │   ├── test_mock_data.py         # Persona integrity & procedural PAN tests
│   │   ├── test_pdf_generator.py     # PDF dossier generation & indexing tests
│   │   └── test_pipeline.py          # 7-step asset pipeline & arithmetic tests
│   ├── pytest.ini                    # Pytest configuration
│   └── requirements.txt              # Backend dependencies
├── scripts/                          # Cross-platform monorepo runners
│   └── run-python.js                 # Cross-platform .venv Python resolution
├── package.json                      # Monorepo orchestration & single-command runners
├── start-backend.ps1                 # PowerShell backend launcher
├── start-frontend.ps1                # PowerShell frontend launcher
└── README.md                         # Project documentation
```

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
| `npm run test` | Run complete backend pytest suite + frontend typecheck & build |
| `npm run test:backend` | Run 16-suite backend test harness (`pytest fastapi-backend`) |
| `npm run test:frontend` | Build and typecheck React frontend (`tsc -b && vite build`) |
| `npm run seed` | Seed all 5 personas, estate cases, documents, and chat sessions |
| `npm run seed:reset` | Reset SQLite tables and reseed all demo personas |
| `npm run seed:raghavan` | Seed primary demo persona (Raghavan Sundaram) |
| `npm run seed:priya` | Seed millennial tech employee persona (Priya Sharma) |

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

### Key Engineering Principles:
* **Zero Double-Counting**: Potential duplicates are flagged (`isDuplicate=True`, `duplicateOf=primary.id`) rather than erased. The clean `verifiableTotal` excludes duplicate values while preserving a complete regulatory audit trail.
* **Strict Identity Safeguard**: Partial name discrepancies (e.g., `R. Raghavan` vs `Raghavan`) receive a 0.65 confidence rating and are **never** elevated to verified status.
* **Publication-Grade PDF Engine**: ReportLab-based vector PDF generator creates official succession claiming dossiers complete with legal heir entitlement breakdowns, statutory claim forms (Form 20, DA-2, Form A), and legal affidavits.
* **In-Process BM25 & NVIDIA NIM RAG**: The legal succession assistant operates over both statutory knowledge guides and user-uploaded estate documents indexed into SQLite FTS5.

---

## Key Pages and Endpoints

| Category | Route | Purpose | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Verify** | `/app/verify` | Multi-Regulator Identity Cross-Check | Cross-matches PAN, Name, and DOB against regulatory schemas; scores confidence and flags partial discrepancies. |
| **Aggregate** | `/app/aggregate` | Account Aggregator Consent | ReBIT-style consent handle creation; multi-regulator asset discovery and automatic ingestion. |
| **Alerts** | `/app/alerts` | Real-time Nominee Gap Auditing | WebSocket alerts for missing nominees, deceased nominees, minor nominees without appointed guardians, and dormant accounts. |
| **Reunite** | `/app/reunite` | Civil Registration System (CRS) Link | Ingests death events, instantiates an estate succession case, and notifies legal heirs via SMS/Email. |
| **Transfer** | `/app/cases/:id` | Estate Settlement Checklist | State-specific succession requirements (e.g., Tahsildar Legal Heir Certificate in TN vs. Succession Certificate in MH) + AI Assistant. |
| **Claim Dossier** | `/api/reports/claiming-dossier/pdf` | Statutory Claiming Dossier (PDF) | Generates official claim packet with institution-by-institution forms and legal heir signature blocks. |
| **Heir Portal** | `/heir` | Dedicated Claimant View | Secure access for legal heirs using Case ID + Heir PAN to track and tick off claim steps. |
| **Forecast** | `/app/forecast` | Portfolio Projection | Month-by-month compound growth across asset classes with inflation adjustment and SIP step-up. |
| **Life Plan** | `/app/plan` | Monte Carlo Life Simulator | 300-path stochastic simulation calculating financial independence age, success probability, and multi-generational legacy. |

---

## 3-Minute Live Jury Demo Script

1. **Verify (`/app/verify`)**: Click *"Fill demo identity"* for Raghavan (`ABCPI1234K`) -> Click *"Verify with all regulators"*. Notice Canara Bank highlights a partial name discrepancy (`R. Raghavan`) scored at 65% and isolated from confirmed identities. Click *"Download Claim Dossier (PDF)"* to inspect the generated dossier.
2. **Aggregate (`/app/aggregate`)**: Click *"Approve and fetch from 5 regulators"*. Watch holdings aggregate and real-time nominee alerts stream in via WebSockets. Click *"Export Claim Schedule (PDF)"*.
3. **Alerts (`/app/alerts`)**: Navigate to Alerts -> Click *"Update nominee"* on Indian Bank FD -> Assign *"Meenakshi (Spouse)"* -> Watch the alert resolve live with instant net-worth recalculation.
4. **Reunite (`/app/reunite`)**: Submit a Civil Registration System (CRS) death report -> Case `AB-XXXX` is created, and legal heirs (Meenakshi and Divya) receive notifications.
5. **Transfer / Case View (`/app/cases/:id`)**: Review the Tamil Nadu legal heir roadmap: Legal Heir Certificate from Tahsildar, Form 20 EPF settlement, LIC Claim Form A. Click *"Download Claim Dossier (PDF)"* to generate the case-specific packet. Query the integrated AI legal guide.
6. **Heir Portal (`/heir`)**: Open `/heir` with Case ID `AB-4581` and Heir PAN `ABCPI5678M` -> The heir securely logs in to view and tick off claim steps.
7. **Forecast and Life Plan (`/app/plan`)**: Run the Monte Carlo simulation -> 84% success rate; adjust retirement levers to see financial independence age dynamically shift.

---

## Dexathon 2026 Team and Ownership

* **Asvand**: Product Architecture, User Journey, UI/UX Polish and Frontend Integration.
* **Sai**: Backend Engineering, 7-Step Asset Pipeline, System Integration, Reliability and Automated Testing.
* **Shajith**: Presentation Visuals, Security Risk Registers, and Statutory Succession Documentation.

---

## Legal and Compliance Notice

*Succession checklists and AI-generated guidance provide educational information based on statutory regulations (Hindu Succession Act, Indian Succession Act, EPFO Guidelines, and RBI Master Circulars). Users must confirm specific institutional requirements before submitting formal claim paperwork.*
