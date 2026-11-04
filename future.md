# Asset Bridge - Quality of Life & Future Roadmap (`future.md`)

This document outlines prioritized Quality of Life (QoL) improvements, technical enhancements, and feature expansions planned for the Asset Bridge platform.

---

## 1. User Experience (UX) & Heir Journey

### 1.1 Interactive Statutory Delay Compensation Calculator
* **Background**: Under Reserve Bank of India Master Directions (*Notification RBI/DOR/2025-26/170*, Paras 319-322), commercial banks are statutorily mandated to settle deceased depositor claims within 15 calendar days. Delays beyond 15 days mandate interest compensation at **Bank Rate + 4.00% p.a.** (currently **9.75% p.a.**).
* **Feature**: Add an interactive calculator directly inside the Banking asset claim card in `CaseBody.tsx`.
* **Behavior**:
  * Claimant inputs the date the claim application and complete documentation were submitted to the bank branch.
  * If elapsed time > 15 calendar days, the calculator computes the overdue duration and exact statutory interest owed by the bank on the asset balance.
  * Generates a formal RBI Delay Penalty Demand notice text that can be included in follow-up correspondence or escalations to the Banking Ombudsman.

### 1.2 In-App Outbox & Sent Transmissions History Drawer
* **Background**: The backend persists all PDF dossier email dispatches in the SQLite `sent_emails` table and exposes `/api/reports/claiming-dossier/email/history`.
* **Feature**: Add a "Transmission History" drawer or tab within the estate case view.
* **Behavior**:
  * Displays a chronological audit log of all sent dossiers (recipient address, recipient name, timestamp, tracking ID `eml_...`).
  * Visual badge indicating delivery method (SMTP Active vs. Local Outbox Mock).
  * Direct action to re-send the packet, copy tracking reference, or inspect transmission metadata.

### 1.3 Non-Blocking Toast Notification System
* **Background**: Certain actions (e.g. download failures, vault indexing errors) currently invoke standard browser `alert(...)` dialogs.
* **Feature**: Implement a centralized `useToast()` provider in `client/src/components/ui.tsx`.
* **Behavior**:
  * Non-blocking, auto-dismissing banner notifications for success, warning, error, and informational states.
  * Supports action buttons (e.g., "View in Vault", "Undo", "Retry").

### 1.4 Instant Persona Quick-Switcher in Navigation
* **Background**: Asset Bridge includes 5 realistic demographic personas (Raghavan, Priya, Vikram, Sunita, Rajesh) with unique legal edge cases across Indian states and asset types.
* **Feature**: Add a quick-switch dropdown in the application header (`Layout.tsx`) during demo / development mode.
* **Behavior**:
  * Allows evaluators and testers to switch between persona profiles with a single click without manually logging out or running terminal seed commands.
  * Updates user session, holds case state, and re-renders active dashboard widgets instantaneously.

### 1.5 Print-Optimized Stylesheet (`@media print`)
* **Background**: Legal heirs frequently require physical hard copies for submission to bank branch managers, tahsildars, and registrar offices.
* **Feature**: Add dedicated print CSS rules for the Case Dossier Preview and Timeline views.
* **Behavior**:
  * Formats document layouts for standard A4 pages with crisp borders, page breaks between institutional schedules, and hides interactive UI buttons automatically during printing.

### 1.6 Drag-and-Drop Document Upload & In-Browser PDF Viewer
* **Background**: Claimants upload death certificates, legal heir certificates, and KYC documents via standard file inputs.
* **Feature**: Introduce an Aceternity-styled drag-and-drop dropzone with an integrated inline document viewer (PDF and image rendering).
* **Behavior**:
  * Visual preview of uploaded proofs before committing to the SQLite Document Vault.
  * Pre-upload client-side file size and MIME-type validation.

---

## 2. Legal Tech & Regulatory Guidance

### 2.1 State-Specific Revenue Portal Deep Links
* **Background**: `fastapi-backend/app/core/identity.py` maps all 10 major Indian states to their required succession documents and authorities.
* **Feature**: Integrate direct outbound links and guidance to official state government e-governance portals:
  * **Tamil Nadu**: TN e-Sevai (`https://www.tnesevai.tn.gov.in`)
  * **Karnataka**: Nadakacheri / Atalji Janasnehi Kendra (`https://nadakacheri.karnataka.gov.in`)
  * **Andhra Pradesh / Telangana**: MeeSeva (`https://www.meeseva.gov.in`)
  * **Delhi**: e-District Delhi (`https://edistrict.delhigovt.nic.in`)
  * **Uttar Pradesh**: e-District UP (`https://edistrict.up.gov.in`)
  * **Maharashtra**: Aaple Sarkar (`https://aaplesarkar.mahaonline.gov.in`)
