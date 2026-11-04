import math
import os
import re
import json
from collections import Counter
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel

from app.config import KNOWLEDGE_DIR, GEMINI_KEY, OPENAI_KEY
from app.core.store import store, uid
from app.aggregation.documents import search_user_documents

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

STOP = set(
    "a an the of to and or in on for is are be by with as at it this that from if i my me we our "
    "what how do does can who which when where should will would there their they them you your "
    "has have had not no was were been get".split()
)

def tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]

class Chunk:
    def __init__(self, source: str, doc_title: str, heading: str, text: str):
        self.source, self.doc_title, self.heading, self.text = source, doc_title, heading, text
        self.toks = tokens(f"{Path(source).stem.replace('-', ' ')} {doc_title} {doc_title} {heading} {heading} {text}")

def load_chunks() -> List[Chunk]:
    chunks = []
    if not KNOWLEDGE_DIR.exists():
        return chunks
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        doc_title, heading, buf = path.stem, "", []
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                doc_title = line[2:].strip()
            elif line.startswith("## "):
                if buf:
                    chunks.append(Chunk(path.name, doc_title, heading, " ".join(buf)))
                heading, buf = line[3:].strip(), []
            elif line.strip():
                buf.append(line.strip())
        if buf:
            chunks.append(Chunk(path.name, doc_title, heading, " ".join(buf)))
    return chunks

CHUNKS = load_chunks()
N = len(CHUNKS)
AVGDL = sum(len(c.toks) for c in CHUNKS) / max(N, 1)
DF = Counter(t for c in CHUNKS for t in set(c.toks))

def bm25(query: List[str], chunk: Chunk, k1=1.4, b=0.75) -> float:
    tf = Counter(chunk.toks)
    score = 0.0
    for q in query:
        if q not in tf:
            continue
        idf = math.log(1 + (N - DF[q] + 0.5) / (DF[q] + 0.5))
        score += idf * tf[q] * (k1 + 1) / (tf[q] + k1 * (1 - b + b * len(chunk.toks) / AVGDL))
    return score

ALIASES = {
    "pf": ["provident", "epf", "form 20", "eps", "10d"],
    "epf": ["provident", "epfo", "pension", "form 20"],
    "pension": ["eps", "10d", "superannuation"],
    "mf": ["mutual", "fund", "cams", "kfintech", "cas"],
    "shares": ["demat", "transmission", "nsdl", "cdsl"],
    "stocks": ["demat", "shares", "equity"],
    "fd": ["deposit", "bank", "deceased", "mandate"],
    "savings": ["bank", "deposit", "inoperative"],
    "policy": ["insurance", "insurer", "lic", "claim"],
    "heir": ["legal", "certificate", "tahsildar", "succession", "surviving"],
    "dead": ["death", "deceased", "demise"],
    "died": ["death", "deceased"],
    "passed": ["death", "deceased"],
    "will": ["testament", "probate", "executor"],
    "court": ["succession", "probate", "affidavit"],
}

def retrieve_statutory(question: str, state: Optional[str] = None, k: int = 4) -> List[Chunk]:
    q = tokens(question)
    expanded = list(q)
    for t in q:
        expanded.extend(ALIASES.get(t, []))
    
    scored = sorted(((bm25(expanded, c), c) for c in CHUNKS), key=lambda x: -x[0])
    top = [c for s, c in scored[:k] if s > 0]
    
    if state and top and any(t in q for t in ("heir", "legal", "certificate", "nominee", "nomination", "succession", "documents")):
        rule = next((c for c in CHUNKS if c.heading.lower() == state.lower()), None)
        if rule and rule not in top:
            top = top[: k - 1] + [rule]
    return top

SYSTEM_PROMPT = (
    "You are Asset Bridge Navigator, the intelligent financial twin and succession assistant for Indian families. "
    "You help users claim deceased relatives' money across RBI, EPFO, IRDAI, SEBI, LIC, and Small Savings, "
    "and navigate their personalized estate and uploaded documents. "
    "Answer in clear, empathetic language with short numbered steps and exact form names. "
    "Ground your answers in both statutory sources and the user's uploaded documents. "
    "Cite statutory sources as [Law #] and user documents as [User Doc #]. "
    "Keep answers under 250 words. Remind the user to confirm exact requirements with the branch or registrar."
)

