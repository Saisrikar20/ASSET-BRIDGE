import datetime, re, random
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from app.core.store import store, uid
from app.core.auth import get_current_user, public_user, verify_token
from app.core.live import live_manager
from app.core.identity import REGULATORS, STATES, STATE_HEIR_DOC, DEMO_IDENTITY, DEMO_RECORDS
from app.aggregation.models import (
    PANValidationRequest, PANValidationResponse, PipelineProcessRequest,
    ConsolidatedReport
)
from app.aggregation.pipeline import (
    validate_input, process_pipeline, discover_assets, normalize_assets,
    detect_duplicates, analyze_financials, generate_consolidated_report
)
from app.aggregation.assistant import answer_question, GuideIn
from app.aggregation.documents import ingest_document, search_user_documents, delete_user_document
from app.aggregation.pdf_generator import generate_claiming_dossier_pdf
from app.aggregation.personas import PERSONAS
from app.aggregation.mock_generator import generate_portfolio_for_pan


router = APIRouter(prefix="/api")

# --- Succession helper ---
def build_succession_tasks(holdings: list, state: str) -> list:
    heir_doc_info = STATE_HEIR_DOC.get(state, {
        "doc": "Legal Heir / Succession Certificate",
        "authority": "Local revenue office or District Court",
        "days": "1–6 months"
    })
    needs_heir_doc = any(not h.get("nominee") or (h.get("nominee") and h.get("nominee").get("status") != "valid") for h in holdings)
    
    n = 0
    def tid():
        nonlocal n
        n += 1
        return f"t{n}"

    tasks = [
        {
            "id": tid(),
            "title": "Obtain death certificate",
            "detail": "Issued by the local registrar under the Civil Registration System. Get several certified copies.",
            "docs": ["Form 2 death report", "ID of informant"],
            "authority": "Municipal / Panchayat registrar",
            "holdingId": None,
            "done": False
        }
    ]
    if needs_heir_doc:
        tasks.append({
            "id": tid(),
            "title": f"Get {heir_doc_info['doc']}",
            "detail": f"Needed wherever there is no valid nominee. In {state or 'your state'}, this comes from {heir_doc_info['authority']} — typically {heir_doc_info['days']}.",
            "docs": ["Death certificate", "ID & address proof of all heirs", "Relationship proof"],
            "authority": heir_doc_info["authority"],
            "holdingId": None,
            "done": False
        })

    for h in holdings:
        reg = h.get("regulator")
        inst = h.get("institution", "Institution")
        nom = h.get("nominee") and h.get("nominee").get("status") == "valid"
        htype = h.get("type", "Asset")
        hid = h.get("id")

        if reg == "RBI":
            if "Gold Bond" in htype:
                tasks.append({
                    "id": tid(), "title": "Transmit Sovereign Gold Bond",
                    "detail": f"Submit transmission request for {h.get('ref')}.",
                    "docs": ["SGB transmission form", "Death certificate", "Claimant KYC"],
                    "authority": inst, "holdingId": hid, "done": False
                })
            else:
                title = f"Submit nominee claim at {inst}" if nom else f"Submit legal-heir claim at {inst}"
                tasks.append({
                    "id": tid(), "title": title,
                    "detail": f"Settle deposit claim with {inst}.",
                    "docs": ["Bank claim form", "Death certificate", "KYC"],
                    "authority": inst, "holdingId": hid, "done": False
                })
        elif reg == "EPFO":
            tasks.append({
                "id": tid(), "title": "File Form 20 (PF settlement)",
                "detail": f"Claim PF balance for {inst}.",
                "docs": ["Form 20", "Death certificate", "Cancelled cheque"],
                "authority": "EPFO regional office", "holdingId": hid, "done": False
            })
        elif reg in ["IRDAI", "LIC"]:
            tasks.append({
                "id": tid(), "title": f"Submit insurance death claim to {inst}",
                "detail": f"Intimate death claim for policy {h.get('ref')}.",
                "docs": ["Claim form", "Death certificate", "Policy document", "Bank mandate"],
                "authority": inst, "holdingId": hid, "done": False
            })
        elif reg == "SEBI":
            tasks.append({
                "id": tid(), "title": f"Transmit securities via {inst}",
                "detail": f"Move securities or mutual funds for {h.get('ref')} to claimant.",
                "docs": ["Transmission request form", "Death certificate", "Client Master List"],
                "authority": inst, "holdingId": hid, "done": False
            })
        else:
            tasks.append({
                "id": tid(), "title": f"Claim {htype} at {inst}",
                "detail": f"Submit title and death paperwork for {h.get('ref')}.",
                "docs": ["Claim form", "Death certificate", "ID proof"],
                "authority": inst, "holdingId": hid, "done": False
            })

    return tasks

