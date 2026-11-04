"""
Asset Bridge Email Sender Service
Provides authenticated dispatch of statutory claiming dossiers via:
- Google Workspace / Gmail SMTP with App Password
- Twilio Comms Native Email API (https://comms.twilio.com/v1/Emails)
- Twilio SendGrid Web API v3
- Twilio SMS Delivery Notifications
- RFC 822 MIME message formatting & local outbox mock fallback
"""

from app.email_sender.templates import (
    format_inr,
    build_email_html,
    build_email_text,
    build_mime_message,
    build_sendgrid_payload,
)
from app.email_sender.dispatcher import (
    send_claiming_dossier_email,
    send_via_twilio_comms,
    send_via_twilio_sendgrid,
    send_twilio_sms_alert,
)

__all__ = [
    "format_inr",
    "build_email_html",
    "build_email_text",
    "build_mime_message",
    "build_sendgrid_payload",
    "send_claiming_dossier_email",
    "send_via_twilio_comms",
    "send_via_twilio_sendgrid",
    "send_twilio_sms_alert",
]

