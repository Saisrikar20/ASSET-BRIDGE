# ASSET BRIDGE — API CONTRACT & INTEGRATION SPECIFICATION
**Document ID:** `DOC-ASVAND-05`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Focus:** Complete API Surface Definition, Contract Schemas, and Subsystem Coordination  

---

## 1. BACKEND API STATUS CLASSIFICATION

Following PR #1, endpoints fall into two distinct operational categories:
1. **ACTIVE IN FASTAPI:** Live in `fastapi-backend/app/module1_core/routers.py`.
2. **PORT PENDING FROM LEGACY NODE:** Fully implemented in legacy Node.js Express router (commit `6142819`), awaiting porting to Python by backend lead Sai.

---

## 2. DETAILED ENDPOINT CONTRACT AUDIT

### CATEGORY A: ACTIVE FASTAPI ENDPOINTS (`fastapi-backend/app/`)

#### 1. `GET /api/meta`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:33`)
- **Auth:** None (Public)
- **Response Structure (200 OK):**
  ```json
  {
    "regulators": {
      "RBI": { "name": "Reserve Bank of India", "covers": "Bank deposits", "fiType": "DEPOSIT" },
      "EPFO": { "name": "Employees' Provident Fund Organisation", "covers": "Provident fund & pension", "fiType": "EPF" },
      "IRDAI": { "name": "Insurance Regulatory and Development Authority", "covers": "Private life insurance", "fiType": "INSURANCE_POLICIES" },
      "SEBI": { "name": "Securities and Exchange Board of India", "covers": "Mutual funds & demat", "fiType": "MUTUAL_FUNDS" },
      "LIC": { "name": "Life Insurance Corporation of India", "covers": "LIC policies", "fiType": "LIC_POLICIES" },
      "PFRDA": { "name": "Pension Fund Regulatory and Development Authority", "covers": "NPS & Atal Pension", "fiType": "NPS" },
      "DOP": { "name": "India Post (Department of Posts)", "covers": "PPF, NSC & small savings", "fiType": "RECURRING_DEPOSIT" }
    },
    "states": ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra", "Delhi", "Uttar Pradesh", "West Bengal", "Gujarat"],
    "heirDocs": { "Tamil Nadu": { "doc": "Legal Heir Certificate", "authority": "Tahsildar (apply via TN e-Sevai)", "days": "15–30 days" } },
    "demoIdentity": { "name": "Raghavan", "pan": "ABCPI1234K", "dob": "1984-03-14", "aadhaarLast4": "4821", "mobile": "9840012345", "state": "Tamil Nadu" },
    "nationalStats": [{ "label": "Unclaimed bank deposits", "value": 67004, "regulator": "RBI" }]
  }
  ```

#### 2. `GET /api/showcase`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:43`)
- **Auth:** None (Public)
- **Response (200 OK):** Live statistics computed from demo persona Raghavan (`holdings`, `alerts`, `transfer`, `life`).

#### 3. `POST /api/auth/signup`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:72`)
- **Auth:** None
- **Request Body:**
  ```json
  { "name": "string", "email": "user@example.com", "password": "string (min 6 chars)" }
  ```
- **Response (200 OK):** `{ "token": "string", "user": { "id": "u_...", "email": "...", "name": "..." } }`
- **Errors:** `400 Bad Request` (password < 6 chars), `409 Conflict` (email already exists).

#### 4. `POST /api/auth/login`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:87`)
- **Request Body:** `{ "email": "user@example.com", "password": "string" }`
- **Response (200 OK):** `{ "token": "string", "user": { ... } }`
- **Errors:** `401 Unauthorized` ("Wrong email or password").

#### 5. `POST /api/auth/demo`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:94`)
- **Description:** One-click login as demo persona Raghavan (`demo@assetbridge.in`); seeds default demo heirs Meenakshi & Divya.
- **Response (200 OK):** `{ "token": "string", "user": { ... } }`

#### 6. `GET /api/me`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:107`)
- **Auth:** `Bearer <token>`
- **Response (200 OK):** `{ "user": { "id": "...", "name": "...", "identity": { ... }, "verification": { ... } } }`

#### 7. `POST /api/identity`
- **Status:** **ACTIVE IN FASTAPI** (`routers.py:131`)
- **Auth:** `Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "Raghavan",
    "pan": "ABCPI1234K",
    "dob": "1984-03-14",
    "state": "Tamil Nadu",
    "aadhaarLast4": "4821",
    "mobile": "9840012345"
  }
  ```
- **Validation:** PAN regex `^[A-Z]{5}[0-9]{4}[A-Z]$`; Aadhaar `^\d{4}$`.
- **Response (200 OK):** Updated user object with `verification.results` containing match status for each regulator.

---

### CATEGORY B: ENDPOINTS AWAITING PYTHON PORTING (FROM LEGACY `server/src/routes/api.js`)

These endpoints are currently returning **HTTP 404** on `localhost:8000` until ported by Sai:

