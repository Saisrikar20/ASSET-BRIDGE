"""
Asset Bridge Email Dispatcher
Delivers official statutory claiming dossiers (PDF) to claimants, legal heirs, and institutions.
Supports SMTP (e.g. Mailshield AI, Google App Passwords) with graceful local outbox fallback.
"""

import os
import smtplib
import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_TLS,
    OUTBOX_DIR,
    is_smtp_configured
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

                            {custom_note_block}

                            <!-- Summary Metrics Card -->
                            <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 24px 0;">
                                <tr>
                                    <td style="padding: 16px 20px; border-right: 1px solid #e2e8f0; width: 50%;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Total Portfolio Value</div>
                                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace;">{inr_formatted}</div>
                                    </td>
                                    <td style="padding: 16px 20px; width: 50%;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Institutional Assets</div>
                                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">{holdings_count} Records</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Included Documents List -->
                            <div style="margin: 20px 0;">
                                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 8px;">Dossier Inclusions:</div>
                                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
                                    <li><strong>Cover Particulars:</strong> Identity, PAN, and state succession jurisdiction.</li>
                                    <li><strong>Multi-Regulator Schedule:</strong> Complete audit across RBI, EPFO, IRDAI, SEBI, LIC, PFRDA, DOP.</li>
                                    <li><strong>Statutory Claim Forms:</strong> Pre-filled Form 20 (EPFO), Form DA-2 (Banking), Form A (LIC), and Demat T3.</li>
                                    <li><strong>Legal Heir Distribution Schedule:</strong> Percentage shares and calculated INR values per heir.</li>
                                    <li><strong>Statutory Annexures:</strong> Formatted Indemnity Bond, No Objection Certificate (NOC), and Affidavit templates.</li>
                                </ul>
                            </div>

                            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
                                <p style="margin: 0; font-size: 12px; color: #065f46; line-height: 1.5;">
                                    <strong>Attachment Notice:</strong> The official PDF dossier is attached to this transmission. Legal heirs may submit these forms directly to the respective institutional nodal officers.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                            <p style="margin: 0 0 6px 0;">
                                This automated legal packet was generated by Asset Bridge under user-authorized digital consent.
                            </p>
                            <p style="margin: 0;">
                                Asset Bridge Platform · Confidential & Privileged Succession Documentation
                            </p>
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
    """Render plain text fallback for email clients that do not render HTML."""
    lines = [
        "ASSET BRIDGE - STATUTORY ASSET CLAIMING DOSSIER",
        "=" * 50,
        f"Claimant / Deceased: {person_name} (PAN: {pan})",
    ]
    if case_id:
        lines.append(f"Estate Case Reference: {case_id}")
    lines.extend([
        f"Portfolio Value: {format_inr(total_value_inr)}",
        f"Holdings Count: {holdings_count} Records",
        "-" * 50,
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
    
    sender_name = SMTP_FROM_NAME or "Asset Bridge Succession Engine"
    sender_addr = SMTP_FROM_EMAIL or "claims@assetbridge.in"
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
    custom_note: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatch official statutory claiming dossier via SMTP or write to local outbox in mock mode.
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

    is_mock = not is_smtp_configured()
    status = "sent"

    if is_smtp_configured():
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
            status = f"smtp_failed: {str(e)[:100]}"
            # Fallback to local outbox so transmission is never lost
            outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
            outbox_file.write_bytes(msg.as_bytes())
            is_mock = True
    else:
        # Mock mode / Offline development: write to outbox
        outbox_file = OUTBOX_DIR / f"{tracking_id}_{filename}.eml"
        outbox_file.write_bytes(msg.as_bytes())
        status = "mock_delivered"
        is_mock = True

    # Record transmission in SQLite audit table
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = {
        "id": tracking_id,
        "userId": user_id or "",
        "caseId": case_id or "",
        "toEmail": to_email,
        "recipientName": recipient_name or "",
        "subject": subject,
        "filename": filename,
        "status": status,
        "isMock": is_mock,
        "createdAt": created_at
    }
    try:
        store.insert("sent_emails", record)
    except Exception as e:
        print(f"[WARN] Failed to insert sent_emails record into SQLite: {e}")

    return {
        "ok": True,
        "trackingId": tracking_id,
        "status": status,
        "isMock": is_mock,
        "toEmail": to_email,
        "filename": filename,
        "subject": subject,
        "message": "Dossier sent via SMTP" if not is_mock else f"Dossier written to local outbox in mock mode ({tracking_id})"
    }
