# ASSET BRIDGE — ROUND 4 RAGHAVAN DEMONSTRATION SCENARIO & DATASET VALIDATION

> **STATUTORY DISCLAIMER & EVALUATION NOTICE**  
> All records, account numbers, identities, PAN identifiers, policy folios, and financial valuations contained in this document and within the Asset Bridge demonstration environment are **100% synthetic mock fixtures**. They are designed exclusively for technical demonstration and judging evaluation in **Dexathon 2026 Round 4**. None of the data corresponds to any living or deceased individual, nor are any live institutional connections made to actual banking, EPFO, IRDAI, or SEBI production servers.

---

## 1. Fictional Persona Overview

| Attribute | Synthetic Specification | Regulatory Context |
| :--- | :--- | :--- |
| **Full Legal Name** | **Raghavan** | Primary demise succession scenario subject |
| **Demo User ID** | `u_raghavan` | Persisted SQLite user identifier |
| **Authentication Email** | `raghavan@demo.local` | Demo credential for passwordless / one-click login |
| **Synthetic PAN** | `ABCPI1234K` | 4th char `P` indicates Individual entity status |
| **Date of Birth** | `1984-03-14` | Matches all banking KYC records |
| **Aadhaar (Last 4)** | `4821` | Only masked last 4 digits stored (UIDAI compliant) |
| **Contact Mobile** | `+91 98400 12345` | Masked synthetic Indian mobile |
| **State of Demise & Domicile** | **Tamil Nadu (Chennai)** | Governed by Tamil Nadu Tahsildar Legal Heir Rules |
| **Demise Record (CRS)** | `TN-CHN-2025-098124` | Municipal Registrar of Births and Deaths |
| **Estate Valuation** | **₹1,56,75,230.00 (₹1.56 Cr)** | 16 discrete financial instruments across 7 statutory registries |

---

## 2. Synthetic Dataset Inventory & Reconciliation

Every asset record is strictly reconciled against the 7 statutory Indian regulators:

| # | Registry / Regulator | Institution | Account / Policy Ref | Category | Operating Status | Synthetic Valuation (INR) | Nominee Registered & Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **RBI** | State Bank of India | `XXXX4417` | `DEPOSIT` | **Active** | ₹3,84,500.00 | Meenakshi (Spouse) · Valid |
| 2 | **RBI** | Indian Bank | `XXXX0932` | `DEPOSIT` | **Inoperative** | ₹6,50,000.00 | *None registered* · **High Risk** |
| 3 | **RBI** | Canara Bank | `XXXX2210` | `DEPOSIT` | **Unclaimed** | ₹41,230.00 | Lakshmi (Mother) · **Predeceased** |
| 4 | **RBI** | State Bank of India (SGB) | `SGB 2019-20 S-IV` | `GOVT_SAVINGS` | **Active** | ₹4,12,000.00 | *None registered* · **High Risk** |
| 5 | **EPFO** | UAN `1009XXXX7712` | `TN/MAS/0042117` | `EPF` | **Active** | ₹18,72,000.00 | Meenakshi (Spouse) · Valid |
| 6 | **EPFO** | UAN `1003XXXX0485` | `TN/AMB/0019873` | `EPF` | **Inoperative** | ₹5,12,400.00 | *None registered* · **High Risk** |
| 7 | **IRDAI** | HDFC Life Insurance | `POL-77XX1903` | `INSURANCE` | **Active** | ₹50,00,000.00 | *None registered* · **High Risk** |
| 8 | **IRDAI** | Star Health & Allied | `POL-31XX0021` | `INSURANCE` | **Active** | ₹5,00,000.00 | Arjun (Son) · **Minor Nominee (14 yrs)** |
| 9 | **SEBI** | SBI Mutual Fund (CAMS) | `FOLIO 1182XX44` | `MUTUAL_FUND` | **Active** | ₹9,26,300.00 | *None registered* · **High Risk** |
| 10 | **SEBI** | HDFC Mutual Fund (CAMS) | `FOLIO 5530XX19` | `MUTUAL_FUND` | **Unclaimed** | ₹2,14,800.00 | Meenakshi (Spouse) · Valid |
| 11 | **SEBI** | CDSL · Zerodha Broking | `BO 1208XXXX3321` | `EQUITY_DEMAT` | **Active** | ₹13,48,000.00 | Meenakshi (Spouse) · Valid |
| 12 | **LIC** | LIC · Jeevan Anand | `POL 7124XX09` | `INSURANCE` | **Active** | ₹10,00,000.00 | Meenakshi (Spouse) · Valid |
| 13 | **LIC** | LIC · Jeevan Saral (Unpaid) | `POL 6630XX55` | `INSURANCE` | **Unclaimed** | ₹2,87,000.00 | Lakshmi (Mother) · **Predeceased** |
| 14 | **PFRDA** | Protean CRA (NPS Tier-I) | `PRAN XXXX4471` | `PENSION` | **Active** | ₹16,40,000.00 | Meenakshi (Spouse) · Valid |
| 15 | **DOP** | India Post (Mylapore HPO) | `PPF XXXX7781` | `GOVT_SAVINGS` | **Active** | ₹7,35,000.00 | *None registered* · **High Risk** |
| 16 | **DOP** | India Post (Adyar SO) | `NSC XXXX0318` | `GOVT_SAVINGS` | **Unclaimed** | ₹1,52,000.00 | Lakshmi (Mother) · **Predeceased** |