* **Behavior**: Claimants can launch the relevant state revenue portal directly from their checklist item with pre-copied case particulars.

### 2.2 Asset Schedule & Heir Distribution Spreadsheet Export (.CSV / .XLSX)
* **Background**: Families and legal counsel often require spreadsheet format for deliberations with chartered accountants and partition settlement.
* **Feature**: Add a 1-click "Export Schedule (.CSV)" button on the Aggregate and Heirs pages.
* **Behavior**:
  * Exports verified asset records, account numbers, valuation, nomination statuses, and exact rupee share distributions per legal heir into a structured CSV file.

### 2.3 Interactive Pre-Fill Wizard for Claim Forms
* **Background**: The dossier generator outputs pre-filled statutory templates (EPFO Form 20, Banking Annex V/VI, LIC Form A, Demat TRF).
* **Feature**: Provide an in-app form editor allowing claimants to review or specify missing institution-specific particulars (e.g. claimant savings account IFSC, branch code, employer establishment code) prior to generating final signed PDFs.

---

## 3. Developer Experience (DX) & Demo Readiness

### 3.1 Live Outbox Inspector API (`/api/dev/outbox`)
* **Background**: When SMTP is disabled or credentials are omitted, the mailer writes `.eml` files to `fastapi-backend/data/outbox/`.
* **Feature**: Add read-only development endpoints:
  * `GET /api/dev/outbox`: Lists all queued/mocked email transmissions with timestamp, recipient, and size.
  * `GET /api/dev/outbox/{filename}`: Downloads or renders the raw RFC 822 MIME message directly in the browser for inspection.

### 3.2 Monorepo Diagnostic Command (`npm run doctor`)
* **Feature**: Add a self-diagnostic command in `package.json` executing `node scripts/doctor.js`.
* **Checks performed**:
  * Python environment and dependency resolution (`pytest`, `reportlab`, `fastapi`, `uvicorn`).
  * Node.js dependencies and client build integrity.
  * SQLite database file existence, WAL mode status, and schema completeness.
  * Local port availability for `:8000` (backend) and `:5173` (frontend).
  * API key presence detection (NVIDIA NIM, SMTP).

### 3.3 Auto-Reindexing of Knowledge Base on File Modification
* **Feature**: Add file-watcher integration to `fastapi-backend/app/aggregation/document_rag.py`.
* **Behavior**: Automatically detects edits in `fastapi-backend/knowledge/*.md` and updates the SQLite FTS5 index and chunks without requiring a full backend restart.

---

## 4. Performance, Security & Data Architecture

### 4.1 Client-Side PDF Caching via IndexedDB / SWR
* **Background**: Generating multi-page institutional dossiers can take 1-2 seconds on low-resource machines.
* **Feature**: Cache downloaded PDF byte buffers in the browser using IndexedDB or SWR keyed by `caseId + updatedAt`.
* **Benefit**: Instantaneous preview switching when toggling between dossier tabs without repetitive server-side rendering.

### 4.2 Progressive Web App (PWA) Offline Capability
* **Background**: Claimants frequently visit government administrative offices (Tehsildar / Taluk office, sub-registrar) or rural bank branches with intermittent connectivity.
* **Feature**: Add service worker caching for statutory guidance articles, checklists, and previously generated dossiers so heirs retain offline access on mobile devices.

### 4.3 Automated SQLite Maintenance & Backup Hook
* **Feature**: Scheduled SQLite vacuuming and automated single-file snapshotting (`VACUUM INTO 'data/backup_asset_bridge.db'`) on server shutdown or periodic schedule to ensure continuous zero-data-loss durability.

---

## 5. Implementation Priority Matrix

| Feature / QoL Enhancement | Category | User Impact | Implementation Effort | Recommended Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Interactive RBI Delay Penalty Calculator** | Claimant UX | High | Low | Phase 1 (Immediate) |
| **Outbox & Sent Transmissions Drawer** | Claimant UX | High | Medium | Phase 1 (Immediate) |
| **Persona Quick-Switcher in Navigation** | Demo / DX | High | Low | Phase 1 (Immediate) |
| **State Revenue Portal Deep Links** | Legal Tech | Medium | Low | Phase 1 (Immediate) |
| **Non-Blocking Toast System** | Core UI | Medium | Low | Phase 2 (Polish) |
| **Spreadsheet (.CSV) Export** | Legal Tech | Medium | Low | Phase 2 (Polish) |
| **Live Outbox API Inspector** | DX | High | Low | Phase 2 (Polish) |
| **Monorepo Doctor Check (`npm run doctor`)** | DX | Medium | Low | Phase 2 (Polish) |
| **Client-Side PDF IndexedDB Caching** | Performance | Medium | Medium | Phase 3 (Scale) |
| **PWA Offline Mode for Field Visits** | Accessibility | High | High | Phase 3 (Scale) |
