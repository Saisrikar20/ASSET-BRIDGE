# Asset Bridge
### The Unified Financial Twin and Autonomous Succession Engine for Indian Families
**Dexathon 2026 -- Round 2**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)]()
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
1. **While Alive**: Aggregates institutional holdings under ReBIT-style consent, normalizes multi-regulator data, audits for nominee gaps in real time, and runs stochastic life projections.
2. **Upon Death**: Detects death events via the Civil Registration System (CRS), opens an automated succession case, alerts legal heirs, and generates state-specific legal claim roadmaps with an embedded AI legal assistant.

---

## System Architecture

Asset Bridge is built as a hardened, high-throughput full-stack system:

```
+------------------------------------------------------------------------+
|                        React 19 + TypeScript Client                    |
|   (Vite / Tailwind CSS v4 / Code-Split Chunks / Motion Animations)     |
|   Port: 5173  (Proxies /api and /ws to Backend)                        |
+-----------------------------------+-+----------------------------------+
                                    | HTTP / WebSocket (/ws)
                                    v
+------------------------------------------------------------------------+
|                   Unified Python FastAPI Backend (:4000)               |
+------------------------------------------------------------------------+
|  1. Core Layer (app/core)                                              |
|     - HMAC-SHA256 Auth and JWT Dependency Injection                    |
|     - Regulatory Metadata and Demographics Engine                      |
|     - Real-time WebSocket Alert Dispatcher (/ws)                       |
|     - Atomic Thread-Safe Store (data/db.json)                          |
+------------------------------------------------------------------------+
|  2. Aggregation and Pipeline Layer (app/aggregation)                   |
|     - Deterministic 7-Step Asset Processing Pipeline                   |
|     - Strict PAN Regex and ITD Entity Code Validator                   |
|     - Confidence-Scored Identity Matching (Exact / Partial / Mismatch) |
|     - Multi-Regulator Asset Discovery and Typed Normalization          |
|     - Non-Destructive Duplicate Detection (Zero Double-Counting)       |
|     - Real-time Nominee Gap Auditing and Risk Categorization           |
|     - In-Process BM25 Legal Succession RAG Assistant                   |
+------------------------------------------------------------------------+
|  3. Wealth Simulation Layer (app/simulation)                           |
|     - 19 Indian Investment Instruments Catalog                         |
|     - Month-by-Month Compound Wealth Forecaster                        |
|     - Stochastic Monte Carlo Life and Retirement Simulator (300 Runs)  |
|     - Portfolio Allocation and Idle-Money Cost Analyzer                |
+------------------------------------------------------------------------+
```

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
* **In-Process BM25 RAG**: The legal succession assistant operates directly within the FastAPI process over 8 statutory knowledge guides, executing in **< 5ms** with zero network failure mode and offline fallback.

---

## Key Modules and Endpoints

| Category | Route | Purpose | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Verify** | `/app/verify` | Multi-Regulator Identity Cross-Check | Cross-matches PAN, Name, and DOB against regulatory schemas; scores confidence and flags partial discrepancies. |
| **Aggregate** | `/app/aggregate` | Account Aggregator Consent | ReBIT-style consent handle creation; multi-regulator asset discovery and automatic ingestion. |
| **Alerts** | `/app/alerts` | Real-time Nominee Gap Auditing | WebSocket alerts for missing nominees, deceased nominees, minor nominees without appointed guardians, and dormant/inoperative accounts. |
| **Reunite** | `/app/reunite` | Civil Registration System (CRS) Link | Ingests death events, instantiates an estate succession case, and notifies legal heirs via SMS/Email. |
| **Transfer** | `/app/cases/:id` | Estate Settlement Checklist | State-specific succession requirements (e.g., Tahsildar Legal Heir Certificate in TN vs. Civil Court Succession Certificate in MH) + AI Assistant. |
| **Heir Portal** | `/heir` | Dedicated Claimant View | Secure access for legal heirs using Case ID + Heir PAN to track and tick off claim steps. |
| **Forecast** | `/app/forecast` | Portfolio Projection | Month-by-month compound growth across asset classes with inflation adjustment and SIP step-up. |
| **Invest** | `/app/invest` | Investment Catalog | Curated database of 19 Indian savings and investment instruments (PPF, VPF, NPS, SGBs, mutual funds). |
| **Life Plan** | `/app/plan` | Monte Carlo Life Simulator | 300-path stochastic simulation calculating financial independence age, success probability, and multi-generational legacy. |

