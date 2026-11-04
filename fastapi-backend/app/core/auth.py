import hashlib, hmac, base64, json, time, secrets
from fastapi import Header, HTTPException, status
from app.config import AUTH_SECRET
from app.core.store import store, uid

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"{salt}:{h}"

def check_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":")
        candidate = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
        return hmac.compare_digest(candidate, h)
    except Exception:
        return False

def sign_token(user_id: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"sub": user_id, "iat": int(time.time()*1000)}).encode()).decode().rstrip("=")
    sig = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

def verify_token(token: str) -> str | None:
    if not token or "." not in token:
        return None
    payload, sig = token.split(".", 1)
    expected = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        pad = "=" * ((4 - len(payload) % 4) % 4)
        return json.loads(base64.urlsafe_b64decode(payload + pad)).get("sub")
    except Exception:
        return None

def public_user(u: dict) -> dict:
    if not u:
        return {}
    out = dict(u)
    out.pop("passwordHash", None)
    out.pop("password_hash", None)
    return out

def get_current_user(authorization: str | None = Header(None)) -> dict:
    token = (authorization or "").replace("Bearer ", "").strip()
    user_id = verify_token(token)
    user = store.find("users", lambda u: u.get("id") == user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return user

def seed_demo_heirs(user_id: str):
    store.insert("heirs", {"id": uid("k_"), "userId": user_id, "name": "Meenakshi", "relation": "Spouse", "pan": "ABCPI5678M", "mobile": "9840055501", "email": "meenakshi@example.com", "share": 50})
    store.insert("heirs", {"id": uid("k_"), "userId": user_id, "name": "Divya", "relation": "Daughter", "pan": "BCDPI4321Q", "mobile": "9840055502", "email": "divya@example.com", "share": 50})
