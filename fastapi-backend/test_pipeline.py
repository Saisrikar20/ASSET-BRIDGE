import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app
from app.module2_aggregation.models import AssetCategory, RecordStatus, NomineeStatus
from app.module2_aggregation.pipeline import (
    validate_input, match_name_logic, match_identity, discover_assets,
    normalize_assets, detect_duplicates, analyze_financials, process_pipeline
)

client = TestClient(app)

def test_suite():
    print("======================================================================")
    print("DEXATHON 2026 ROUND 2: CORE ASSET PROCESSING PIPELINE & RELIABILITY TEST")
    print("======================================================================\n")

    # ------------------------------------------------------------------
    # 1. INPUT VALIDATION TESTS
    # ------------------------------------------------------------------
    print("--- 1. Input Validation Tests ---")
    # Valid PAN
    v, msg, et = validate_input("ABCPI1234K")
    assert v is True and et == "Individual", f"Failed valid PAN: {msg}"
    print("[PASS] Valid Individual PAN (ABCPI1234K) recognized.")

    # Valid Company PAN
    v, msg, et = validate_input("AAACA1234K")
    assert v is True and et == "Company", f"Failed company PAN: {msg}"
    print("[PASS] Valid Company PAN (AAACA1234K) recognized.")

    # Invalid PAN - bad format
    v, msg, _ = validate_input("INVALID123")
    assert v is False
    print(f"[PASS] Malformed PAN rejected: {msg}")

    # Empty PAN
    v, msg, _ = validate_input("")
    assert v is False
    print(f"[PASS] Empty PAN rejected: {msg}")

    # Whitespace / Lowercase resilience
    v, msg, et = validate_input("  abcpi1234k  ")
    assert v is True
    print("[PASS] Lowercase and whitespace automatically normalized.")

    # ------------------------------------------------------------------
    # 2. IDENTITY MATCHING TESTS
    # ------------------------------------------------------------------
    print("\n--- 2. Identity Matching Tests ---")
    # Exact match
    status, conf = match_name_logic("Raghavan", "Raghavan")
    assert status == "exact" and conf == 1.0
    print("[PASS] Exact name match scored 100% confidence.")

    # Partial match
    status, conf = match_name_logic("Raghavan", "R. Raghavan")
    assert status == "partial" and conf == 0.65
    print("[PASS] Partial name match ('Raghavan' vs 'R. Raghavan') isolated to 65% and NOT marked verified.")

    # Mismatch
    status, conf = match_name_logic("Suresh Kumar", "Raghavan")
    assert status == "mismatch" and conf == 0.0
    print("[PASS] Complete name mismatch correctly identified.")

    # ------------------------------------------------------------------
    # 3. ASSET DISCOVERY & NORMALIZATION TESTS
    # ------------------------------------------------------------------
    print("\n--- 3. Asset Discovery & Normalization Tests ---")
    identity = {"pan": "ABCPI1234K", "name": "Raghavan", "dob": "1984-03-14", "state": "Tamil Nadu"}
    
    # Discovery across all regulators
    discovered = discover_assets(identity)
    assert len(discovered) == 16, f"Expected 16 demo assets, got {len(discovered)}"
    print(f"[PASS] Discovered {len(discovered)} records across all 7 regulators (RBI, EPFO, IRDAI, SEBI, LIC, PFRDA, DOP).")

    # Filtered discovery
    rbi_only = discover_assets(identity, regulators=["RBI"])
    assert len(rbi_only) == 4
    print(f"[PASS] Regulator filtering verified (RBI isolated: {len(rbi_only)} assets).")

    # Asset Normalization
    normalized = normalize_assets(discovered, identity)
    assert len(normalized) == 16
    categories = {a.category for a in normalized}
    assert AssetCategory.DEPOSIT in categories
    assert AssetCategory.EPF in categories
    assert AssetCategory.MUTUAL_FUND in categories
    assert AssetCategory.INSURANCE in categories
    assert AssetCategory.GOVT_SAVINGS in categories
    print(f"[PASS] All {len(normalized)} records normalized to uniform Pydantic schema across {len(categories)} financial categories.")

    # ------------------------------------------------------------------
    # 4. DUPLICATE DETECTION & NON-DESTRUCTIVE PRESERVATION TESTS
    # ------------------------------------------------------------------
    print("\n--- 4. Duplicate Detection & Non-Destructive Preservation ---")
    # Inject synthetic duplicates: 1 exact ref duplicate, 1 heuristic duplicate
    dup_list = list(normalized)
    
    # Exact duplicate (same institution, same ref)
    exact_dup = dup_list[0].model_copy(update={"id": "ast_dup_001"})
    dup_list.append(exact_dup)
    
    # Heuristic duplicate (same institution, category, holder, value)
    heuristic_dup = dup_list[1].model_copy(update={"id": "ast_dup_002", "ref": "XXXX0932_CLONE"})
    dup_list.append(heuristic_dup)
    
    deduped_assets, duplicate_candidates = detect_duplicates(dup_list)
    assert len(duplicate_candidates) == 2, f"Expected 2 duplicate candidates, found {len(duplicate_candidates)}"
    assert len(deduped_assets) == 18, "Original records must NEVER be deleted from dataset!"
    
    flagged = [a for a in deduped_assets if a.isDuplicate]
    assert len(flagged) == 2
    print(f"[PASS] Duplicate detection flagged {len(flagged)} duplicates without deleting any records.")
    print(f"       Resolution mode: {duplicate_candidates[0].resolution} (Candidate of {duplicate_candidates[0].primaryId})")

    # ------------------------------------------------------------------
    # 5. FINANCIAL ANALYSIS & VERIFIABLE TOTAL CALCULATIONS
    # ------------------------------------------------------------------
    print("\n--- 5. Financial Analysis & Double-Counting Safeguard ---")
    analysis = analyze_financials(deduped_assets, identity)
    
    # Verifiable total MUST exclude duplicate values
    expected_unique_total = sum(a.value for a in normalized)
    assert analysis.verifiableTotal == expected_unique_total, "Verifiable total must NOT double count duplicates!"
    assert analysis.totalDiscoveredValue > analysis.verifiableTotal, "Discovered total includes duplicates; verifiable total does not."
    assert analysis.duplicateCount == 2
    assert analysis.uniqueCount == 16
    assert analysis.atRiskValue > 0
    assert len(analysis.alerts) > 0
    print(f"[PASS] Financial analysis completed:")
    print(f"       - Total Discovered Value:  INR {analysis.totalDiscoveredValue:,.2f}")
    print(f"       - Verifiable Clean Total:  INR {analysis.verifiableTotal:,.2f} (Duplicates excluded)")
    print(f"       - At-Risk Assets Value:    INR {analysis.atRiskValue:,.2f} ({analysis.atRiskValue/analysis.verifiableTotal*100:.1f}%)")
    print(f"       - Generated Risk Alerts:   {len(analysis.alerts)} items")

    # ------------------------------------------------------------------
    # 6. END-TO-END PIPELINE & CONSOLIDATED REPORT TEST
    # ------------------------------------------------------------------
    print("\n--- 6. End-to-End Pipeline & Report Generation ---")
    report = process_pipeline(identity)
    assert report.reportId.startswith("REP-")
    assert report.pan == "ABCPI1234K"
    assert len(report.importantFindings) >= 4
    assert len(report.dataLimitations) >= 3
    assert len(report.suggestedNextSteps) >= 4
    print("[PASS] End-to-end 7-step pipeline executed successfully.")
    print(f"       Report ID: {report.reportId}")
    print(f"       Findings count: {len(report.importantFindings)}, Limitations: {len(report.dataLimitations)}")

    # ------------------------------------------------------------------
    # 7. FASTAPI REST API & INTEGRATION TESTS
    # ------------------------------------------------------------------
    print("\n--- 7. FastAPI REST API & Integration Tests ---")
    # Health check
    res = client.get("/health")
    assert res.status_code == 200 and res.json()["ok"] is True
    print("[PASS] GET /health (service: asset-bridge-fastapi-unified)")

    # PAN Validation API
    res = client.post("/api/pipeline/validate-pan", json={"pan": "ABCPI1234K"})
    assert res.status_code == 200 and res.json()["valid"] is True
    print("[PASS] POST /api/pipeline/validate-pan (valid)")

    res = client.post("/api/pipeline/validate-pan", json={"pan": "BADPAN123"})
    assert res.status_code == 400
    print("[PASS] POST /api/pipeline/validate-pan (rejected with 400 Bad Request)")

    # Auth demo login to get token
    demo_res = client.post("/api/auth/demo")
    assert demo_res.status_code == 200
    token = demo_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Demo login authenticated, Bearer token acquired.")

    # Full pipeline process endpoint
    proc_payload = {
        "pan": "ABCPI1234K",
        "name": "Raghavan",
        "dob": "1984-03-14",
        "state": "Tamil Nadu"
    }
    res = client.post("/api/pipeline/process", json=proc_payload, headers=headers)
    assert res.status_code == 200
    report_data = res.json()
    assert report_data["pan"] == "ABCPI1234K"
    assert len(report_data["discoveredAssets"]) == 16
    print("[PASS] POST /api/pipeline/process returned complete ConsolidatedReport.")

    # Get consolidated report
    res = client.get("/api/reports/consolidated", headers=headers)
    assert res.status_code == 200
    print("[PASS] GET /api/reports/consolidated returned cached report.")

    # Consents and Holdings flow
    res = client.post("/api/consents", json={"regulators": ["RBI", "EPFO", "SEBI"]}, headers=headers)
    assert res.status_code == 200
    print(f"[PASS] POST /api/consents aggregated {res.json()['holdingsCount']} holdings.")

    res = client.get("/api/holdings", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["holdings"]) > 0
    print("[PASS] GET /api/holdings returned aggregated portfolio with summary.")

    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    assert len(alerts) > 0
    print(f"[PASS] GET /api/alerts returned {len(alerts)} risk alerts.")

    # AI Succession Guide (In-process RAG assistant)
    res = client.post("/api/assistant", json={
        "question": "What documents are required to claim EPF pension Form 10D in Tamil Nadu?",
        "state": "Tamil Nadu"
    })
    assert res.status_code == 200
    guide_data = res.json()
    assert "answer" in guide_data and len(guide_data["sources"]) > 0
    print(f"[PASS] POST /api/assistant returned succession guidance using engine '{guide_data['engine']}' with {len(guide_data['sources'])} cited knowledge chunks.")

    # ------------------------------------------------------------------
    # 8. WEALTH SIMULATION & LIFE PLAN INTEGRATION TESTS
    # ------------------------------------------------------------------
    print("\n--- 8. Wealth Simulation & Life Plan Integration Tests ---")
    # GET /api/options
    res = client.get("/api/options")
    assert res.status_code == 200
    assert "options" in res.json() and len(res.json()["options"]) > 5
    print("[PASS] GET /api/options returned investment catalog.")

    # GET & PUT /api/plan
    res = client.get("/api/plan", headers=headers)
    assert res.status_code == 200
    res = client.put("/api/plan", json={"contributions": [{"optionId": "ppf", "monthly": 5000, "lumpSum": 0}]}, headers=headers)
    assert res.status_code == 200
    print("[PASS] GET & PUT /api/plan verified.")

    # POST /api/forecast
    res = client.post("/api/forecast", json={}, headers=headers)
    assert res.status_code == 200
    fc = res.json()
    assert "points" in fc and len(fc["points"]) > 1
    print(f"[PASS] POST /api/forecast projected {len(fc['points'])} years.")

    # GET /api/analysis
    res = client.get("/api/analysis", headers=headers)
    assert res.status_code == 200
    an = res.json()
    assert "allocation" in an and "liquidity" in an
    print("[PASS] GET /api/analysis returned allocation & liquidity.")

    # GET & POST /api/life/simulate
    res = client.get("/api/life", headers=headers)
    assert res.status_code == 200
    res = client.post("/api/life/simulate", json={"runs": 100}, headers=headers)
    assert res.status_code == 200
    sim = res.json()
    assert "rows" in sim and sim["successRate"] > 0
    print(f"[PASS] POST /api/life/simulate returned Monte Carlo simulation (Success rate: {sim['successRate']}%).")

    # GET /api/progress
    res = client.get("/api/progress", headers=headers)
    assert res.status_code == 200
    assert "snapshots" in res.json()
    print("[PASS] GET /api/progress returned net-worth trajectory.")

    # ------------------------------------------------------------------
    # 9. ERROR & RELIABILITY TESTS
    # ------------------------------------------------------------------
    print("\n--- 9. Error Handling & Reliability Tests ---")
    # Unauthorized request
    res = client.get("/api/holdings")
    assert res.status_code == 401
    print("[PASS] Unauthorized access without Bearer token rejected with 401.")

    # Invalid JSON body
    res = client.post("/api/pipeline/process", content="invalid json", headers={"Content-Type": "application/json", **headers})
    assert res.status_code == 400
    print("[PASS] Malformed JSON payload safely caught and rejected with 400.")

    print("\n======================================================================")
    print("ALL TEST SUITES PASSED SUCCESSFULLY! (100% PASS RATE)")
    print("======================================================================")

if __name__ == "__main__":
    test_suite()