---

## Quick Start and Running Locally

### Prerequisites
* **Python**: 3.11+ (tested on Python 3.11, 3.12, and 3.14)
* **Node.js**: 20+ (with npm)
* **PowerShell** (Windows) or **Bash** (Linux/macOS)

---

### Option 1: One-Click Launch (Recommended for Windows)

In two separate PowerShell terminals:

```powershell
# Terminal 1: Start FastAPI Backend (Port 4000)
.\start-backend.ps1

# Terminal 2: Start React Frontend (Port 5173)
.\start-frontend.ps1
```

---

### Option 2: Manual Step-by-Step Launch

#### 1. Start the FastAPI Unified Backend
```bash
# Navigate to the backend directory
cd fastapi-backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 4000
uvicorn app.main:app --host 127.0.0.1 --port 4000 --reload
```

#### 2. Start the React Frontend (New Terminal)
```bash
# Navigate to client directory
cd client

# Install packages
npm install

# Start Vite dev server on port 5173
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## Automated Testing and Verification

Asset Bridge includes an automated test harness covering validation edge cases, duplicate handling, financial arithmetic, and security:

```bash
# Run core foundation tests
python fastapi-backend/test_core.py

# Run complete 7-step pipeline and reliability tests
python fastapi-backend/test_pipeline.py
```

### Test Coverage Highlights:
* **Input Validation**: Valid/invalid PAN syntax, 4th-char entity validation, empty strings, case/whitespace sanitization.
* **Identity Matching**: Exact matches, partial name discrepancies, complete mismatches, simulated provenance tagging.
* **Asset Discovery and Normalization**: Multi-regulator retrieval across all 7 regulators, Pydantic enum validation.
* **Duplicate Detection**: Exact reference and heuristic duplicate detection, verifying non-destructive preservation.
* **Double-Counting Prevention**: Validating that `verifiableTotal` strictly excludes duplicate assets.
* **Succession and AI RAG**: In-process BM25 statutory retrieval and extractive fallback.
* **Security and Auth**: Unauthorized access rejection (`401`), malformed JSON payload handling (`400`).

**Test Results:** **100% PASS RATE across 9 test suites.**

---

## 3-Minute Live Jury Demo Script

1. **Verify (`/app/verify`)**: Click *"Fill demo identity"* for Raghavan (`ABCPI1234K`) -> Click *"Verify with all regulators"*. Notice Canara Bank highlights a partial name discrepancy (`R. Raghavan`) scored at 65% and isolated from confirmed identities.
2. **Aggregate (`/app/aggregate`)**: Click *"Approve and fetch from 5 regulators"*. Watch holdings aggregate and real-time nominee alerts stream in via WebSockets.
3. **Alerts (`/app/alerts`)**: Navigate to Alerts -> Click *"Update nominee"* on Indian Bank FD -> Assign *"Meenakshi (Spouse)"* -> Watch the alert resolve live with instant net-worth recalculation.
4. **Reunite (`/app/reunite`)**: Submit a Civil Registration System (CRS) death report -> Case `AB-XXXX` is created, and legal heirs (Meenakshi and Divya) receive notifications.
5. **Transfer / Case View (`/app/cases/:id`)**: Review the Tamil Nadu legal heir roadmap: Legal Heir Certificate from Tahsildar, Form 20 EPF settlement, LIC Claim Form A. Query the integrated AI legal guide.
6. **Heir Portal (`/heir`)**: Open `/heir` in a private window with Case ID and Heir PAN `ABCPI5678M` -> The heir securely logs in to view and tick off claim steps.
7. **Forecast and Life Plan (`/app/plan`)**: Run the Monte Carlo simulation -> 84% success rate; adjust retirement levers to see financial independence age dynamically shift.

---

## Dexathon 2026 Team and Ownership

* **Asvand**: Product Architecture, User Journey, UI/UX Polish and Frontend Integration.
* **Sai**: Backend Engineering, 7-Step Asset Pipeline, System Integration, Reliability and Automated Testing.
* **Shajith**: Presentation Visuals, Security Risk Registers, and Statutory Succession Documentation.

---

## Legal and Compliance Notice

*Succession checklists and AI-generated guidance provide educational information based on statutory regulations (Hindu Succession Act, Indian Succession Act, EPFO Guidelines, and RBI Master Circulars). Users must confirm specific institutional requirements before submitting formal claim paperwork.*
