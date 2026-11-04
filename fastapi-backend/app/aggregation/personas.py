"""
Multi-Persona Demographics & Asset Catalog for Asset Bridge
Dexathon 2026 - Comprehensive Mock Data Suite
"""

from typing import Dict, List, Any

PERSONAS: Dict[str, Dict[str, Any]] = {
    "raghavan": {
        "id": "raghavan",
        "name": "Raghavan",
        "pan": "ABCPI1234K",
        "dob": "1984-03-14",
        "aadhaarLast4": "4821",
        "mobile": "9840012345",
        "state": "Tamil Nadu",
        "role": "Salaried IT Specialist",
        "age": 42,
        "description": "Primary demise test case. Features inoperative Indian Bank FD without nominee, Canara Bank initial mismatch ('R. Raghavan'), LIC policy with deceased mother nominee, and Tamil Nadu Tahsildar succession roadmap.",
        "family": [
            {"name": "Meenakshi", "relation": "Spouse", "age": 39, "pan": "ABCPI5678M", "phone": "9840054321"},
            {"name": "Arjun", "relation": "Son", "age": 14, "pan": "ABCPI9012N", "minor": True},
            {"name": "Lakshmi", "relation": "Mother", "status": "deceased"}
        ],
        "holdings": [
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
            {'regulator': 'DOP', 'type': 'National Savings Certificate (matured)', 'institution': 'India Post · Adyar SO', 'ref': 'NSC XXXX0318', 'value': 152000, 'status': 'unclaimed', 'lastActivity': '2018-06-30', 'nominee': {'name': 'Lakshmi', 'relation': 'Mother', 'status': 'deceased'}, 'kycUpdated': '2013-06-30'},
            {'regulator': 'LIC', 'type': 'Matured policy (unpaid)', 'institution': 'LIC of India · Jeevan Saral', 'ref': 'POL 6630XX55', 'value': 287000, 'status': 'unclaimed', 'lastActivity': '2019-12-20', 'nominee': {'name': 'Lakshmi', 'relation': 'Mother', 'status': 'deceased'}, 'kycUpdated': '2004-06-30'}
        ]
    },

    "priya": {
        "id": "priya",
        "name": "Priya Sharma",
        "pan": "AABCS9876L",
        "dob": "1994-08-22",
        "aadhaarLast4": "7134",
        "mobile": "9880011223",
        "state": "Karnataka",
        "role": "Tech Lead / Startup Engineer",
        "age": 31,
        "description": "High-earning early wealth accumulator. Features high-value Demat equity and mutual funds, but critical nomination gaps on Zerodha and HDFC AMC folios risking sudden asset lockup.",
        "family": [
            {"name": "Suresh Sharma", "relation": "Father", "age": 64, "pan": "AABCS1122K"},
            {"name": "Anita Sharma", "relation": "Mother", "age": 60, "pan": "AABCS3344M"}
        ],
        "holdings": [
            {'regulator': 'SEBI', 'type': 'Demat holdings (Equities)', 'institution': 'CDSL · Zerodha Broking', 'ref': 'BO 1208XXXX9912', 'value': 2450000, 'status': 'active', 'lastActivity': '2026-10-25', 'nominee': None, 'kycUpdated': '2024-05-10'},
            {'regulator': 'SEBI', 'type': 'Mutual fund folio', 'institution': 'Parag Parikh Flexi Cap · via CAMS', 'ref': 'FOLIO 8831XX90', 'value': 820000, 'sip': 15000, 'status': 'active', 'lastActivity': '2026-10-01', 'nominee': {'name': 'Anita Sharma', 'relation': 'Mother', 'status': 'valid'}, 'kycUpdated': '2023-11-15'},
            {'regulator': 'SEBI', 'type': 'Mutual fund folio', 'institution': 'HDFC Top 100 · via CAMS', 'ref': 'FOLIO 3320XX71', 'value': 580000, 'status': 'active', 'lastActivity': '2026-09-12', 'nominee': None, 'kycUpdated': '2022-04-10'},
            {'regulator': 'EPFO', 'type': 'EPF (Bengaluru Tech Park)', 'institution': 'UAN 1014XXXX8833', 'ref': 'KN/BNG/0074129', 'value': 850000, 'sip': 9600, 'status': 'active', 'lastActivity': '2026-10-15', 'nominee': {'name': 'Anita Sharma', 'relation': 'Mother', 'status': 'valid'}, 'kycUpdated': '2024-01-10'},
            {'regulator': 'RBI', 'type': 'Salary account', 'institution': 'HDFC Bank', 'ref': 'XXXX8823', 'value': 480000, 'status': 'active', 'lastActivity': '2026-10-31', 'nominee': {'name': 'Suresh Sharma', 'relation': 'Father', 'status': 'valid'}, 'kycUpdated': '2024-03-20'},
            {'regulator': 'RBI', 'type': 'Fixed deposit', 'institution': 'ICICI Bank', 'ref': 'XXXX4119', 'value': 1000000, 'status': 'active', 'lastActivity': '2026-06-15', 'nominee': None, 'kycUpdated': '2023-08-11'},
            {'regulator': 'PFRDA', 'type': 'NPS Tier I (All Citizen)', 'institution': 'PRAN 1101XXXX5521 · NSDL CRA', 'ref': 'PRAN XXXX5521', 'value': 620000, 'sip': 4166, 'status': 'active', 'lastActivity': '2026-09-20', 'nominee': {'name': 'Anita Sharma', 'relation': 'Mother', 'status': 'valid'}, 'kycUpdated': '2023-01-15'},
            {'regulator': 'IRDAI', 'type': 'Term insurance (1 Crore)', 'institution': 'ICICI Prudential Life', 'ref': 'POL-99XX4431', 'value': 10000000, 'status': 'active', 'lastActivity': '2026-05-18', 'nominee': {'name': 'Anita Sharma', 'relation': 'Mother', 'status': 'valid'}, 'kycUpdated': '2023-06-12'}
        ]
    },

    "vikram": {
        "id": "vikram",
        "name": "Vikramaditya Sengupta",
        "pan": "BPCPS4321D",
        "dob": "1957-06-18",
        "aadhaarLast4": "9942",
        "mobile": "9830022334",
        "state": "West Bengal",
        "role": "Retired Central Govt Officer",
        "age": 69,
        "description": "Senior citizen retiree in Kolkata. Unclaimed physical shares and dividends transferred to IEPF, matured Post Office SCSS without valid nominee, and mandatory West Bengal District Court Succession Certificate path.",
        "family": [
            {"name": "Ananya Sengupta", "relation": "Spouse", "age": 66, "pan": "BPCPS9988E"},
            {"name": "Debashis Sengupta", "relation": "Son", "age": 38, "pan": "BPCPS7766F"}
        ],
        "holdings": [
            {'regulator': 'RBI', 'type': 'Pension savings account', 'institution': 'State Bank of India · Kolkata Main', 'ref': 'XXXX3318', 'value': 640000, 'status': 'active', 'lastActivity': '2026-10-28', 'nominee': {'name': 'Ananya Sengupta', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2024-02-14'},
            {'regulator': 'RBI', 'type': 'Senior citizen fixed deposit', 'institution': 'UCO Bank', 'ref': 'XXXX8821', 'value': 1200000, 'status': 'inoperative', 'lastActivity': '2016-04-12', 'nominee': None, 'kycUpdated': '2014-08-10'},
            {'regulator': 'DOP', 'type': 'Senior Citizen Savings Scheme (SCSS)', 'institution': 'India Post · GPO Kolkata', 'ref': 'SCSS XXXX9941', 'value': 1500000, 'status': 'active', 'lastActivity': '2026-07-15', 'nominee': None, 'kycUpdated': '2021-04-10'},
            {'regulator': 'SEBI', 'type': 'IEPF Unclaimed Shares (Tata Motors)', 'institution': 'IEPF Authority · MCA', 'ref': 'IEPF/TATAMOT/5512', 'value': 480000, 'status': 'unclaimed', 'lastActivity': '2014-11-20', 'nominee': None, 'kycUpdated': '2008-03-12'},
            {'regulator': 'SEBI', 'type': 'IEPF Unclaimed Dividend', 'institution': 'IEPF Authority · MCA', 'ref': 'IEPF/DIV/88123', 'value': 142000, 'status': 'unclaimed', 'lastActivity': '2015-08-15', 'nominee': None, 'kycUpdated': '2008-03-12'},
            {'regulator': 'EPFO', 'type': 'EPS 1995 Pensioner Folio', 'institution': 'EPFO Regional Office Kolkata', 'ref': 'WB/CAL/0018821/PPO', 'value': 28000, 'sip': 0, 'status': 'active', 'lastActivity': '2026-10-01', 'nominee': {'name': 'Ananya Sengupta', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2023-09-01'},
            {'regulator': 'LIC', 'type': 'Jeevan Akshay Pension Annuity', 'institution': 'LIC of India · Branch 412', 'ref': 'POL 4410XX98', 'value': 1800000, 'status': 'active', 'lastActivity': '2026-09-30', 'nominee': {'name': 'Ananya Sengupta', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2020-01-20'}
        ]
    },

    "sunita": {
        "id": "sunita",
        "name": "Sunita Deshmukh",
        "pan": "AXCPD5566M",
        "dob": "1973-11-05",
        "aadhaarLast4": "5512",
        "mobile": "9822033445",
        "state": "Maharashtra",
        "role": "Self-Employed Entrepreneur",
        "age": 53,
        "description": "Business owner in Pune. Deceased spouse remains registered as 100% nominee on major business and insurance folios; Maharashtra Civil Court Succession Certificate required for transmission.",
        "family": [
            {"name": "Prakash Deshmukh", "relation": "Spouse", "status": "deceased"},
            {"name": "Rohan Deshmukh", "relation": "Son", "age": 26, "pan": "AXCPD1122P"},
            {"name": "Neha Deshmukh", "relation": "Daughter", "age": 22, "pan": "AXCPD3344Q"}
        ],
        "holdings": [
            {'regulator': 'RBI', 'type': 'Current / Business account', 'institution': 'Bank of Baroda · Pune Camp', 'ref': 'XXXX9012', 'value': 3500000, 'status': 'active', 'lastActivity': '2026-10-29', 'nominee': {'name': 'Prakash Deshmukh', 'relation': 'Spouse', 'status': 'deceased'}, 'kycUpdated': '2023-11-20'},
            {'regulator': 'RBI', 'type': 'Sovereign Gold Bonds', 'institution': 'RBI · via Bank of Baroda', 'ref': 'SGB 2020-21 S-VII', 'value': 1250000, 'status': 'active', 'lastActivity': '2026-05-10', 'nominee': None, 'kycUpdated': '2020-11-15'},
            {'regulator': 'LIC', 'type': 'Jeevan Labh Policy', 'institution': 'LIC of India · Shivaji Nagar', 'ref': 'POL 8812XX44', 'value': 2500000, 'status': 'active', 'lastActivity': '2026-03-15', 'nominee': {'name': 'Prakash Deshmukh', 'relation': 'Spouse', 'status': 'deceased'}, 'kycUpdated': '2019-02-10'},
            {'regulator': 'IRDAI', 'type': 'Term life insurance', 'institution': 'HDFC Life', 'ref': 'POL-33XX8819', 'value': 7500000, 'status': 'active', 'lastActivity': '2026-06-20', 'nominee': {'name': 'Rohan Deshmukh', 'relation': 'Son', 'status': 'valid'}, 'kycUpdated': '2024-01-15'},
            {'regulator': 'SEBI', 'type': 'Mutual fund portfolio', 'institution': 'Kotak Mutual Fund · via CAMS', 'ref': 'FOLIO 4412XX09', 'value': 1850000, 'status': 'active', 'lastActivity': '2026-08-14', 'nominee': None, 'kycUpdated': '2022-07-19'},
            {'regulator': 'DOP', 'type': 'Public Provident Fund', 'institution': 'India Post · Pune City SO', 'ref': 'PPF XXXX3310', 'value': 1420000, 'status': 'active', 'lastActivity': '2026-04-05', 'nominee': {'name': 'Neha Deshmukh', 'relation': 'Daughter', 'status': 'valid'}, 'kycUpdated': '2021-09-12'}
        ]
    },

    "rajesh": {
        "id": "rajesh",
        "name": "Rajesh Patel",
        "pan": "AYCPP7788N",
        "dob": "1978-04-12",
        "aadhaarLast4": "3391",
        "mobile": "9898044556",
        "state": "Gujarat",
        "role": "Non-Resident Indian (Dubai / Ahmedabad)",
        "age": 48,
        "description": "NRI professional with offshore and onshore financial assets. Inoperative NRO account due to passport renewal KYC lapse, and FEMA regulatory restrictions on PPF and Small Savings.",
        "family": [
            {"name": "Bhavna Patel", "relation": "Spouse", "age": 45, "pan": "AYCPP5544R"},
            {"name": "Karan Patel", "relation": "Son", "age": 19, "pan": "AYCPP8899S"}
        ],
        "holdings": [
            {'regulator': 'RBI', 'type': 'NRE Fixed Deposit (Tax-Free)', 'institution': 'ICICI Bank · Ahmedabad Branch', 'ref': 'NRE-XXXX1145', 'value': 4500000, 'status': 'active', 'lastActivity': '2026-09-18', 'nominee': {'name': 'Bhavna Patel', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2024-04-12'},
            {'regulator': 'RBI', 'type': 'NRO Savings Account', 'institution': 'Axis Bank · Ellisbridge', 'ref': 'NRO-XXXX8829', 'value': 820000, 'status': 'inoperative', 'lastActivity': '2017-03-22', 'nominee': None, 'kycUpdated': '2015-01-10'},
            {'regulator': 'SEBI', 'type': 'NRI Mutual Fund Folio', 'institution': 'Mirae Asset Large Cap · via KFintech', 'ref': 'FOLIO 9920XX11', 'value': 2800000, 'status': 'active', 'lastActivity': '2026-07-10', 'nominee': {'name': 'Bhavna Patel', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2023-10-15'},
            {'regulator': 'DOP', 'type': 'Pre-NRI Public Provident Fund', 'institution': 'India Post · Navrangpura SO', 'ref': 'PPF XXXX0012', 'value': 2250000, 'status': 'active', 'lastActivity': '2026-03-30', 'nominee': None, 'kycUpdated': '2018-05-14'},
            {'regulator': 'IRDAI', 'type': 'Offshore NRI Term Plan', 'institution': 'Max Life Insurance', 'ref': 'POL-NRI-4412', 'value': 15000000, 'status': 'active', 'lastActivity': '2026-02-15', 'nominee': {'name': 'Bhavna Patel', 'relation': 'Spouse', 'status': 'valid'}, 'kycUpdated': '2024-02-28'}
        ]
    }
}

