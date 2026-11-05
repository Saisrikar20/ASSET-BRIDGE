"""
Asset Bridge Root Package Proxy.
Forwards all module imports to fastapi-backend/app so that:
'from app.aggregation.documents import ingest_regulation_document'
works universally from any directory, editor, or tool without path errors.
"""
from pathlib import Path
import sys

_ROOT_DIR = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _ROOT_DIR / "fastapi-backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

_BACKEND_APP_DIR = _BACKEND_DIR / "app"
if _BACKEND_APP_DIR.exists():
    __path__.insert(0, str(_BACKEND_APP_DIR))
