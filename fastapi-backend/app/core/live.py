import json, datetime
from fastapi import WebSocket

class LiveManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [ws for ws in self.active_connections[user_id] if ws != websocket]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def push(self, user_id: str, event_type: str, payload: dict):
        conns = self.active_connections.get(user_id, [])
        dead = []
        msg = json.dumps({
            "type": event_type,
            "data": payload,
            "at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        for ws in conns:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

live_manager = LiveManager()