# -------------------------------------------------------------
# TASK 4: CORE PIPELINE ENDPOINTS
# -------------------------------------------------------------
@router.post("/pipeline/validate-pan", response_model=PANValidationResponse)
def api_validate_pan(body: PANValidationRequest):
    """Step 1 Input Validation endpoint."""
    valid, msg, entity_type = validate_input(body.pan)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    return PANValidationResponse(
        valid=True,
        pan=body.pan.strip().upper(),
        entityType=entity_type,
        message=f"Valid {entity_type} PAN."
    )

@router.post("/pipeline/process", response_model=ConsolidatedReport)
def api_process_pipeline(body: PipelineProcessRequest, user: dict = Depends(get_current_user)):
    """Executes the deterministic 7-step Core Asset Processing Pipeline."""
    identity_dict = {
        "pan": body.pan.strip().upper(),
        "name": body.name.strip(),
        "dob": body.dob.strip(),
        "state": body.state.strip(),
        "aadhaarLast4": body.aadhaarLast4,
        "mobile": body.mobile
    }
    try:
        report = process_pipeline(identity_dict, body.regulators)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Cache latest report in user record
    store.update("users", lambda u: u.get("id") == user["id"], {"latestReport": report.model_dump()})
    return report

@router.get("/reports/consolidated")
def api_get_consolidated_report(user: dict = Depends(get_current_user)):
    """Retrieves the latest consolidated report or generates one from current identity."""
    existing = user.get("latestReport")
    if existing:
        return existing
        
    identity = user.get("identity")
    if not identity:
        identity = DEMO_IDENTITY
        
    report = process_pipeline(identity)
    return report.model_dump()

# -------------------------------------------------------------
# FRONTEND INTEGRATION: Consents & Aggregation
# -------------------------------------------------------------
class ConsentCreateBody(BaseModel):
    regulators: List[str]
    months: Optional[int] = 12

