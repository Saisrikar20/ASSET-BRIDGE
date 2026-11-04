import datetime, re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.store import store, uid
from app.core.auth import hash_password, check_password, sign_token, get_current_user, public_user, seed_demo_heirs
from app.core.identity import REGULATORS, STATES, STATE_HEIR_DOC, DEMO_IDENTITY, DEMO_RECORDS, NATIONAL_STATS, verify_identity, summarize

router = APIRouter(prefix="/api")
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

class SignupBody(BaseModel):
    name: str
    email: str
    password: str

class LoginBody(BaseModel):
    email: str
    password: str

class IdentityBody(BaseModel):
    name: str
    pan: str
    dob: str
    state: str
    aadhaarLast4: str | None = ""
    mobile: str | None = ""

class AvatarBody(BaseModel):
    displayName: str
    variant: int
    seed: str

@router.get("/meta")
def get_meta():
    return {
        "regulators": REGULATORS,
        "states": STATES,
        "heirDocs": STATE_HEIR_DOC,
        "demoIdentity": DEMO_IDENTITY,
        "nationalStats": NATIONAL_STATS
    }

@router.get("/showcase")
def get_showcase():
    return {
        "persona": {"name": DEMO_IDENTITY["name"], "state": DEMO_IDENTITY["state"], "age": 42},
        "sources": len(REGULATORS),
        "regulators": [{"code": k, "covers": v["covers"]} for k, v in REGULATORS.items()],
        "summary": summarize(DEMO_RECORDS),
        "holdings": len(DEMO_RECORDS),
        "verify": [{"regulator": v["regulator"], "status": v["status"], "records": v["recordsFound"]} for v in verify_identity(DEMO_IDENTITY)],
        "alerts": {
            "total": 8,
            "bySeverity": {"high": 4, "medium": 3, "low": 1},
            "byKind": {
                "nominee_missing": 4,
                "nominee_deceased": 2,
                "nominee_minor": 1,
                "inoperative": 2,
                "unclaimed": 3,
                "name_mismatch": 1,
                "kyc_stale": 2
            },
            "examples": [{"title": "No nominee on Fixed deposit", "regulator": "RBI"}]
        },
        "nominees": {"coverage": 0.42, "missing": 5},
        "idle": 1845000,
        "transfer": {"steps": 12, "forms": 8, "state": DEMO_IDENTITY["state"]},
        "life": {"successRate": 76, "runs": 600, "retireAge": 57, "retireMedian": 28400000, "fiAge": 52, "legacyToday": 14200000, "milestones": 3}
    }

@router.post("/auth/signup")
def signup(body: SignupBody):
    email = body.email.strip().lower()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if store.find("users", lambda u: u.get("email") == email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = store.insert("users", {
        "id": uid("u_"), "email": email, "name": body.name.strip(),
        "passwordHash": hash_password(body.password),
        "identity": None, "verification": None, "deceased": None,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return {"token": sign_token(user["id"]), "user": public_user(user)}

@router.post("/auth/login")
def login(body: LoginBody):
    user = store.find("users", lambda u: u.get("email") == body.email.strip().lower())
    if not user or not check_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"token": sign_token(user["id"]), "user": public_user(user)}

@router.post("/auth/demo")
def demo_login():
    email = "demo@assetbridge.in"
    user = store.find("users", lambda u: u.get("email") == email)
    if not user:
        user = store.insert("users", {
            "id": uid("u_"), "email": email, "name": DEMO_IDENTITY["name"],
            "passwordHash": hash_password(uid()), "identity": None, "verification": None, "deceased": None,
            "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        seed_demo_heirs(user["id"])
    return {"token": sign_token(user["id"]), "user": public_user(user)}

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}

@router.put("/me/avatar")
def update_avatar(body: AvatarBody, user: dict = Depends(get_current_user)):
    user = store.update("users", lambda u: u.get("id") == user["id"], {
        "avatar": {"displayName": body.displayName.strip()[:32], "variant": body.variant, "seed": body.seed[:64]}
    })
    return {"user": public_user(user)}

@router.post("/demo/reset")
def reset_demo(user: dict = Depends(get_current_user)):
    uid_val = user["id"]
    for tbl in ["holdings", "alerts", "consents", "heirs", "snapshots"]:
        store.remove(tbl, lambda r: r.get("userId") == uid_val)
    store.remove("cases", lambda c: c.get("ownerId") == uid_val)
    store.update("users", lambda u: u.get("id") == uid_val, {
        "identity": None, "verification": None, "deceased": None, "plan": None, "lifePlan": None, "baseline": None
    })
    if user.get("email") == "demo@assetbridge.in":
        seed_demo_heirs(uid_val)
    return {"ok": True}

@router.post("/identity")
def update_identity(body: IdentityBody, user: dict = Depends(get_current_user)):
    pan = body.pan.strip().upper()
    if not PAN_RE.match(pan):
        raise HTTPException(status_code=400, detail="PAN must look like ABCDE1234F")
    if body.aadhaarLast4 and not re.match(r"^\d{4}$", body.aadhaarLast4):
        raise HTTPException(status_code=400, detail="Enter only the last 4 digits of Aadhaar")
    identity = {
        "name": body.name.strip(), "pan": pan, "dob": body.dob,
        "aadhaarLast4": body.aadhaarLast4 or "", "mobile": body.mobile or "", "state": body.state
    }
    verification = {
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "results": verify_identity(identity)
    }
    user = store.update("users", lambda u: u.get("id") == user["id"], {"identity": identity, "verification": verification})
    return {"user": public_user(user)}
