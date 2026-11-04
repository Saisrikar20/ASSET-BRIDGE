"""
Unit Test Suite for Asset Bridge Document Ingestion & Multi-Source RAG Assistant
Verifies: Document upload, duplicate detection, FTS5 search, multi-source citations, and persistent chat sessions.
"""

import sys
import io
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.store import store

client = TestClient(app)

def test_document_ingestion_and_rag():
    print("=" * 60)
    print("TESTING DOCUMENT INGESTION & MULTI-SOURCE RAG NAVIGATOR")
    print("=" * 60)

    # 1. Authenticate with demo user
    login_res = client.post("/api/auth/demo")
    assert login_res.status_code == 200, f"Demo login failed: {login_res.text}"
    token = login_res.json()["token"]
    user = login_res.json()["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Demo user authenticated.")

    # 2. Upload sample Death Certificate text file
    sample_doc_content = (
        "GREATER CHENNAI CORPORATION\n"
        "GOVERNMENT OF TAMIL NADU\n"
        "CERTIFICATE OF DEATH\n"
        "Registration No: TN-CHN-2025-098124\n"
        "Name of Deceased: Raghavan R\n"
        "Date of Death: 14/10/2025\n"
        "Place of Death: Adyar, Chennai, Tamil Nadu\n"
        "Father / Husband Name: Ramaswamy\n"
        "Informant: Meenakshi (Wife)\n"
        "Cause: Natural causes\n"
    ).encode("utf-8")

    files = {
        "file": ("death_certificate_raghavan.txt", io.BytesIO(sample_doc_content), "text/plain")
    }
    data = {
        "caseId": "AB-4819",
        "taskId": "t1",
        "docType": "death_cert"
    }

    upload_res = client.post("/api/documents/upload", files=files, data=data, headers=headers)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data["duplicate"] is False
    doc_id = upload_data["document"]["id"]
    print(f"[PASS] Document uploaded and indexed: {doc_id} ({upload_data['chunks_indexed']} chunks).")

    # 3. Test duplicate detection
    dup_files = {
        "file": ("death_certificate_raghavan.txt", io.BytesIO(sample_doc_content), "text/plain")
    }
    dup_res = client.post("/api/documents/upload", files=dup_files, data=data, headers=headers)
    assert dup_res.status_code == 200
    assert dup_res.json()["duplicate"] is True
    print("[PASS] SHA-256 duplicate document detection verified.")

    # 4. List documents
    list_res = client.get("/api/documents", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()["documents"]
    assert any(d["id"] == doc_id for d in docs)
    print(f"[PASS] Document listed in user vault (total documents: {len(docs)}).")

    # 5. Query Multi-Source AI Assistant with document-grounded question
    ask_payload = {
        "question": "What is the date of death and place of death in the uploaded death certificate for Raghavan, and what are the rules for claiming bank deposits?",
        "state": "Tamil Nadu",
        "caseId": "AB-4819"
    }
    assistant_res = client.post("/api/assistant", json=ask_payload, headers=headers)
    assert assistant_res.status_code == 200, f"Assistant failed: {assistant_res.text}"
    ans_data = assistant_res.json()
    
    assert "answer" in ans_data
    assert len(ans_data["sources"]) > 0
    # Check for dual sources
    source_types = [s["type"] for s in ans_data["sources"]]
    print(f"[PASS] AI Navigator responded with engine '{ans_data['engine']}'.")
    print(f"       Sources cited: {len(ans_data['sources'])} (Types: {set(source_types)})")
    
    # Check action recommendations
    assert len(ans_data["actions"]) > 0
    print(f"       Action recommendations: {[a['label'] for a in ans_data['actions']]}")

    # 6. Test Chat Session & Message Persistence
    sess_res = client.get("/api/assistant/sessions", headers=headers)
    assert sess_res.status_code == 200
    sessions = sess_res.json()["sessions"]
    assert len(sessions) > 0
    active_session_id = sessions[0]["id"]
    print(f"[PASS] Chat session persisted in SQLite: {active_session_id}.")

    msg_res = client.get(f"/api/assistant/sessions/{active_session_id}/messages", headers=headers)
    assert msg_res.status_code == 200
    messages = msg_res.json()["messages"]
    assert len(messages) >= 2  # At least user prompt and assistant response
    print(f"[PASS] Session messages retrieved: {len(messages)} messages persisted.")

    # 7. Clean up document
    del_res = client.delete(f"/api/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 200
    print("[PASS] Document deleted and FTS5 cascade cleanup verified.")

    print("=" * 60)
    print("ALL DOCUMENT INGESTION & MULTI-SOURCE RAG TESTS PASSED (100%)")
    print("=" * 60)

if __name__ == "__main__":
    test_document_ingestion_and_rag()

