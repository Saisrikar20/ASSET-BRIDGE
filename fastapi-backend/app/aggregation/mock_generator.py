"""
Procedural Deterministic Mock Asset Generator for Asset Bridge
Dexathon 2026 - Generates realistic, reproducible portfolios for ANY Indian PAN.
"""

import hashlib
import random
from typing import Dict, List, Any, Optional

BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Canara Bank", "Punjab National Bank", "Bank of Baroda", "Axis Bank", "Indian Bank"]
AMCS = ["SBI Mutual Fund", "HDFC Mutual Fund", "ICICI Prudential MF", "Nippon India MF", "Kotak Mahindra MF", "Parag Parikh Financial Advisory"]
BROKERS = ["Zerodha Broking (CDSL)", "Groww (CDSL)", "Upstox (NSDL)", "ICICI Direct (NSDL)", "Angel One (CDSL)"]
INSURERS = ["LIC of India", "HDFC Life", "ICICI Prudential Life", "SBI Life", "Max Life", "Tata AIA Life"]

def generate_portfolio_for_pan(pan: str, name: str, dob: str = "1985-05-15", state: str = "Tamil Nadu") -> List[Dict[str, Any]]:
    """
    Deterministically generates 8 to 14 authentic financial holdings across 7 statutory regulators
    for any PAN using SHA-256 seed.
    """
    clean_pan = (pan or "ABCDE1234F").strip().upper()
    seed_val = int(hashlib.sha256(clean_pan.encode("utf-8")).hexdigest(), 16) % (2**32)
    rng = random.Random(seed_val)
    
    holdings: List[Dict[str, Any]] = []
    
    # Generate 1 to 2 Bank Accounts (RBI)
    bank_1 = rng.choice(BANKS)
    last4_1 = str(rng.randint(1000, 9999))
    val_1 = rng.randint(25000, 850000)
    holdings.append({
        "regulator": "RBI",
        "type": "Savings account",
        "institution": bank_1,
        "ref": f"XXXX{last4_1}",
        "value": val_1,
        "status": "active",
        "lastActivity": "2026-09-15",
        "nominee": {"name": f"{name} Family", "relation": "Spouse", "status": "valid"},
        "kycUpdated": "2023-08-10"
    })
    
    # 70% chance of a second bank account or FD (sometimes inoperative or missing nominee)
    if rng.random() < 0.75:
        bank_2 = rng.choice([b for b in BANKS if b != bank_1] or BANKS)
        last4_2 = str(rng.randint(1000, 9999))
        val_2 = rng.randint(50000, 1500000)
        is_inop = rng.random() < 0.35
        holdings.append({
            "regulator": "RBI",
            "type": "Fixed deposit",
            "institution": bank_2,
            "ref": f"XXXX{last4_2}",
            "value": val_2,
            "status": "inoperative" if is_inop else "active",
            "lastActivity": "2015-11-20" if is_inop else "2026-06-10",
            "nominee": None if rng.random() < 0.6 else {"name": "Relative", "relation": "Mother", "status": "deceased"},
            "kycUpdated": "2012-04-15" if is_inop else "2024-01-10"
        })
        
    # Sovereign Gold Bond (RBI)
    if rng.random() < 0.5:
        holdings.append({
            "regulator": "RBI",
            "type": "Sovereign Gold Bond",
            "institution": f"RBI · via {bank_1}",
            "ref": f"SGB 2020-21 S-{rng.randint(1, 8)}",
            "value": rng.randint(200000, 900000),
            "status": "active",
            "lastActivity": "2026-05-12",
            "nominee": None if rng.random() < 0.5 else {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
            "kycUpdated": "2020-10-01"
        })

    # EPFO (Provident Fund)
    uan_digits = str(rng.randint(1000, 9999))
    pf_val = rng.randint(300000, 3200000)
    holdings.append({
        "regulator": "EPFO",
        "type": "EPF (current employer)",
        "institution": f"UAN 1008XXXX{uan_digits}",
        "ref": f"DL/CPM/00{rng.randint(10000, 99999)}",
        "value": pf_val,
        "sip": rng.choice([3600, 5000, 7200, 9600, 15000]),
        "status": "active",
        "lastActivity": "2026-09-30",
        "nominee": {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"} if rng.random() < 0.7 else None,
        "kycUpdated": "2024-03-01"
    })

    # SEBI (Mutual Funds via CAMS / KFintech)
    amc_1 = rng.choice(AMCS)
    folio_digits = str(rng.randint(1000, 9999))
    mf_val = rng.randint(150000, 2400000)
    holdings.append({
        "regulator": "SEBI",
        "type": "Mutual fund folio",
        "institution": f"{amc_1} · via CAMS",
        "ref": f"FOLIO 8812XX{folio_digits}",
        "value": mf_val,
        "sip": rng.choice([2500, 5000, 10000, 20000]),
        "status": "active",
        "lastActivity": "2026-10-05",
        "nominee": None if rng.random() < 0.4 else {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
        "kycUpdated": "2023-07-15"
    })

    # SEBI (Demat Holdings)
    if rng.random() < 0.8:
        broker = rng.choice(BROKERS)
        demat_val = rng.randint(400000, 4500000)
        holdings.append({
            "regulator": "SEBI",
            "type": "Demat holdings (Equities)",
            "institution": broker,
            "ref": f"BO 1208XXXX{rng.randint(1000, 9999)}",
            "value": demat_val,
            "status": "active",
            "lastActivity": "2026-10-18",
            "nominee": None if rng.random() < 0.45 else {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
            "kycUpdated": "2024-05-10"
        })

    # IRDAI / LIC (Life Insurance)
    insurer = rng.choice(INSURERS)
    policy_num = str(rng.randint(1000, 9999))
    ins_val = rng.randint(1000000, 10000000)
    is_lic = "LIC" in insurer
    holdings.append({
        "regulator": "LIC" if is_lic else "IRDAI",
        "type": "Endowment policy" if is_lic else "Term life insurance",
        "institution": insurer,
        "ref": f"POL-77XX{policy_num}",
        "value": ins_val,
        "status": "active",
        "lastActivity": "2026-04-15",
        "nominee": {"name": "Elder", "relation": "Mother", "status": "deceased"} if rng.random() < 0.3 else {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
        "kycUpdated": "2022-09-12"
    })

    # PFRDA (NPS)
    if rng.random() < 0.65:
        pran_num = str(rng.randint(1000, 9999))
        nps_val = rng.randint(250000, 2200000)
        holdings.append({
            "regulator": "PFRDA",
            "type": "NPS Tier I",
            "institution": f"PRAN 1100XXXX{pran_num} · Protean CRA",
            "ref": f"PRAN XXXX{pran_num}",
            "value": nps_val,
            "sip": 5000,
            "status": "active",
            "lastActivity": "2026-09-10",
            "nominee": {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
            "kycUpdated": "2023-01-20"
        })

    # DOP (India Post - PPF or NSC)
    if rng.random() < 0.6:
        dop_type = "Public Provident Fund" if rng.random() < 0.7 else "National Savings Certificate"
        dop_ref = f"{'PPF' if 'PPF' in dop_type else 'NSC'} XXXX{rng.randint(1000, 9999)}"
        holdings.append({
            "regulator": "DOP",
            "type": dop_type,
            "institution": f"India Post · {state} Circle",
            "ref": dop_ref,
            "value": rng.randint(120000, 1500000),
            "status": "unclaimed" if rng.random() < 0.25 else "active",
            "lastActivity": "2026-03-31",
            "nominee": None if rng.random() < 0.5 else {"name": f"{name} Spouse", "relation": "Spouse", "status": "valid"},
            "kycUpdated": "2018-06-20"
        })

    # Inject a slight name discrepancy on one record for 25% of users to test matching confidence
    if rng.random() < 0.35 and holdings:
        target_h = holdings[rng.randint(0, len(holdings) - 1)]
        parts = name.split()
        if len(parts) > 1:
            target_h["registeredName"] = f"{parts[0][0]}. {' '.join(parts[1:])}"
        else:
            target_h["registeredName"] = f"R. {name}"

    return holdings
