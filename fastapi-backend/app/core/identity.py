import re, random

REGULATORS = {
    'RBI': {'name': 'Reserve Bank of India', 'covers': 'Bank deposits', 'fiType': 'DEPOSIT'},
    'EPFO': {'name': "Employees' Provident Fund Organisation", 'covers': 'Provident fund & pension', 'fiType': 'EPF'},
    'IRDAI': {'name': 'Insurance Regulatory and Development Authority', 'covers': 'Private life insurance', 'fiType': 'INSURANCE_POLICIES'},
    'SEBI': {'name': 'Securities and Exchange Board of India', 'covers': 'Mutual funds & demat', 'fiType': 'MUTUAL_FUNDS'},
    'LIC': {'name': 'Life Insurance Corporation of India', 'covers': 'LIC policies', 'fiType': 'LIC_POLICIES'},
    'PFRDA': {'name': 'Pension Fund Regulatory and Development Authority', 'covers': 'NPS & Atal Pension', 'fiType': 'NPS'},
    'DOP': {'name': 'India Post (Department of Posts)', 'covers': 'PPF, NSC & small savings', 'fiType': 'RECURRING_DEPOSIT'},
}

DEMO_IDENTITY = {
    'name': 'Raghavan Sundaram',
    'pan': 'ABCPI1234K',
    'dob': '1984-03-14',
    'aadhaarLast4': '4821',
    'mobile': '9840012345',
    'state': 'Tamil Nadu',
}

STATE_HEIR_DOC = {
    'Tamil Nadu': {'doc': 'Legal Heir Certificate', 'authority': 'Tahsildar (apply via TN e-Sevai)', 'days': '15–30 days'},
    'Kerala': {'doc': 'Legal Heirship Certificate', 'authority': 'Village Officer / Tahsildar', 'days': '15–30 days'},
    'Karnataka': {'doc': 'Family Tree / Survival Certificate', 'authority': 'Tahsildar via Nadakacheri (Atalji Janasnehi Kendra)', 'days': '7–21 days'},
    'Andhra Pradesh': {'doc': 'Family Member Certificate', 'authority': 'Tahsildar via MeeSeva', 'days': '7–30 days'},
    'Telangana': {'doc': 'Family Member Certificate', 'authority': 'Tahsildar via MeeSeva', 'days': '7–30 days'},
    'Maharashtra': {'doc': 'Heirship / Succession Certificate', 'authority': 'Civil Court (district)', 'days': '3–6 months'},
    'Delhi': {'doc': 'Legal Heir Certificate', 'authority': 'SDM / Revenue Department via e-District Delhi', 'days': '15–30 days'},
    'Uttar Pradesh': {'doc': 'Varisan Praman Patra (Heirship Certificate)', 'authority': 'Tehsil via e-District UP', 'days': '15–30 days'},
    'West Bengal': {'doc': 'Succession Certificate', 'authority': 'District Court', 'days': '3–6 months'},
    'Gujarat': {'doc': 'Heirship Certificate', 'authority': 'Mamlatdar / Civil Court', 'days': '1–3 months'},
}

STATES = list(STATE_HEIR_DOC.keys())

NATIONAL_STATS = [
    {'label': 'Unclaimed bank deposits', 'value': 67004, 'regulator': 'RBI'},
    {'label': 'Inoperative EPF accounts', 'value': 9330, 'regulator': 'EPFO'},
    {'label': 'Unclaimed LIC funds', 'value': 5564, 'regulator': 'LIC'},
    {'label': 'Unclaimed mutual funds', 'value': 3749, 'regulator': 'SEBI'},
    {'label': 'Household commercial bank deposits (RBI Table 50B)', 'value': 15316000, 'regulator': 'RBI'},
    {'label': 'Household life insurance assets (RBI Table 50B)', 'value': 5795000, 'regulator': 'LIC'},
    {'label': 'Household mutual fund investments (RBI Table 50B)', 'value': 2368000, 'regulator': 'SEBI'},
]

