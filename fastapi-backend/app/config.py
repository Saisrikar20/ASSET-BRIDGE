import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
DB_PATH = DATA_DIR / "asset_bridge.db"
UPLOADS_DIR = DATA_DIR / "uploads"

AUTH_SECRET = os.getenv("AUTH_SECRET", "asset-bridge-dev-secret")
PORT = int(os.getenv("PORT", 4000))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