@router.get("/consents")
def get_consents(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    return {"consents": store.all("consents", lambda c: c.get("userId") == uid_val)}

@router.post("/consents")
async def create_consent(body: ConsentCreateBody, user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    identity = user.get("identity") or DEMO_IDENTITY
    
    # Store consent artefact
    c_id = uid("c_")
    now = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(days=body.months * 30)
    
    consent = store.insert("consents", {
        "id": c_id,
        "userId": uid_val,
        "handle": f"consent-{uid()[:8]}@onemoney",
        "purpose": "Aggregated wealth and succession twin audit",
        "fiTypes": [REGULATORS[r]["fiType"] for r in body.regulators if r in REGULATORS],
        "regulators": body.regulators,
        "status": "ACTIVE",
        "createdAt": now.isoformat(),
        "expiresAt": expires.isoformat(),
        "fetchType": "ONETIME",
        "dataLife": f"{body.months} months"
    })
    
    # Step 3 & 4: Discover & Normalize
    raw_records = discover_assets(identity, body.regulators)
    normalized = normalize_assets(raw_records, identity)
    deduped_assets, duplicates = detect_duplicates(normalized)
    
    # Persist holdings
    store.remove("holdings", lambda h: h.get("userId") == uid_val)
    created_holdings = []
    for a in deduped_assets:
        h_dict = a.model_dump()
        h_dict["userId"] = uid_val
        h_dict["consentId"] = c_id
        store.insert("holdings", h_dict)
        created_holdings.append(h_dict)
        
    # Step 6: Financial Analysis & Alerts
    analysis = analyze_financials(deduped_assets, identity)
    store.remove("alerts", lambda al: al.get("userId") == uid_val)
    for al in analysis.alerts:
        al_dict = al.model_dump()
        al_dict["userId"] = uid_val
        store.insert("alerts", al_dict)
        await live_manager.push(uid_val, "alert", al_dict)
        
    return {"consent": consent, "holdingsCount": len(created_holdings)}

@router.post("/consents/{consent_id}/revoke")
def revoke_consent(consent_id: str, user: dict = Depends(get_current_user)):
    c = store.find("consents", lambda c: c.get("id") == consent_id and c.get("userId") == user["id"])
    if not c:
        raise HTTPException(status_code=404, detail="Consent not found")
    store.update("consents", lambda item: item.get("id") == consent_id, {"status": "REVOKED"})
    return {"ok": True}

# -------------------------------------------------------------
# FRONTEND INTEGRATION: Holdings & Alerts
# -------------------------------------------------------------
@router.get("/holdings")
def get_holdings(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    holdings = store.all("holdings", lambda h: h.get("userId") == uid_val)
    
    # Calculate summary
    total = sum(h.get("value", 0) for h in holdings if not h.get("isDuplicate"))
    at_risk = sum(h.get("value", 0) for h in holdings if not h.get("isDuplicate") and (not h.get("nominee") or h.get("recordStatus") != "active" or (h.get("nominee") and h.get("nominee").get("status") != "valid")))
    
    by_reg = []
    for code in REGULATORS.keys():
        hs = [h for h in holdings if h.get("regulator") == code and not h.get("isDuplicate")]
        by_reg.append({
            "regulator": code,
            "count": len(hs),
            "value": sum(h.get("value", 0) for h in hs)
        })
        
    return {
        "holdings": holdings,
        "summary": {
            "total": total,
            "atRisk": at_risk,
            "count": len([h for h in holdings if not h.get("isDuplicate")]),
            "byRegulator": by_reg
        }
    }

class NomineeUpdateBody(BaseModel):
    name: str
    relation: str

@router.patch("/holdings/{holding_id}/nominee")
async def update_nominee(holding_id: str, body: NomineeUpdateBody, user: dict = Depends(get_current_user)):
    h = store.find("holdings", lambda item: item.get("id") == holding_id and item.get("userId") == user["id"])
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    new_nominee = {"name": body.name.strip(), "relation": body.relation.strip(), "status": "valid"}
    updated = store.update("holdings", lambda item: item.get("id") == holding_id, {"nominee": new_nominee})
    
    # Auto-resolve nominee_missing alert
    store.update("alerts", lambda a: a.get("holdingId") == holding_id and a.get("kind") == "nominee_missing", {"resolved": True})
    await live_manager.push(user["id"], "alert_resolved", {"holdingId": holding_id})
    return {"holding": updated}

@router.post("/holdings/{holding_id}/reactivate")
async def reactivate_holding(holding_id: str, user: dict = Depends(get_current_user)):
    h = store.find("holdings", lambda item: item.get("id") == holding_id and item.get("userId") == user["id"])
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    updated = store.update("holdings", lambda item: item.get("id") == holding_id, {"recordStatus": "active", "status": "active"})
    store.update("alerts", lambda a: a.get("holdingId") == holding_id and a.get("kind") in ["inoperative", "unclaimed"], {"resolved": True})
    await live_manager.push(user["id"], "holding_updated", {"id": holding_id, "status": "active"})
    return {"holding": updated}

@router.get("/alerts")
def get_alerts(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    return {"alerts": store.all("alerts", lambda a: a.get("userId") == uid_val)}

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, user: dict = Depends(get_current_user)):
    a = store.find("alerts", lambda item: item.get("id") == alert_id and item.get("userId") == user["id"])
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    store.update("alerts", lambda item: item.get("id") == alert_id, {"resolved": True})
    return {"ok": True}

# -------------------------------------------------------------
# FRONTEND INTEGRATION: Heirs & Estate Cases
# -------------------------------------------------------------
class HeirCreateBody(BaseModel):
    name: str
    relation: str
    pan: str
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    share: float

@router.get("/heirs")
def get_heirs(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    return {"heirs": store.all("heirs", lambda h: h.get("userId") == uid_val)}

@router.post("/heirs")
def add_heir(body: HeirCreateBody, user: dict = Depends(get_current_user)):
    heir = store.insert("heirs", {
        "id": uid("k_"),
        "userId": user["id"],
        "name": body.name.strip(),
        "relation": body.relation.strip(),
        "pan": body.pan.strip().upper(),
        "mobile": body.mobile or "",
        "email": body.email or "",
        "share": body.share
    })
    return {"heir": heir}

@router.delete("/heirs/{heir_id}")
def delete_heir(heir_id: str, user: dict = Depends(get_current_user)):
    store.remove("heirs", lambda h: h.get("id") == heir_id and h.get("userId") == user["id"])
    return {"ok": True}

class DeathNoticeBody(BaseModel):
    pan: str
    dateOfDeath: str
    registrationNo: Optional[str] = None
    place: Optional[str] = None

@router.post("/crs/death")
async def crs_death_notification(body: DeathNoticeBody, user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    holdings = store.all("holdings", lambda h: h.get("userId") == uid_val)
    heirs = store.all("heirs", lambda h: h.get("userId") == uid_val)
    state = (user.get("identity") or {}).get("state", "Tamil Nadu")
    
    deceased = {
        "dateOfDeath": body.dateOfDeath,
        "registrationNo": body.registrationNo or f"CRS/{datetime.date.today().year}/{random.randint(100000, 999999)}",
        "place": body.place or state
    }
    store.update("users", lambda u: u.get("id") == uid_val, {"deceased": deceased})
    
    case_tasks = build_succession_tasks(holdings, state)
    case_row = store.insert("cases", {
        "id": f"AB-{uid()[:4].upper()}{random.randint(10, 99)}",
        "ownerId": uid_val,
        "deceasedName": (user.get("identity") or {}).get("name", user["name"]),
        "deceasedPan": body.pan.strip().upper(),
        "state": state,
        "deceased": deceased,
        "holdings": holdings,
        "heirs": heirs,
        "tasks": case_tasks,
        "timeline": [
            {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "text": f"Death registration {deceased['registrationNo']} received via CRS"},
            {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "text": f"Matched to PAN {body.pan} — {len(holdings)} holdings aggregated"},
            {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "text": f"{len(heirs)} legal heir(s) notified"}
        ],
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    
    await live_manager.push(uid_val, "case", {"id": case_row["id"]})
    return {"case": case_row, "notified": [{"name": h["name"], "via": ["SMS", "Email"]} for h in heirs]}

@router.get("/cases")
def get_cases(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    pan = (user.get("identity") or {}).get("pan")
    cases = store.all("cases", lambda c: c.get("ownerId") == uid_val or (pan and any(h.get("pan") == pan for h in c.get("heirs", []))))
    return {
        "cases": [
            {
                "id": c["id"],
                "deceasedName": c["deceasedName"],
                "createdAt": c["createdAt"],
                "progress": len([t for t in c.get("tasks", []) if t.get("done")]) / max(len(c.get("tasks", [])), 1)
            } for c in cases
        ]
    }

@router.get("/cases/{case_id}")
def get_case_detail(case_id: str, user: dict = Depends(get_current_user)):
    c = store.find("cases", lambda item: item.get("id") == case_id.upper())
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"case": c, "actor": "owner"}

class TaskUpdateBody(BaseModel):
    done: bool

@router.patch("/cases/{case_id}/tasks/{task_id}")
async def update_case_task(case_id: str, task_id: str, body: TaskUpdateBody, user: dict = Depends(get_current_user)):
    c = store.find("cases", lambda item: item.get("id") == case_id.upper())
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    t = next((task for task in c.get("tasks", []) if task.get("id") == task_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    t["done"] = body.done
    c.setdefault("timeline", []).append({
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "text": f"Family {'completed' if body.done else 'reopened'}: {t.get('title')}"
    })
    store.update("cases", lambda item: item.get("id") == case_id.upper(), c)
    await live_manager.push(c.get("ownerId", ""), "case_update", {"id": c["id"]})
    return {"case": c}

# -------------------------------------------------------------
# TASK 3: MULTI-SOURCE RAG AI NAVIGATOR & DOCUMENT VAULT
# -------------------------------------------------------------
@router.post("/assistant")
async def api_assistant(body: GuideIn, authorization: Optional[str] = Header(None)):
    """Multi-source AI Navigator searching statutory law, user documents, and live portfolio."""
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Ask a question")
        
    if authorization and authorization.startswith("Bearer "):
        user_id = verify_token(authorization.replace("Bearer ", "").strip())
        if user_id:
            body.userId = user_id
            
    result = await answer_question(body)
    return result

@router.get("/assistant/sessions")
def get_chat_sessions(user: dict = Depends(get_current_user)):
    """List persistent chat sessions for authenticated user."""
    sessions = store.all("chat_sessions", lambda s: s.get("userId") == user["id"] or s.get("user_id") == user["id"])
    return {"sessions": sessions}

class CreateSessionBody(BaseModel):
    title: str = "New Consultation"
    caseId: Optional[str] = ""

@router.post("/assistant/sessions")
def create_chat_session(body: CreateSessionBody, user: dict = Depends(get_current_user)):
    """Create a new persistent AI chat session."""
    session = store.insert("chat_sessions", {
        "id": uid("sess_"),
        "userId": user["id"],
        "caseId": body.caseId or "",
        "title": body.title,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return {"session": session}

@router.get("/assistant/sessions/{session_id}/messages")
def get_session_messages(session_id: str, user: dict = Depends(get_current_user)):
    """Retrieve full persistent conversation history for a given session."""
    session = store.find("chat_sessions", lambda s: s.get("id") == session_id and (s.get("userId") == user["id"] or s.get("user_id") == user["id"]))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = store.all("chat_messages", lambda m: m.get("sessionId") == session_id or m.get("session_id") == session_id)
    return {"messages": messages}

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    caseId: Optional[str] = Form(""),
    taskId: Optional[str] = Form(""),
    docType: Optional[str] = Form("other"),
    user: dict = Depends(get_current_user)
):
    """Upload, extract, chunk, and index an estate or financial document into SQLite and FTS5."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
    try:
        result = ingest_document(
            file_bytes=content,
            file_name=file.filename or "uploaded_file",
            mime_type=file.content_type or "application/octet-stream",
            user_id=user["id"],
            case_id=caseId,
            task_id=taskId,
            doc_type=docType or "other"
        )
        
        # Dispatch live alert via WebSockets
        await live_manager.push(user["id"], "doc_uploaded", {
            "fileName": file.filename,
            "docId": result["document"]["id"],
            "chunks": result.get("chunks_indexed", 0)
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.get("/documents")
def list_documents(caseId: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List indexed user documents from SQLite vault."""
    pred = lambda d: (d.get("userId") == user["id"] or d.get("user_id") == user["id"]) and (not caseId or d.get("caseId") == caseId)
    docs = store.all("user_documents", pred)
    return {"documents": docs}

@router.get("/documents/{doc_id}/download")
def download_document(doc_id: str, user: dict = Depends(get_current_user)):
    """Download stored document file."""
    doc = store.find("user_documents", lambda d: d.get("id") == doc_id and (d.get("userId") == user["id"] or d.get("user_id") == user["id"]))
    if not doc or not doc.get("filePath"):
        raise HTTPException(status_code=404, detail="Document not found")
        
    file_path = doc.get("filePath")
    from pathlib import Path
    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Physical document file missing from disk")
        
    return FileResponse(path=file_path, filename=doc.get("fileName"), media_type=doc.get("mimeType"))

@router.delete("/documents/{doc_id}")
def remove_document(doc_id: str, user: dict = Depends(get_current_user)):
    """Delete a user document and cascade remove all chunks and FTS search index entries."""
    success = delete_user_document(doc_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or could not be removed")
    return {"ok": True, "message": "Document deleted"}

# -------------------------------------------------------------
# TASK 4: OFFICIAL SUCCESSION & ASSET CLAIMING DOSSIER (PDF)
# -------------------------------------------------------------
def resolve_person_context(
    pan: Optional[str] = None,
    persona_id: Optional[str] = None,
    case_id: Optional[str] = None,
    user: Optional[dict] = None
) -> Dict[str, Any]:
    """Resolve demographic profile, financial holdings, and legal heirs for PDF dossier."""
    # 1. Check if case_id specified
    if case_id:
        case_data = store.find("cases", lambda c: c.get("id") == case_id)
        if case_data:
            state = case_data.get("state", "Tamil Nadu")
            return {
                "person": {
                    "name": case_data.get("deceasedName", "Deceased"),
                    "pan": case_data.get("deceasedPan", "ABCDE1234F"),
                    "state": state,
                    "dob": case_data.get("deceased", {}).get("dob", "—"),
                    "aadhaarLast4": "—"
                },
                "holdings": case_data.get("holdings", []),
                "heirs": case_data.get("heirs", []),
                "state_info": STATE_HEIR_DOC.get(state, {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
                "case": case_data
            }

    # 2. Check if persona_id specified
    pid = (persona_id or "").lower()
    if pid in PERSONAS:
        p = PERSONAS[pid]
        state = p.get("state", "Tamil Nadu")
        return {
            "person": p,
            "holdings": p.get("holdings", []),
            "heirs": p.get("family", []),
            "state_info": STATE_HEIR_DOC.get(state, {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
            "case": None
        }

    # 3. Check if pan matches a known persona
    clean_pan = (pan or "").strip().upper()
    for p in PERSONAS.values():
        if p.get("pan", "").upper() == clean_pan:
            state = p.get("state", "Tamil Nadu")
            return {
                "person": p,
                "holdings": p.get("holdings", []),
                "heirs": p.get("family", []),
                "state_info": STATE_HEIR_DOC.get(state, {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
                "case": None
            }

    # 4. If authenticated user has holdings in DB
    if user and user.get("id"):
        uid_val = user["id"]
        user_holdings = store.all("holdings", lambda h: h.get("userId") == uid_val or h.get("user_id") == uid_val)
        user_heirs = store.all("heirs", lambda h: h.get("userId") == uid_val or h.get("user_id") == uid_val)
        ident = user.get("identity") or {}
        state = ident.get("state") or "Tamil Nadu"
        if user_holdings:
            return {
                "person": {
                    "name": ident.get("name") or user.get("name", "User"),
                    "pan": clean_pan or ident.get("pan", "ABCPI1234K"),
                    "dob": ident.get("dob", "1980-01-01"),
                    "aadhaarLast4": ident.get("aadhaarLast4", "0000"),
                    "state": state
                },
                "holdings": user_holdings,
                "heirs": user_heirs,
                "state_info": STATE_HEIR_DOC.get(state, {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
                "case": None
            }

    # 5. Fallback to procedural generator for arbitrary PAN
    if clean_pan and len(clean_pan) == 10:
        inv_name = f"Investor {clean_pan[:5]}"
        holdings_list = generate_portfolio_for_pan(clean_pan, name=inv_name)
        state = "Tamil Nadu"
        return {
            "person": {
                "name": inv_name,
                "pan": clean_pan,
                "dob": "1985-05-15",
                "aadhaarLast4": "8899",
                "state": state
            },
            "holdings": holdings_list,
            "heirs": [
                {"name": "Nominated Beneficiary", "relation": "Spouse", "share": 100, "pan": f"{clean_pan[:4]}S9988E"}
            ],
            "state_info": STATE_HEIR_DOC.get(state, {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
            "case": None
        }

    # 6. Default to Raghavan
    ragh = PERSONAS["raghavan"]
    return {
        "person": ragh,
        "holdings": ragh.get("holdings", []),
        "heirs": ragh.get("family", []),
        "state_info": STATE_HEIR_DOC.get(ragh.get("state", "Tamil Nadu"), {"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15–30 days"}),
        "case": None
    }

@router.get("/reports/claiming-dossier/pdf")
def get_claiming_dossier_pdf(
    pan: Optional[str] = None,
    personaId: Optional[str] = None,
    caseId: Optional[str] = None,
    masked: bool = False,
    authorization: Optional[str] = Header(None)
):
    """Generate and download publication-grade Asset Claiming & Succession Dossier in PDF format."""
    auth_user = None
    if isinstance(authorization, str) and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        uid_val = verify_token(token)
        if uid_val:
            auth_user = store.find("users", lambda u: u.get("id") == uid_val)

    ctx = resolve_person_context(pan=pan, persona_id=personaId, case_id=caseId, user=auth_user)
    
    pdf_bytes = generate_claiming_dossier_pdf(
        person_info=ctx["person"],
        holdings=ctx["holdings"],
        heirs=ctx["heirs"],
        state_info=ctx["state_info"],
        case_info=ctx.get("case"),
        masked=masked
    )
    
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', ctx["person"].get("name", "Claimant"))
    filename = f"Asset_Bridge_Claiming_Dossier_{clean_name}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )

@router.get("/cases/{case_id}/claiming-dossier/pdf")
def get_case_claiming_dossier_pdf(case_id: str, masked: bool = False, authorization: Optional[str] = Header(None)):
    """Generate case-specific claiming dossier PDF."""
    return get_claiming_dossier_pdf(caseId=case_id, masked=masked, authorization=authorization)

@router.post("/reports/claiming-dossier/vault")
async def save_claiming_dossier_to_vault(
    pan: Optional[str] = None,
    personaId: Optional[str] = None,
    caseId: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Generate claiming dossier PDF and index directly into SQLite document vault for AI RAG navigation."""
    ctx = resolve_person_context(pan=pan, persona_id=personaId, case_id=caseId, user=user)
    
    pdf_bytes = generate_claiming_dossier_pdf(
        person_info=ctx["person"],
        holdings=ctx["holdings"],
        heirs=ctx["heirs"],
        state_info=ctx["state_info"],
        case_info=ctx.get("case")
    )
    
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', ctx["person"].get("name", "Claimant"))
    filename = f"Claiming_Dossier_{clean_name}_{datetime.date.today().strftime('%Y%m%d')}.pdf"
    
    # Ingest generated bytes into Document Vault
    doc_meta = ingest_document(
        file_bytes=pdf_bytes,
        file_name=filename,
        mime_type="application/pdf",
        user_id=user["id"],
        case_id=caseId or "",
        doc_type="Statutory Claiming Dossier"
    )
    
    return {
        "ok": True,
        "message": "Dossier generated and indexed into SQLite vault",
        "document": doc_meta["document"],
        "chunks_indexed": doc_meta.get("chunks_indexed", 0)
    }

