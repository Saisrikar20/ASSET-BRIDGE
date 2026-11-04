import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import sign_token, verify_token, hash_password, check_password

client = TestClient(app)

def test_core():
    print("Testing Core Foundation...")
    
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] GET /health passed")

    # 2. Meta
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "regulators" in data and "RBI" in data["regulators"]
    assert "states" in data and len(data["states"]) > 5
    print("[PASS] GET /api/meta passed")

    # 3. Showcase
    res = client.get("/api/showcase")
    assert res.status_code == 200
    sc = res.json()
    assert sc["persona"]["name"] == "Raghavan"
    print("[PASS] GET /api/showcase passed")

    # 4. Auth & Demo Login
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    login_data = res.json()
    token = login_data["token"]
    user = login_data["user"]
    assert token and user["email"] == "demo@assetbridge.in"
    print("[PASS] POST /api/auth/demo passed")

    # 5. Auth Me
    res = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"]["name"] == "Raghavan"
    print("[PASS] GET /api/me passed")

    # 6. Identity Verification
    ident_payload = {
        "name": "Raghavan",
        "pan": "ABCPI1234K",
        "dob": "1984-03-14",
        "state": "Tamil Nadu",
        "aadhaarLast4": "4821",
        "mobile": "9840012345"
    }
    res = client.post("/api/identity", json=ident_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    verified_user = res.json()["user"]
    assert verified_user["identity"]["pan"] == "ABCPI1234K"
    assert "verification" in verified_user
    results = verified_user["verification"]["results"]
    assert len(results) == 7
    print("[PASS] POST /api/identity passed with 7 regulator checks")

    # 7. Demo Reset
    res = client.post("/api/demo/reset", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200 and res.json()["ok"] is True
    print("[PASS] POST /api/demo/reset passed")

    print("\nALL CORE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_core()
