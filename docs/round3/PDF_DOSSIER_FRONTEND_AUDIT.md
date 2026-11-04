# ASSET BRIDGE — ROUND 3
# FRONTEND PDF DOSSIER INTEGRATION AUDIT

**Target:** Statutory Succession & Asset Claiming Dossier PDF Generation & Frontend Integration  
**Backend Reference:** `fastapi-backend/app/aggregation/pdf_generator.py`  
**API Router Reference:** `fastapi-backend/app/aggregation/routers.py`  
**Frontend References:** `client/src/lib/api.ts`, `client/src/components/CaseBody.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Verify.tsx`, `client/src/pages/Aggregate.tsx`  
**Audit Date:** November 4, 2026  
**Auditor Mode:** Empirical Codebase Verification (Direct File Inspection, Runtime Endpoint Probing, & Test Verification)

---

## 1. Executive Summary

This audit evaluates the implementation status of the **Statutory Succession & Asset Claiming Dossier PDF** across both the FastAPI backend engine and the React frontend client.

### Key Audit Findings:
1. **The Backend Generator is Complete & Fully Functional:** The ReportLab-based generator in `pdf_generator.py` is fully implemented (684 lines), generates genuine multi-page A4 PDFs with dynamic tables, running headers/footers (`NumberedCanvas`), custom institutional claim matrices, and statutory annexures.
2. **The API Endpoints Exist & Are Live:** Three endpoints are implemented in `routers.py`:
   - `GET /api/reports/claiming-dossier/pdf`
   - `GET /api/cases/{case_id}/claiming-dossier/pdf`
   - `POST /api/reports/claiming-dossier/vault` (ingests PDF into SQLite document vault for AI RAG)
3. **The Frontend Client Helper Exists:** `downloadClaimingDossierPdf()` in `client/src/lib/api.ts` is implemented and fetches the binary blob, creates an object URL, and triggers an anchor download.
4. **Buttons Are Connected Across 4 Pages:** The "Download Claim Dossier (PDF)" button is connected in `CaseBody.tsx`, `Dashboard.tsx`, `Verify.tsx`, and `Aggregate.tsx`.
5. **Identified Frontend UX Deficiencies:**
   - No loading spinner / state tracking during PDF compilation.
   - No error toast or graceful error catch on network/server failure.
   - Server-provided `Content-Disposition` filename is not parsed from headers.
   - The backend `masked=true` query option is not exposed to the user as a toggle.
   - The backend `POST /api/reports/claiming-dossier/vault` (direct AI vault ingestion) is not surfaced on the frontend.

---

## 2. Backend Generator Findings (`pdf_generator.py`)

### A. Generator Existence & Status
- **File:** `fastapi-backend/app/aggregation/pdf_generator.py` (684 lines)
- **Status:** **COMPLETE AND TESTED**.
- **Engine:** Python `reportlab` (version 5.1.0) using `SimpleDocTemplate`, `Table`, `Paragraph`, `KeepTogether`, and `HRFlowable`.
- **Canvas Implementation:** `NumberedCanvas(canvas.Canvas)` &mdash; a two-pass canvas that dynamically calculates the total page count and draws running headers ("ASSET BRIDGE · STATUTORY SUCCESSION & ASSET CLAIMING DOSSIER") and running footers ("Page X of Y" + statutory disclaimers) on all pages.

### B. Function Signature
```python
def generate_claiming_dossier_pdf(
    person_info: Dict[str, Any],
    holdings: List[Dict[str, Any]],
    heirs: List[Dict[str, Any]],
    state_info: Dict[str, Any],
    case_info: Optional[Dict[str, Any]] = None,
    masked: bool = False
) -> bytes
```
- **Returns:** Pure PDF binary (`bytes`) starting with `%PDF-` header.
- **Buffer:** Uses in-memory `io.BytesIO()`. No temporary disk files are created or leaked.

### C. Genuinely Implemented Sections

1. **Official Cover Header & Primary Particulars Table:**
   - Subject Full Name, PAN (masked or unmasked), Date of Birth, Aadhaar (last 4 digits masked: `XXXX-XXXX-8899`), State of Residence.
   - Summary statistics: Total Mapped Assets count, Total Portfolio Value in INR (`format_inr`), and Nomination Gap Risk count.
   - CRS Death Registration metadata (if `case_info` provided): Demise Registration # and Date of Demise.
   - Header visual seal: `SEAL: SHA-256 VERIFIED`.
