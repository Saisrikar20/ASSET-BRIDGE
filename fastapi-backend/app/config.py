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

AUTH_SECRET = os.getenv("AUTH_SECRET", "asset-bridge-dev-secret")
PORT = int(os.getenv("PORT", 4000))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))

# AI / LLM Configurations
NVIDIA_KEY = os.getenv("NVIDIA_API_KEY", "") or os.getenv("NVIDIA_NIM_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