### Mathematical Reconciliation:
- **Total Portfolio Valuation:** **₹1,56,75,230.00**
- **Operating Status Breakdown:**
  - Active Holdings: 10 assets (₹1,38,31,000.00)
  - Inoperative Accounts: 2 assets (₹11,62,400.00)
  - Unclaimed / Dormant Holdings: 4 assets (₹6,81,830.00)
- **At-Risk Portfolio Value:** **₹94,30,730.00** across 11 assets (due to missing nomination, predeceased mother nominee, minor nominee status, or account dormancy).

---

## 3. Real-World Risk Scenarios Demonstrated

Asset Bridge showcases 5 distinct real-world Indian statutory hurdles using this scenario:

1. **Missing Nomination on High-Value Instruments:**
   - HDFC Life Term Policy (`₹50,00,000`), Indian Bank FD (`₹6,50,000`), and SBI Mutual Fund (`₹9,26,300`) have no nomination registered.
   - *Statutory Impact:* Triggers high-severity warning badges and activates the Tamil Nadu Tahsildar Legal Heirship procedure.
2. **Nominee Predeceased the Policyholder:**
   - Canara Bank (`XXXX2210`), LIC Jeevan Saral (`POL 6630XX55`), and India Post NSC (`XXXX0318`) feature the deceased mother (`Lakshmi`).
   - *Statutory Impact:* Automatically flags the nomination as invalid under Insurance Act §39 and Banking Regulation Act §45ZA, directing claims to surviving Class-I legal heirs.
3. **Minor Nominee Without Designated Major Guardian:**
   - Star Health Cover (`₹5,00,000`) names minor son `Arjun` (Age 14) without a declared major appointee.
   - *Statutory Impact:* Triggers a medium alert requesting court or natural guardian (mother Meenakshi) documentation.
4. **Initial-Prefix Name Discrepancy on Legacy Passbook:**
   - Canara Bank passbook registered as `'R. Raghavan'`, while PAN registry and all other banks read `'Raghavan'`.
   - *Statutory Impact:* Flagged with an amber Partial Match advisory (`confidence: 0.65`) requiring an Annexure-I Indemnity Bond and Notarized Name Affidavit.
5. **Multi-Employer Inoperative EPF Accumulation:**
   - UAN `1003XXXX0485` from previous employer in Ambur has been dormant since 2011 with no active contributions or nomination.
   - *Statutory Impact:* Form 20 deceased member settlement workflow initiated with employer attestation bypass.

---

## 4. Family & Succession Structure

Raghavan died intestate (without a registered Will) under the **Hindu Succession Act, 1956**:

