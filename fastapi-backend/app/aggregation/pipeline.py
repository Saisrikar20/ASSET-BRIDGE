import re
import datetime
from typing import List, Dict, Any, Tuple, Optional
from app.aggregation.models import (
    AssetCategory, RecordStatus, SourceType, VerificationStatus,
    NomineeStatus, AlertSeverity, NomineeDetail, NormalizedAsset,
    DuplicateCandidate, AlertItem, CategoryBreakdown, FinancialAnalysis,
    IdentityMatchingResult, ConsolidatedReport
)
from app.core.identity import REGULATORS, DEMO_RECORDS, DEMO_IDENTITY, clean_name, match_name_logic

PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

PAN_ENTITY_TYPES = {
    'P': 'Individual',
    'C': 'Company',
    'H': 'Hindu Undivided Family (HUF)',
    'F': 'Partnership Firm',
    'A': 'Association of Persons (AOP)',
    'T': 'Trust',
    'B': 'Body of Individuals (BOI)',
    'G': 'Government Agency',
    'J': 'Artificial Juridical Person',
    'L': 'Local Authority'
}

REGULATOR_CATEGORY_MAP = {
    'RBI': AssetCategory.DEPOSIT,
    'EPFO': AssetCategory.EPF,
    'IRDAI': AssetCategory.INSURANCE,
    'SEBI': AssetCategory.MUTUAL_FUND,
    'LIC': AssetCategory.INSURANCE,
    'PFRDA': AssetCategory.PENSION,
    'DOP': AssetCategory.GOVT_SAVINGS
}

# -------------------------------------------------------------
# STEP 1: Input Validation
# -------------------------------------------------------------
def validate_input(pan: str, identity_data: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, Optional[str]]:
    if not pan:
        return False, "PAN cannot be empty", None
    sanitized_pan = pan.strip().upper()
    if not PAN_PATTERN.match(sanitized_pan):
        return False, "Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F)", None
    
    entity_code = sanitized_pan[3]
    entity_type = PAN_ENTITY_TYPES.get(entity_code, "Unknown Entity")
    
    if identity_data:
        name = identity_data.get("name", "").strip()
        if not name:
            return False, "Name is required for identity verification", entity_type
    
    return True, "Valid PAN", entity_type

# -------------------------------------------------------------
# STEP 2: Identity Matching
# -------------------------------------------------------------
def match_identity(identity: Dict[str, Any], regulators: Optional[List[str]] = None) -> List[IdentityMatchingResult]:
    target_regulators = regulators or list(REGULATORS.keys())
    results: List[IdentityMatchingResult] = []
    given_name = identity.get("name", "")
    is_demo = identity.get("pan", "").upper() == DEMO_IDENTITY["pan"]

    for reg_code in target_regulators:
        reg_info = REGULATORS.get(reg_code, {"name": reg_code})
        sample_records = [r for r in DEMO_RECORDS if r.get("regulator") == reg_code]
        
        for r in sample_records:
            registered_name = r.get("registeredName") or (DEMO_IDENTITY["name"] if is_demo else given_name)
            match_status, conf = match_name_logic(given_name, registered_name)
            
            # Partial match must NEVER be treated as confirmed verified!
            details = f"Matched with {conf * 100:.0f}% confidence against registered record at {r.get('institution')}"
            if match_status == 'partial':
                details += " (PARTIAL MATCH: initial matches, requires manual or Aadhaar OTP re-verification)"
            elif match_status == 'mismatch':
                details += " (NAME MISMATCH: registration name does not match PAN)"

            results.append(IdentityMatchingResult(
                regulator=reg_code,
                institution=r.get("institution", "Unknown"),
                matchStatus=match_status,
                isSimulated=True,
                confidence=conf,
                details=details
            ))
            
    return results

