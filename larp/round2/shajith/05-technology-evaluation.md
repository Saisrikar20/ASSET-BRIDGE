# Asset Bridge – Technology Evaluation & Trade-off Analysis
**Author:** Shajith (Architecture & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Overview & Evaluation Methodology

This document evaluates the architectural decisions, programming languages, application frameworks, persistence engines, and machine learning components selected for **Asset Bridge Round 2**. Each technology is assessed against four criteria:
1. **Developer Velocity & Hackathon Feasibility:** Can the team ship reliable, testable features rapidly?
2. **Domain Fit for Indian Financial Infrastructure:** Does the stack handle complex statutory rules, PDF statement parsing, and financial simulations?
3. **Operational Simplicity:** Does it minimize deployment friction, cold starts, and inter-service failure modes?
4. **Resilience & Offline Demo Reliability:** Can the application function gracefully without live internet or paid API keys?

---

## 2. Layer-by-Layer Technology Evaluation

### 2.1 Backend Framework: Python FastAPI vs. Node.js Express vs. Go Gin

| Dimension | Python FastAPI (Selected) | Node.js Express (Round 1 Legacy) | Go Gin (Evaluated Alternative) |
|---|---|---|---|
| **Language Runtime** | Python 3.14+ | Node.js 20+ (JavaScript) | Go 1.22+ |
| **Data Validation** | Native Pydantic v2 schemas; strict compile/runtime typing. | Manual manual checks or external Joi/Zod libraries. | Static struct tags with `binding:"required"`. |
| **API Documentation** | Automated Swagger UI (`/docs`) & ReDoc (`/redoc`). | Manual Swagger/Postman specification maintenance. | Requires external `swag` annotations and build tools. |
| **Financial / Math Ecosystem** | World-class (NumPy, SciPy, Pandas for Monte Carlo). | Limited; requires native C++ bindings or slow JS loops. | High raw performance, but limited financial modeling libraries. |
| **AI / NLP Integration** | Native host for PyTorch, LangChain, SentenceTransformers, Gemini SDK. | Dependent on HTTP calls or Python subprocess pipes. | Minimal AI/LLM native ecosystem; requires HTTP wrappers. |
| **Verdict** | **Selected**: Best unified bridge between financial simulation, AI, and APIs. | **Replaced**: Eliminated to avoid dual-runtime operational overhead. | **Rejected**: Unnecessary complexity for hackathon iteration velocity. |

---

### 2.2 Data Persistence: Dual-Mode Supabase (PostgreSQL) vs. Pure MongoDB vs. SQLite

| Dimension | Dual-Mode Supabase + JSON (Selected) | MongoDB Document Store (Evaluated) | Embedded SQLite (Evaluated) |
|---|---|---|---|
| **Architecture** | PostgreSQL with Row-Level Security (RLS) + Local JSON fallback. | Schema-less NoSQL collection store. | Embedded single-file relational database. |
| **Relational Integrity** | Strict Foreign Keys linking Users ➔ Holdings ➔ Alerts ➔ Heirs. | Application-level manual joins; prone to orphan records. | Excellent relational integrity; zero-network local file. |
| **Production Fit** | High; native Auth, PgBouncer pooling, and PGVector extension. | Good for document blobs, weak for financial audits. | Limited concurrency; difficult multi-region deployment. |
| **Demo Resilience** | **Flawless**: Defaults to `data/db.json` when credentials missing. | Requires running Mongo daemon locally or cloud Atlas cluster. | Requires file locking management across async processes. |
| **Verdict** | **Selected**: Guarantees zero-config local run while unlocking production SQL. | **Rejected**: Financial holdings and legal succession require relational schemas. | **Alternative**: Viable for local mode, but JSON store is lighter for rapid mocks. |

---

### 2.3 Real-Time Engine: Starlette Native WebSockets vs. Socket.io vs. Server-Sent Events (SSE)

| Dimension | Starlette WebSockets (Selected) | Socket.io (Node.js Legacy) | Server-Sent Events (SSE) |
|---|---|---|---|
| **Protocol** | Standard RFC 6455 bidirectional WebSocket. | Custom framing over WebSocket with HTTP fallback. | Unidirectional HTTP long-lived text stream. |
| **Client Overhead** | Zero extra dependencies; native browser `WebSocket` API. | Heavy client library (`socket.io-client` ~60KB bundle). | Zero extra dependencies; native `EventSource` API. |
| **Bidirectional Comm** | Supported (heartbeats, token auth, client events). | Supported. | No; client must send separate HTTP POST requests. |
| **Backend Integration** | Built directly into FastAPI without extra middleware. | Requires Node.js engine or third-party Python server. | Simple to implement on FastAPI with `StreamingResponse`. |
| **Verdict** | **Selected**: Minimal footprint, native standard, supported in React via `useLive`. | **Replaced**: Removed alongside Node.js legacy backend. | **Rejected**: Lacks bi-directional signaling for interactive alert resolution. |

---

### 2.4 AI & Knowledge Retrieval: Hybrid RAG Router vs. Heavy LangChain Pipeline

| Dimension | Asset Bridge Hybrid RAG Router (Selected) | Full LangChain / LlamaIndex Pipeline | Cloud Bedrock / Vertex AI Agents |
|---|---|---|---|
| **Architecture** | Lightweight direct client (Gemini/OpenAI) + BM25 local fallback. | Heavy abstraction framework with multi-chain executors. | Fully managed cloud enterprise agent service. |
| **Startup Overhead** | < 100ms initialization; minimal dependency tree. | Heavy dependencies; slow package install (500MB+). | Requires AWS/GCP service roles, IAM setup, and billing. |
| **Zero-API Demo Fallback** | **Yes**: Falls back to deterministic extractive matching from Markdown. | Requires complex custom fallback chain setup. | No; completely fails if internet or cloud credits lapse. |
| **Domain Accuracy** | High; strict prompt boundaries grounded in 8 statutory manuals. | High; but prone to framework abstraction debugging. | High; but vendor-locked to cloud provider formats. |
| **Verdict** | **Selected**: Resilient, transparent, lightning-fast, and demo-safe. | **Rejected**: Excessive abstraction overhead for 8 curated markdown files. | **Rejected**: Incompatible with local zero-config evaluation. |

---

### 2.5 Financial Simulation Engine: NumPy Vectorized Monte Carlo vs. JavaScript Loop

| Dimension | NumPy Vectorized Simulation (Target) | JavaScript Synchronous Loop (Legacy) |
|---|---|---|
| **Execution Performance** | C-optimized vectorized SIMD execution (< 25ms for 1,000 paths). | Single-threaded V8 event-loop blocking (150–350ms). |
| **Statistical Libraries** | Built-in normal distribution, covariance, and fan-chart quartiles. | Manual random number generation and percentile sorting. |
| **Complex Tax Slabs** | Clean tabular vector operations for FY 2025-26 new/old regimes. | Nested imperative `if/else` statements. |
| **Verdict** | **Selected**: Superior accuracy, speed, and analytical credibility. | **Replaced**: Phased out with the legacy Node backend. |

---

## 3. Summary of Selected Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FINAL ROUND 2 TECH STACK                        │
├────────────────────┬───────────────────────────────────────────────────┤
│ Frontend Web & UI  │ React 19, TypeScript, Vite 8, Tailwind CSS v4     │
│ UX / Accessibility │ Senior-First High Contrast Theme, Steppers, PWA   │
│ Backend Framework  │ Python 3.14+, FastAPI, Pydantic v2, Starlette WS   │
│ Persistence Layer  │ Supabase (PostgreSQL with RLS) + Local JSON Fallback│
│ Ingestion Engine   │ CAMS / KFintech CAS Parser (pdfplumber, openpyxl) │
│ Life Simulation    │ NumPy / Pandas Vectorized Monte Carlo (1,000 runs)│
│ AI Knowledge Guide │ RAG (8 Statutory Manuals) + Gemini/OpenAI Router   │
│ Offline Fallback   │ BM25 Local Extractive Document Matcher            │
│ Testing Suite      │ Pytest, FastAPI TestClient (`test_module1.py`)    │
└────────────────────┴───────────────────────────────────────────────────┘
```
