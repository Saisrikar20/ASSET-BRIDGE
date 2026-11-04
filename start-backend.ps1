# Asset Bridge: Launch Unified FastAPI Backend
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Starting Asset Bridge Unified FastAPI Backend (:8000)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$VenvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
    & $VenvPython -m uvicorn app.main:app --app-dir fastapi-backend --host 127.0.0.1 --port 8000 --reload
} else {
    uv run --with fastapi --with uvicorn --with pydantic --with httpx --with python-dotenv --with python-multipart uvicorn app.main:app --app-dir fastapi-backend --port 8000 --reload
}
