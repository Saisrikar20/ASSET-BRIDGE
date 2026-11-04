import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load .env from root or fastapi-backend directory
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
DB_PATH = DATA_DIR / "asset_bridge.db"
UPLOADS_DIR = DATA_DIR / "uploads"
OUTBOX_DIR = DATA_DIR / "outbox"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

AUTH_SECRET = os.getenv("AUTH_SECRET", "asset-bridge-dev-secret")
PORT = int(os.getenv("PORT", 8000))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))

# AI / LLM Configurations
NVIDIA_KEY = os.getenv("NVIDIA_API_KEY", "") or os.getenv("NVIDIA_NIM_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-bolt-e4b")

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

# Email SMTP Configuration (Google Workspace / Gmail with App Password or Custom SMTP)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "claims@assetbridge.in").strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Asset Bridge Succession Engine").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
SMTP_ENABLED = os.getenv("SMTP_ENABLED", "true" if (SMTP_HOST and SMTP_USER and SMTP_PASSWORD) else "false").lower() in ("true", "1", "yes")

# Twilio Email Configuration (Twilio SendGrid v3 API)
TWILIO_SENDGRID_API_KEY = os.getenv("TWILIO_SENDGRID_API_KEY", os.getenv("SENDGRID_API_KEY", "")).strip()
TWILIO_FROM_EMAIL = os.getenv("TWILIO_FROM_EMAIL", os.getenv("SENDGRID_FROM_EMAIL", SMTP_FROM_EMAIL)).strip()
TWILIO_FROM_NAME = os.getenv("TWILIO_FROM_NAME", os.getenv("SENDGRID_FROM_NAME", SMTP_FROM_NAME)).strip()

# Twilio Communications & Comms Email (https://comms.twilio.com/v1/Emails and SMS)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
TWILIO_COMMS_FROM_EMAIL = os.getenv("TWILIO_COMMS_FROM_EMAIL", f"{TWILIO_ACCOUNT_SID}@twilio.email" if TWILIO_ACCOUNT_SID else "").strip()
TWILIO_COMMS_FROM_NAME = os.getenv("TWILIO_COMMS_FROM_NAME", "Trial with Twilio").strip()

# Redis Storage Configuration (Optional: for Scrapy distributed crawling and caching)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0").strip()
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() in ("true", "1", "yes")

def is_smtp_configured() -> bool:
    """Check if authentic SMTP credentials (such as Google App Password) are configured and enabled."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_ENABLED)

def is_twilio_configured() -> bool:
    """Check if Twilio SendGrid email API credentials are configured."""
    return bool(TWILIO_SENDGRID_API_KEY and TWILIO_SENDGRID_API_KEY.strip())

def is_twilio_comms_configured() -> bool:
    """Check if Twilio Comms native Email API credentials (Account SID + Auth Token) are configured."""
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)

def is_twilio_sms_configured() -> bool:
    """Check if Twilio SMS credentials are configured."""
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)

def is_redis_configured() -> bool:
    """Check if Redis storage is enabled and configured."""
    return bool(REDIS_ENABLED and REDIS_URL)
