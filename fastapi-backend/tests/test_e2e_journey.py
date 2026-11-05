import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_user_journey_end_to_end():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json().get("ok") is True

    # 2. Demo login as Raghavan
    res = client.post("/api/auth/demo?persona=raghavan")
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert "user" in data
    token = data["token"]
    raghavan_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify session via /api/me
    res = client.get("/api/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["user"]["id"] == raghavan_id

    # 3. Identity Verification
    identity_payload = {
        "name": "Raghavan Sundaram",
        "pan": "ABCPI1234K",
        "dob": "1984-03-14",
        "state": "Tamil Nadu",
        "aadhaarLast4": "4821",
        "mobile": "9840012345"
    }
    res = client.post("/api/identity", json=identity_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["user"]["identity"]["pan"] == "ABCPI1234K"

    # 4. View Dashboard Data (Pre-sync)
    res = client.get("/api/holdings", headers=headers)
    assert res.status_code == 200
    holdings_data = res.json()
    assert "holdings" in holdings_data
    assert "summary" in holdings_data

    res = client.get("/api/heirs", headers=headers)
    assert res.status_code == 200
    assert "heirs" in res.json()

    # 5. Create Aggregation Consent
    consent_payload = {
        "regulators": ["RBI", "SEBI", "EPFO", "IRDAI"],
        "months": 12
    }
    res = client.post("/api/consents", json=consent_payload, headers=headers)
    assert res.status_code == 200
    consent_data = res.json()
    assert "consent" in consent_data
    assert consent_data["consent"]["status"] == "ACTIVE"

    # 6. Fetch & Sync Assets
    res = client.post("/api/holdings/sync", headers=headers)
    assert res.status_code == 200
    sync_data = res.json()
    assert sync_data.get("ok") is True
    assert sync_data.get("holdingsCount", 0) > 0

    # 7. Verify Alerts generated post-sync and Resolve an Alert
    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    alerts = res.json().get("alerts", [])
    assert len(alerts) > 0
    res = client.get("/api/alerts", headers=headers)
    unresolved = [a for a in res.json().get("alerts", []) if not a.get("resolved")]
    if unresolved:
        alert_id = unresolved[0]["id"]
        res = client.post(f"/api/alerts/{alert_id}/resolve", headers=headers)
        assert res.status_code == 200
        assert res.json().get("ok") is True

    # 8. Manage Heirs (Add, Update, Delete)
    new_heir_payload = {
        "name": "Kavitha Sundaram",
        "relation": "Sister",
        "pan": "ABCPS9999K",
        "mobile": "9840099999",
        "email": "kavitha@example.com",
        "share": 10.0
    }
    res = client.post("/api/heirs", json=new_heir_payload, headers=headers)
    assert res.status_code == 200
    created_heir = res.json()["heir"]
    heir_id = created_heir["id"]

    # Update heir share
    res = client.patch(f"/api/heirs/{heir_id}", json={"share": 15.0}, headers=headers)
    assert res.status_code == 200
    assert res.json()["heir"]["share"] == 15.0

    # Delete heir
    res = client.delete(f"/api/heirs/{heir_id}", headers=headers)
    assert res.status_code == 200
    assert res.json().get("ok") is True

    # 9. Estate Case creation via /api/cases
    case_payload = {
        "dateOfDeath": "2026-01-10",
        "registrationNo": "TN-MUC-2026-999",
        "place": "Chennai, Tamil Nadu"
    }
    res = client.post("/api/cases", json=case_payload, headers=headers)
    assert res.status_code == 200
    created_case = res.json()["case"]
    case_id = created_case["id"]

    # Get Case details
    res = client.get(f"/api/cases/{case_id}", headers=headers)
    assert res.status_code == 200
    case_detail = res.json()["case"]
    assert case_detail["id"] == case_id
    tasks = case_detail.get("tasks", [])
    assert len(tasks) > 0

    # Update a task in the case
    task_id = tasks[0]["id"]
    res = client.patch(f"/api/cases/{case_id}/tasks/{task_id}", json={"done": True}, headers=headers)
    assert res.status_code == 200
    updated_tasks = res.json()["case"]["tasks"]
    assert any(t["id"] == task_id and t["done"] is True for t in updated_tasks)

    # 10. Download Claiming Dossier PDF
    res = client.get(f"/api/reports/claiming-dossier/pdf?caseId={case_id}", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000

    # 11. Dispatch Claiming Dossier Email
    email_payload = {
        "toEmail": "nodal.officer@indianbank.in",
        "recipientName": "Chief Nodal Officer",
        "caseId": case_id,
        "customNote": "Statutory Transmission Intimation for deceased holdings."
    }
    res = client.post("/api/reports/claiming-dossier/email", json=email_payload, headers=headers)
    assert res.status_code == 200
    email_res = res.json()
    assert email_res.get("ok") is True
    tracking_id = email_res.get("trackingId")
    assert tracking_id is not None

    # 12. Check Email History
    res = client.get(f"/api/reports/claiming-dossier/email/history?caseId={case_id}", headers=headers)
    assert res.status_code == 200
    history = res.json().get("history", [])
    assert any(h["id"] == tracking_id for h in history)

    # 13. Download Outbox EML
    res = client.get(f"/api/reports/claiming-dossier/outbox/{tracking_id}")
    assert res.status_code == 200
    assert "message/rfc822" in res.headers.get("content-type", "")

    # 14. Ask AI Succession Navigator
    ai_payload = {
        "question": "What is the RBI 15-day claim settlement rule for bank deposits without nominee?",
        "state": "Tamil Nadu",
        "caseId": case_id
    }
    res = client.post("/api/ai/ask", json=ai_payload, headers=headers)
    assert res.status_code == 200
    ai_res = res.json()
    assert "answer" in ai_res
    assert len(ai_res["answer"]) > 10
    assert "engine" in ai_res

    # 15. Upload Document to Vault
    file_content = b"%PDF-1.4 Mock Death Certificate for testing RAG extraction"
    files = {"file": ("death_certificate.pdf", file_content, "application/pdf")}
    data = {"caseId": case_id, "docType": "Death Certificate"}
    res = client.post("/api/documents/upload", files=files, data=data, headers=headers)
    assert res.status_code == 200
    upload_res = res.json()
    assert upload_res.get("document", {}).get("fileName") == "death_certificate.pdf"

    # 16. Query Regulatory Circulars
    res = client.get("/api/documents/regulations", headers=headers)
    assert res.status_code == 200
    regs = res.json().get("regulations", [])
    assert len(regs) > 0

    # 17. Demographic Persona Switching & Data Segregation
    res = client.post("/api/auth/demo?persona=priya")
    assert res.status_code == 200
    priya_data = res.json()
    priya_token = priya_data["token"]
    priya_headers = {"Authorization": f"Bearer {priya_token}"}
    priya_id = priya_data["user"]["id"]
    assert priya_id != raghavan_id

    # Verify Priya's holdings are isolated from Raghavan's
    res = client.get("/api/holdings", headers=priya_headers)
    assert res.status_code == 200
    priya_holdings = res.json()["holdings"]
    for h in priya_holdings:
        assert h["userId"] == priya_id