def build_multisource_prompt(
    question: str,
    state: Optional[str],
    context: Optional[dict],
    history: List[dict],
    statutory_chunks: List[Chunk],
    user_doc_chunks: List[Dict[str, Any]]
) -> str:
    stat_src = "\n\n".join(f"[Law {i+1}] {c.doc_title} — {c.heading}: {c.text}" for i, c in enumerate(statutory_chunks))
    
    user_src = ""
    if user_doc_chunks:
        user_lines = [f"[User Doc {i+1}] {d['sourceName']} ({d['section']}): {d['content']}" for i, d in enumerate(user_doc_chunks)]
        user_src = "User's Uploaded Case Documents:\n" + "\n\n".join(user_lines) + "\n\n"
        
    ctx = ""
    if context:
        holdings_lines = []
        for h in context.get("holdings", [])[:6]:
            nom = h.get('nominee')
            nom_str = nom.get('name') if isinstance(nom, dict) else str(nom)
            holdings_lines.append(f"- {h.get('regulator')} {h.get('type')} at {h.get('institution')} (Value: INR {h.get('value', 0):,}, Nominee: {nom_str})")
        
        alerts_lines = [f"- Alert: {a.get('title')} ({a.get('severity')})" for a in context.get("alerts", [])[:4]]
        
        ctx = "User's Live Estate Context:\n"
        if holdings_lines:
            ctx += "Holdings:\n" + "\n".join(holdings_lines) + "\n"
        if alerts_lines:
            ctx += "Risk Alerts:\n" + "\n".join(alerts_lines) + "\n"
        ctx += "\n"

    hist = "".join(f"{m.get('role', 'user').title()}: {m.get('content', '')}\n" for m in (history or [])[-6:])
    
    return f"Jurisdiction/State: {state or 'Not specified'}\n\n{ctx}{user_src}Statutory Regulations:\n{stat_src}\n\n{hist}User: {question}"

async def call_gemini(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            headers={"x-goog-api-key": GEMINI_KEY},
            json={
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3},
            },
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]