2. **State Succession Jurisdiction & Legal Framework:**
   - Resolves state revenue rules based on `person_info.get("state")` using `STATE_HEIR_DOC`.
   - Injects the state succession document (e.g. *Legal Heir Certificate* in Tamil Nadu / Karnataka, *Varisu Saandriidhal*, *Waris Praman Patra* in UP).
   - Details issuing authority (e.g. *Local Revenue Office / Tahsildar*), statutory timeframe (e.g. *15–30 days*), and 3 mandatory procedural stages (Civil Registration &rarr; Heir Certificate Application &rarr; Revenue Inspector Publication / Inquiry).
3. **Consolidated Schedule of Financial Assets by Regulator:**
   - Multi-column table: Regulator (color-coded badge), Institution & Asset Particulars, Account/Policy Reference, Value (INR), and Nominee Status & Mode.
   - Dynamic nominee categorization: `Valid`, `Deceased Nominee` (rose badge), `Minor (Guardian req.)` (amber badge), or `NO NOMINEE (Legal Heirs Route)` (red badge).
4. **Institution-by-Institution Actionable Claim Procedures:**
   - Generates a standalone card block per holding using `get_institution_procedure(holding, state)`.
   - Prescribed Claim Form:
     - **RBI:** Model Claim Form for Deceased Depositor Accounts (Form DA-2 Annexure A).
     - **EPFO:** EPFO Form 20 (Provident Fund Final Settlement) & Form 10D (Monthly Pension Claim).
     - **SEBI (Demat):** Form ISR-5 (Transmission of Securities) via Depository Participant (CDSL/NSDL).
     - **SEBI (Mutual Funds):** CAMS / KFintech Common Transmission Request Form (Form T3).
     - **IRDAI / LIC:** Form A (Death Claim Intimation Form) & Form C (Physician's Certificate).
     - **PFRDA:** PFRDA Death Withdrawal Form (Form 301 for NPS Tier-I Demise Claim).
     - **DOP:** Post Office Form SB-84 (Claim for Deceased Depositor's Account).
   - Competent Authority (Branch Manager, RPFC, DP Operations, AMC RTA, CRA).
   - Statutory SLA under citizen charters and regulator master circulars (15 to 30 days).
   - Mandatory Enclosures Checklist: Specific documents required depending on whether a valid nominee exists (e.g., Letter of Indemnity + sureties if no nominee, versus Nominee KYC if nominee present).
5. **Legal Heir Beneficiary Schedule & Allocation Matrix:**
   - Table of all legal heirs, relations, PAN, intended share (%), and estimated monetary entitlement in INR.
   - Claimant Signatory Block: Formatted dual-column signature lines for all claimants with formal legal attestation declaration.
6. **Statutory Annexures:**
   - **Annexure I: Model Letter of Indemnity:** Non-judicial stamp paper draft indemnifying financial institutions for claims without probate or succession certificate. Dynamically injects deceased name, PAN, and date of demise.
   - **Annexure II: No-Objection Certificate (NOC) by Co-Heirs:** Relinquishment draft in favor of primary claimant. Dynamically injects deceased name and primary heir name.
   - **Annexure III: Affidavit of Name Variation:** Formal oath declaration under the Indian Oaths Act for minor spelling or initial discrepancies between KYC records and PAN.

### D. Cryptographic & Masking Details
- **PAN Masking:** `mask_pan(pan)` transforms `ABCDE1234F` into `ABXXXXX4F`. Enabled when `masked=True`.
- **SHA-256 Verification:** In `pdf_generator.py`, the string `SEAL: SHA-256 VERIFIED` is a printed visual badge. Genuine cryptographic SHA-256 hashing is computed when the document is ingested into the SQLite vault via `documents.py::compute_sha256()` or on the frontend via `crypto.subtle.digest`.

---

## 3. Backend API Endpoints & Contract

The endpoints are defined in `fastapi-backend/app/aggregation/routers.py` under the router prefix `/api`:

### Endpoint 1: Universal Dossier Export
- **Method:** `GET`
- **URL:** `/api/reports/claiming-dossier/pdf`
- **Query Parameters:**
  - `pan` (string, optional): Target PAN.
  - `personaId` (string, optional): Target persona key (`raghavan`, `priya`, `vikram`, `sunita`, `rajesh`).
  - `caseId` (string, optional): Specific estate case ID (e.g. `AB-3816`).
  - `masked` (boolean, default: `false`): Masks PAN characters.
- **Headers:** `Authorization: Bearer <token>` (optional; if provided, authenticated user's holdings and heirs are used).
- **Response Type:** Binary stream (`Response`).
- **Content-Type:** `application/pdf`.
- **Headers Returned:**
  - `Content-Disposition: attachment; filename="Asset_Bridge_Claiming_Dossier_<Name>.pdf"`
  - `Cache-Control: no-cache, no-store, must-revalidate`
- **Status Codes:** `200 OK` on success; `400 / 404 / 500` on failure.

### Endpoint 2: Case-Specific Shortcut
- **Method:** `GET`
- **URL:** `/api/cases/{case_id}/claiming-dossier/pdf`
- **Parameters:** `case_id` path parameter, `masked` query parameter, `Authorization` header.
- **Behavior:** Forwards directly to `get_claiming_dossier_pdf(caseId=case_id)`.

### Endpoint 3: AI Document Vault Ingestion
- **Method:** `POST`
- **URL:** `/api/reports/claiming-dossier/vault`
- **Authentication:** Required (`get_current_user`).
- **Behavior:** Generates the claiming dossier PDF in memory and immediately indexes it into the user's SQLite FTS5 Document Vault (`ingest_document()`) as `doc_type="Statutory Claiming Dossier"`, making it instantly searchable by the AI Succession Guide.
- **Response Type:** `application/json` (`{ "ok": true, "document": { ... }, "chunks_indexed": N }`).

---

## 4. Existing Frontend Audit

### A. API Client Layer (`client/src/lib/api.ts`)
The client library includes three dedicated helper functions:
```typescript
// 1. URL Builder
export function getClaimingDossierPdfUrl(params?: {
  pan?: string;
  personaId?: string;
  caseId?: string;
  masked?: boolean;
}): string

// 2. Binary Downloader
export async function downloadClaimingDossierPdf(params?: {
  pan?: string;
  personaId?: string;
  caseId?: string;
  masked?: boolean;
  filename?: string;
}): Promise<void>

// 3. Vault Ingestion Helper
export async function saveClaimingDossierToVault(params?: {
  pan?: string;
  personaId?: string;
  caseId?: string;
}): Promise<{ ok: boolean; message: string; document: any; chunks_indexed: number }>
```

### B. Implementation Audit Across Pages

| Location | Component | Invocation Code | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Estate Claim Workspace** | `client/src/components/CaseBody.tsx` (Line 268) | `downloadClaimingDossierPdf({ caseId: c.id, filename: 'Asset_Bridge_Claiming_Dossier_' + c.id + '.pdf' })` | **CONNECTED & WORKING**. Passes active case ID. |
| **Claim Workspace (Alternative)** | `client/src/components/CaseBody.tsx` (Line 958) | `downloadClaimingDossierPdf({ caseId: c.id, filename: 'Asset_Bridge_Claiming_Dossier_' + c.id + '.pdf' })` | **CONNECTED & WORKING**. Passes active case ID. |
| **Dashboard** | `client/src/pages/Dashboard.tsx` (Line 82) | `downloadClaimingDossierPdf({ pan: user?.identity?.pan })` | **CONNECTED & WORKING**. Uses current authenticated PAN. |
| **Identity Verification** | `client/src/pages/Verify.tsx` (Line 360) | `downloadClaimingDossierPdf({ pan: form.pan })` | **CONNECTED & WORKING**. Uses currently verified form PAN. |
| **Asset Aggregation** | `client/src/pages/Aggregate.tsx` (Line 607) | `downloadClaimingDossierPdf({ pan: user?.identity?.pan })` | **CONNECTED & WORKING**. Uses current authenticated PAN. |

---

## 5. Live Endpoint Verification & Test Results

The endpoint was directly verified using automated tests and runtime HTTP probing against the running FastAPI server:

1. **Direct HTTP Probe (`GET http://127.0.0.1:8000/api/reports/claiming-dossier/pdf?personaId=raghavan`):**
   - **HTTP Status:** `200 OK`
   - **Content-Type:** `application/pdf`
   - **Content-Disposition:** `attachment; filename="Asset_Bridge_Claiming_Dossier_Raghavan.pdf"`
   - **Payload Size:** 27,535 bytes
   - **Binary Validation:** Valid `%PDF-1.4` binary stream.
2. **Case-Specific Probe (`GET http://127.0.0.1:8000/api/cases/AB-3816/claiming-dossier/pdf`):**
   - **HTTP Status:** `200 OK`
   - **Content-Type:** `application/pdf`
   - **Payload Size:** 9,599 bytes
   - **Binary Validation:** Valid `%PDF-1.4` binary stream with Estate Case `AB-3816` details.
3. **Automated Backend Pytest Suite:**
   - `test_pdf_generator.py::test_persona_pdf_generation` &mdash; **PASSED**
   - `test_pdf_generator.py::test_procedural_pan_pdf_generation` &mdash; **PASSED**
   - `test_pdf_generator.py::test_case_specific_pdf_generation` &mdash; **PASSED**
   - `test_pdf_generator.py::test_vault_auto_ingestion` &mdash; **PASSED**

---

## 6. Functional & Gap Classification

| Item | Classification | Notes |
| :--- | :--- | :--- |
| **Backend PDF Generation Engine** | **Already implemented and working** | ReportLab generation tested and functional. |
| **Backend REST Endpoints** | **Already implemented and working** | `GET /api/reports/claiming-dossier/pdf` and `GET /api/cases/{case_id}/...` live. |
| **Backend Vault Ingestion Endpoint** | **Already implemented and working** | `POST /api/reports/claiming-dossier/vault` functional in backend. |
| **Frontend API Download Function** | **Already implemented and working** | Blob conversion and trigger anchor functional in `api.ts`. |
| **Frontend Button in Case Workspace** | **Already implemented and working** | Invokes `downloadClaimingDossierPdf` with active `caseId`. |
| **Frontend Buttons in Dashboard / Verify / Aggregate** | **Already implemented and working** | Connected with `pan` parameter. |
| **Button Loading Indicator** | **Implemented but lacks feedback** | Button does not show a loading spinner while downloading. |
| **Error Feedback / Toast** | **Missing** | Network or server errors are logged to console without a user-visible toast. |
| **Filename Header Extraction** | **Minor Enhancement** | Uses client-supplied or fallback filename instead of parsing server `Content-Disposition`. |
| **Masking Toggle in UI** | **Not surfaced in UI** | Backend supports `masked=true`, but frontend does not provide a toggle. |
| **Direct "Save to Vault" Button** | **Backend implemented, frontend missing** | `saveClaimingDossierToVault` is available in `api.ts` but has no button in `CaseBody.tsx`. |

---

## 7. Legal and Presentation Accuracy Notice

The generated PDF is an **informational procedural guidance dossier and claim-preparation aid**, not a court-certified legal decree or automatic guarantee of institutional settlement:
1. **Statutory Heir Certificate:** In India, financial institutions require an official Legal Heir Certificate from the Tahsildar / Revenue Authority or a court-granted Succession Certificate (under the Indian Succession Act, 1925) for claims lacking valid nominations. The dossier outlines the necessary application roadmap but cannot replace the government-issued certificate.
2. **Institution-Specific Rules:** Banks and RTAs reserve the right to demand additional KYC verification, branch in-person verification (IPV), or legal surety bonds if the account balance exceeds branch delegation thresholds.
3. **Statutory Annexures:** The indemnity and NOC annexures are standard model formats that must be executed on non-judicial stamp paper of appropriate state-specific value.

---

## 8. Recommended Frontend Enhancements (Pending User Approval)

The integration is **functional today**. For optimal user experience and robustness, the following small, non-invasive enhancements can be implemented upon approval:

1. **Add Download State Feedback:**
   - In `CaseBody.tsx` (and optionally `Dashboard.tsx`, `Verify.tsx`), wrap the download in local state (`isDownloading`), displaying a `Loader2` spinner and disabling the button during generation.
2. **User-Friendly Error Handling:**
   - Catch download errors and surface a clear toast message (e.g., *"Unable to generate dossier. Please verify server connection."*).
3. **Add "Save to Estate Vault" Option in Case Workspace:**
   - Add a subtle secondary action button: *"Index Dossier in AI Vault"*, calling `saveClaimingDossierToVault({ caseId: c.id })`. This allows the AI Succession Guide to immediately reference the full generated dossier for conversational Q&A.
4. **Filename Header Parsing in `api.ts`:**
   - Parse `Content-Disposition` header regex in `downloadClaimingDossierPdf` so the server-generated filename (`Asset_Bridge_Claiming_Dossier_Raghavan.pdf`) is preserved automatically.

---

## 9. Dependency Assessment on Backend Work

- **Backend Dependency:** **ZERO BLOCKERS**.
  Sai's backend code (`pdf_generator.py`, `routers.py`, `test_pdf_generator.py`) is already committed, merged into `main`, and fully operational.
- No modifications to the backend are required.
