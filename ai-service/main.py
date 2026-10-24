"""Asset Bridge AI service — natural-language succession guidance.

RAG over ./knowledge (state-specific legal requirements). Retrieval is a
small BM25 index; generation uses Gemini or OpenAI when a key is set and
falls back to an extractive answer built from the retrieved passages.
"""
import math
import os
import re
from collections import Counter
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

KB_DIR = Path(__file__).parent / "knowledge"
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

STOP = set(
    "a an the of to and or in on for is are be by with as at it this that from if i my me we our "
    "what how do does can who which when where should will would there their they them you your "
    "has have had not no was were been get".split()
)


def tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]


# ---------- knowledge base ----------
class Chunk:
    def __init__(self, source: str, doc_title: str, heading: str, text: str):
        self.source, self.doc_title, self.heading, self.text = source, doc_title, heading, text
        # headings and document titles weighted; file stem adds topic words like "epf"
        self.toks = tokens(f"{Path(source).stem.replace('-', ' ')} {doc_title} {doc_title} {heading} {heading} {text}")


def load_chunks() -> list[Chunk]:
    chunks = []
    for path in sorted(KB_DIR.glob("*.md")):
        doc_title, heading, buf = path.stem, "", []
        for line in path.read_text().splitlines():
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


def bm25(query: list[str], chunk: Chunk, k1=1.4, b=0.75) -> float:
    tf = Counter(chunk.toks)
    score = 0.0
    for q in query:
        if q not in tf:
            continue
        idf = math.log(1 + (N - DF[q] + 0.5) / (DF[q] + 0.5))
        score += idf * tf[q] * (k1 + 1) / (tf[q] + k1 * (1 - b + b * len(chunk.toks) / AVGDL))
    return score


ALIASES = {
    "pf": ["provident", "epf"], "epf": ["provident", "epfo"], "pension": ["eps", "10d"],
    "mf": ["mutual", "fund"], "shares": ["demat", "transmission"], "stocks": ["demat", "shares"],
    "fd": ["deposit", "bank"], "savings": ["bank", "deposit"], "policy": ["insurance", "insurer"],
    "heir": ["legal", "certificate"], "dead": ["death"], "died": ["death"], "passed": ["death"],
}


def retrieve(question: str, state: str | None, k: int = 4) -> list[Chunk]:
    q = tokens(question)
    q += [a for t in q for a in ALIASES.get(t, [])]
    scored = sorted(((bm25(q, c), c) for c in CHUNKS), key=lambda x: -x[0])
    top = [c for s, c in scored[:k] if s > 0]
    # Heir paperwork is state-specific: surface the family's state rule when relevant.
    if state and top and any(t in q for t in ("heir", "legal", "certificate", "nominee", "nomination", "succession", "documents")):
        rule = next((c for c in CHUNKS if c.heading.lower() == state.lower()), None)
        if rule and rule not in top:
            top = top[: k - 1] + [rule]
    return top


# ---------- generation ----------
SYSTEM = (
    "You are Asset Bridge's succession guide for Indian families claiming a deceased relative's money "
    "across banks (RBI), EPF (EPFO), insurance (IRDAI, LIC) and mutual funds/shares (SEBI). "
    "Answer in plain, warm language with short numbered steps and the exact form/document names. "
    "Use ONLY the provided sources; if they don't cover something, say so and suggest asking the institution. "
    "Cite sources inline as [1], [2]. Keep it under 220 words. End with one line reminding them to confirm "
    "requirements with the institution, since rules change."
)


def build_prompt(question, state, context, history, chunks):
    src = "\n\n".join(f"[{i+1}] {c.doc_title} — {c.heading}: {c.text}" for i, c in enumerate(chunks))
    ctx = ""
    if context and context.get("holdings"):
        lines = [f"- {h['regulator']} {h['type']} at {h['institution']} (nominee: {h['nominee']}, status: {h['status']})" for h in context["holdings"]]
        ctx = "The family's case includes:\n" + "\n".join(lines) + "\n\n"
    hist = "".join(f"{m['role'].title()}: {m['content']}\n" for m in (history or [])[-6:])
    return f"State: {state or 'not specified'}\n\n{ctx}Sources:\n{src}\n\n{hist}User: {question}"


async def call_gemini(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            headers={"x-goog-api-key": GEMINI_KEY},
            json={
                "systemInstruction": {"parts": [{"text": SYSTEM}]},
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
            json={"model": OPENAI_MODEL, "temperature": 0.3, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", text) if s.strip()]


def extractive(question: str, chunks: list[Chunk]) -> str:
    """No LLM key: pick the most relevant sentences from each source, cited."""
    if not chunks:
        return (
            "I couldn't find guidance on that in Asset Bridge's knowledge base. Try asking about a specific "
            "asset (bank deposit, EPF, insurance, LIC, mutual fund, shares) or a document such as a legal heir certificate."
        )
    q = set(tokens(question))
    lines = []
    for i, c in enumerate(chunks[:3]):
        ranked = sorted(sentences(c.text), key=lambda s: -len(q & set(tokens(s))))
        lines.append(f"{i+1}. **{c.heading}** — {' '.join(ranked[:2])} [{i+1}]")
    return "\n".join(lines) + "\n\n_Requirements change — confirm the current list with the institution before you visit._"


# ---------- API ----------
class Msg(BaseModel):
    role: str
    content: str


class GuideIn(BaseModel):
    question: str
    state: str | None = None
    context: dict | None = None
    history: list[Msg] = []


app = FastAPI(title="Asset Bridge AI")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    engine = "gemini" if GEMINI_KEY else "openai" if OPENAI_KEY else "extractive"
    return {"ok": True, "engine": engine, "chunks": N}


@app.post("/guide")
async def guide(body: GuideIn):
    chunks = retrieve(body.question, body.state)
    engine = "extractive"
    answer = None
    if chunks and (GEMINI_KEY or OPENAI_KEY):
        prompt = build_prompt(body.question, body.state, body.context, [m.model_dump() for m in body.history], chunks)
        try:
            answer = await (call_gemini(prompt) if GEMINI_KEY else call_openai(prompt))
            engine = "gemini" if GEMINI_KEY else "openai"
        except Exception as e:  # network / quota — degrade gracefully
            print("LLM call failed, using extractive answer:", e)
    if answer is None:
        answer = extractive(body.question, chunks)
    return {
        "answer": answer,
        "engine": engine,
        "sources": [{"n": i + 1, "title": c.doc_title, "section": c.heading, "file": c.source} for i, c in enumerate(chunks)],
    }