async def call_openai(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_KEY}"},
            json={"model": OPENAI_MODEL, "temperature": 0.3, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

def sentences(text: str) -> List[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", text) if s.strip()]

def extractive_multisource(
    question: str,
    statutory_chunks: List[Chunk],
    user_doc_chunks: List[Dict[str, Any]],
    context: Optional[dict] = None
) -> str:
    lines = []
    q_tokens = set(tokens(question))
    
    # 1. Synthesize from User Uploaded Documents if matching
    if user_doc_chunks:
        lines.append("### Findings from Your Uploaded Documents:")
        for i, doc in enumerate(user_doc_chunks[:2]):
            sents = sentences(doc["content"])
            ranked = sorted(sents, key=lambda s: -len(q_tokens & set(tokens(s))))
            snippet = ranked[0] if ranked else doc["content"][:160]
            lines.append(f"- **{doc['sourceName']}** ({doc['section']}): {snippet} [User Doc {i+1}]")
        lines.append("")

    # 2. Synthesize from Statutory Regulations
    if statutory_chunks:
        lines.append("### Applicable Statutory Procedures:")
        for i, c in enumerate(statutory_chunks[:3]):
            ranked = sorted(sentences(c.text), key=lambda s: -len(q_tokens & set(tokens(s))))
            snippet = " ".join(ranked[:2]) if ranked else c.text[:180]
            lines.append(f"{i+1}. **{c.heading}** — {snippet} [Law {i+1}]")
    else:
        if not user_doc_chunks:
            return (
                "I couldn't locate specific guidance on that in Asset Bridge's knowledge base or your uploaded documents. "
                "Try asking about a specific holding (bank deposit, EPF pension, LIC insurance, mutual funds), "
                "or succession paperwork (Tahsildar legal heir certificate, Form 20, death certificate)."
            )
            
    lines.append("\n_Note: Statutory requirements may vary by branch or revenue circle. Verify with the institution before formal submission._")
    return "\n".join(lines)

def generate_action_links(
    question: str,
    case_id: Optional[str] = None,
    context: Optional[dict] = None
) -> List[Dict[str, str]]:
    actions = []
    q_lower = question.lower()
    
    if any(k in q_lower for k in ["alert", "nominee", "missing", "risk", "gap"]):
        actions.append({"label": "Resolve Nominee Gaps", "url": "/app/alerts", "type": "navigate"})
        
    if case_id or any(k in q_lower for k in ["case", "task", "claim", "form 20", "heir", "tahsildar"]):
        cid = case_id or (context.get("case", {}).get("id") if context else "")
        target = f"/app/cases/{cid}" if cid else "/app/cases"
        actions.append({"label": "View Estate Claim Checklist", "url": target, "type": "navigate"})
        
    if any(k in q_lower for k in ["upload", "document", "file", "attach", "certificate"]):
        cid = case_id or (context.get("case", {}).get("id") if context else "")
        target = f"/app/cases/{cid}" if cid else "/app/cases"
        actions.append({"label": "Upload Estate Document", "url": target, "type": "upload"})
        
    if any(k in q_lower for k in ["aggregate", "holding", "portfolio", "bank", "epf", "discover"]):
        actions.append({"label": "Review Discovered Assets", "url": "/app/aggregate", "type": "navigate"})
        
    return actions[:3]

class GuideIn(BaseModel):
    question: str
    state: Optional[str] = None
    caseId: Optional[str] = None
    sessionId: Optional[str] = None
    userId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    history: List[Dict[str, str]] = []

async def answer_question(body: GuideIn) -> Dict[str, Any]:
    statutory_chunks = retrieve_statutory(body.question, body.state)
    
    user_doc_chunks = []
    if body.userId:
        user_doc_chunks = search_user_documents(body.question, body.userId, body.caseId, limit=3)
        
    # Enrich context with live DB holdings/alerts if userId present
    ctx = body.context or {}
    if body.userId and not ctx.get("holdings"):
        holdings = store.all("holdings", lambda h: (h.get("userId") == body.userId or h.get("user_id") == body.userId))
        alerts = store.all("alerts", lambda a: (a.get("userId") == body.userId or a.get("user_id") == body.userId and not a.get("resolved")))
        ctx["holdings"] = holdings
        ctx["alerts"] = alerts

    engine = "extractive"
    answer = None
    if (statutory_chunks or user_doc_chunks) and (GEMINI_KEY or OPENAI_KEY):
        prompt = build_multisource_prompt(
            body.question, body.state, ctx, body.history, statutory_chunks, user_doc_chunks
        )
        try:
            answer = await (call_gemini(prompt) if GEMINI_KEY else call_openai(prompt))
            engine = "gemini" if GEMINI_KEY else "openai"
        except Exception:
            pass

    if answer is None:
        answer = extractive_multisource(body.question, statutory_chunks, user_doc_chunks, ctx)

    # Format sources with dual tags
    sources = []
    for i, ud in enumerate(user_doc_chunks):
        sources.append({
            "type": "user_doc",
            "tag": f"User Doc {i+1}",
            "title": ud["title"],
            "section": ud["section"],
            "file": ud["sourceName"]
        })
    for i, sc in enumerate(statutory_chunks):
        sources.append({
            "type": "statutory",
            "tag": f"Law {i+1}",
            "title": sc.doc_title,
            "section": sc.heading,
            "file": sc.source
        })

    # Generate interactive action pills
    actions = generate_action_links(body.question, body.caseId, ctx)

    # Persist chat session and messages if session / user exists
    session_id = body.sessionId
    if body.userId:
        if not session_id:
            session_id = uid("sess_")
            store.insert("chat_sessions", {
                "id": session_id,
                "userId": body.userId,
                "caseId": body.caseId or "",
                "title": body.question[:50],
                "createdAt": "2026-11-04T00:00:00Z"
            })
            
        # Insert user message
        store.insert("chat_messages", {
            "id": uid("msg_"),
            "sessionId": session_id,
            "role": "user",
            "content": body.question,
            "sources": [],
            "actions": [],
            "engine": ""
        })
        
        # Insert assistant message
        store.insert("chat_messages", {
            "id": uid("msg_"),
            "sessionId": session_id,
            "role": "assistant",
            "content": answer,
            "sources": sources,
            "actions": actions,
            "engine": engine
        })

    return {
        "answer": answer,
        "engine": engine,
        "sessionId": session_id,
        "sources": sources,
        "actions": actions
    }
