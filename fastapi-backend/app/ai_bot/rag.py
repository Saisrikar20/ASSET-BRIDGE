import os
import re
import hashlib
import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx
from app.config import UPLOADS_DIR
from app.core.store import store, uid
from app.core.db import get_connection, transaction, query_all

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/json": ".json",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}

def sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent directory traversal and invalid characters."""
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
    return clean[:120]

def compute_sha256(content: bytes) -> str:
    """Compute SHA-256 hexadecimal digest of byte buffer."""
    return hashlib.sha256(content).hexdigest()

def extract_text_from_pdf(content: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf."""
    import io
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        text_parts = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_parts.append(f"[Page {i+1}]\n{page_text.strip()}")
        return "\n\n".join(text_parts)
    except Exception as e:
        # Fallback to pure regex ASCII extraction
        ascii_matches = re.findall(rb"[\x20-\x7e\n\r]{4,}", content)
        return " ".join([m.decode("ascii", errors="ignore") for m in ascii_matches[:200]])

def chunk_text(text: str, chunk_size: int = 250, overlap: int = 30) -> List[Dict[str, Any]]:
    """Split text into semantic overlapping chunks."""
    words = text.split()
    if not words:
        return []
    
    chunks = []
    idx = 0
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_content = " ".join(chunk_words)
        
        # Try to find page or section header
        section_match = re.search(r"\[Page \d+\]", chunk_content)
        section = section_match.group(0) if section_match else f"Section {idx+1}"
        
        chunks.append({
            "chunk_index": idx,
            "section": section,
            "content": chunk_content
        })
        idx += 1
        if end >= len(words):
            break
        start += (chunk_size - overlap)
        
    return chunks

def clean_fts_query(query: str) -> str:
    """Sanitize user query for SQLite FTS5 MATCH syntax."""
    # Remove FTS operators and special characters
    terms = re.findall(r"[a-zA-Z0-9]+", query)
    if not terms:
        return ""
    # Search for term prefixes with NEAR or OR
    return " OR ".join([f'"{t}"*' for t in terms[:10]])