| Method | Endpoint | Expected Payload | Response Contract | Target Module |
|---|---|---|---|---|
| `GET` | `/api/consents` | None | `{ consents: Consent[] }` | Module 2 (Aggregation) |
| `POST` | `/api/consents` | `{ regulators: string[], purpose: string, months: number }` | `{ consent: Consent, holdings: Holding[] }` | Module 2 (Aggregation) |
| `POST` | `/api/consents/:id/revoke` | None | `{ consent: Consent }` (purges holdings & alerts) | Module 2 (Aggregation) |
| `GET` | `/api/holdings` | None | `{ holdings: Holding[], summary: Summary }` | Module 2 (Aggregation) |
| `GET` | `/api/alerts` | None | `{ alerts: Alert[] }` (sorted by severity) | Module 2 (Aggregation) |
| `POST` | `/api/alerts/:id/resolve` | None | `{ alert: Alert }` (broadcasts WS update) | Module 2 (Aggregation) |
| `PATCH`| `/api/holdings/:id/nominee` | `{ name: string, relation: string, guardian?: string }` | `{ holding: Holding }` (auto-resolves alerts) | Module 2 (Aggregation) |
| `POST` | `/api/holdings/:id/reactivate`| None | `{ holding: Holding }` (sets status to 'active') | Module 2 (Aggregation) |
| `GET` | `/api/options` | None | `{ options: Option[], classes: Class[], scenarios: Scenario[] }` | Module 3 (LifeSim) |
| `GET` | `/api/plan` | None | `{ plan: InvestmentPlan }` | Module 3 (LifeSim) |
| `PUT` | `/api/plan` | `{ contributions: Contribution[], settings: Settings }` | `{ plan: InvestmentPlan }` | Module 3 (LifeSim) |
| `POST` | `/api/forecast` | `{ plan?: Plan, settings?: Settings }` | `{ monthly: Point[], age: number }` | Module 3 (LifeSim) |
| `GET` | `/api/analysis` | None | `{ allocation: Allocation, idleCost: number, return: number }` | Module 3 (LifeSim) |
| `GET` | `/api/life` | None | `{ plan: LifePlan }` | Module 3 (LifeSim) |
| `PUT` | `/api/life` | `{ profile: Profile, income: Income[], expenses: Expense[], milestones: Milestone[], family: Member[] }` | `{ plan: LifePlan }` | Module 3 (LifeSim) |
| `POST` | `/api/life/simulate` | `{ plan?: LifePlan, runs?: number }` (default 1000) | `{ successRate: number, fan: Percentiles[], rows: Yearly[] }` | Module 3 (LifeSim) |
| `GET` | `/api/heirs` | None | `{ heirs: Heir[] }` | Module 4 (Succession) |
| `POST` | `/api/heirs` | `{ name: string, relation: string, pan: string, mobile: string, share: number }` | `{ heir: Heir }` | Module 4 (Succession) |
| `DELETE`|`/api/heirs/:id` | None | `{ ok: true }` | Module 4 (Succession) |
| `POST` | `/api/crs/death` | `{ pan: string, dateOfDeath: string, registrationNo?: string, place?: string }` | `{ case: Case, notified: string[] }` | Module 4 (Succession) |
| `GET` | `/api/cases` | None (Auth via Bearer or `x-heir-pan`) | `{ cases: CaseSummary[] }` | Module 4 (Succession) |
| `GET` | `/api/cases/:id` | None (Auth via Bearer or `x-heir-pan`) | `{ case: Case, actor: string }` | Module 4 (Succession) |
| `PATCH`| `/api/cases/:id/tasks/:taskId` | `{ done: boolean }` | `{ case: Case }` (broadcasts WS update) | Module 4 (Succession) |
| `POST` | `/api/assistant` | `{ question: string, state?: string, caseId?: string, history?: Msg[] }` | `{ answer: string, engine: string, sources: Source[] }` | Module 5 (AI Guide) |

---

### CATEGORY C: NEW PROPOSED ENDPOINTS (ROUND 2 EXPANSION)

#### 1. `POST /api/upload/cas` (Owned by Sai)
- **Purpose:** Ingest CAMS/KFintech Consolidated Account Statement files (PDF/CSV) to discover actual mutual funds and equities.
- **Request Format:** `multipart/form-data` with `file: Binary`.
- **Response (200 OK):**
  ```json
  {
    "parsed": 8,
    "folios": [{ "amc": "HDFC Mutual Fund", "folio": "1182/44", "units": 412.5, "nav": 240.2, "value": 99082.5 }],
    "totalValue": 450210
  }
  ```

#### 2. `POST /api/cases/:id/documents` (Owned by Asvand / Sai)
- **Purpose:** Record uploaded supporting documents against a succession task.
- **Request Body:**
  ```json
  {
    "taskId": "t2",
    "documentType": "death_certificate",
    "fileName": "DeathCert_TN_2026.pdf",
    "fileSize": 1420500,
    "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "extractedMetadata": { "registrationNo": "TN/2026/0491", "dateOfDeath": "2026-09-12" }
  }
  ```
- **Response (200 OK):** `{ "task": { ... }, "status": "VERIFIED" }`

