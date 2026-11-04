# Asset Bridge – Security & Risk Register
**Author:** Shajith (Architecture & Technical Documentation Lead)  
**Date:** November 2026  
**Repository:** [ASSET-BRIDGE](https://github.com/asvandkanakaraj/ASSET-BRIDGE.git)  
**Branch:** `shajith/round2-documentation`

---

## 1. Security Architecture & Threat Modeling Overview

Asset Bridge aggregates sensitive financial holdings, identification numbers (PAN, Aadhaar last-4), family heir structures, and death certificate records. The platform operates under the regulatory jurisdiction of the **Digital Personal Data Protection (DPDP) Act 2023**, Reserve Bank of India (RBI) Account Aggregator guidelines, and UIDAI data-masking mandates.

This register identifies vulnerabilities, assigns standard severity ratings (Critical, High, Medium, Low), and details concrete engineering mitigations implemented or planned.

---

## 2. Comprehensive Security Risk Register

| Risk ID | Vulnerability / Threat Vector | Category | Impact Description | Severity | Current Status | Engineering Mitigation & Controls |
|---|---|---|---|---|---|---|
| **SEC-01** | **Unsalted / Simple Password Hashing** | Authentication | SHA-256 without per-user salt in `auth.py` allows rainbow-table precomputation if disk is breached. | **High** | Existing | Replace with **Argon2id** (`passlib[argon2]`) with minimum 64MB memory cost and 3 iterations, or bcrypt work factor 12. |
| **SEC-02** | **CORS Wildcard Policy (`*`)** | API Security | `allow_origins=["*"]` allows malicious third-party origins to execute authenticated cross-site requests. | **High** | Existing | Restrict `allow_origins` strictly to trusted frontend domain (`http://localhost:5173`, production Vercel/Netlify URLs). |
| **SEC-03** | **Plaintext JSON Storage (`db.json`)** | Storage | User records, PAN numbers, asset balances, and hashed passwords stored in unencrypted JSON file on disk. | **Critical** | Being Migrated | Transition to **Supabase / PostgreSQL** with **Row-Level Security (RLS)**, TLS 1.3 in transit, and AES-256 encryption at rest. |
| **SEC-04** | **Aadhaar Storage & UIDAI Non-Compliance** | Privacy / PII | Storing 12-digit Aadhaar numbers violates UIDAI mandates and attracts severe statutory penalties. | **Critical** | Mitigated | Enforce strict 4-digit masking regex (`^\d{4}$`). Full Aadhaar numbers are rejected at the Pydantic schema validation layer. |
| **SEC-05** | **JWT Token Leakage via WebSocket Query Strings** | Real-Time / WS | Passing JWTs in URL query parameters (`/ws?token=...`) exposes session tokens in proxy logs, browser histories, and WAF records. | **Medium** | Existing | Transition WebSocket authentication to HTTP-only cookies or a one-time ephemeral connection ticket exchange. |
| **SEC-06** | **AI Legal Hallucination (Nominee vs. Legal Heir)** | AI / RAG | LLM hallucinating that a nominee is the absolute owner, contradicting Indian Supreme Court rulings (*Sarbati Devi* precedent). | **High** | Mitigated | Strict grounding system prompts + 8 curated statutory markdown files. Explicit disclaimer disallowing ungrounded legal claims. |
| **SEC-07** | **Unauthorized Estate Trigger (Spurious Death Registration)** | Fraud / Access | Malicious user or rogue heir submitting a fabricated death certificate to freeze legitimate owner's assets. | **Critical** | Planned | Require cryptographic verification via Civil Registration System (CRS) API / DigiLocker digital signatures before estate mode activation. |
| **SEC-08** | **Missing Rate Limiting on Identity & Auth Endpoints** | API Security | Unthrottled brute-force attacks against `/api/auth/login` and scraping via `/api/identity`. | **Medium** | Existing | Implement `slowapi` Redis-backed rate limiter (limit login to 5 attempts/min; identity queries to 10/min per IP). |
| **SEC-09** | **CAS Statement PDF Password Decryption Vulnerability** | Ingestion | Ingestion parser processing password-protected statements could expose user passwords or crash on malformed PDFs. | **Medium** | Planned | In-memory stream parsing with PyMuPDF/pdfplumber; immediately zeroize password buffers; reject corrupted binaries. |
| **SEC-10** | **Lack of Token Expiration & Revocation List** | Session | JWT tokens issued with long expiration times cannot be invalidated on logout or password reset. | **Medium** | Being Migrated | Implement standard JWT `exp` claims (60-minute access token) with Redis token blocklist on `/api/auth/logout`. |
| **SEC-11** | **Data Isolation Between Heirs in Multi-Heir Estates** | Privacy | One heir observing another heir's private financial assets outside the deceased person's estate share. | **High** | Planned | PostgreSQL Row-Level Security policies ensuring heirs can only query assets linked to active cases where they are named. |
| **SEC-12** | **Prompt Injection via AI Succession Guide Chat** | AI Security | User crafting adversarial inputs to extract backend prompts, system instructions, or internal database metadata. | **Medium** | Mitigated | Input sanitization, max character limits (500 chars), and strict output filtering rejecting prompt regurgitation. |

---

## 3. DPDP Act 2023 Compliance Checklist

Under India's Digital Personal Data Protection Act, Asset Bridge operates as a **Data Fiduciary**:
1. **Notice & Purpose Limitation:** User explicitly consents to asset discovery across regulators solely for estate mapping and gap resolution.
2. **Right to Erasure (Demo Reset):** The `/api/demo/reset` endpoint completely purges holdings, consents, alerts, cases, and identity tokens.
3. **Data Minimization:** Only last 4 digits of Aadhaar collected; bank account numbers truncated to `•••• 1234`.
4. **Data Security Safeguards:** Mandatory HTTPS / TLS 1.3 transport; scheduled migration to encrypted PostgreSQL persistence.

---

## 4. Threat Matrix by Severity

```
CRITICAL (Action Required Before Production):
├── SEC-03: Plaintext JSON storage file (Migrate to Supabase PostgreSQL + RLS)
├── SEC-04: Full Aadhaar storage risk (Enforce last-4 masking - Mitigated)
└── SEC-07: Spurious death event trigger (Require verified CRS digital certificate)

HIGH (Action Required Before Multi-User Beta):
├── SEC-01: Unsalted SHA-256 password hashing (Upgrade to Argon2id / bcrypt)
├── SEC-02: Wildcard CORS configuration (Restrict to trusted web domains)
├── SEC-06: AI legal hallucination on succession rights (Ground in verified manuals)
└── SEC-11: Data leakage across multiple heirs (Enforce tenant & case RLS)

MEDIUM (Scheduled for Engineering Hardening):
├── SEC-05: WebSocket token passing via query string (Move to one-time connection ticket)
├── SEC-08: Missing API rate limiting (Deploy slowapi Redis limiter)
├── SEC-09: CAS statement PDF password handling (In-memory zeroization)
├── SEC-10: Token revocation on logout (Implement Redis blacklist)
└── SEC-12: AI prompt injection mitigation (Input sanitization & system safeguards)
```
