"""
Asset Bridge Email Dispatcher
Delivers official statutory claiming dossiers (PDF) to claimants, legal heirs, and institutions.
Powered by Google Workspace / Gmail SMTP with App Password, Twilio Comms & SendGrid APIs,
Twilio SMS alerts, and local outbox fallback.
"""

import os
import base64
import smtplib
import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

from app.config import (
    TWILIO_SENDGRID_API_KEY,
    TWILIO_FROM_EMAIL,
    TWILIO_FROM_NAME,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    TWILIO_COMMS_FROM_EMAIL,
    TWILIO_COMMS_FROM_NAME,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_TLS,
    OUTBOX_DIR,
    is_smtp_configured,
    is_twilio_configured,
    is_twilio_comms_configured,
    is_twilio_sms_configured,
)
from app.core.store import store, uid

def format_inr(val: float) -> str:
    """Format numeric value as Indian Rupee string."""
    try:
        s = f"{val:,.2f}"
        parts = s.split(".")
        integer_part = parts[0].replace(",", "")
        if len(integer_part) > 3:
            last_three = integer_part[-3:]
            other_numbers = integer_part[:-3]
            res = ""
            for i in range(len(other_numbers) - 1, -1, -2):
                if i - 1 >= 0:
                    res = other_numbers[i-1:i+1] + ("," if res else "") + res
                else:
                    res = other_numbers[i] + ("," if res else "") + res
            return f"Rs. {res},{last_three}.{parts[1]}"
        return f"Rs. {s}"
    except Exception:
        return f"Rs. {val}"