# -------------------------------------------------------------
# STEP 3: Asset Discovery
# -------------------------------------------------------------
def discover_assets(identity: Dict[str, Any], regulators: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    target_regulators = set(regulators or REGULATORS.keys())
    is_demo = identity.get("pan", "").upper() == DEMO_IDENTITY["pan"]
    from app.core.identity import get_records_for_identity
    all_recs = get_records_for_identity(identity)
    
    discovered: List[Dict[str, Any]] = []
    for r in all_recs:
        if r.get("regulator") in target_regulators:
            record_copy = dict(r)
            if not is_demo:
                record_copy["registeredName"] = record_copy.get("registeredName") or identity.get("name", "")
                record_copy["registeredDob"] = record_copy.get("registeredDob") or identity.get("dob", "")
            else:
                record_copy["registeredName"] = record_copy.get("registeredName") or DEMO_IDENTITY["name"]
                record_copy["registeredDob"] = record_copy.get("registeredDob") or DEMO_IDENTITY["dob"]
            discovered.append(record_copy)
            
    return discovered

# -------------------------------------------------------------
# STEP 4: Asset Normalization
# -------------------------------------------------------------
def normalize_assets(raw_records: List[Dict[str, Any]], identity: Dict[str, Any]) -> List[NormalizedAsset]:
    normalized: List[NormalizedAsset] = []
    idx = 1
    
    for r in raw_records:
        reg = r.get("regulator", "RBI")
        raw_type = (r.get("type") or "Asset").lower()
        
        # Category resolution
        if "demat" in raw_type or "zerodha" in raw_type or "cdsl" in raw_type:
            cat = AssetCategory.EQUITY_DEMAT
        elif "mutual fund" in raw_type or "cams" in raw_type:
            cat = AssetCategory.MUTUAL_FUND
        elif "gold" in raw_type or "sgb" in raw_type:
            cat = AssetCategory.GOVT_SAVINGS
        elif "ppf" in raw_type or "nsc" in raw_type or reg == "DOP":
            cat = AssetCategory.GOVT_SAVINGS
        elif "nps" in raw_type or reg == "PFRDA":
            cat = AssetCategory.PENSION
        elif "epf" in raw_type or reg == "EPFO":
            cat = AssetCategory.EPF
        elif "insurance" in raw_type or reg in ["IRDAI", "LIC"]:
            cat = AssetCategory.INSURANCE
        else:
            cat = REGULATOR_CATEGORY_MAP.get(reg, AssetCategory.DEPOSIT)
            
        # Nominee mapping
        nominee_dict = r.get("nominee")
        nominee_obj = None
        if nominee_dict:
            nominee_obj = NomineeDetail(
                name=nominee_dict.get("name", "Unknown"),
                relation=nominee_dict.get("relation", "Relative"),
                status=NomineeStatus(nominee_dict.get("status", "valid")),
                guardian=nominee_dict.get("guardian")
            )
            
        # Verification status logic
        name_status, conf = match_name_logic(identity.get("name", ""), r.get("registeredName", ""))
        verif_status = VerificationStatus.PROVISIONAL
        if conf == 1.0:
            verif_status = VerificationStatus.VERIFIED
        elif conf == 0.0:
            verif_status = VerificationStatus.UNVERIFIED
            
        norm_item = NormalizedAsset(
            id=f"ast_{idx:03d}",
            category=cat,
            regulator=reg,
            type=r.get("type", "General Asset"),
            institution=r.get("institution", "Unknown Institution"),
            ref=r.get("ref", "XXXX"),
            holderName=r.get("registeredName") or identity.get("name", "Unknown"),
            value=float(r.get("value", 0.0)),
            sip=float(r["sip"]) if "sip" in r and r["sip"] is not None else None,
            recordStatus=RecordStatus(r.get("status", "active")),
            sourceType=SourceType.SIMULATED_AGGREGATOR,
            verificationStatus=verif_status,
            lastActivity=r.get("lastActivity", datetime.date.today().isoformat()),
            nominee=nominee_obj,
            kycUpdated=r.get("kycUpdated", "2020-01-01"),
            confidenceScore=conf
        )
        normalized.append(norm_item)
        idx += 1
        
    return normalized

# -------------------------------------------------------------
# STEP 5: Duplicate Detection
# -------------------------------------------------------------
def detect_duplicates(assets: List[NormalizedAsset]) -> Tuple[List[NormalizedAsset], List[DuplicateCandidate]]:
    """
    Identifies duplicate assets using deterministic matching rules.
    CRITICAL: Preserves records where identity is uncertain rather than deleting them automatically.
    """
    candidates: List[DuplicateCandidate] = []
    seen_refs: Dict[str, NormalizedAsset] = {}
    
    for asset in assets:
        # Rule 1: Exact institution + reference match
        key_exact = f"{clean_name(asset.institution)}::{clean_name(asset.ref)}"
        if key_exact in seen_refs:
            primary = seen_refs[key_exact]
            asset.isDuplicate = True
            asset.duplicateOf = primary.id
            candidates.append(DuplicateCandidate(
                primaryId=primary.id,
                duplicateId=asset.id,
                matchReason=f"Identical institution ({asset.institution}) and reference ID ({asset.ref})",
                confidence=1.0,
                resolution="flagged_not_deleted"
            ))
            continue
        
        # Rule 2: Same institution + same category + exact same value (heuristic duplicate)
        found_heuristic = False
        for _, existing in seen_refs.items():
            if (existing.institution == asset.institution and 
                existing.category == asset.category and 
                abs(existing.value - asset.value) < 1.0 and 
                existing.holderName == asset.holderName and 
                asset.ref != "XXXX"):
                asset.isDuplicate = True
                asset.duplicateOf = existing.id
                candidates.append(DuplicateCandidate(
                    primaryId=existing.id,
                    duplicateId=asset.id,
                    matchReason=f"Exact match on institution, holder, category ({asset.category}), and balance (₹{asset.value:,.0f})",
                    confidence=0.85,
                    resolution="flagged_not_deleted"
                ))
                found_heuristic = True
                break
                
        if not found_heuristic:
            seen_refs[key_exact] = asset
            
    return assets, candidates

# -------------------------------------------------------------
# STEP 6: Financial Analysis & Risk Alerts
# -------------------------------------------------------------
def analyze_financials(assets: List[NormalizedAsset], identity: Dict[str, Any]) -> FinancialAnalysis:
    """
    Calculates totals only where data supports it (excluding duplicates from verifiable total).
    Generates actionable risk alerts.
    """
    total_discovered = 0.0
    verifiable_total = 0.0
    at_risk = 0.0
    category_counts: Dict[AssetCategory, int] = {cat: 0 for cat in AssetCategory}
    category_values: Dict[AssetCategory, float] = {cat: 0.0 for cat in AssetCategory}
    
    nominee_missing_cnt = 0
    inoperative_cnt = 0
    unclaimed_cnt = 0
    alerts: List[AlertItem] = []
    alert_idx = 1
    
    def add_alert(sev: AlertSeverity, kind: str, title: str, detail: str, holding_id: str, reg: str):
        nonlocal alert_idx
        alerts.append(AlertItem(
            id=f"alt_{alert_idx:03d}",
            severity=sev,
            kind=kind,
            title=title,
            detail=detail,
            holdingId=holding_id,
            regulator=reg,
            resolved=False,
            createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat()
        ))
        alert_idx += 1

    for a in assets:
        total_discovered += a.value
        
        # Calculate verifiable totals ONLY from non-duplicate assets
        if not a.isDuplicate:
            verifiable_total += a.value
            category_counts[a.category] += 1
            category_values[a.category] += a.value
            
            # Nominee risk analysis
            has_valid_nominee = a.nominee and a.nominee.status == NomineeStatus.VALID
            is_dormant = a.recordStatus != RecordStatus.ACTIVE
            
            if not has_valid_nominee or is_dormant:
                at_risk += a.value
                
            if not a.nominee:
                nominee_missing_cnt += 1
                add_alert(
                    AlertSeverity.HIGH, "nominee_missing",
                    f"No nominee on {a.type}",
                    f"{a.institution} ({a.ref}) has no registered nominee. Claims will require a court heirship certificate for ₹{a.value:,.0f}.",
                    a.id, a.regulator
                )
            elif a.nominee.status == NomineeStatus.DECEASED:
                add_alert(
                    AlertSeverity.HIGH, "nominee_deceased",
                    f"Nominee {a.nominee.name} is deceased",
                    f"Nomination on {a.institution} ({a.ref}) is invalid because the nominee is deceased. Appoint a new nominee immediately.",
                    a.id, a.regulator
                )
            elif a.nominee.status == NomineeStatus.MINOR:
                add_alert(
                    AlertSeverity.MEDIUM, "nominee_minor",
                    f"Minor nominee on {a.type}",
                    f"Nominee {a.nominee.name} is a minor on {a.institution}. A legal guardian must be designated.",
                    a.id, a.regulator
                )
                
            if a.recordStatus == RecordStatus.UNCLAIMED:
                unclaimed_cnt += 1
                add_alert(
                    AlertSeverity.HIGH, "unclaimed",
                    f"Unclaimed asset at {a.institution}",
                    f"Funds of ₹{a.value:,.0f} have been idle since {a.lastActivity} and flagged as unclaimed under regulator rules.",
                    a.id, a.regulator
                )
            elif a.recordStatus == RecordStatus.INOPERATIVE:
                inoperative_cnt += 1
                add_alert(
                    AlertSeverity.MEDIUM, "inoperative",
                    f"Inoperative account at {a.institution}",
                    f"No customer transactions recorded since {a.lastActivity}. Submit re-KYC to restore active status.",
                    a.id, a.regulator
                )
                
            if a.confidenceScore < 1.0:
                add_alert(
                    AlertSeverity.MEDIUM, "name_mismatch",
                    f"Name discrepancy at {a.institution}",
                    f"Registered as '{a.holderName}' which differs from input name '{identity.get('name')}'.",
                    a.id, a.regulator
                )

    breakdowns = [
        CategoryBreakdown(category=cat, count=category_counts[cat], value=category_values[cat])
        for cat in AssetCategory if category_counts[cat] > 0
    ]
    
    unique_count = len([a for a in assets if not a.isDuplicate])
    duplicate_count = len([a for a in assets if a.isDuplicate])
    
    return FinancialAnalysis(
        totalDiscoveredValue=total_discovered,
        verifiableTotal=verifiable_total,
        atRiskValue=at_risk,
        totalCount=len(assets),
        uniqueCount=unique_count,
        duplicateCount=duplicate_count,
        nomineeMissingCount=nominee_missing_cnt,
        inoperativeCount=inoperative_cnt,
        unclaimedCount=unclaimed_cnt,
        byCategory=breakdowns,
        alerts=alerts
    )

# -------------------------------------------------------------
# STEP 7: Consolidated Report Generation
# -------------------------------------------------------------
def generate_consolidated_report(
    identity: Dict[str, Any],
    assets: List[NormalizedAsset],
    duplicates: List[DuplicateCandidate],
    analysis: FinancialAnalysis
) -> ConsolidatedReport:
    report_id = f"REP-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')}"
    pan = identity.get("pan", "").upper()
    holder_name = identity.get("name", "User")
    
    important_findings = [
        f"Discovered {analysis.uniqueCount} verified financial assets totaling ₹{analysis.verifiableTotal:,.0f}.",
        f"₹{analysis.atRiskValue:,.0f} ({(analysis.atRiskValue/analysis.verifiableTotal*100) if analysis.verifiableTotal > 0 else 0:.1f}%) is currently at risk due to absent nominees or inoperative status.",
        f"{analysis.nomineeMissingCount} holdings lack registered nominees, requiring formal court heir certificates during succession.",
        f"{analysis.unclaimedCount} unclaimed and {analysis.inoperativeCount} dormant accounts detected across banking and postal registries."
    ]
    if duplicates:
        important_findings.append(f"{len(duplicates)} potentially duplicate holding records flagged and isolated to prevent double counting.")
        
    data_limitations = [
        "Simulated Institutional Aggregation: Aggregated records reflect simulated endpoints adhering to RBI/SEBI/IRDAI sandbox specifications.",
        "Live Institutional Connectors: Production access requires Account Aggregator (RBI-AA) user consent approval via NBFC-AA.",
        "Dormancy Timelines: Inoperative classifications reflect statutory guidelines (2+ years dormant for banking, 10+ years for DEA transfer)."
    ]
    
    suggested_next_steps = [
        "1. Complete Nominee Registration: Update nominee details for the high-risk accounts identified in the alerts.",
        "2. Submit Re-KYC for Inoperative Accounts: Reactivate dormant bank and EPF accounts with current proof of identity.",
        "3. File Unclaimed Deposit Reclaim: Initiate formal claim requests via RBI UDGAM / IEPF portal for unclaimed balances.",
        "4. Synchronize Estate Case: Generate the state-specific legal heir roadmap to protect estate transmission for family members."
    ]
    
    summary = {
        "pan": pan,
        "name": holder_name,
        "totalDiscoveredValue": analysis.totalDiscoveredValue,
        "verifiableTotal": analysis.verifiableTotal,
        "atRiskValue": analysis.atRiskValue,
        "riskPercentage": round((analysis.atRiskValue / analysis.verifiableTotal * 100) if analysis.verifiableTotal > 0 else 0, 1),
        "totalAssets": analysis.totalCount,
        "uniqueAssets": analysis.uniqueCount,
        "duplicateAssets": analysis.duplicateCount,
        "alertsCount": len(analysis.alerts)
    }
    
    return ConsolidatedReport(
        reportId=report_id,
        generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        pan=pan,
        holderName=holder_name,
        summary=summary,
        discoveredAssets=assets,
        categories=analysis.byCategory,
        potentialDuplicates=duplicates,
        importantFindings=important_findings,
        dataLimitations=data_limitations,
        suggestedNextSteps=suggested_next_steps
    )

# -------------------------------------------------------------
# End-to-End Pipeline Orchestrator
# -------------------------------------------------------------
def process_pipeline(identity: Dict[str, Any], regulators: Optional[List[str]] = None) -> ConsolidatedReport:
    """Executes the full 7-step pipeline sequentially."""
    pan = identity.get("pan", "")
    valid, msg, _ = validate_input(pan, identity)
    if not valid:
        raise ValueError(f"Pipeline Input Validation Failed: {msg}")
        
    # Step 2: Identity Matching
    match_identity(identity, regulators)
    
    # Step 3: Asset Discovery
    raw_records = discover_assets(identity, regulators)
    
    # Step 4: Asset Normalization
    normalized = normalize_assets(raw_records, identity)
    
    # Step 5: Duplicate Detection
    deduped_assets, duplicates = detect_duplicates(normalized)
    
    # Step 6: Financial Analysis
    analysis = analyze_financials(deduped_assets, identity)
    
    # Step 7: Report Generation
    report = generate_consolidated_report(identity, deduped_assets, duplicates, analysis)
    
    return report

