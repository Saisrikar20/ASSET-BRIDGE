# ASSET BRIDGE — RELIABILITY, TESTING & QUALITY ASSURANCE
**Document ID:** `DOC-ASVAND-10`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Focus:** Verification Test Suite, Test Execution Results & Defect Catalog  

---

## 1. BUILD & TYPE-CHECKING AUDIT (ACTUAL EXECUTION)

Safe verification commands were executed directly on the local repository:

### A. Frontend Build Check (`client/`)
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Result:** **FAILED (Exit code 1)**
- **Root Cause:** Dependencies are not installed in `client/node_modules`. The TypeScript compiler (`tsc`) is missing from the local workspace.
- **Action Required:** Execute `npm install` in `client/` to enable compilation and bundle verification.

### B. Backend Test Suite (`fastapi-backend/`)
- **Command:** `& "C:\Users\ASVAND\AppData\Local\Python\bin\python.exe" fastapi-backend/test_module1.py`
- **Result:** **FAILED (Exit code 1)**
- **Root Cause:** `fastapi.testclient` failed to import (`ModuleNotFoundError: No module named 'fastapi'`). Python dependencies are not installed in a global virtual environment.
- **Action Required:** Create `.venv` in `fastapi-backend/` and run `pip install -r requirements.txt`.

---

## 2. RELIABILITY TEST CHECKLIST & EXECUTION MATRIX

| Test ID | Test Scenario | Input Data | Expected Output | Actual Executed Output | Status | Owner |
|---|---|---|---|---|---|---|
| **TEST-01** | Valid PAN Identity Verification | PAN: `ABCPI1234K`, DOB: `1984-03-14` | Status 200; 7 regulator results; Canara Bank marked `partial`. | Code verified in `identity.py`; runtime execution blocked on venv. | **Audited (Not Executed)** | Sai |
| **TEST-02** | Invalid PAN Regex Rejection | PAN: `INVALID123` | Status 400; `"PAN must look like ABCDE1234F"` | Verified via code inspection in `routers.py:134`. | **Audited** | Sai |
| **TEST-03** | Aadhaar 4-Digit Enforcement | `aadhaarLast4: "12345"` | Status 400; `"Enter only the last 4 digits of Aadhaar"` | Verified via code inspection in `routers.py:137`. | **Audited** | Sai |
| **TEST-04** | Duplicate User Registration | Email: `demo@assetbridge.in` | Status 409; `"An account with this email already exists"` | Verified via code inspection in `routers.py:78`. | **Audited** | Sai |
| **TEST-05** | Password Length Validation | Password: `"12345"` | Status 400; `"Password must be at least 6 characters"` | Verified via code inspection in `routers.py:76`. | **Audited** | Sai |
| **TEST-06** | AI RAG Offline Fallback | Query: "How do I claim EPF?", No API Key | Extractive sentences returned with inline `[1]`, `[2]` citations; zero crash. | Implemented in `main.py:150` (`extractive()`). | **Audited** | Sai |
| **TEST-07** | Client Duplicate File Upload | Upload identical PDF to Task t1 and Task t2 | System computes SHA-256 hash and displays warning badge: "Duplicate file detected". | Test specification defined for Task FE-01. | **Planned** | Asvand |
| **TEST-08** | Client Document MIME Validation | Upload `.exe` or `.sh` file | File rejected immediately; inline error: "Only PDF, PNG, and JPEG accepted". | Test specification defined for Task FE-01. | **Planned** | Asvand |
| **TEST-09** | Claim Dossier PDF Export | Case `AB-TN8841` | PDF downloads; includes all 16 holdings and pre-filled Form 20 data. | Test specification defined for Task FE-02. | **Planned** | Asvand |
| **TEST-10** | Monte Carlo Convergence | 1,000 runs, seed `0x811c9dc5` | Success rate stays exactly 76%; P10, P50, P90 percentiles deterministic. | Verified in legacy `lifesim.js`; pending Python port. | **Audited** | Sai |

---

## 3. EDGE CASE & FAULT TOLERANCE AUDIT

1. **Backend Offline / Cold Start Handling:**
   - On free-tier cloud platforms (e.g. Render), services sleep after 15 minutes of inactivity. The landing page (`Landing.tsx`) displays a graceful loading message: *"Waking up secure API service (may take ~45s on first load)..."*.
2. **Empty States:**
   - If a user inputs a PAN with zero matching records, `Dashboard.tsx` correctly renders an empty state illustration: *"No unclaimed assets found across 7 regulators under this PAN. Try linking family members."*
3. **Network Disconnection During Live Demo:**
   - WebSocket client (`live.tsx`) implements exponential backoff reconnection (retrying at 1s, 2s, 4s, up to 10s intervals) without locking the UI.