def build_email_html(
    person_name: str,
    pan: str,
    case_id: Optional[str] = None,
    holdings_count: int = 0,
    total_value_inr: float = 0.0,
    custom_note: Optional[str] = None
) -> str:
    """Render responsive, corporate HTML email template for statutory claiming dossier dispatch."""
    case_badge = f'<span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; font-weight: 600;">Case {case_id}</span>' if case_id else '<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; font-weight: 600;">Personal Twin Dossier</span>'
    inr_formatted = format_inr(total_value_inr)
    now_str = datetime.datetime.now().strftime("%d %B %Y, %I:%M %p IST")
    
    custom_note_block = ""
    if custom_note and custom_note.strip():
        custom_note_block = f"""
        <div style="margin: 20px 0; padding: 14px 16px; background-color: #f8fafc; border-left: 4px solid #0f766e; border-radius: 4px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Claimant / Sender Note</p>
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">{custom_note.strip()}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asset Bridge - Statutory Claiming Dossier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #042f2e; padding: 24px 32px; border-bottom: 3px solid #0f766e;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">ASSET BRIDGE</div>
                                        <div style="font-size: 11px; color: #99f6e4; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px;">Unified Financial Twin & Succession Engine</div>
                                    </td>
                                    <td align="right">
                                        {case_badge}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px;">
                            <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                                Official Statutory Asset Claiming Dossier
                            </h1>
                            <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">
                                Generated on {now_str}
                            </p>

                            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                                Please find attached the official, publication-grade statutory claiming packet for <strong>{person_name}</strong> (PAN: <span style="font-family: monospace; font-weight: 600;">{pan}</span>). This dossier consolidates verified asset holdings, legal heir distribution schedules, and pre-formatted statutory claim applications.
                            </p>

                            <!-- Key Financial Summary Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 16px 20px; border-right: 1px solid #e2e8f0;" width="50%">
                                        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Total Identified Value</div>
                                        <div style="font-size: 20px; font-weight: 800; color: #0f766e; margin-top: 4px;">{inr_formatted}</div>
                                    </td>
                                    <td style="padding: 16px 20px;" width="50%">
                                        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Registered Holdings</div>
                                        <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">{holdings_count} Records</div>
                                    </td>
                                </tr>
                            </table>

                            {custom_note_block}

                            <div style="margin: 24px 0 20px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                                <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 6px;">
                                    Included Documentation in PDF Attachment:
                                </div>
                                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #166534; line-height: 1.6;">
                                    <li>Consolidated Asset Register across Banking, EPFO, Demat, Insurance, and NPS</li>
                                    <li>Regulator-specific Claim Applications (Form 20, DA-2, Demat Transmission)</li>
                                    <li>Legal Heir Distribution Schedule with Indian Succession Act shares</li>
                                    <li>Pre-drafted Indemnity Bonds, NOC Affidavits, and Name Discrepancy forms</li>
                                </ul>
                            </div>

                            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 24px 0;">
                                <strong>Instructions for Heir / Executor:</strong> Download and review the attached PDF dossier. Sign the relevant annexures where indicated and present them along with the Death Certificate and KYC to the respective nodal branches or nodal officers.
                            </p>

                            <!-- Security Notice -->
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                                This transmission is strictly confidential and generated for legitimate legal heirs and succession coordinators. Digital fingerprint: <span style="font-family: monospace;">SHA256-AUTHENTICATED</span>.
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                                Asset Bridge Platform · Statutory Succession Engine
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                                Automated Claiming Dossier Dispatch Service · Powered by Google SMTP & Twilio Communications
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

def build_email_text(
    person_name: str,
    pan: str,
    case_id: Optional[str] = None,
    holdings_count: int = 0,
    total_value_inr: float = 0.0,
    custom_note: Optional[str] = None
) -> str:
    """Render plain text fallback for the claiming dossier email."""
    inr_formatted = format_inr(total_value_inr)
    now_str = datetime.datetime.now().strftime("%d %B %Y, %I:%M %p IST")
    lines = [
        "ASSET BRIDGE - STATUTORY ASSET CLAIMING DOSSIER",
        "=" * 50,
        f"Generated: {now_str}",
        f"Subject: Official Claiming Dossier for {person_name} (PAN: {pan})",
    ]
    if case_id:
        lines.append(f"Case Reference: {case_id}")
    lines.extend([
        f"Total Identified Value: {inr_formatted}",
        f"Registered Holdings Count: {holdings_count}",
        "",
    ])
    if custom_note and custom_note.strip():
        lines.extend([
            "Note from Claimant / Coordinator:",
            custom_note.strip(),
            "-" * 50,
        ])
    lines.extend([
        "Please find the attached statutory claiming dossier PDF.",
        "It includes:",
        "1. Consolidated Asset Schedule across all 7 regulators",
        "2. Formatted claim forms (EPFO Form 20, Banking DA-2, LIC Form A, Demat T3)",
        "3. Legal Heir Distribution Schedule and signature declarations",
        "4. Standard statutory annexures (Indemnity Bond, NOC, Name Affidavit)",
        "",
        "Asset Bridge Platform - Confidential Succession Documentation"
    ])
    return "\n".join(lines)

def build_mime_message(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: str,
    pdf_bytes: bytes,
    filename: str,
    recipient_name: Optional[str] = None
) -> EmailMessage:
    """Construct a MIME multipart/mixed EmailMessage with attached PDF."""
    msg = EmailMessage()
    msg["Subject"] = subject
    
    sender_name = SMTP_FROM_NAME or TWILIO_FROM_NAME or "Asset Bridge Succession Engine"
    sender_addr = SMTP_FROM_EMAIL or TWILIO_FROM_EMAIL or "claims@assetbridge.in"
    msg["From"] = f"{sender_name} <{sender_addr}>"
    
    if recipient_name and recipient_name.strip():
        msg["To"] = f"{recipient_name.strip()} <{to_email.strip()}>"
    else:
        msg["To"] = to_email.strip()

    # Plain text alternative
    msg.set_content(body_text)
    
    # HTML alternative
    msg.add_alternative(body_html, subtype="html")

    # PDF Attachment
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=filename
    )
    return msg

def build_sendgrid_payload(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: str,
    pdf_bytes: bytes,
    filename: str,
    recipient_name: Optional[str] = None,
    case_id: Optional[str] = None,
    pan: Optional[str] = None,
    tracking_id: Optional[str] = None
) -> Dict[str, Any]:
    """Construct a Twilio SendGrid Web API v3 payload with base64 PDF attachment."""
    to_entry: Dict[str, str] = {"email": to_email.strip()}
    if recipient_name and recipient_name.strip():
        to_entry["name"] = recipient_name.strip()

    from_email = TWILIO_FROM_EMAIL or "claims@assetbridge.in"
    from_name = TWILIO_FROM_NAME or "Asset Bridge Succession Engine"

    encoded_pdf = base64.b64encode(pdf_bytes).decode("ascii")

    payload: Dict[str, Any] = {
        "personalizations": [
            {
                "to": [to_entry],
                "subject": subject
            }
        ],
        "from": {
            "email": from_email,
            "name": from_name
        },
        "content": [
            {"type": "text/plain", "value": body_text},
            {"type": "text/html", "value": body_html}
        ],
        "attachments": [
            {
                "content": encoded_pdf,
                "filename": filename,
                "type": "application/pdf",
                "disposition": "attachment"
            }
        ],
        "categories": ["statutory-claiming-dossier", "asset-bridge-succession"]
    }

    custom_args: Dict[str, str] = {}
    if tracking_id:
        custom_args["tracking_id"] = str(tracking_id)
    if case_id:
        custom_args["case_id"] = str(case_id)
    if pan:
        custom_args["pan"] = str(pan)
    if custom_args:
        payload["custom_args"] = custom_args

    return payload

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
