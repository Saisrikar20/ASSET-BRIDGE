# Asset Bridge

**A financial twin that maps a person's holdings across every regulator while they're alive — and reunites their family with everything left behind.**

₹94,000+ crore of Indian families' money sits unclaimed across banks, EPF, insurance and mutual funds, split across five regulators (RBI, EPFO, IRDAI, SEBI, LIC). Asset Bridge also maps NPS (PFRDA) and India Post small savings that never share data. When someone dies, nothing connects their death to their money. Asset Bridge replaces a multi-month chase across five bureaucracies with one automated process.

| Step | What it does | Where |
|---|---|---|
| 01 Verify | Cross-checks name / DOB / PAN against every regulator's records and flags mismatches | `/app/verify` |
| 02 Aggregate | Account-Aggregator-style consent artefact → fetches holdings from each regulator | `/app/aggregate` |
| 03 Alert | Real-time (WebSocket) nominee-gap alerts: missing / deceased / minor nominee, inoperative & unclaimed accounts, name mismatch, stale KYC | `/app/alerts` |
| 04 Reunite | A Civil Registration System death event matched by PAN opens an estate case and notifies every heir | `/app/reunite`, `/heir` |
| 05 Transfer | State-specific, per-holding succession checklist (forms, documents, authority) + AI guide | `/app/cases/:id` |
| Life plan | ProjectionLab-style planner: income, expenses and milestones on top of mapped holdings. 1,000-path Monte Carlo → chance of success, fan chart, financial-independence age, "levers", year-by-year table | `/app/plan` |
| Life at a glance | Lifespan dial: one ring per family member coloured by life phase (school, college, working, retired), milestones on the rim | `/app/plan` → Timeline |
| Cash flow & tax | Sankey of each year's money with Indian income tax under the new or old regime (FY 2025-26 slabs) | `/app/plan` → Cash flow |
| Legacy | What the family would inherit at any age, how much flows through a valid nominee vs needs a legal-heir certificate | `/app/plan` → Legacy |
| Progress | Net-worth snapshots charted against a saved baseline projection | `/app/plan` → Progress |
| Forecast | Month-by-month projection of the whole twin by asset class + portfolio analysis | `/app/forecast` |
| Invest | 19 Indian investment options (PPF, VPF, NPS, SCSS, SSY, NSC, KVP, POMIS, RBI bonds, G-Secs, FDs, mutual funds, gold ETF, SGB, REITs) | `/app/invest` |

## Architecture

```
client/           React 19 + TypeScript + Vite + Tailwind CSS    :5173  (proxies /api and /ws)
fastapi-backend/  Unified Python FastAPI Backend                :8000  (REST, WebSockets, RAG)
```

- **Unified FastAPI Backend**: Ingests identity, handles ReBIT-style consent, runs the 7-step core asset pipeline, runs Monte Carlo simulations and state-aware succession workflows.
- **RAG Succession Guidance**: BM25 lexical search over `fastapi-backend/knowledge/*.md` with Gemini/OpenAI API and extractive fallback.
- **Persistence**: Debounced JSON store behind `fastapi-backend/app/module1_core/store.py`, designed as an abstraction seam for PostgreSQL / Supabase.
- **UI Components**: High-fidelity Kokonut UI dials, Aceternity UI lighting effects, and Tailwind CSS v4 dynamic theming.

## Run it

Requires Node 20+ and Python 3.11+.

```bash
# 1. Unified FastAPI Backend
cd fastapi-backend
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 2. Client Frontend (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173 → **Try the live demo**.

## Demo script (≈3 min)

1. **Try the live demo** → Verify → *Fill demo identity* → *Verify with all regulators* — Canara Bank shows a partial match ("R. Raghavan").
2. Aggregate → *Approve & fetch from 5 regulators* — watch alerts stream in live (toasts + sidebar badge).
3. Dashboard — ₹1.27 Cr mapped, ~₹81 L at risk. Alerts → *Update nominee* → quick-pick Meenakshi → resolved live.
4. Reunite → *Send death registration* → case ID appears, heirs notified.
5. Open the case → Tamil Nadu checklist (Legal Heir Certificate from Tahsildar, Form 20 / 10D / 5(IF), LIC Claim Form A, MF transmission…). Ask the AI guide a question.
6. Open `/heir` in a private window with the case ID and heir PAN `ABCPI5678M` (Meenakshi) or `BCDPI4321Q` (Divya) — the heir sees the same case and can tick off steps.
7. Forecast & analysis — switch scenarios, drag the horizon, toggle *In today's rupees*; hover the chart.
8. Life plan — 76% chance of success; *Levers* shows retiring at 59 lifts it to 96%.

## Production Path

- Real data via RBI Account Aggregator FIPs (consent artefact shape mirrors ReBIT), then regulator APIs (EPFO, IRDAI, SEBI).
- Death events from the Civil Registration System linked to PAN/Aadhaar.
- Supabase Auth + PostgreSQL with Row-Level Security for users/holdings/cases.
- Deploy: Vercel (client) · Render / Railway (fastapi-backend).

> Succession guidance is general information, not legal advice. Requirements vary by institution and change over time.
