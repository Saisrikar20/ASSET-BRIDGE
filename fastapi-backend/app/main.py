from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from app.module1_core.routers import router as module1_router
from app.module2_aggregation.routers import router as module2_router
from app.module3_simulation.routers import router as module3_router
from app.module1_core.live import live_manager
from app.module1_core.auth import verify_token

app = FastAPI(title="Asset Bridge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    msg = exc.errors()[0].get("msg", "Validation error") if exc.errors() else "Validation error"
    return JSONResponse(status_code=400, content={"error": msg})

app.include_router(module1_router)
app.include_router(module2_router)
app.include_router(module3_router)

@app.get("/")
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True, "service": "asset-bridge-fastapi-unified"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token") or ""
    user_id = verify_token(token) or "anonymous"
    await live_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        live_manager.disconnect(user_id, websocket)
