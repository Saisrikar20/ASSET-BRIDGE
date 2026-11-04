# Asset Bridge – Round Evolution Matrix (Round 1 vs. Round 2)
**Author:** Shajith (Architecture & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Overview of Platform Evolution

Between Round 1 and Round 2 of Dexathon 2026, Asset Bridge transitioned from an experimental multi-service hackathon prototype into a hardened, unified estate-planning and financial twin platform. This evolution was driven by three architectural imperatives:
1. **Unified Backend Runtime:** Eliminating Node.js/Python dual-runtime operational overhead by consolidating services onto **Python FastAPI**.
2. **Real-World Ingestion:** Moving beyond static mock catalogs by designing automated **CAMS/KFintech Consolidated Account Statement (CAS)** ingestion.
3. **Institutional & Senior Ergonomics:** Introducing human-centric, senior-first accessibility to make complex financial succession intuitive for elderly asset holders and grieving family members.

---

## 2. 16-Category Comprehensive Evolution Matrix

| # | Dimension / Category | Round 1 Prototype | Round 2 Architecture (Dexathon 2026) | Strategic Impact & Evolution Details |
|---|---|---|---|---|
| **1** | **Backend Runtime** | Node.js (v20+) + Python (3.11+) dual-runtime split. | Unified Python 3.14+ runtime using FastAPI. | Eliminates inter-service HTTP hops between Node and Python; single deployment container. |
| **2** | **Architecture Model** | Split microservice: Node API (`:4000`) + AI Service (`:8001`). | Single unified modular monolith (`fastapi-backend/`). | Solves port-collision bugs, simplifies CORS, and consolidates authentication tokens. |
| **3** | **API Specification & Validation** | Loose Express JavaScript route handlers; ad-hoc JSON validation. | Strongly typed FastAPI routes powered by Pydantic v2 schemas. | Strict request/response validation; automated interactive OpenAPI/Swagger documentation at `/docs`. |
| **4** | **Real-Time Communication** | Node.js `ws` package with basic broadcast loops. | Native Starlette WebSocket endpoints with `ConnectionManager`. | Clean client lifecycle management; support for Redis Pub/Sub scaling in multi-worker environments. |
| **5** | **Data Persistence** | Plain text `server/data/db.json` file storage. | Dual-mode persistence: Supabase (PostgreSQL with RLS) + JSON fallback. | Production-grade relational schema, transactional integrity, and zero-config local demo fallback. |
| **6** | **Asset Ingestion Pipeline** | Hardcoded deterministic synthetic holdings catalog. | Planned CAMS / KFintech CAS statement parser (`/api/upload/cas`). | Enables real-world PDF/Excel statement ingestion with automated portfolio breakdown and alert triggers. |
| **7** | **Identity & PAN Discovery** | Client-heavy mock verification simulation. | Server-side regex pattern validation + 7-regulator discovery broker. | Simulates realistic regulator API boundaries (RBI, EPFO, IRDAI, SEBI, PFRDA, Post Office, Canara Bank). |
| **8** | **Nominee-Gap Alerts** | Hardcoded static list triggered by demo PAN. | Stateful rule engine evaluating missing, deceased, and minor nominees. | Flags accounts at risk of dormancy or statutory DEA Fund transfer before demise. |
| **9** | **Succession & Estate Workflows** | Static text checklists for estate transfer. | Jurisdiction-aware succession roadmap (e.g., Tahsildar vs. Civil Court). | Differentiates legal procedures across Indian states (Tamil Nadu, Karnataka, Maharashtra). |
| **10** | **Financial & Life Simulation** | JavaScript synchronous calculation loop. | Vectorized NumPy/Pandas engine executing 1,000-path Monte Carlo runs. | Simulates realistic lifespan uncertainty, sequential drawdown, and FY 2025-26 Indian tax slabs. |
| **11** | **AI / RAG Architecture** | Ad-hoc text extraction over markdown files. | Multi-tier RAG: Vector search (MiniLM/PGVector) with Gemini/OpenAI router. | Fallback to offline BM25 retrieval ensuring zero-API demo resilience. |
| **12** | **User Experience & Accessibility** | Institutional terminal style; complex circular detent dials. | Senior-first "Family Passbook" mode; WCAG AAA contrast; +/- steppers. | Adapts interface for elderly users (55–80+) with presbyopia, motor tremor, or cognitive fatigue. |
| **13** | **Security & Cryptography** | Unsalted plain SHA-256 password hashing. | Salted Argon2id / bcrypt hashing; JWT bearer auth; DPDP Act compliance. | Sanitizes sensitive PII (PAN, Aadhaar last-4); prevents plain-text exposure in logs. |
| **14** | **Mobile Readiness** | Responsive web layout with desktop-oriented click targets. | Progressive Web App (PWA) manifest; offline caching; 48px touch targets. | Enables installation on mobile phones; facilitates drag-and-drop file upload on tablets. |
| **15** | **Testing & Quality Assurance** | Manual UI walkthroughs; no automated regression suite. | Pytest + FastAPI `TestClient` test harness (`test_module1.py`). | 7 automated test passes covering health, auth, identity verification, showcase, and state resets. |
| **16** | **DevOps & Cloud Deployment** | Dual-service Render blueprint (`render.yaml`) + Netlify config. | Unified Docker container deployed to Render/Railway + Vercel SPA. | Single environment config, predictable build steps, and reduced cold-start latency. |

---

## 3. Detailed Architectural Progression

```
ROUND 1: HYBRID MULTI-RUNTIME PROTOTYPE
┌───────────────────────────┐         ┌───────────────────────────┐
│     React 19 Frontend     │ ──REST─▶│     Node.js Express       │ ──JSON──▶ [db.json Disk]
│       (Vite Port 5173)    │ ◀──WS───│       (Port 4000)         │
└───────────────────────────┘         └─────────────┬─────────────┘
                                                    │ HTTP
                                                    ▼
                                      ┌───────────────────────────┐
                                      │    FastAPI AI Microservice│ ──RAG───▶ [8 Markdown Files]
                                      │       (Port 8001)         │
                                      └───────────────────────────┘

ROUND 2: UNIFIED PYTHON BACKEND & DUAL-MODE STORAGE
┌──────────────────────────────────────┐
│  React 19 Frontend + PWA + Senior UI │
│            (Port 5173)               │
└──────────────────┬───────────────────┘
                   │ REST (/api) & WebSockets (/ws)
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              UNIFIED FASTAPI BACKEND (Port 8000)                │
│  ┌───────────────────────┐ ┌─────────────────────────────────┐  │
│  │ Module 1: Core & Auth │ │ Module 2: Holdings & Succession │  │
│  ├───────────────────────┤ ├─────────────────────────────────┤  │
│  │ Module 3: Monte Carlo │ │ Phase 1: CAS Ingestion Parser   │  │
│  ├───────────────────────┤ ├─────────────────────────────────┤  │
│  │ WebSocket Live Hub    │ │ RAG Succession Guide (Gemini/BM25)│
│  └───────────────────────┘ └─────────────────────────────────┘  │
└──────────────────┬───────────────────────────────┬──────────────┘
                   │                               │
                   ▼                               ▼
       ┌───────────────────────┐       ┌───────────────────────┐
       │ Supabase / PostgreSQL │       │ Local JSON Fallback   │
       │ (Production with RLS) │       │ (Zero-Config Offline) │
       └───────────────────────┘       └───────────────────────┘
```

---

## 4. Key Lessons Learned Across Iterations

1. **Premature Microservices Hurt Hackathons:** Running Node.js on `:4000` and Python on `:8001` created race conditions during local startup, port-binding conflicts on Windows, and duplicate authentication checks. Consolidating into FastAPI simplifies development for the entire team.
2. **Domain Accuracy Outweighs Generic AI:** Generic LLMs often hallucinate succession rules (e.g., claiming a nominee is the absolute owner, whereas Indian Supreme Court precedent dictates nominees are merely trustees for legal heirs). Grounding responses strictly in verified statutory manuals ensures legal accuracy.
3. **Accessibility is a Core Feature:** The target users of Asset Bridge are either elderly asset creators or grieving heirs under extreme distress. Large tap targets, plain language, and high contrast are fundamental architectural requirements.
