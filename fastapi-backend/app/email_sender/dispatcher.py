"""
Core Email Dispatcher for Asset Bridge Statutory Claiming Dossiers.
Delivers PDF claiming dossiers to legal heirs and nodal authorities via:
1. Google Workspace / Gmail SMTP with App Password (Primary)
2. Twilio SendGrid Web API v3
3. Twilio Comms Native Email API (https://comms.twilio.com/v1/Emails)
4. Local Outbox Fallback (.eml RFC 822) with SQLite Audit Logging
"""

import os
import smtplib
import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

from app.config import (
    TWILIO_SENDGRID_API_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    TWILIO_COMMS_FROM_EMAIL,
    TWILIO_COMMS_FROM_NAME,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_USE_TLS,
    OUTBOX_DIR,
    is_smtp_configured,
    is_twilio_configured,
    is_twilio_comms_configured,
    is_twilio_sms_configured,
)
from app.core.store import store, uid
from app.email_sender.templates import (
    build_email_html,
    build_email_text,
    build_mime_message,
    build_sendgrid_payload,
)

def send_via_twilio_sendgrid(
    payload: Dict[str, Any],
    api_key: Optional[str] = None,
    timeout: float = 20.0
) -> Dict[str, Any]:
    """
    Deliver email via Twilio SendGrid v3 API (https://api.sendgrid.com/v3/mail/send).
    Returns status dict with statusCode and messageId.
    """
    key = api_key or TWILIO_SENDGRID_API_KEY
    if not key:
        return {"ok": False, "error": "TWILIO_SENDGRID_API_KEY is not configured", "provider": "twilio_sendgrid"}

    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload, headers=headers)
        
        if resp.status_code in (200, 201, 202):
            msg_id = resp.headers.get("X-Message-Id", "")
            return {
                "ok": True,
                "statusCode": resp.status_code,
                "messageId": msg_id,
                "provider": "twilio_sendgrid"
            }

        # Error response parsing from SendGrid
        err_msg = resp.text
        try:
            err_json = resp.json()
            errors = err_json.get("errors", [])
            if errors and isinstance(errors, list):
                err_msg = "; ".join([e.get("message", "") for e in errors if isinstance(e, dict)])
        except Exception:
            pass

        return {
            "ok": False,
            "statusCode": resp.status_code,
            "error": err_msg or f"HTTP {resp.status_code}",
            "provider": "twilio_sendgrid"
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"Twilio SendGrid connection error: {str(e)}",
            "provider": "twilio_sendgrid"
        }

def send_via_twilio_comms(
    to_email: str,
    subject: str,
    body_html: str,
    from_address: Optional[str] = None,
    from_name: Optional[str] = None,
    account_sid: Optional[str] = None,
    auth_token: Optional[str] = None,
    timeout: float = 15.0
) -> Dict[str, Any]:
    """
    Deliver email via Twilio Comms native Email API (https://comms.twilio.com/v1/Emails).
    Authenticates using HTTP Basic Auth (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).
    """
    sid = (account_sid or TWILIO_ACCOUNT_SID).strip()
    token = (auth_token or TWILIO_AUTH_TOKEN).strip()
    if not sid or not token:
        return {"ok": False, "error": "Twilio Account SID or Auth Token is not configured", "provider": "twilio_comms"}

    from_addr = (from_address or TWILIO_COMMS_FROM_EMAIL or f"{sid}@twilio.email").strip()
    from_nm = (from_name or TWILIO_COMMS_FROM_NAME or "Trial with Twilio").strip()

    url = "https://comms.twilio.com/v1/Emails"
    payload = {
        "from": {
            "address": from_addr,
            "name": from_nm
        },
        "to": [
            {"address": to_email.strip()}
        ],
        "content": {
            "subject": subject,
            "html": body_html
        }
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                url,
                auth=(sid, token),
                json=payload,
                headers={"Content-Type": "application/json"}
            )
        
        if resp.status_code in (200, 201, 202):
            data = resp.json() if resp.text else {}
            op_id = data.get("operationId", "")
            return {
                "ok": True,
                "statusCode": resp.status_code,
                "operationId": op_id,
                "provider": "twilio_comms"
            }
        
        err_msg = resp.text
        try:
            data = resp.json()
            err_msg = data.get("message") or data.get("error") or err_msg
        except Exception:
            pass
        return {
            "ok": False,
            "statusCode": resp.status_code,
            "error": f"Twilio Comms error: {err_msg}",
            "provider": "twilio_comms"
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"Twilio Comms connection error: {str(e)}",
            "provider": "twilio_comms"
        }

