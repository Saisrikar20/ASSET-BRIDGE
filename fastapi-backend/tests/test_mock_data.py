"""
Unit Test Suite for Asset Bridge Mock Data Suite & Procedural Asset Engine
Dexathon 2026 - Verifies: Personas, Determinism, Seeder, and API Endpoints.
"""

import sys
import re
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.store import store
from app.aggregation.personas import PERSONAS
from app.aggregation.mock_generator import generate_portfolio_for_pan
from app.aggregation.pipeline import discover_assets, process_pipeline
from app.core.seeder import seed_persona

client = TestClient(app)
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

def test_persona_catalog():
    print("--- 1. Testing Persona Catalog Integrity ---")
    expected_keys = {"raghavan", "priya", "vikram", "sunita", "rajesh"}
    assert set(PERSONAS.keys()) == expected_keys, f"Expected {expected_keys}, got {set(PERSONAS.keys())}"
    
    for key, p in PERSONAS.items():
        assert PAN_RE.match(p["pan"]), f"Persona '{key}' has invalid PAN: {p['pan']}"
        assert p["name"], f"Persona '{key}' missing name"
        assert p["state"], f"Persona '{key}' missing state"
        assert len(p["holdings"]) >= 5, f"Persona '{key}' has insufficient holdings ({len(p['holdings'])})"
        # Verify regulators present
        regulators = {h["regulator"] for h in p["holdings"]}
        assert len(regulators) >= 4, f"Persona '{key}' should cover at least 4 regulators, got {regulators}"
        print(f"[PASS] Persona '{p['name']}' ({p['pan']} · {p['state']}) verified with {len(p['holdings'])} holdings.")

def test_mock_generator_determinism():
    print("\n--- 2. Testing Procedural Mock Generator Determinism ---")
    pan_1 = "ABCDE1234F"
    pan_2 = "XYZPD9876M"
    
    # Determinism check: multiple calls with same PAN must yield identical results
    run_a = generate_portfolio_for_pan(pan_1, "Tester One")
    run_b = generate_portfolio_for_pan(pan_1, "Tester One")
    assert len(run_a) == len(run_b), "Procedural generator is not deterministic in length"
    assert [h["ref"] for h in run_a] == [h["ref"] for h in run_b], "Procedural generator yields different refs for same PAN"
    assert [h["value"] for h in run_a] == [h["value"] for h in run_b], "Procedural generator yields different values for same PAN"
    print(f"[PASS] Determinism verified: 2 identical runs for {pan_1} produced exact same {len(run_a)} assets.")
    
    # Uniqueness check: different PAN must yield different assets
    run_c = generate_portfolio_for_pan(pan_2, "Tester Two")
    assert [h["ref"] for h in run_a] != [h["ref"] for h in run_c], "Different PANs produced identical holdings!"
    print(f"[PASS] Uniqueness verified: {pan_1} vs {pan_2} produced distinct portfolio distributions.")

def test_database_seeder():
    print("\n--- 3. Testing Database Seeder Execution ---")
    seed_persona("priya", reset=False)
    
    # Check user in SQLite
    user = store.find("users", lambda u: u.get("id") == "u_priya")
    assert user is not None, "Seeded user 'u_priya' not found in store"
    assert user["name"] == "Priya Sharma"
    
    # Check holdings in SQLite
    holdings = store.all("holdings", lambda h: h.get("userId") == "u_priya")
    assert len(holdings) == 8, f"Expected 8 holdings for Priya, got {len(holdings)}"
    
    # Check alerts
    alerts = store.all("alerts", lambda a: a.get("userId") == "u_priya")
    assert len(alerts) > 0, "No alerts generated for Priya"
    
    # Check chat sessions
    sessions = store.all("chat_sessions", lambda s: s.get("userId") == "u_priya")
    assert len(sessions) > 0, "No chat sessions seeded for Priya"
    print(f"[PASS] Database seeder successfully populated SQLite for Priya Sharma.")

def test_api_integration():
    print("\n--- 4. Testing API Endpoints & Verification ---")
    # 1. GET /api/meta personas
    meta_res = client.get("/api/meta")
    assert meta_res.status_code == 200
    meta_data = meta_res.json()
    assert "personas" in meta_data
    assert len(meta_data["personas"]) == 5
    print(f"[PASS] GET /api/meta returned {len(meta_data['personas'])} personas.")

    # 2. POST /api/demo/seed endpoint
    seed_res = client.post("/api/demo/seed", json={"persona": "sunita", "reset": False})
    assert seed_res.status_code == 200
    assert seed_res.json()["ok"] is True
    print("[PASS] POST /api/demo/seed succeeded for Sunita Deshmukh.")

    # 3. Dynamic pipeline processing for Priya Sharma
    priya_report = process_pipeline(
        identity={
            "name": "Priya Sharma",
            "pan": "AABCS9876L",
            "dob": "1994-08-22",
            "state": "Karnataka"
        }
    )
    assert priya_report.reportId.startswith("REP-")
    assert priya_report.summary["totalAssets"] == 8
    assert priya_report.summary["verifiableTotal"] > 0
    print(f"[PASS] 7-Step pipeline dynamically executed for Priya Sharma.")
    print(f"       Total Assets: {priya_report.summary['totalAssets']}, Verifiable Total: INR {priya_report.summary['verifiableTotal']:,.2f}")

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING ASSET BRIDGE MOCK DATA SUITE & PROCEDURAL GENERATOR")
    print("=" * 60)
    test_persona_catalog()
    test_mock_generator_determinism()
    test_database_seeder()
    test_api_integration()
    print("=" * 60)
    print("ALL MOCK DATA TESTS PASSED (100% SUCCESS)")
    print("=" * 60)
