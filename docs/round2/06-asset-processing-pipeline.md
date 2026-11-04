# Asset Bridge – End-to-End Asset Processing Pipeline
**Author:** Shajith (Architecture & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Pipeline Overview & Objectives

The Asset Bridge pipeline connects a person's statutory identification (PAN) to their distributed wealth across five independent financial regulators, proactively identifies catastrophic nominee vulnerabilities, models lifetime cash flows, and automates estate transmission when a death event occurs.

```
[PAN / Identity Input]
          │
          ▼
┌───────────────────────────────────┐
│ STAGE 1: Identity Ingestion       │ ➔ Regex check, sanitization, Aadhaar last-4 masking
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ STAGE 2: Multi-Regulator Broker   │ ➔ 7-Regulator simulated discovery (RBI, EPFO, SEBI...)
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ STAGE 3: Asset Consent/Ingestion  │ ➔ ReBIT AA Consent Artefact / CAS Statement PDF upload
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ STAGE 4: Nominee Gap & Risk Engine│ ➔ Missing / Deceased / Minor nominee & Dormancy check
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ STAGE 5: Monte Carlo Life Planner │ ➔ 1,000-path simulation, Indian tax slabs, legacy share
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ STAGE 6: Estate Transmission Case │ ➔ CRS death event matching, state-specific claim checklist
└───────────────────────────────────┘
```

---

## 2. Detailed Pipeline Stages

### Stage 1: PAN & Identity Ingestion
- **Input Parameters:** Full Name, Permanent Account Number (PAN), Date of Birth (YYYY-MM-DD), Domicile State, Aadhaar Last 4 Digits, Mobile Number.
- **Validation Logic:**
  - PAN Regex: `^[A-Z]{5}[0-9]{4}[A-Z]$` (Character 4 represents entity type: `P` for Individual).
  - Aadhaar: Strips everything except the final 4 digits (`^\d{4}$`) to avoid storing complete Aadhaar numbers (UIDAI compliance).
  - Normalization: Name capitalization trimmed, email lowercase, ISO-8601 timestamps attached.
- **Components:** `fastapi-backend/app/module1_core/routers.py` (`POST /api/identity`).

### Stage 2: Multi-Regulator Discovery & Verification Broker
- **Processing Logic:**
  - Evaluates user identity against seven simulated institutional record repositories:
    1. **RBI (Reserve Bank of India):** Bank savings, fixed deposits, current accounts.
    2. **EPFO (Employees' Provident Fund Organisation):** UAN, PF balance, EPS pension records.
    3. **IRDAI (Insurance Regulatory and Development Authority):** Term, endowment, and ULIP policies.
    4. **SEBI (Securities and Exchange Board of India):** Demat accounts, mutual fund folios.
    5. **PFRDA (Pension Fund Regulatory and Development Authority):** National Pension System (NPS PRAN).
    6. **India Post:** Small savings schemes (PPF, NSC, KVP, Senior Citizen Savings Scheme).
    7. **Canara Bank (Scheduled Commercial Bank):** Edge-case testing for partial name matching.
  - Generates verification audit tokens with match confidence: `exact_match`, `partial_match` (e.g., initials like "R. Raghavan"), or `no_record`.
- **Components:** `fastapi-backend/app/module1_core/identity.py` (`verify_identity()`).

### Stage 3: Asset Aggregation & Consent Ingestion
- **Dual Ingestion Paths:**
  1. **Account Aggregator Consent Artefact (Simulated):** Mirrors ReBIT specifications (FIP consent handle, validity range, fetch frequency, data encryption keys).
  2. **CAS Statement Ingestion (Phase 1 Target):** CAMS / KFintech Consolidated Account Statement PDF/Excel parser. Extracts ISINs, folio numbers, units, NAV, and holding values. Password-unlocking using standard PAN-based hash convention.
- **Output:** Standardized `Holding` record array with asset class taxonomy (Cash, Fixed Income, Equity, Pension, Insurance, Gold).

### Stage 4: Nominee-Gap & Vulnerability Evaluation Engine
- **Vulnerability Taxonomies Evaluated:**
  - `nominee_missing`: Holding has no nominee on record (high statutory friction; forces heirs into court for legal heir certificates).
  - `nominee_deceased`: Nominee passed away before the asset holder (common in aging couples; renders nomination void).
  - `nominee_minor`: Nominee is under 18 without an appointed adult guardian.
  - `inoperative`: Bank account or dividend unpaid for > 24 months (inoperative status).
  - `unclaimed`: Account idle for > 10 years; funds transferred to RBI DEA Fund or SEBI IEPF.
  - `name_mismatch`: Holding registration name deviates from PAN card.
  - `kyc_stale`: Re-KYC deadline expired.
- **Real-Time Notification:** Evaluated vulnerabilities are immediately dispatched over WebSocket (`/ws`) to the connected React client, generating toast notifications and updating the unread alert badge.

### Stage 5: Financial Simulation & Life Plan Modeling
- **Simulation Mechanics:**
  - Vectorized Monte Carlo engine running **1,000 asset paths** up to age 95.
  - Stochastic return modeling with standard deviations across asset classes (Equity: 12% ± 16%, Debt: 7.5% ± 4%, Gold: 8% ± 12%).
  - Sequential drawdown priority: Cash ➔ Debt / Fixed Deposits ➔ Gold ➔ Mutual Funds / Equity ➔ EPF/PPF ➔ NPS annuity.
  - Indian Income Tax calculation under FY 2025-26 slabs with standard deduction, rebate under Section 87A, and 4% health & education cess.
- **Outputs:** Chance of plan success (%), fan chart 10th/50th/90th percentile trajectories, financial independence age, and legacy inheritance split.

### Stage 6: Estate Case & Succession Transmission Engine
- **Civil Registration System (CRS) Trigger:**
  - Matches deceased individual's PAN against death registration records (`registrationNo`, date, place of demise).
  - Freezes active user twin state and transitions platform into **Estate Transmission Mode**.
- **State-Specific Legal Heir Checklist Generation:**
  - Automatically queries `STATE_HEIR_DOC` catalog (e.g., Tahsildar Legal Heir Certificate in Tamil Nadu vs. District Court Succession Certificate in Maharashtra).
  - Compiles statutory claim packets:
    - **Banks:** Deceased depositor claim form + Annexure A indemnity.
    - **EPFO:** Form 20 (Provident Fund withdrawal), Form 10D (Monthly widow/children pension), Form 5(IF) (EDLI insurance up to ₹7,00,000).
    - **Life Insurance:** Form A claim application + original policy bond.
    - **Mutual Funds:** Form ISR-4 transmission request + demat client master list.
- **Heir Portal Synchronization:** Case link and access tokens distributed to registered heirs (`/heir`) for collaborative checklist progress tracking.
