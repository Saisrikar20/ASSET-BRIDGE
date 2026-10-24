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
| Life plan | ProjectionLab-style planner: income, expenses and milestones (education, wedding, car every N years…) on top of mapped holdings. 1,000-path Monte Carlo → chance of success, fan chart, financial-independence age, "levers" (retire later, spend less…), year-by-year table | `/app/plan` |
| Life at a glance | Lifespan dial (inspired by Kokonut UI's Time Zone Planner): one ring per family member coloured by life phase (school, college, working, retired), milestones on the rim, and a window you drag round to inspect any year or span — each person's age and phase, net worth, income and spending. *Find best retirement age* searches for the earliest age with an 85%+ chance of success | `/app/plan` → Timeline |
| Cash flow & tax | Sankey of each year's money (income → tax, expenses, milestones, contributions, surplus / withdrawals) with Indian income tax under the new or old regime (FY 2025-26 slabs) and a regime comparison | `/app/plan` → Cash flow |
| Legacy | What the family would inherit at any age (investments + life cover), how much flows through a valid nominee vs needs a legal-heir certificate, and each heir's share | `/app/plan` → Legacy |
| Progress | Net-worth snapshots charted against a saved baseline projection — ahead / behind plan | `/app/plan` → Progress |
| Forecast | Month-by-month projection of the whole twin by asset class (conservative / base / optimistic, inflation, SIP step-up, reclaim idle money) + portfolio analysis: allocation, liquidity, idle-money cost, blended return | `/app/forecast` |
| Invest | 19 Indian investment options (PPF, VPF, NPS, SCSS, SSY, NSC, KVP, POMIS, RBI bonds, G-Secs, FDs, index/flexi/ELSS/hybrid/debt funds, gold ETF, SGB, REITs) — add any to a saved plan that feeds the forecast | `/app/invest` |

## Architecture

```
client/      React + TypeScript + Vite + Tailwind      :5173  (proxies /api and /ws)
server/      Node.js + Express REST + WebSockets        :4000
ai-service/  Python + FastAPI, RAG over knowledge/*.md  :8001  (Gemini / OpenAI / extractive fallback)
```

- **Regulator data is simulated** (`server/src/data/regulators.js`). The demo PAN `ABCPI1234K` returns a hand-built portfolio that triggers every alert type; any other valid PAN gets a deterministic synthetic portfolio.
- **Persistence** is a JSON file (`server/data/db.json`) behind a tiny store interface (`server/src/lib/store.js`) — the seam for Supabase (Postgres + Auth) and MongoDB.
- **Life simulator**: `server/src/lib/lifesim.js` (seeded Monte Carlo, drawdown order cash → debt → gold → equity → EPF/PPF after retirement → NPS from 60) and `server/src/lib/tax.js` (Indian income tax).
- **UI components**: the Detent Dial (every percentage input, and the chance-of-success gauge) and Avatar Picker are vendored from [Kokonut UI](https://kokonutui.com) (MIT) in `client/src/components/kokonutui/`, with small local changes noted in each file header.
- **Glow & theme**: stat cards use Aceternity UI's [Glowing Effect](https://ui.aceternity.com/components/glowing-effect) (`client/src/components/aceternity/`). Dark mode is a `.dark` class on `<html>` (sidebar / header toggle, remembered per browser, defaults to the OS setting); `client/src/index.css` remaps the colour tokens rather than adding `dark:` variants everywhere, and charts read `--chart-*` / `--series-*` variables.
- **Forecast engine**: `server/src/lib/forecast.js`; option catalog and return assumptions in `server/src/data/options.js` (small-savings rates change quarterly — update them there).
- **Succession rules**: structured checklists in `server/src/data/succession.js`; long-form guidance for the AI in `ai-service/knowledge/`.

## Run it

Requires Node 20+ and Python 3.11+.

```bash
# 1. API
cd server && npm install && npm run dev

# 2. AI service (new terminal)
cd ai-service && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
GEMINI_API_KEY=...  .venv/bin/uvicorn main:app --port 8001   # key optional

# 3. Web (new terminal)
cd client && npm install && npm run dev
```

Open http://localhost:5173 → **Try the live demo**.

## Demo script (≈3 min)

1. **Try the live demo** → Verify → *Fill demo identity* → *Verify with all regulators* — Canara Bank shows a partial match ("R. Iyer").
2. Aggregate → *Approve & fetch from 5 regulators* — watch alerts stream in live (toasts + sidebar badge).
3. Dashboard — ₹1.27 Cr mapped, ~₹81 L at risk. Alerts → *Update nominee* → quick-pick Meenakshi → resolved live.
4. Reunite → *Send death registration* → case ID appears, heirs notified.
5. Open the case → Tamil Nadu checklist (Legal Heir Certificate from Tahsildar, Form 20 / 10D / 5(IF), LIC Claim Form A, MF transmission…). Ask the AI guide a question.
6. Open `/heir` in a private window with the case ID and heir PAN `ABCPI5678M` (Meenakshi) or `BCDPI4321Q` (Divya) — the heir sees the same case and can tick off steps.

7. Forecast & analysis — switch scenarios, drag the horizon, toggle *In today's rupees*; hover the chart. Investment options → add a SIP and watch the projection change.

8. Life plan — 76% chance of success; *Levers* shows retiring at 59 lifts it to 96%. Click a year for its cash-flow Sankey and tax; Legacy shows what each heir would get; Progress compares a year of (demo) snapshots against the baseline.

*Reset demo* on the dashboard puts everything back.

## Production path

- Real data via RBI Account Aggregator FIPs (consent artefact shape already mirrors ReBIT), then regulator APIs (EPFO, IRDAI, SEBI).
- Death events from the Civil Registration System linked to PAN/Aadhaar.
- Supabase Auth + Postgres for users/holdings/cases, MongoDB for paperwork metadata.
- Deploy: Vercel (client) · Render/Railway (server, ai-service).

> Succession guidance is general information, not legal advice. Requirements vary by institution and change over time.
