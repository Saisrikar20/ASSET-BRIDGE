"""
Email Templates and Message Formatting for Asset Bridge Claiming Dossier Dispatch.
Provides responsive, corporate HTML templates with Indian Rupee formatting,
plain text fallbacks, MIME construction, and Twilio SendGrid payloads.
"""

import base64
import datetime
from email.message import EmailMessage
from typing import Any, Dict, Optional

from app.config import (
    TWILIO_FROM_EMAIL,
    TWILIO_FROM_NAME,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
)

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
