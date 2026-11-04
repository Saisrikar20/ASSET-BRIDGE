"""
Backward compatibility bridge for app.core.mailer.
Re-exports the Email Sender service from app.email_sender.
"""

from app.config import (
    is_smtp_configured,
    is_twilio_configured,
    is_twilio_comms_configured,
    is_twilio_sms_configured,
    TWILIO_SENDGRID_API_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_TLS,
    SMTP_ENABLED,
)
import app.email_sender.dispatcher as _disp
from app.email_sender import (
    format_inr,
    build_email_html,
    build_email_text,
    build_mime_message,
    build_sendgrid_payload,
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
    "is_smtp_configured",
    "is_twilio_configured",
    "is_twilio_comms_configured",
    "is_twilio_sms_configured",
    "TWILIO_SENDGRID_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
    "SMTP_USE_TLS",
    "SMTP_ENABLED",
]