| Family Member | Legal Relation | Age | Synthetic PAN | Legal Heir Status | Intestate Share (%) | Intestate Allocation (INR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Meenakshi** | Spouse (Widow) | 39 | `ABCPI5678M` | Class-I Primary Heir | **50.0%** | ₹78,37,615.00 |
| **Arjun** | Son | 14 | `ABCPI9012N` | Class-I Minor Heir | **50.0%** | ₹78,37,615.00 |
| **Lakshmi** | Mother | — | — | Predeceased (Demised) | 0.0% | ₹0.00 |

*Share Verification:* `50.0% + 50.0% = 100.0%` (strictly reconciled without arithmetic drift).

---

## 5. Supported End-to-End Demonstration Workflow

Judges can walk through the complete journey in 8 sequential steps:

```
[1. Instant Demo Login] 
        ↓
[2. Statutory Identity Gate (/app/verify)] 
    -> 7 Regulators checked, Canara Bank partial match displayed in amber
        ↓
[3. Asset Aggregation Gateway (/app/aggregate)]
    -> Active ReBIT AA Consent Handle (consent-raghavan@onemoney)
    -> 16 Assets grouped by regulator with inoperative/unclaimed badges
        ↓
[4. Proactive Risk Center (/app/alerts)]
    -> 10 Actionable risk alerts with severity filtering
        ↓
[5. Succession Legal Heirs (/app/heirs)]
    -> Meenakshi (50%) and Arjun (50%) Class-I allocation
        ↓
[6. Succession Estate Case (/app/cases)]
    -> Case AB-XXXX with Tahsildar roadmap & statutory task checklist
        ↓
[7. Claiming Dossier PDF (/api/reports/claiming-dossier/pdf)]
    -> Instant 1-click generation of the complete 16-asset legal docket
        ↓
[8. AI Succession Navigator (/app/guide)]
    -> Chat assistant citing authentic statutory markdown regulations
```

---

## 6. AI Demonstration Questions & Knowledge Sources

The AI Navigator (`/app/guide`) retrieves answers directly from the local statutory RAG corpus without hallucinations:

1. **Question:** *"What documents do I need to claim a bank account without nominee in Tamil Nadu?"*
   - *Retrieved Sources:* `Bank deposits (Reserve Bank of India Statutory Framework)`, `Legal heir and succession certificates by state`, `indian_bank_fd_advice.txt`.
   - *Core Answer:* Death Certificate from Chennai Corporation under CRS, Tamil Nadu e-Sevai Legal Heir Certificate issued by Tahsildar, Bank Claim Form Annexure A, and Letter of Indemnity.
2. **Question:** *"How do I claim EPFO provident fund for a deceased employee with Form 20?"*
   - *Retrieved Sources:* `Provident fund and pension (EPFO)`, `epfo_form20_claim_extract.txt`.
   - *Core Answer:* Form 20 PF settlement, cancelled cheque of surviving heir/nominee bank account, death certificate, and Form 5IF for EDLI insurance benefit up to ₹7,00,000.
3. **Question:** *"What is the procedure for Canara Bank initial name mismatch like R. Raghavan?"*
   - *Retrieved Sources:* `Bank deposits (Reserve Bank of India Statutory Framework)`, `Planning ahead while alive`.
   - *Core Answer:* Discrepancy between initials and full name is cured via a notarized One and the Same Person Affidavit alongside an Annexure-I Indemnity Bond.
4. **Question:** *"What is the difference between a Legal Heir Certificate and a Succession Certificate in Tamil Nadu?"*
   - *Retrieved Sources:* `Legal heir and succession certificates by state`.
   - *Core Answer:* Tahsildar Legal Heir Certificate (issued via TN e-Sevai in 15–30 days) suffices for movable assets under ₹10 lakhs; Court Succession Certificate from Civil District Court (taking 3–6 months with 2–3% court fees) is mandated for disputed claims or securities exceeding threshold limits.

---

## 7. Repeatability & Safe Demo Reset

To guarantee demo predictability during live judge evaluation:

- **Automatic Seeder Self-Healing:** Logging in via `/auth/demo?persona=raghavan` automatically validates user identity and holdings in SQLite.
- **Dedicated Reset Endpoint:** `POST /api/demo/reset` safely cleans and re-seeds the exact 16 assets, 10 alerts, heirs, documents, and cases without deleting unrelated users or teammate databases.
- **Idempotency:** Repeated runs or re-verifications never create duplicate holdings or drift account balances.

---

## 8. Integration Disclosures & Simulation Boundaries

1. **ReBIT Account Aggregator (AA):** Aggregation protocol interactions, consent handles (`consent-raghavan@onemoney`), and data payload deliveries are simulated locally in SQLite using authentic schemas; live production AA APIs require licensed FIU status and RBI NBFC-AA sandbox gateway access.
2. **Outbox Email Dispatch:** Email transmission records RFC 822 `.eml` files into the local directory `data/outbox/` for judge auditability; no external SMTP relay is attempted.
3. **OCR & Document Extraction:** Sample uploaded documents (`.txt`, `.pdf`) are indexed into SQLite FTS5 with chunk-level BM25 and semantic text retrieval.
