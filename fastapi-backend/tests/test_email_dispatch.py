"""
Unit Test Suite for Statutory Claiming Dossier Email Dispatch Service
Verifies: MIME construction, outbox mock delivery, API endpoints, and SQLite audit logs.
"""

import sys
import email
from pathlib import Path
from email.message import EmailMessage

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.config import OUTBOX_DIR
from app.core.store import store
import app.core.mailer as mailer_module
from app.core.mailer import (
    build_email_html,
    build_email_text,
    build_mime_message,
    send_claiming_dossier_email
)
from app.aggregation.pdf_generator import generate_claiming_dossier_pdf
from app.aggregation.personas import PERSONAS

client = TestClient(app)

def test_mime_message_construction():
    print("--- 1. Testing MIME Message Construction ---")
    ragh = PERSONAS["raghavan"]
    pdf_bytes = generate_claiming_dossier_pdf(
        person_info=ragh,
        holdings=ragh.get("holdings", []),
        heirs=ragh.get("family", []),
        state_info={"doc": "Legal Heir Certificate", "authority": "Tahsildar", "days": "15-30 days"}
    )
    assert len(pdf_bytes) > 5000

    html = build_email_html("Raghavan Sundaram", "ABCPI1234K", "AB-4581", 16, 2150000.0, "Please verify claim documents.")
    text = build_email_text("Raghavan Sundaram", "ABCPI1234K", "AB-4581", 16, 2150000.0, "Please verify claim documents.")
    assert "Raghavan Sundaram" in html
    assert "ABCPI1234K" in text
    assert "Please verify claim documents." in html

    msg = build_mime_message(
        to_email="heir@family.org",
        subject="Statutory Claim Dossier - Raghavan",
        body_html=html,
        body_text=text,
        pdf_bytes=pdf_bytes,
        filename="Claim_Dossier_Raghavan.pdf",
        recipient_name="Meenakshi Sundaram"
    )

    assert isinstance(msg, EmailMessage)
    assert "heir@family.org" in msg["To"]
    assert "Meenakshi Sundaram" in msg["To"]
    assert msg["Subject"] == "Statutory Claim Dossier - Raghavan"
    
    # Verify attachments
    attachments = list(msg.iter_attachments())
    assert len(attachments) == 1
    att = attachments[0]
    assert att.get_filename() == "Claim_Dossier_Raghavan.pdf"
    assert att.get_content_type() == "application/pdf"
    assert len(att.get_content()) == len(pdf_bytes)
    print("[PASS] MIME message assembled with valid PDF attachment.")

def test_outbox_fallback_mock_delivery(monkeypatch):
    print("--- 2. Testing Outbox Mock Delivery Fallback ---")
    monkeypatch.setattr(mailer_module, "is_smtp_configured", lambda: False)

    dummy_pdf = b"%PDF-1.4 Mock Dossier Buffer"
    result = send_claiming_dossier_email(
        to_email="test.claimant@example.com",
        pdf_bytes=dummy_pdf,
        filename="Test_Dossier.pdf",
        person_name="Test Person",
        pan="ABCDE1234F",
        case_id="AB-9999",
        holdings_count=3,
        total_value_inr=500000.0,
        custom_note="Priority settlement requested."
    )

    assert result["ok"] is True
    assert result["isMock"] is True
    assert result["status"] == "mock_delivered"
    assert result["trackingId"].startswith("eml_")

    # Verify .eml file written to outbox
    eml_file = OUTBOX_DIR / f"{result['trackingId']}_Test_Dossier.pdf.eml"
    assert eml_file.exists(), f"Outbox file {eml_file} was not written"
    eml_content = eml_file.read_bytes()
    assert b"test.claimant@example.com" in eml_content
    assert b"Priority settlement requested." in eml_content

    # Parse .eml structure and verify decoded attachment matches original bytes
    parsed_msg = email.message_from_bytes(eml_content, policy=email.policy.default)
    attachments = list(parsed_msg.iter_attachments())
    assert len(attachments) == 1
    assert attachments[0].get_filename() == "Test_Dossier.pdf"
    assert attachments[0].get_content() == dummy_pdf
    print(f"[PASS] Mock delivery successfully stored and decoded in {eml_file.name} ({len(eml_content)} bytes).")

def test_api_send_dossier_email_endpoint(monkeypatch):
    print("--- 3. Testing POST /api/reports/claiming-dossier/email ---")
    monkeypatch.setattr(mailer_module, "is_smtp_configured", lambda: False)
    
    # A. Validation check: Invalid email
    bad_res = client.post("/api/reports/claiming-dossier/email", json={
        "toEmail": "not-an-email",
        "personaId": "priya"
    })
    assert bad_res.status_code == 400

    # B. Valid email dispatch (mock mode tested cleanly)
    res = client.post("/api/reports/claiming-dossier/email", json={
        "toEmail": "priya.heir@family.org",
        "recipientName": "Ananya Sharma",
        "personaId": "priya",
        "customNote": "Please find attached the claiming dossier."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["trackingId"].startswith("eml_")
    assert data["toEmail"] == "priya.heir@family.org"
    print(f"[PASS] API dispatch endpoint returned 200 OK with trackingId: {data['trackingId']}.")

def test_audit_history_endpoint():
    print("--- 4. Testing GET /api/reports/claiming-dossier/email/history ---")
    res = client.get("/api/reports/claiming-dossier/email/history")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "history" in data
    assert len(data["history"]) > 0
    
    top = data["history"][0]
    assert "trackingId" in top or "id" in top
    assert "toEmail" in top or "to_email" in top
    print(f"[PASS] Audit history returned {data['count']} sent email records.")
