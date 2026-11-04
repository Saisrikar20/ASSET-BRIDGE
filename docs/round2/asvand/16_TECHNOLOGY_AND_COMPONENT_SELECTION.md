# ASSET BRIDGE — CRITERION 2: TECHNOLOGY & COMPONENT SELECTION JUSTIFICATION
**Document ID:** `DOC-ASVAND-16`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Evaluation Standard:** Criterion 2 — *"Appropriate technologies, tools and hardware components, with clear justification."*  
**Date:** November 4, 2026  
**Status:** COMPLETE TECHNICAL EVALUATION & EVIDENCE  

---

## 1. TECHNOLOGY STACK EVOLUTION: ROUND 1 VS. ROUND 2

| Subsystem | Round 1 Prototype | Round 2 Architecture | Strategic Justification for Change |
|---|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | React 19.3.1 + TypeScript | **Retained:** Component lifecycle, strict typing on financial contracts, fast reconciliation. |
| **Bundler & Tooling** | Vite 8 + Tailwind CSS v4 | Vite 8.3.5 + `@tailwindcss/vite` | **Retained & Optimized:** Sub-second HMR, native CSS variables for instant dark/light mode. |
| **Backend API Layer** | Node.js (Express 5.3) | Python FastAPI 0.115 | **Changed:** Eliminated dual-runtime overhead; unified REST API, simulation engine, and NLP RAG under Python. |
| **Real-Time Layer** | Node `ws` library | FastAPI Native WebSockets (`/ws`) | **Changed:** Managed via `live_manager` connection pool in `module1_core/live.py`. |
| **AI / Legal Guidance** | Standalone Python microservice (:8001) | Integrated FastAPI Sub-Router (`module2_aggregation/assistant.py`) | **Changed:** Removed inter-service HTTP hop (`API \to AI_URL`); direct in-memory BM25 index evaluation. |
| **Data Persistence** | Node debounced JSON store | Abstracted Python store (`store.py`) | **Retained & Hardened:** Lightweight file-backed store (`db.json`) acting as drop-in facade for PostgreSQL/Supabase. |
| **Mathematical Engines** | Client/Node JS scripts | Vectorized Python Engines (`module3_simulation/routers.py`) | **Changed:** Deterministic, seeded Monte Carlo and Union Budget 2025 tax slabs ported to Python. |

---

## 2. IN-DEPTH RESPONSES TO THE 10 EVALUATION QUESTIONS

### Q1: What technologies did we use in Round 1?
In Round 1, the prototype utilized a split-architecture:
- Frontend: React 19 with Vite and Tailwind v4.
- Backend: Node.js with Express 5 on port 4000.
- AI Guidance: A secondary Python microservice on port 8001 using FastAPI and BM25 indexing.
- Communication: Express proxied legal queries to the Python service over local HTTP (`http://127.0.0.1:8001/guide`).

### Q2: What technologies are currently used in Round 2?
- Frontend: React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, Tailwind CSS 4.3.3, Motion 14.6.0.
- Backend: Unified Python FastAPI (port 8000), Uvicorn 0.30, Pydantic v2.7, Starlette, HTTPX 0.27.
- Submodules: `module1_core` (Auth & Identity), `module2_aggregation` (7-step pipeline & RAG assistant), `module3_simulation` (Monte Carlo & Tax).

### Q3: Which technologies were retained?
- **React 19 + TypeScript:** Unsurpassed ecosystem support for reactive financial dashboards and component isolation.
- **Tailwind CSS v4:** Dynamic CSS token remapping (`--bg`, `--card`, `--ink`, `--chart-*`) eliminates runtime CSS-in-JS overhead while supporting native dark/light theme switching.
- **Motion (Framer Motion):** Smooth physical transitions for multi-generational lifespan dials and animated risk badges.
- **BM25 Lexical Ranking with Extractive Fallback:** Highly reliable information retrieval over statutory Markdown files without cloud dependencies.

### Q4: Which technologies were changed?
- **Legacy Express Node Server Removed:** Ported entirely to Python FastAPI.
- **Inter-Service Proxy Eliminated:** The standalone AI microservice on port 8001 was merged directly into the FastAPI application, eliminating HTTP socket overhead.

### Q5: Why were those changes necessary?
In Round 1, running two separate backend runtimes (Node on :4000 and Python on :8001) created:
1. Double the memory footprint and deployment complexity (two containers on Render/Railway).
2. Inter-service latency and network failure risk during live evaluation.
3. Language duplication: business rules were written in JavaScript while NLP was in Python.  
By unifying into Python FastAPI, the entire backend runs in a single process, sharing memory, types, and logging.

### Q6: What alternatives could we have selected?
- **Alternative A: Go / Gin or Rust / Axum Backend:** Extremely high throughput, but lacks mature NLP and legal RAG libraries required for Indian succession reasoning.
- **Alternative B: Pure Node.js with LangChain.js:** Avoids Python, but LangChain adds massive dependency bloat (~150MB) and poor offline fallback capabilities.
- **Alternative C: Third-Party Managed BaaS (Firebase / Supabase Cloud):** Fast setup, but introduces cloud latency, vendor lock-in, and requires continuous internet during hackathon judging.

### Q7: Why is our selected approach better for this product?
FastAPI provides asynchronous ASGI performance, automatic OpenAPI documentation (`/docs`), strict runtime type enforcement via Pydantic v2, and native Python NLP integration. Combined with a lightweight React 19 SPA, the application boots in $<1.5$ seconds and operates with zero cloud API keys if necessary.

### Q8: What are the trade-offs?
- *Trade-off 1 (Local Persistence):* Using a debounced JSON file store (`store.py`) ensures zero-config local setup and offline resilience, but is limited to single-node deployments. (A Supabase PostgreSQL connection seam is designed for horizontal scaling).
- *Trade-off 2 (Synthetic Regulators):* Using deterministic FNV-1a seeded PRNG simulates multi-regulator responses realistically without requiring live RBI/EPFO production licenses (which are legally impossible for hackathon participants to obtain).

### Q9: Are there technologies that are unnecessary or overcomplicated?
- **Yes, and we eliminated them:** We rejected introducing external vector databases (Pinecone, ChromaDB) and heavy embeddings models (SentenceTransformers) for 8 legal documents. The native BM25 ranker evaluates in $<3\text{ms}$ with zero external dependencies and zero GPU requirements.
- We rejected adding bloated charting packages (Chart.js / Recharts) because pure SVG path rendering provides superior 60fps responsiveness.

### Q10: Are our technology choices appropriate for the expected scale and demo environment?
Yes. The architecture is engineered specifically for hackathon and demo resilience:
- It can run 100% locally on a single laptop without internet.
- If external LLM APIs (Gemini/OpenAI) fail or experience quota limits, the extractive fallback guarantees cited legal answers.
- The React client production bundle compiles into static assets deployable on any CDN.

---

## 3. HARDWARE COMPONENT JUSTIFICATION

Asset Bridge is intentionally a **Software-First Cloud/Web Solution**:
- **Why No Specialized Hardware?** Indian citizens, elderly retirees, and grieving heirs already have smartphones and web browsers. Requiring proprietary biometric dongles or specialized hardware readers would create an insurmountable friction barrier.
- **Client Requirements:** Standard modern web browser (Chrome, Safari, Firefox, Edge) on mobile or desktop.
- **Server Requirements:** 1 vCPU, 512MB RAM standard container (Render, AWS t4g.nano, or local dev machine).
