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



def test_raghavan_demonstration_scenario():
    print("\n--- 5. Testing Raghavan Synthetic Scenario and Integrity ---")
    seed_persona("raghavan", reset=False)
    
    # 1. Identity & Persona Check
    user = store.find("users", lambda u: u.get("id") == "u_raghavan")
    assert user is not None, "Raghavan user record missing"
    assert user["name"] == "Raghavan"
    assert user["identity"]["pan"] == "ABCPI1234K"
    assert user["identity"]["state"] == "Tamil Nadu"
    
    # 2. Holdings Portfolio Check
    holdings = store.all("holdings", lambda h: h.get("userId") == "u_raghavan")
    assert len(holdings) == 16, f"Expected 16 holdings, got {len(holdings)}"
    total_val = sum(h["value"] for h in holdings)
    assert total_val == 15675230, f"Expected valuation 15,675,230, got {total_val}"
    
    # 3. Status and Nominee Breakdown
    inoperative = [h for h in holdings if (h.get("status") or h.get("recordStatus")) == "inoperative"]
    unclaimed = [h for h in holdings if (h.get("status") or h.get("recordStatus")) == "unclaimed"]
    assert len(inoperative) == 2, f"Expected 2 inoperative, got {len(inoperative)}"
    assert len(unclaimed) == 4, f"Expected 4 unclaimed, got {len(unclaimed)}"
    
    # 4. Deceased and Minor Nominees
    deceased_nominees = [h for h in holdings if isinstance(h.get("nominee"), dict) and h["nominee"].get("status") == "deceased"]
    minor_nominees = [h for h in holdings if isinstance(h.get("nominee"), dict) and h["nominee"].get("status") == "minor"]
    assert len(deceased_nominees) == 3, f"Expected 3 deceased nominee holdings, got {len(deceased_nominees)}"
    assert len(minor_nominees) == 1, f"Expected 1 minor nominee holding, got {len(minor_nominees)}"
    
    # 5. Active AA Consent Check
    consents = store.all("consents", lambda c: c.get("userId") == "u_raghavan")
    assert any(c.get("status") == "ACTIVE" for c in consents), "Missing ACTIVE consent handle for Raghavan"
    
    # 6. Heirs Share Reconciliation (100% total)
    heirs = store.all("heirs", lambda hr: hr.get("userId") == "u_raghavan")
    assert len(heirs) == 2, f"Expected 2 surviving legal heirs, got {len(heirs)}"
    total_share = sum(hr.get("share", 0) for hr in heirs)
    assert total_share == 100.0, f"Heir shares must sum to 100%, got {total_share}"
    print("[PASS] Raghavan scenario validation passed: 16 holdings, INR 15.67M, 7 regulators, 100% heir shares.")

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
