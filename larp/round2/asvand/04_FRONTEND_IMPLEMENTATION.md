# ASSET BRIDGE — FRONTEND AUDIT & IMPLEMENTATION SPECIFICATION
**Document ID:** `DOC-ASVAND-04`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Focus:** Client Architecture, Component Hierarchy, and Actionable Implementation Checklist  

---

## 1. FRONTEND ARCHITECTURE & DIRECTORY STRUCTURE

The frontend is a modern Single Page Application (SPA) located in `client/`:
- **Build & Dev Tooling:** Vite 8.3.5 with `@tailwindcss/vite` and `@vitejs/plugin-react`.
- **Framework & Types:** React 19.3.1, TypeScript 7.0.2 / 5.8+, React Router DOM 7.18.4.
- **Styling Architecture:** Tailwind CSS v4.3.3 configured via `@import "tailwindcss";` in `client/src/index.css`. Uses dynamic CSS custom properties for theming (`--bg`, `--card`, `--ink`, `--chart-*`), enabling seamless dark/light mode toggling without scattering `dark:` classes across all elements.
- **Animation Layer:** Motion (formerly Framer Motion) 14.6.0 for layout transitions, stagger animations, and coverflow effects.

```
client/src/
├── App.tsx                     # Top-level routing & ProtectedRoute boundary
├── index.css                   # Tailwind v4 theme tokens & typography
├── main.tsx                    # React DOM entry point
├── components/
│   ├── aceternity/             # Lamp hero, glowing border effects
│   ├── kokonutui/              # Detent dial, avatar picker
│   ├── landing/                # Coverflow, live showcase, reveal animations
│   ├── CaseBody.tsx            # Succession task list & heir checklist
│   ├── CircuitTransition.tsx   # Visual SVG circuit transitions
│   ├── ForecastChart.tsx       # Multi-asset class projection chart
│   ├── GuideChat.tsx           # Interactive AI assistant widget
│   ├── Layout.tsx              # Sidebar, navigation, theme toggle & live toast drawer
│   ├── LifeCharts.tsx          # Monte Carlo fan chart & Sankey cash flows
│   ├── LifeTimeline.tsx        # Multi-ring concentric lifespan dial
│   └── ui.tsx                  # Button, Card, Badge, Modal, Progress primitives
├── lib/
│   ├── api.ts                  # Typed fetch wrappers (targets http://localhost:8000)
│   ├── auth.tsx                # AuthContext & token management
│   ├── format.ts               # Indian number system (Lakh/Crore) & date formatters
│   ├── live.tsx                # WebSocket client & real-time toast broadcaster
│   ├── splash.tsx              # App boot splash loader
│   ├── theme.tsx               # ThemeContext (dark/light)
│   └── utils.ts                # clsx / twMerge utilities
└── pages/                      # 14 route pages (Verify, Aggregate, Dashboard, etc.)
```

---

## 2. COMPONENT AUDIT & IDENTIFIED DEFICIENCIES

1. **`CaseBody.tsx` (Critical Deficiency):**
   - *Current State:* Renders tasks as simple checkbox items (`t.done`). Displays required forms as static text pills (`t.docs`).
   - *Missing Capability:* No interactive file dropzone. No ability for an heir to upload a Death Certificate or Legal Heir Certificate. No MIME or file-size validation. No claim packet PDF generation.
2. **`Layout.tsx` Navigation Density:**
   - *Current State:* Sidebar displays 12 individual navigation links (`verify`, `aggregate`, `alerts`, `forecast`, `invest`, `plan`, `avatar`, `heirs`, `reunite`, `cases`, `guide`).
   - *Deficiency:* Overwhelms evaluators and violates the simplified user journey. Needs consolidation into 6 primary operational sections.
3. **`client/src/lib/api.ts` Endpoint Alignment:**
   - *Current State:* Port updated to `:8000`, but endpoints expect responses from legacy Node server routes that are not yet active in FastAPI.

---

## 3. PAGE-BY-PAGE IMPLEMENTATION CHECKLIST

### TASK FE-01: Document Upload Dropzone Component in `CaseBody.tsx`
- **Existing Implementation:** Static text tags listing required documents (`FileText` icon).
- **Required Outcome:** Interactive drag-and-drop file upload zone under each task requiring paperwork (Death Certificate, Form 20, Form 10D, Form A, KYC).
- **Files Affected:** `client/src/components/CaseBody.tsx`, `client/src/components/ui.tsx`.
- **Dependencies:** None (client-side implementation).
- **Acceptance Criteria:**
  - Accepts PDF, PNG, and JPEG files up to 5MB.
  - Rejects invalid MIME types with clear user-facing error message.
  - Computes SHA-256 hash using browser Web Crypto API (`window.crypto.subtle.digest`) to detect duplicate file uploads.
  - Displays uploaded file preview with file size, name, and "Verified" status chip.