DEMO_RECORDS = [
    {'regulator': 'RBI', 'type': 'Savings account', 'institution': 'State Bank of India', 'ref': 'XXXX4417', 'value': 384500, 'status': 'active', 'lastActivity': '2026-09-30', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2023-06-11'},
    {'regulator': 'RBI', 'type': 'Fixed deposit', 'institution': 'Indian Bank', 'ref': 'XXXX0932', 'value': 650000, 'status': 'inoperative', 'lastActivity': '2015-02-18', 'nominee': None, 'kycUpdated': '2012-01-09'},
    {'regulator': 'RBI', 'type': 'Savings account', 'institution': 'Canara Bank', 'ref': 'XXXX2210', 'value': 41230, 'status': 'unclaimed', 'lastActivity': '2013-07-02', 'nominee': {'name': 'Lakshmi', 'relation': 'Mother', 'status': 'deceased'}, 'kycUpdated': '2009-04-21', 'registeredName': 'R. Raghavan'},
    {'regulator': 'EPFO', 'type': 'EPF (current employer)', 'institution': 'UAN 1009XXXX7712', 'ref': 'TN/MAS/0042117', 'value': 1872000, 'sip': 7200, 'status': 'active', 'lastActivity': '2026-09-30', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2024-02-01'},
    {'regulator': 'EPFO', 'type': 'EPF (previous employer)', 'institution': 'UAN 1003XXXX0485', 'ref': 'TN/AMB/0019873', 'value': 512400, 'status': 'inoperative', 'lastActivity': '2011-11-30', 'nominee': None, 'kycUpdated': '2010-08-15'},
    {'regulator': 'IRDAI', 'type': 'Term life insurance', 'institution': 'HDFC Life', 'ref': 'POL-77XX1903', 'value': 5000000, 'status': 'active', 'lastActivity': '2026-04-01', 'nominee': None, 'kycUpdated': '2021-03-30'},
    {'regulator': 'IRDAI', 'type': 'Personal accident cover', 'institution': 'Star Health', 'ref': 'POL-31XX0021', 'value': 500000, 'status': 'active', 'lastActivity': '2026-01-15', 'nominee': {'name': 'Arjun', 'relation': 'Son', 'status': 'minor'}, 'kycUpdated': '2022-12-10'},
    {'regulator': 'SEBI', 'type': 'Mutual fund folio', 'institution': 'SBI Mutual Fund · via CAMS', 'ref': 'FOLIO 1182XX44', 'value': 926300, 'sip': 10000, 'status': 'active', 'lastActivity': '2026-08-05', 'nominee': None, 'kycUpdated': '2019-05-20'},
    {'regulator': 'SEBI', 'type': 'Mutual fund folio', 'institution': 'HDFC Mutual Fund · via CAMS', 'ref': 'FOLIO 5530XX19', 'value': 214800, 'status': 'unclaimed', 'lastActivity': '2016-03-11', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2014-02-02'},
    {'regulator': 'SEBI', 'type': 'Demat holdings', 'institution': 'CDSL · Zerodha', 'ref': 'BO 1208XXXX3321', 'value': 1348000, 'status': 'active', 'lastActivity': '2026-10-10', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2024-07-19'},
    {'regulator': 'LIC', 'type': 'Endowment policy', 'institution': 'LIC of India · Jeevan Anand', 'ref': 'POL 7124XX09', 'value': 1000000, 'status': 'active', 'lastActivity': '2026-03-28', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2018-09-09'},
    {'regulator': 'RBI', 'type': 'Sovereign Gold Bond', 'institution': 'RBI · via State Bank of India', 'ref': 'SGB 2019-20 S-IV', 'value': 412000, 'status': 'active', 'lastActivity': '2026-08-12', 'nominee': None, 'kycUpdated': '2019-10-01'},
    {'regulator': 'PFRDA', 'type': 'NPS Tier I', 'institution': 'PRAN 1100XXXX4471 · Protean CRA', 'ref': 'PRAN XXXX4471', 'value': 1640000, 'sip': 5000, 'status': 'active', 'lastActivity': '2026-09-05', 'nominee': {'name': 'Meenakshi', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2022-04-18'},
    {'regulator': 'DOP', 'type': 'Public Provident Fund', 'institution': 'India Post · Mylapore HPO', 'ref': 'PPF XXXX7781', 'value': 735000, 'sip': 12500, 'status': 'active', 'lastActivity': '2026-04-02', 'nominee': None, 'kycUpdated': '2016-11-23'},
    {'regulator': 'DOP', 'type': 'National Savings Certificate (matured)', 'institution': 'India Post · Adyar SO', 'ref': 'NSC XXXX0318', 'value': 152000, 'status': 'unclaimed', 'lastActivity': '2018-06-30', 'nominee': {'name': 'Lakshmi', 'relation': 'Mother', 'status': 'deceased'}, 'kycUpdated': '2013-06-30', 'registeredName': 'Raghavan Sundaram', 'registeredDob': '1984-03-15'},
    {'regulator': 'LIC', 'type': 'Matured policy (unpaid)', 'institution': 'LIC of India · Jeevan Saral', 'ref': 'POL 6630XX55', 'value': 287000, 'status': 'unclaimed', 'lastActivity': '2019-12-20', 'nominee': {'name': 'Lakshmi', 'relation': 'Mother', 'status': 'deceased'}, 'kycUpdated': '2004-06-30', 'registeredName': 'Sundaram Raghavan', 'registeredDob': '1984-03-14'},
]

def clean_name(s: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', ' ', (s or '').lower())).strip()

def match_name_logic(given: str, registered: str) -> tuple[str, float]:
    a, b = clean_name(given), clean_name(registered)
    if not a or not b:
        return 'mismatch', 0.0
    if a == b:
        return 'exact', 1.0
    ap, bp = a.split(' '), b.split(' ')
    # Exactly same tokens in different order (e.g. Sundaram Raghavan vs Raghavan Sundaram)
    if set(ap) == set(bp) and len(ap) > 1:
        return 'partial', 0.85
    # Single name matches first token (e.g. Raghavan vs Raghavan Sundaram)
    if (len(bp) == 1 and bp[0] == ap[0]) or (len(ap) == 1 and ap[0] == bp[0]):
        return 'exact', 1.0
    # Initial prefix: 'R Raghavan' vs 'Raghavan Sundaram' or 'Raghavan'
    if (len(bp) == 2 and len(bp[0]) == 1 and bp[0] == ap[0][0] and bp[1] in ap):
        return 'partial', 0.65
    if (len(ap) == 2 and len(ap[0]) == 1 and ap[0] == bp[0][0] and ap[1] in bp):
        return 'partial', 0.65
    if ap[-1] == bp[-1] and ap[0][0] == bp[0][0]:
        return 'partial', 0.65
    # Middle/Last initial: 'Priya S' vs 'Priya Sharma' or 'Rajesh K Patel' vs 'Rajesh Patel'
    if ap[0] == bp[0] and (len(bp[-1]) == 1 and bp[-1] == ap[-1][0]):
        return 'partial', 0.75
    if ap[0] == bp[0] and (len(ap[-1]) == 1 and ap[-1] == bp[-1][0]):
        return 'partial', 0.75
    if set(ap) & set(bp):
        return 'partial', 0.65
    return 'mismatch', 0.0

def name_match(given: str, registered: str) -> str:
    return match_name_logic(given, registered)[0]

def get_records_for_identity(identity: dict) -> list:
    pan = (identity.get('pan') or '').strip().upper()
    name = identity.get('name') or 'User'
    dob = identity.get('dob') or '1985-05-15'
    state = identity.get('state') or 'Tamil Nadu'
    
    # 1. Match Raghavan demo PAN (exact default baseline)
    if pan == DEMO_IDENTITY['pan']:
        return DEMO_RECORDS
        
    # 2. Match other defined personas
    try:
        from app.aggregation.personas import PERSONAS
        for p in PERSONAS.values():
            if p['pan'].upper() == pan:
                return p['holdings']
    except Exception:
        pass
        
    # 3. Procedural deterministic generation for custom PAN
    try:
        from app.aggregation.mock_generator import generate_portfolio_for_pan
        return generate_portfolio_for_pan(pan, name, dob, state)
    except Exception:
        return DEMO_RECORDS

def query_regulator(regulator: str, identity: dict) -> list:
    is_demo = identity.get('pan', '').upper() == DEMO_IDENTITY['pan']
    all_recs = get_records_for_identity(identity)
    recs = [r for r in all_recs if r.get('regulator') == regulator]
    out = []
    for r in recs:
        c = dict(r)
        c['registeredName'] = c.get('registeredName') or (DEMO_IDENTITY['name'] if is_demo else identity.get('name', ''))
        c['registeredDob'] = c.get('registeredDob') or (DEMO_IDENTITY['dob'] if is_demo else identity.get('dob', ''))
        out.append(c)
    return out


def verify_identity(identity: dict) -> list:
    out = []
    for code, reg in REGULATORS.items():
        recs = query_regulator(code, identity)
        checks = []
        for r in recs:
            checks.append({
                'ref': r.get('ref'),
                'institution': r.get('institution'),
                'name': name_match(identity.get('name', ''), r.get('registeredName', '')),
                'registeredName': r.get('registeredName'),
                'registeredDob': r.get('registeredDob'),
                'dob': 'exact' if r.get('registeredDob') == identity.get('dob') else 'mismatch',
            })
        worst = 'verified'
        if any(c['name'] == 'mismatch' or c['dob'] == 'mismatch' for c in checks):
            worst = 'mismatch'
        elif any(c['name'] == 'partial' for c in checks):
            worst = 'partial'
        out.append({
            'regulator': code,
            'name': reg['name'],
            'recordsFound': len(recs),
            'status': worst if recs else 'none',
            'checks': checks
        })
    return out

def summarize(holdings: list) -> dict:
    by_reg = []
    for code in REGULATORS.keys():
        hs = [h for h in holdings if h.get("regulator") == code]
        by_reg.append({"regulator": code, "count": len(hs), "value": sum(h.get("value", 0) for h in hs)})
    tot = sum(h.get("value", 0) for h in holdings)
    risk = sum(h.get("value", 0) for h in holdings if not h.get("nominee") or (h.get("nominee") and h.get("nominee").get("status") != "valid") or h.get("status") != "active")
    return {"total": tot, "atRisk": risk, "count": len(holdings), "byRegulator": by_reg}