def send_twilio_sms_alert(
    to_phone: str,
    person_name: str,
    to_email: str,
    tracking_id: str,
    case_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatch optional SMS delivery notification via Twilio REST API.
    """
    if not is_twilio_sms_configured():
        return {"ok": False, "skipped": True, "reason": "Twilio SMS not configured"}

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    body_text = (
        f"Asset Bridge Notice: Official statutory claiming dossier for {person_name} "
        f"has been dispatched to {to_email}. Tracking ID: {tracking_id}."
    )
    if case_id:
        body_text += f" Case: {case_id}."

    data = {
        "From": TWILIO_PHONE_NUMBER,
        "To": to_phone.strip(),
        "Body": body_text
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
        if resp.status_code in (200, 201):
            sid = resp.json().get("sid", "")
            return {"ok": True, "smsId": sid}
        return {"ok": False, "error": resp.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def send_claiming_dossier_email(
    to_email: str,
    pdf_bytes: bytes,
    filename: str,
    person_name: str,
    pan: str,
    case_id: Optional[str] = None,
    holdings_count: int = 0,
    total_value_inr: float = 0.0,
    recipient_name: Optional[str] = None,
    recipient_phone: Optional[str] = None,
    custom_note: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatch official statutory claiming dossier via authenticated Google App Password SMTP,
    Twilio SendGrid API, Twilio Comms Email API, or local outbox fallback.
    Audits the transmission into SQLite 'sent_emails' table.
    """
    tracking_id = uid("eml_")
    subject = f"Asset Bridge Statutory Claiming Dossier - {person_name}"
    if case_id:
        subject += f" (Case {case_id})"

    body_html = build_email_html(
        person_name=person_name,
        pan=pan,
        case_id=case_id,
        holdings_count=holdings_count,
        total_value_inr=total_value_inr,
        custom_note=custom_note
    )
    body_text = build_email_text(
        person_name=person_name,
        pan=pan,
        case_id=case_id,
        holdings_count=holdings_count,
        total_value_inr=total_value_inr,
        custom_note=custom_note
    )

    msg = build_mime_message(
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        pdf_bytes=pdf_bytes,
        filename=filename,
        recipient_name=recipient_name
    )

    is_mock = True
    status = "sent"
    provider = "mock"
    provider_msg_id = None
    warning_note = None

    # Priority 1: Primary SMTP with Google App Password
    # Sends authentic MIME messages with binary PDF attachments directly to real inboxes
    if is_smtp_configured():
        provider = "smtp"
        try:
            if SMTP_PORT == 465:
                # SSL Direct
                with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20.0) as server:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                # STARTTLS (Port 587 or default)
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20.0) as server:
                    if SMTP_USE_TLS:
                        server.starttls()
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)
            status = "sent"
            is_mock = False
        except Exception as e:
            warning_note = f"SMTP dispatch failed: {str(e)}"
            # If SMTP fails, attempt fallback to Twilio SendGrid
            if is_twilio_configured():
                sendgrid_payload = build_sendgrid_payload(
                    to_email=to_email,
                    subject=subject,
                    body_html=body_html,
                    body_text=body_text,
                    pdf_bytes=pdf_bytes,
                    filename=filename,
                    recipient_name=recipient_name,
                    case_id=case_id,
                    pan=pan,
                    tracking_id=tracking_id
                )
                res = send_via_twilio_sendgrid(sendgrid_payload)
                if res.get("ok"):
                    status = "sent"
                    is_mock = False
                    provider = "twilio_sendgrid"
                    provider_msg_id = res.get("messageId")
                    warning_note = None
            if is_mock:
                status = f"smtp_fallback_outbox: {warning_note[:120]}"
                outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
                outbox_file.write_bytes(msg.as_bytes())

    # Priority 2: Twilio SendGrid Web API v3
    elif is_twilio_configured():
        provider = "twilio_sendgrid"
        sendgrid_payload = build_sendgrid_payload(
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            pdf_bytes=pdf_bytes,
            filename=filename,
            recipient_name=recipient_name,
            case_id=case_id,
            pan=pan,
            tracking_id=tracking_id
        )
        res = send_via_twilio_sendgrid(sendgrid_payload)
        if res.get("ok"):
            status = "sent"
            is_mock = False
            provider_msg_id = res.get("messageId")
        else:
            warning_note = res.get("error", "Twilio SendGrid dispatch failed")
            status = f"twilio_fallback_outbox: {warning_note[:120]}"
            outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
            outbox_file.write_bytes(msg.as_bytes())
            is_mock = True

    # Priority 3: Twilio Comms Native Email API (https://comms.twilio.com/v1/Emails)
    elif is_twilio_comms_configured():
        provider = "twilio_comms"
        comms_res = send_via_twilio_comms(
            to_email=to_email,
            subject=subject,
            body_html=body_html
        )
        if comms_res.get("ok"):
            status = "sent"
            is_mock = False
            provider_msg_id = comms_res.get("operationId")
        else:
            warning_note = comms_res.get("error", "Twilio Comms dispatch failed")
            status = f"twilio_comms_fallback_outbox: {warning_note[:120]}"
            outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
            outbox_file.write_bytes(msg.as_bytes())
            is_mock = True

    # Priority 4: Local Outbox Mock Fallback
    else:
        provider = "mock"
        outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
        outbox_file.write_bytes(msg.as_bytes())
        status = "mock_delivered"
        is_mock = True

    # Twilio SMS notification (optional)
    sms_res = None
    if recipient_phone and is_twilio_sms_configured():
        sms_res = send_twilio_sms_alert(
            to_phone=recipient_phone,
            person_name=person_name,
            to_email=to_email,
            tracking_id=tracking_id,
            case_id=case_id
        )

    # Record transmission in SQLite audit table
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = {
        "id": tracking_id,
        "userId": user_id or "",
        "caseId": case_id or "",
        "toEmail": to_email,
        "recipientName": recipient_name or "",
        "recipientPhone": recipient_phone or "",
        "subject": subject,
        "filename": filename,
        "status": status,
        "provider": provider,
        "providerMessageId": provider_msg_id or "",
        "smsSent": bool(sms_res and sms_res.get("ok")),
        "isMock": is_mock,
        "createdAt": created_at
    }
    try:
        store.insert("sent_emails", record)
    except Exception as e:
        print(f"[WARN] Failed to insert sent_emails record into SQLite: {e}")

    message_str = "Dossier sent via Google SMTP with App Password" if (provider == "smtp" and not is_mock) else (
        "Dossier sent via Twilio SendGrid" if (provider == "twilio_sendgrid" and not is_mock) else (
            "Dossier sent via Twilio Comms" if (provider == "twilio_comms" and not is_mock) else (
                f"Dossier written to local outbox in mock mode ({tracking_id})"
            )
        )
    )

    out: Dict[str, Any] = {
        "ok": True,
        "trackingId": tracking_id,
        "status": status,
        "isMock": is_mock,
        "provider": provider,
        "toEmail": to_email,
        "recipientName": recipient_name or "",
        "recipientPhone": recipient_phone or "",
        "filename": filename,
        "subject": subject,
        "message": message_str
    }
    if warning_note:
        out["warning"] = warning_note
    if provider_msg_id:
        out["providerMessageId"] = provider_msg_id
    if sms_res:
        out["smsResult"] = sms_res
    return out