def ingest_document(
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    user_id: str,
    case_id: Optional[str] = None,
    task_id: Optional[str] = None,
    doc_type: str = "other"
) -> Dict[str, Any]:
    """
    Ingest, persist, extract, chunk, and index a user document into SQLite and FTS5.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds 10MB limit ({len(file_bytes)/(1024*1024):.1f}MB)")
    
    sha256 = compute_sha256(file_bytes)
    
    # Check for duplicate file for this user
    existing = store.find("user_documents", lambda d: d.get("userId") == user_id and d.get("sha256") == sha256)
    if existing:
        return {
            "duplicate": True,
            "document": existing,
            "message": f"File '{file_name}' was already uploaded and indexed."
        }
    
    doc_id = uid("doc_")
    safe_name = sanitize_filename(file_name)
    user_dir = UPLOADS_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_dir / f"{doc_id}_{safe_name}"
    
    # Save file to disk
    file_path.write_bytes(file_bytes)
    
    # Extract text based on file format
    extracted_text = ""
    if "pdf" in mime_type.lower() or safe_name.lower().endswith(".pdf"):
        extracted_text = extract_text_from_pdf(file_bytes)
    elif any(t in mime_type.lower() for t in ["text", "json", "markdown"]) or safe_name.lower().endswith((".txt", ".md", ".json")):
        extracted_text = file_bytes.decode("utf-8", errors="replace")
    else:
        extracted_text = f"Uploaded visual record: {file_name}. Attached to case {case_id or 'General'}."
    
    doc_record = {
        "id": doc_id,
        "userId": user_id,
        "caseId": case_id or "",
        "taskId": task_id or "",
        "docType": doc_type,
        "fileName": file_name,
        "filePath": str(file_path),
        "fileSize": len(file_bytes),
        "mimeType": mime_type,
        "sha256": sha256,
        "extractedText": extracted_text[:1000],  # store preview in record
        "status": "ready"
    }
    
    # Save to user_documents table
    store.insert("user_documents", doc_record)
    
    # Chunk and index into FTS5
    chunks = chunk_text(extracted_text)
    conn = get_connection()
    with transaction():
        for ch in chunks:
            chunk_id = uid("chk_")
            conn.execute(
                """INSERT INTO doc_chunks 
                   (id, document_id, user_id, doc_type, source_name, title, section, chunk_index, content, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                (chunk_id, doc_id, user_id, doc_type, file_name, file_name, ch["section"], ch["chunk_index"], ch["content"])
            )
            conn.execute(
                """INSERT INTO doc_chunks_fts 
                   (chunk_id, user_id, document_id, doc_type, source_name, title, section, content)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (chunk_id, user_id, doc_id, doc_type, file_name, file_name, ch["section"], ch["content"])
            )
            
    return {
        "duplicate": False,
        "document": doc_record,
        "chunks_indexed": len(chunks),
        "message": f"Successfully ingested and indexed '{file_name}' ({len(chunks)} search chunks generated)."
    }

def search_user_documents(
    query: str,
    user_id: str,
    case_id: Optional[str] = None,
    limit: int = 4
) -> List[Dict[str, Any]]:
    """
    Search indexed user documents using SQLite FTS5 BM25 ranking.
    """
    fts_query = clean_fts_query(query)
    if not fts_query:
        return []
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # FTS5 match query with bm25 ranking
    sql = """
        SELECT chunk_id, user_id, document_id, doc_type, source_name, title, section, content,
               bm25(doc_chunks_fts) as rank
        FROM doc_chunks_fts
        WHERE doc_chunks_fts MATCH ? AND user_id = ?
        ORDER BY rank
        LIMIT ?
    """
    try:
        cursor.execute(sql, (fts_query, user_id, limit))
        rows = cursor.fetchall()
        return [
            {
                "chunkId": r["chunk_id"],
                "documentId": r["document_id"],
                "docType": r["doc_type"],
                "sourceName": r["source_name"],
                "title": r["title"],
                "section": r["section"],
                "content": r["content"],
                "score": float(r["rank"])
            }
            for r in rows
        ]
    except Exception as e:
        return []

def delete_user_document(doc_id: str, user_id: str) -> bool:
    """Delete a user document and cascade remove all chunks and physical files."""
    doc = store.find("user_documents", lambda d: d.get("id") == doc_id and d.get("userId") == user_id)
    if not doc:
        return False
    
    # Remove physical file
    path_str = doc.get("filePath")
    if path_str and Path(path_str).exists():
        try:
            Path(path_str).unlink()
        except Exception:
            pass
            
    conn = get_connection()
    with transaction():
        conn.execute("DELETE FROM doc_chunks_fts WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM doc_chunks WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM user_documents WHERE id = ?", (doc_id,))
        
    store.remove("user_documents", lambda d: d.get("id") == doc_id)
    return True

def ingest_regulation_document(
    regulator: str,
    title: str,
    source_url: str,
    text: Optional[str] = None,
    pdf_bytes: Optional[bytes] = None,
    pdf_url: Optional[str] = None,
    circular_no: Optional[str] = None,
    publication_date: Optional[str] = None,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingest, deduplicate, chunk, and index a statutory regulation or circular
    from government portals (RBI, SEBI, EPFO, IRDAI, PFRDA, IEPFA, India Post)
    into the SQLite Document Vault and FTS5 search index.
    """
    reg_clean = (regulator or "GOV").strip().upper()
    title_clean = (title or "Regulatory Circular").strip()
    
    extracted_text = (text or "").strip()
    raw_bytes = pdf_bytes or b""
    is_pdf = False

    if pdf_bytes:
        is_pdf = True
        if not extracted_text:
            extracted_text = extract_text_from_pdf(pdf_bytes)
    elif pdf_url and not extracted_text:
        try:
            resp = httpx.get(pdf_url, timeout=25.0)
            if resp.status_code == 200:
                raw_bytes = resp.content
                is_pdf = True
                extracted_text = extract_text_from_pdf(raw_bytes)
        except Exception as e:
            extracted_text = f"Regulatory circular from {reg_clean}: {title_clean}. URL: {source_url}. (PDF fetch deferred: {str(e)[:80]})"

    if not extracted_text:
        extracted_text = f"Statutory circular issued by {reg_clean}: {title_clean}. Circular Reference: {circular_no or 'N/A'}. Published on: {publication_date or 'Recent'}. Source: {source_url}."

    # Compute deduplication hash based on sourceUrl + circular_no + title
    dedup_input = f"{reg_clean}|{circular_no or ''}|{source_url}|{title_clean}".encode("utf-8")
    sha256 = hashlib.sha256(dedup_input).hexdigest()

    # Check for existing document in SQLite
    existing = store.find(
        "user_documents",
        lambda d: d.get("docType") == "regulatory_circular" and (
            d.get("sha256") == sha256 or (circular_no and d.get("circularNo") and d.get("circularNo") == circular_no and d.get("regulator") == reg_clean)
        )
    )
    if existing:
        return {
            "ok": True,
            "duplicate": True,
            "docId": existing.get("id"),
            "regulator": reg_clean,
            "title": title_clean,
            "circularNo": circular_no or "",
            "chunksIndexed": 0,
            "message": f"Circular '{title_clean[:50]}' is already indexed."
        }

    doc_id = uid("reg_")
    safe_title = sanitize_filename(f"{reg_clean}_{title_clean}")
    regs_dir = UPLOADS_DIR / "regulations"
    regs_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = ".pdf" if is_pdf else ".txt"
    file_path = regs_dir / f"{doc_id}_{safe_title}{file_ext}"
    if raw_bytes:
        file_path.write_bytes(raw_bytes)
    else:
        file_path.write_text(extracted_text, encoding="utf-8")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc_record = {
        "id": doc_id,
        "userId": "SYSTEM",
        "caseId": "REGULATORY_FEED",
        "taskId": "",
        "docType": "regulatory_circular",
        "fileName": f"[{reg_clean}] {title_clean[:90]}",
        "filePath": str(file_path),
        "fileSize": len(raw_bytes) if raw_bytes else len(extracted_text.encode("utf-8")),
        "mimeType": "application/pdf" if is_pdf else "text/plain",
        "sha256": sha256,
        "extractedText": extracted_text[:1000],
        "status": "ready",
        "regulator": reg_clean,
        "circularNo": circular_no or "",
        "publicationDate": publication_date or "",
        "sourceUrl": source_url,
        "pdfUrl": pdf_url or "",
        "category": category or "Statutory Regulation",
        "createdAt": now_iso
    }
    store.insert("user_documents", doc_record)

    # Chunk and index into FTS5
    chunks = chunk_text(extracted_text)
    conn = get_connection()
    with transaction():
        for ch in chunks:
            chunk_id = uid("chk_")
            conn.execute(
                """INSERT INTO doc_chunks 
                   (id, document_id, user_id, doc_type, source_name, title, section, chunk_index, content, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                (chunk_id, doc_id, "SYSTEM", "regulatory_circular", f"[{reg_clean}] {title_clean}", title_clean, ch["section"], ch["chunk_index"], ch["content"])
            )
            conn.execute(
                """INSERT INTO doc_chunks_fts 
                   (chunk_id, user_id, document_id, doc_type, source_name, title, section, content)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (chunk_id, "SYSTEM", doc_id, "regulatory_circular", f"[{reg_clean}] {title_clean}", title_clean, ch["section"], ch["content"])
            )

    # Check for policy-relevant keywords to trigger high-priority alerts
    impact_keywords = ["delay", "penalty", "interest", "compensation", "deceased", "nomination", "transmission", "settlement", "15 days", "30 days", "udgam"]
    full_text_lower = (title_clean + " " + extracted_text[:3000]).lower()
    if any(k in full_text_lower for k in impact_keywords):
        alert_rec = {
            "id": uid("alt_"),
            "userId": "SYSTEM",
            "severity": "medium",
            "title": f"New {reg_clean} Guidance: {title_clean[:65]}",
            "detail": f"Reference: {circular_no or 'N/A'}. Date: {publication_date or 'Recent'}. Indexed into Document Vault for automated succession analysis.",
            "action": "View in Document Vault",
            "resolved": False,
            "regulator": reg_clean,
            "createdAt": now_iso
        }
        try:
            store.insert("alerts", alert_rec)
        except Exception:
            pass

    return {
        "ok": True,
        "duplicate": False,
        "docId": doc_id,
        "regulator": reg_clean,
        "title": title_clean,
        "circularNo": circular_no or "",
        "publicationDate": publication_date or "",
        "sourceUrl": source_url,
        "pdfUrl": pdf_url or "",
        "chunksIndexed": len(chunks),
        "message": f"Successfully indexed {reg_clean} circular '{title_clean[:40]}' ({len(chunks)} search chunks)."
    }

def list_regulations(
    regulator: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """List indexed regulatory circulars with optional regulator and text search."""
    docs = store.all("user_documents", lambda d: d.get("docType") == "regulatory_circular")
    if regulator:
        reg_upper = regulator.strip().upper()
        docs = [d for d in docs if d.get("regulator", "").upper() == reg_upper]
    if q and q.strip():
        q_lower = q.strip().lower()
        docs = [
            d for d in docs
            if q_lower in d.get("fileName", "").lower()
            or q_lower in d.get("extractedText", "").lower()
            or q_lower in d.get("circularNo", "").lower()
        ]
    docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
    out = []
    for d in docs[:limit]:
        item = dict(d)
        if "title" not in item:
            item["title"] = item.get("fileName", "")
        out.append(item)
    return out