- **Testing Requirements:** Drag a 6MB file (must be rejected); drag a valid PDF (must be accepted and display preview).
- **Priority:** **MUST DO (Critical)**
- **Status:** **Planned**

---

### TASK FE-02: Client-Side Claim Packet PDF Dossier Generator
- **Existing Implementation:** No export mechanism exists; users can only check tasks off.
- **Required Outcome:** A prominent **"Generate Pre-Filled Claim Dossier"** button at the top of `CaseView.tsx`. Clicking it compiles an official, printable PDF containing:
  1. Executive Summary & Deceased Identity Sheet.
  2. Inventory of Discovered Assets with Regulator References.
  3. Pre-filled Statutory Form Declarations (EPFO Form 20, LIC Form A).
  4. Checklist of Attached Supporting Documents with verification timestamps.
- **Files Affected:** `client/src/components/CaseBody.tsx`, new file `client/src/lib/pdf.ts`.
- **Dependencies:** `TASK FE-01`.
- **Acceptance Criteria:**
  - One-click generation in browser using a dedicated print-optimized stylesheet or canvas/pdf generator.
  - Form fields (Name, PAN, Bank IFSC, Folio, Nominee details) are dynamically filled from the case state.
  - Works 100% offline without external server dependencies.
- **Testing Requirements:** Generate claim packet for demo case; verify that all 16 holdings appear formatted in INR with correct account references.
- **Priority:** **MUST DO (Critical)**
- **Status:** **Planned**

---

### TASK FE-03: Sidebar Navigation Streamlining & Grouping
- **Existing Implementation:** 12 flat sidebar links in `client/src/components/Layout.tsx`.
- **Required Outcome:** Consolidate navigation into 5 primary groups:
  1. **Workspace:** Overview / Consolidated Dashboard (`/app`).
  2. **Discovery & Audit:** Verify & Ingestion (`/app/verify`).
  3. **Life Planning:** Twin, Forecast & Investment (`/app/plan`).
  4. **Succession & Claims:** Cases & Legal Checklists (`/app/cases`).
  5. **Legal Assistant:** AI Succession Guide (`/app/guide`).
  *(Relegate `/app/avatar` and `/app/reunite` to demo controls / secondary settings).*
- **Files Affected:** `client/src/components/Layout.tsx`, `client/src/App.tsx`.
- **Dependencies:** None.
- **Acceptance Criteria:** Sidebar is uncluttered; keyboard navigation remains functional; active route highlights correctly.
- **Priority:** **HIGH IMPACT**
- **Status:** **Planned**

---

### TASK FE-04: CAS Statement Upload Dropzone on Aggregation Page
- **Existing Implementation:** Button "Approve & fetch from 5 regulators" that pulls purely synthetic records.
- **Required Outcome:** Add a secondary tab/panel on `/app/aggregate`: **"Upload CAMS / KFintech Consolidated Statement (CAS)"**.
- **Files Affected:** `client/src/pages/Aggregate.tsx`.
- **Dependencies:** Backend parser endpoint `POST /api/upload/cas` (owned by Sai).
- **Acceptance Criteria:**
  - Allows uploading sample CAS PDF/CSV.
  - Posts file to backend parser or demonstrates instant client parsing fallback.
  - Holdings appear immediately in the wealth table.
- **Priority:** **HIGH IMPACT**
- **Status:** **Planned**

---

### TASK FE-05: Real-Time Nominee Gap Quick-Resolution Modal
- **Existing Implementation:** `Alerts.tsx` lists alerts with an "Update nominee" button that triggers a browser prompt or inline edit.
- **Required Outcome:** A polished modal component allowing the user to select from registered family heirs or add a new nominee with 1 click, instantly resolving the alert and updating the risk gauge.
- **Files Affected:** `client/src/pages/Alerts.tsx`, `client/src/components/ui.tsx`.
- **Dependencies:** `PATCH /api/holdings/:id/nominee`.
- **Acceptance Criteria:** Selecting an heir resolves the alert immediately; WebSocket sends updated alert count; sidebar badge updates without page reload.
- **Priority:** **MEDIUM**
- **Status:** **Planned**

