import datetime
"""
Asset Bridge Mock Data Seeder Core Logic
Seeds complete multi-persona portfolios, alerts, cases, documents, and chat sessions.
"""

from pathlib import Path
from app.config import DATA_DIR
from app.core.store import store, uid
from app.core.auth import hash_password
from app.aggregation.personas import PERSONAS
from app.aggregation.documents import ingest_document
from app.core.identity import REGULATORS, verify_identity

SAMPLE_DOCS_DIR = DATA_DIR / "sample_documents"

def seed_persona(persona_key: str, reset: bool = False):
    """Seed comprehensive mock persona data into SQLite persistence layer."""
    if persona_key not in PERSONAS and persona_key != "all":
        print(f"Unknown persona '{persona_key}'. Available: {list(PERSONAS.keys())} or 'all'")
        return

    keys_to_seed = list(PERSONAS.keys()) if persona_key == "all" else [persona_key]
    
    if reset:
        print("[INFO] Resetting SQLite database tables...")
        store.reset()

    for pkey in keys_to_seed:
        p = PERSONAS[pkey]
        user_id = f"u_{pkey}"
        email = f"{pkey}@demo.local"
        
        print(f"\n---> Seeding Persona: {p['name']} ({p['pan']} · {p['state']})")
        
        # 1. Seed User
        identity_data = {
            "name": p["name"],
            "pan": p["pan"],
            "dob": p["dob"],
            "aadhaarLast4": p["aadhaarLast4"],
            "mobile": p["mobile"],
            "state": p["state"]
        }
        user_record = {
            "id": user_id,
            "email": email,
            "name": p["name"],
            "passwordHash": hash_password("demo1234"),
            "identity": identity_data,
            "verification": {
                "at": "2026-11-04T12:00:00Z",
                "results": verify_identity(identity_data)
            },
            "deceased": {
                "dateOfDeath": "2025-10-14",
                "registrationNo": "TN-CHN-2025-098124",
                "place": "Chennai, Tamil Nadu"
            } if pkey == "raghavan" else None
        }
        
        # Remove existing user if already there
        store.remove("users", lambda u: u.get("id") == user_id or u.get("email") == email)
        store.insert("users", user_record)
        print(f"     [OK] User created: {email}")

        # 2. Seed Holdings & Active AA Consent Handle
        store.remove("holdings", lambda h: h.get("userId") == user_id)
        store.remove("consents", lambda c: c.get("userId") == user_id)
        consent_id = f"c_{pkey}_active"
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        store.insert("consents", {
            "id": consent_id,
            "userId": user_id,
            "handle": f"consent-{pkey}@onemoney",
            "purpose": "Aggregated wealth and succession twin audit",
            "fiTypes": [
                "DEPOSIT", "EPF", "INSURANCE_POLICIES", "MUTUAL_FUNDS",
                "LIC_POLICIES", "NPS", "RECURRING_DEPOSIT"
            ],
            "regulators": list(REGULATORS.keys()),
            "status": "ACTIVE",
            "createdAt": now_dt.isoformat(),
            "expiresAt": (now_dt + datetime.timedelta(days=365)).isoformat(),
            "fetchType": "ONETIME",
            "dataLife": "12 months"
        })
        for h in p["holdings"]:
            h_copy = dict(h)
            h_copy["userId"] = user_id
            st = h.get("status") or h.get("recordStatus") or "active"
            h_copy["status"] = st
            h_copy["recordStatus"] = st
            h_copy["registeredName"] = h.get("registeredName") or p["name"]
            h_copy["consentId"] = consent_id
            store.insert("holdings", h_copy)
        print(f"     [OK] {len(p['holdings'])} holdings and active AA consent seeded into SQLite.")

        # 3. Seed Risk Alerts
        store.remove("alerts", lambda a: a.get("userId") == user_id)
        alerts_count = 0
        for h in p["holdings"]:
            nom = h.get("nominee")
            if not nom:
                store.insert("alerts", {
                    "userId": user_id,
                    "holdingId": h.get("id", ""),
                    "severity": "high",
                    "kind": "nominee_missing",
                    "title": f"No nominee registered on {h.get('type')}",
                    "detail": f"Holding at {h.get('institution')} has zero registered nominees. Assets risk court probate delays upon demise.",
                    "regulator": h.get("regulator"),
                    "resolved": False
                })
                alerts_count += 1
            elif isinstance(nom, dict) and nom.get("status") == "deceased":
                store.insert("alerts", {
                    "userId": user_id,
                    "holdingId": h.get("id", ""),
                    "severity": "high",
                    "kind": "nominee_deceased",
                    "title": f"Nominee recorded as deceased on {h.get('type')}",
                    "detail": f"Nominee {nom.get('name')} ({nom.get('relation')}) predeceased the holder. Nomination is inoperative under Insurance / Banking statutes.",
                    "regulator": h.get("regulator"),
                    "resolved": False
                })
                alerts_count += 1
            elif isinstance(nom, dict) and nom.get("status") == "minor":
                store.insert("alerts", {
                    "userId": user_id,
                    "holdingId": h.get("id", ""),
                    "severity": "medium",
                    "kind": "nominee_minor",
                    "title": f"Minor nominee without appointed guardian on {h.get('type')}",
                    "detail": f"Nominee {nom.get('name')} is a minor. Statutory regulations require a designated major guardian for seamless claim settlement.",
                    "regulator": h.get("regulator"),
                    "resolved": False
                })
                alerts_count += 1
        print(f"     [OK] {alerts_count} risk alerts generated.")

        # 4. Seed Heirs and Cases (if applicable)
        store.remove("heirs", lambda hr: hr.get("userId") == user_id)
        case_id = f"AB-{abs(hash(p['pan'])) % 9000 + 1000}"
        surviving_family = [fam for fam in p.get("family", []) if fam.get("status") != "deceased"]
        heir_share = round(100.0 / len(surviving_family), 1) if surviving_family else 100.0
        for fam in surviving_family:
            store.insert("heirs", {
                "userId": user_id,
                "caseId": case_id,
                "name": fam.get("name"),
                "pan": fam.get("pan", "ABCDE1234F"),
                "relation": fam.get("relation"),
                "mobile": fam.get("phone", "9840000000"),
                "email": f"{fam.get('name').lower().replace(' ', '')}@demo.local",
                "share": heir_share
            })
        print(f"     [OK] Legal heirs registered.")

        # Seed Cases for raghavan and vikram
        if pkey in ["raghavan", "vikram"]:
            store.remove("cases", lambda c: c.get("ownerId") == user_id or c.get("id") == case_id)
            case_record = {
                "id": case_id,
                "ownerId": user_id,
                "deceasedName": p["name"],
                "deceasedPan": p["pan"],
                "state": p["state"],
                "totalValue": sum(h["value"] for h in p["holdings"]),
                "progress": 0.35 if pkey == "raghavan" else 0.15,
                "createdAt": "2025-10-18T10:00:00Z",
                "tasks": [
                    {"id": "t1", "title": "Obtain certified copy of Death Certificate", "detail": "Issued by Municipal / Panchayat Registrar under CRS.", "docs": ["Form 2 Death Report"], "authority": "Local Registrar", "done": True},
                    {"id": "t2", "title": f"Obtain {p['state']} Legal Heirship Certificate", "detail": "Required for inoperative bank deposits and unclaimed insurance.", "docs": ["Death Certificate", "Ration Card", "Applicant Aadhaar"], "authority": "Tahsildar / Revenue Court", "done": False},
                    {"id": "t3", "title": "File EPFO Form 20 PF Settlement Claim", "detail": "Claim accumulated EPF balance and EDLI life benefit.", "docs": ["Form 20", "Cancelled Cheque", "Death Certificate"], "authority": "EPFO Regional Office", "done": False}
                ],
                "timeline": [
                    {"at": "2025-10-18T10:00:00Z", "text": "Estate case opened via Civil Registration System (CRS) record match."},
                    {"at": "2025-10-22T14:30:00Z", "text": "Death certificate verified by family informant."}
                ]
            }
            store.insert("cases", case_record)
            print(f"     [OK] Estate Case '{case_id}' initialized.")

        # 5. Ingest Sample Documents into SQLite Vault & FTS5 (for raghavan)
        if pkey == "raghavan" and SAMPLE_DOCS_DIR.exists():
            store.remove("user_documents", lambda d: d.get("userId") == user_id)
            for doc_file in SAMPLE_DOCS_DIR.glob("*.txt"):
                content = doc_file.read_bytes()
                doc_type = "death_cert" if "death" in doc_file.name else ("heir_cert" if "heir" in doc_file.name else "financial_statement")
                res = ingest_document(
                    file_bytes=content,
                    file_name=doc_file.name,
                    mime_type="text/plain",
                    user_id=user_id,
                    case_id=case_id,
                    task_id="t1" if "death" in doc_file.name else "t2",
                    doc_type=doc_type
                )
                print(f"     [OK] Ingested & indexed '{doc_file.name}' into FTS5 ({res.get('chunks_indexed', 0)} chunks).")

        # 6. Seed Persistent Chat Consultation
        store.remove("chat_sessions", lambda s: s.get("userId") == user_id)
        sess_id = uid("sess_")
        store.insert("chat_sessions", {
            "id": sess_id,
            "userId": user_id,
            "caseId": case_id,
            "title": f"Succession Planning & Claim Checklist for {p['name']}",
            "createdAt": "2026-11-04T12:00:00Z"
        })
        store.insert("chat_messages", {
            "id": uid("msg_"),
            "sessionId": sess_id,
            "role": "user",
            "content": f"What documents do I need to claim the bank fixed deposit without nominee in {p['state']}?",
            "sources": [],
            "actions": [],
            "engine": ""
        })
        store.insert("chat_messages", {
            "id": uid("msg_"),
            "sessionId": sess_id,
            "role": "assistant",
            "content": f"Under RBI Master Circular regulations for deceased depositors without registered nomination in **{p['state']}**, the surviving legal heirs must submit:\n\n1. **{p['state']} Legal Heir Certificate** from the local revenue authority [Law 1].\n2. **Certified Death Certificate** [User Doc 1].\n3. **Bank Claim Form Annexure A** signed by all adult legal heirs along with a Letter of Indemnity.",
            "sources": [
                {"type": "user_doc", "title": "death_certificate_raghavan.txt", "section": "Section 1", "file": "death_certificate_raghavan.txt"},
                {"type": "statutory", "title": "Bank Deposits", "section": "RBI Deceased Depositor Circular", "file": "bank-deposits.md"}
            ],
            "actions": [
                {"label": "Review Nominee Alerts", "url": "/app/alerts", "type": "navigate"},
                {"label": "View Case Tasks", "url": f"/app/cases/{case_id}", "type": "navigate"}
            ],
            "engine": "extractive"
        })
        print(f"     [OK] Persistent AI chat consultation seeded.")

    print(f"\n========================================================")
    print(f"MOCK DATA SEEDING COMPLETED FOR: {persona_key.upper()}")
    print(f"========================================================")
