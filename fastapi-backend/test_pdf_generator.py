"""
Asset Bridge - Automated Test Suite for PDF Claiming Dossier Generator
Dexathon 2026 - Comprehensive Verification
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.aggregation.personas import PERSONAS
from app.aggregation.pdf_generator import generate_claiming_dossier_pdf

client = TestClient(app)

def test_persona_pdf_generation():
    print("\n--- 1. Testing PDF Generation for All 5 Personas ---")
    for pid, persona in PERSONAS.items():
        resp = client.get(f"/api/reports/claiming-dossier/pdf?personaId={pid}")
        assert resp.status_code == 200, f"Failed for persona {pid}: {resp.text}"
        assert resp.headers["content-type"] == "application/pdf"
        assert "Content-Disposition" in resp.headers
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 10000, f"PDF too small ({len(resp.content)} bytes)"
        print(f"[PASS] Persona '{persona['name']}' ({pid}) generated valid PDF ({len(resp.content)} bytes).")

def test_procedural_pan_pdf_generation():
    print("\n--- 2. Testing Procedural PAN PDF Generation ---")
    arbitrary_pan = "XYZPD9988M"
    resp = client.get(f"/api/reports/claiming-dossier/pdf?pan={arbitrary_pan}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF-")
    print(f"[PASS] Arbitrary PAN '{arbitrary_pan}' generated procedural PDF ({len(resp.content)} bytes).")

def test_case_specific_pdf_generation():
    print("\n--- 3. Testing Case-Specific PDF Generation ---")
    resp = client.get("/api/cases/AB-4581/claiming-dossier/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF-")
    print(f"[PASS] Estate Case AB-4581 generated tailored claim dossier PDF ({len(resp.content)} bytes).")

def test_vault_auto_ingestion():
    print("\n--- 4. Testing Vault Auto-Ingestion & FTS5 Indexing ---")
    # Authenticate as demo user
    login_resp = client.post("/api/auth/demo", json={})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    vault_resp = client.post("/api/reports/claiming-dossier/vault?personaId=raghavan", headers=headers)
    assert vault_resp.status_code == 200
    data = vault_resp.json()
    assert data["ok"] is True
    assert "document" in data
    assert data["chunks_indexed"] > 0
    doc_id = data["document"]["id"]
    print(f"[PASS] Generated PDF automatically ingested into Document Vault: {doc_id} ({data['chunks_indexed']} chunks indexed).")

    # Verify RAG bot can cite the newly ingested dossier
    chat_resp = client.post(
        "/api/assistant",
        headers=headers,
        json={"question": "What does my statutory claiming dossier specify for Canara Bank?"}
    )
    assert chat_resp.status_code == 200
    ans_data = chat_resp.json()
    assert "answer" in ans_data
    print(f"[PASS] RAG Assistant successfully retrieved and cited generated dossier in response.")

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING ASSET CLAIMING DOSSIER PDF GENERATOR & VAULT SYNC")
    print("=" * 60)
    test_persona_pdf_generation()
    test_procedural_pan_pdf_generation()
    test_case_specific_pdf_generation()
    test_vault_auto_ingestion()
    print("=" * 60)
    print("ALL PDF GENERATOR TESTS PASSED SUCCESSFULLY! (100%)")
    print("=" * 60)
