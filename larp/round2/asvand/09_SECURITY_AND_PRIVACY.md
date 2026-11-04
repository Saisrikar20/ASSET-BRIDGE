# ASSET BRIDGE — SECURITY, PRIVACY & COMPLIANCE REVIEW
**Document ID:** `DOC-ASVAND-09`  
**Author:** Asvand (Product & Frontend Lead Assistant)  
**Date:** November 4, 2026  
**Scope:** Vulnerability Audit, Threat Modeling & DPDP Act 2023 Alignment  

---

## 1. VULNERABILITY & RISK MATRIX

| Risk Area | Risk Description | Severity | Existing Protection | Missing Protection | Recommended Fix | Owner | Priority |
|---|---|---|---|---|---|---|---|
| **Storage at Rest** | PII and balances saved in plaintext JSON (`db.json`). | **HIGH** | None. Plaintext JSON in `fastapi-backend/data/`. | Field-level encryption. | Encrypt PAN, mobile, and balance fields using `AES-256-GCM` before disk write. | Sai | **HIGH** |
| **Secrets Management** | Dev secret fallback `'asset-bridge-dev-secret'`. | **MEDIUM** | Reads `AUTH_SECRET` from environment variable. | Strict production enforcement. | Raise error if default secret is used in non-development environments. | Sai | **MEDIUM** |
| **CORS Policy** | CORS configured to `allow_origins=["*"]`. | **MEDIUM** | Global CORS middleware. | Strict origin whitelist. | Restrict origins to `localhost:5173` and production domain. | Sai | **MEDIUM** |
| **Rate Limiting** | Auth and verification endpoints vulnerable to brute force. | **MEDIUM** | None. | IP-based / token-based rate limiting. | Add `slowapi` rate limiter (5 attempts / min on `/auth/login`). | Sai | **MEDIUM** |
| **CRS Simulation Auth** | `POST /api/crs/death` accepts unauthenticated death events. | **HIGH** | PAN format validation. | Registrar authentication / webhook signature. | Require an API key or HMAC signature on `/crs/death`. | Sai | **HIGH** |
| **Heir Role Isolation** | Anyone with an heir's PAN can view their case details. | **LOW** | `caseAccess()` verifies PAN exists in case heirs. | Second-factor / OTP verification. | Add SMS/email mock OTP step for heir access. | Asvand | **LOW** |
| **AI Prompt Injection** | Untrusted inputs passed directly into LLM prompts. | **LOW** | Pydantic string validation; temperature 0.3. | Strict context delimiters. | Wrap user questions in XML delimiters (`<user_query>`) in prompt. | Sai | **LOW** |

---

## 2. AUDIT OF CURRENT VS. CLAIMED SECURITY CONTROLS

| Claimed Security Control (from Original PPT) | Real Code Reality | Audit Verdict |
|---|---|---|
| **"AES-256-GCM Encryption at Rest"** | `store.py` writes plaintext JSON directly to disk. | **NOT IMPLEMENTED (Planned)** |
| **"Masking Account Numbers in Normal Views"** | Bank account references are formatted as `XXXX4417` in seed records. | **PARTIALLY IMPLEMENTED (Presentation layer only)** |
| **"Explicit Consent Before Data Access"** | User must submit consent parameters before `/api/consents` returns holdings. | **IMPLEMENTED** |
| **"Short-Lived Document Links"** | Documents are not currently uploaded or stored. | **NOT IMPLEMENTED** |
| **"Salted Password Storage"** | Node used `crypto.scryptSync`; Python uses `hashlib.scrypt` with random 16-byte salt and timing-safe comparison. | **IMPLEMENTED & VERIFIED** |
| **"Session Token Verification"** | Cryptographic HMAC-SHA256 signature checked via `hmac.compare_digest`. | **IMPLEMENTED & VERIFIED** |

---

## 3. DIGITAL PERSONAL DATA PROTECTION (DPDP) ACT 2023 COMPLIANCE GAP

Under India's **Digital Personal Data Protection Act 2023**, financial data processors (Data Fiduciaries) must satisfy four statutory requirements:

1. **Notice & Consent (Section 5 & 6):**
   - *Status:* **Compliant in UX**. Our `/app/aggregate` screen provides clear notice of purpose, data retention window (1 year), and regulatory scope.
2. **Right to Withdraw Consent (Section 6(4)):**
   - *Status:* **Compliant in Architecture**. Our `/api/consents/:id/revoke` endpoint immediately changes consent status to `REVOKED` and purges active holdings from the user's twin.
3. **Data Security Safeguards (Section 8(5)):**
   - *Status:* **Non-Compliant in Prototype**. Financial records currently reside in plaintext on disk. We must implement transparent AES-256-GCM encryption in `store.py` before live production deployment.
4. **Data Minimization:**
   - *Status:* **Compliant**. We collect only the last 4 digits of Aadhaar (never storing the full 12-digit Aadhaar number, avoiding Aadhaar Act violations).

