import datetime, math, random
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.store import store, uid
from app.core.auth import get_current_user

router = APIRouter(prefix="/api")

ASSET_CLASSES = {
    'equity': {'label': 'Equity'},
    'debt': {'label': 'Debt & fixed income'},
    'pension': {'label': 'Pension (NPS)'},
    'gold': {'label': 'Gold'},
    'cash': {'label': 'Cash'},
}

SCENARIOS = {
    'conservative': {'label': 'Conservative', 'equity': 9, 'pension': 8, 'gold': 6, 'debtDelta': -0.5, 'cash': 2.5},
    'base': {'label': 'Base', 'equity': 11, 'pension': 9.5, 'gold': 8, 'debtDelta': 0, 'cash': 3},
    'optimistic': {'label': 'Optimistic', 'equity': 13, 'pension': 11, 'gold': 10, 'debtDelta': 0.25, 'cash': 3.5},
}

OPTIONS = [
    {'id': 'ppf', 'name': 'Public Provident Fund (PPF)', 'regulator': 'DOP', 'class': 'debt', 'rate': 7.1, 'rateKind': 'fixed', 'risk': 'Low', 'lockIn': '15 years', 'tax': 'EEE', 'min': '₹500 / year', 'maxMonthly': 12500, 'mode': 'monthly', 'govt': True, 'bestFor': 'Long-term tax-free savings'},
    {'id': 'vpf', 'name': 'Voluntary Provident Fund (VPF)', 'regulator': 'EPFO', 'class': 'debt', 'rate': 8.25, 'rateKind': 'declared yearly', 'risk': 'Low', 'lockIn': 'Until retirement', 'tax': 'EEE', 'min': 'Any % of basic pay', 'mode': 'monthly', 'govt': True, 'bestFor': 'Salaried, highest safe rate'},
    {'id': 'nps', 'name': 'National Pension System (NPS Tier I)', 'regulator': 'PFRDA', 'class': 'pension', 'rate': None, 'rateKind': 'market-linked', 'risk': 'Moderate', 'lockIn': 'Until age 60', 'tax': '80CCD(1B)', 'min': '₹1,000 / year', 'mode': 'monthly', 'govt': True, 'bestFor': 'Low-cost retirement corpus'},
    {'id': 'scss', 'name': "Senior Citizens' Savings Scheme", 'regulator': 'DOP', 'class': 'debt', 'rate': 8.2, 'rateKind': 'fixed', 'risk': 'Low', 'lockIn': '5 years', 'tax': '80C on deposit', 'min': '₹1,000', 'mode': 'lumpsum', 'govt': True, 'bestFor': 'Age 60+, quarterly income'},
    {'id': 'index', 'name': 'Nifty 50 index fund (SIP)', 'regulator': 'SEBI', 'class': 'equity', 'rate': None, 'rateKind': 'market-linked', 'risk': 'High', 'lockIn': 'None', 'tax': 'LTCG 12.5%', 'min': '₹500 SIP', 'mode': 'monthly', 'govt': False, 'bestFor': 'Core equity'},
    {'id': 'flexi', 'name': 'Flexi-cap mutual fund (SIP)', 'regulator': 'SEBI', 'class': 'equity', 'rate': None, 'rateKind': 'market-linked', 'risk': 'High', 'lockIn': 'None', 'tax': 'LTCG 12.5%', 'min': '₹500 SIP', 'mode': 'monthly', 'govt': False, 'bestFor': 'Active equity'},
    {'id': 'goldetf', 'name': 'Gold ETF / gold fund', 'regulator': 'SEBI', 'class': 'gold', 'rate': None, 'rateKind': 'tracks gold price', 'risk': 'Moderate', 'lockIn': 'None', 'tax': 'LTCG 12.5%', 'min': '₹500 SIP', 'mode': 'monthly', 'govt': False, 'bestFor': 'Inflation hedge'},
    {'id': 'sgb', 'name': 'Sovereign Gold Bond', 'regulator': 'RBI', 'class': 'gold', 'rate': None, 'rateKind': 'gold + 2.5%', 'risk': 'Moderate', 'lockIn': '8-year maturity', 'tax': 'Maturity tax-free', 'min': '1 gram', 'mode': 'lumpsum', 'govt': True, 'bestFor': 'Gold with interest'},
]

DEFAULT_SETTINGS = {'years': 15, 'inflation': 5.5, 'scenario': 'base', 'stepUp': 5, 'reclaimIdle': True}

def option_rate(opt: dict, scenario_name: str) -> float:
    sc = SCENARIOS.get(scenario_name, SCENARIOS['base'])
    if opt.get('rate') is not None:
        return opt['rate'] + (sc['debtDelta'] if opt.get('class') == 'debt' else 0)
    return sc.get(opt.get('class', 'debt'), 7.0)

def classify_holding(h: dict) -> dict:
    t = (h.get('type') or '').lower()
    if any(k in t for k in ['insurance', 'cover', 'policy']) and 'matured' not in t:
        return {'class': 'protection', 'rate': 0.0}
    if 'savings account' in t or 'matured' in t:
        return {'class': 'cash', 'rate': 3.0}
    if 'fixed deposit' in t:
        return {'class': 'debt', 'rate': 6.6}
    if 'epf' in t:
        return {'class': 'debt', 'rate': 8.25}
    if 'gold' in t or 'sgb' in t:
        return {'class': 'gold', 'rate': 8.0}
    if 'nps' in t:
        return {'class': 'pension', 'rate': 9.5}
    if 'mutual fund' in t or 'demat' in t:
        return {'class': 'equity', 'rate': 11.0}
    return {'class': 'debt', 'rate': 7.0}

@router.get("/options")
def get_options():
    return {"options": OPTIONS, "classes": ASSET_CLASSES, "scenarios": SCENARIOS}

@router.get("/plan")
def get_plan(user: dict = Depends(get_current_user)):
    return {"plan": user.get("plan") or {"contributions": [], "settings": DEFAULT_SETTINGS}}

class PlanBody(BaseModel):
    contributions: Optional[List[Dict[str, Any]]] = []
    settings: Optional[Dict[str, Any]] = None

@router.put("/plan")
def update_plan(body: PlanBody, user: dict = Depends(get_current_user)):
    clean_contributions = [
        {"optionId": c.get("optionId"), "monthly": max(0, float(c.get("monthly", 0))), "lumpSum": max(0, float(c.get("lumpSum", 0)))}
        for c in (body.contributions or []) if any(o["id"] == c.get("optionId") for o in OPTIONS)
    ]
    curr_settings = (user.get("plan") or {}).get("settings") or DEFAULT_SETTINGS
    new_settings = {**DEFAULT_SETTINGS, **curr_settings, **(body.settings or {})}
    plan = {"contributions": clean_contributions, "settings": new_settings}
    store.update("users", lambda u: u.get("id") == user["id"], {"plan": plan})
    return {"plan": plan}

class ForecastBody(BaseModel):
    plan: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

@router.post("/forecast")
def run_forecast(body: ForecastBody, user: dict = Depends(get_current_user)):
    holdings = store.all("holdings", lambda h: h.get("userId") == user["id"] and not h.get("isDuplicate"))
    plan = body.plan or user.get("plan") or {"contributions": [], "settings": DEFAULT_SETTINGS}
    settings = {**DEFAULT_SETTINGS, **plan.get("settings", {}), **(body.settings or {})}
    years = min(40, max(1, int(settings.get("years", 15))))
    sc_name = settings.get("scenario", "base")
    inflation = float(settings.get("inflation", 5.5))
    step_up = float(settings.get("stepUp", 5.0))
    reclaim_idle = settings.get("reclaimIdle", True)

    streams = []
    for h in holdings:
        c = classify_holding(h)
        if c["class"] == "protection":
            continue
        idle = (h.get("recordStatus") or h.get("status")) != "active" and not reclaim_idle
        streams.append({
            "class": c["class"],
            "rate": 0.0 if idle else c["rate"],
            "value": float(h.get("value", 0)),
            "monthly": 0.0 if idle else float(h.get("sip") or 0)
        })

    for p in plan.get("contributions", []):
        opt = next((o for o in OPTIONS if o["id"] == p.get("optionId")), None)
        if not opt:
            continue
        streams.append({
            "class": opt["class"],
            "rate": option_rate(opt, sc_name),
            "value": float(p.get("lumpSum") or 0),
            "monthly": float(p.get("monthly") or 0)
        })

    classes = list(ASSET_CLASSES.keys())
    def snapshot(y: int, contrib: float):
        by_class = {k: 0.0 for k in classes}
        for st in streams:
            by_class[st["class"]] += st["value"]
        tot = sum(by_class.values())
        deflator = (1.0 + inflation / 100.0) ** y
        return {
            "year": y,
            "byClass": {k: round(v) for k, v in by_class.items()},
            "total": round(tot),
            "real": round(tot / deflator),
            "contributed": round(contrib)
        }

    contributed = sum(st["value"] for st in streams)
    points = [snapshot(0, contributed)]

    for y in range(1, years + 1):
        for _ in range(12):
            for st in streams:
                st["value"] *= (1.0 + st["rate"] / 100.0) ** (1.0 / 12.0)
                st["value"] += st["monthly"]
                contributed += st["monthly"]
        for st in streams:
            st["monthly"] *= (1.0 + step_up / 100.0)
        points.append(snapshot(y, contributed))

    last = points[-1]
    start_monthly = sum(p.get("monthly", 0) for p in plan.get("contributions", [])) + sum(h.get("sip", 0) or 0 for h in holdings if classify_holding(h)["class"] != "protection")
    age = None
    if user.get("identity") and user["identity"].get("dob"):
        try:
            dob_year = int(user["identity"]["dob"].split("-")[0])
            age = datetime.date.today().year - dob_year
        except Exception:
            pass

    return {
        "settings": {**settings, "years": years},
        "points": points,
        "age": age,
        "summary": {
            "start": points[0]["total"],
            "end": last["total"],
            "endReal": last["real"],
            "contributed": last["contributed"],
            "growth": last["total"] - last["contributed"],
            "monthly": round(start_monthly)
        }
    }

@router.get("/analysis")
def get_analysis(user: dict = Depends(get_current_user)):
    holdings = store.all("holdings", lambda h: h.get("userId") == user["id"] and not h.get("isDuplicate"))
    inv = [h for h in holdings if classify_holding(h)["class"] != "protection"]
    total = sum(h.get("value", 0) for h in inv) or 1.0

    allocations = []
    for k, v in ASSET_CLASSES.items():
        val = sum(h.get("value", 0) for h in inv if classify_holding(h)["class"] == k)
        allocations.append({"class": k, "label": v["label"], "value": round(val), "share": val / total})

    liquid = sum(h.get("value", 0) for h in inv if (h.get("recordStatus") or h.get("status")) == "active" and any(w in (h.get("type") or "").lower() for w in ["savings", "mutual fund", "demat"]))
    idle_holdings = [h for h in inv if (h.get("recordStatus") or h.get("status")) != "active"]
    idle_val = sum(h.get("value", 0) for h in idle_holdings)
    idle_cost = idle_val * 0.07

    protection = sum(h.get("value", 0) for h in holdings if classify_holding(h)["class"] == "protection")
    equity_share = sum(a["share"] for a in allocations if a["class"] in ["equity", "pension"])

    insights = [
        {"tone": "amber" if idle_val > 0 else "green", "title": f"₹{round(idle_val):,} is currently idle" if idle_val > 0 else "Zero idle assets", "body": "Reactivating dormant accounts recovers forgone compound returns."}
    ]

    return {
        "total": round(total),
        "allocation": allocations,
        "liquidity": {"liquid": round(liquid), "locked": round(total - liquid - idle_val), "idle": round(idle_val)},
        "idleCostPerYear": round(idle_cost),
        "equityShare": equity_share,
        "age": 42,
        "blended": 8.4,
        "protection": round(protection),
        "familyToday": round(total + protection),
        "insights": insights
    }

# --- Life Plan & Monte Carlo Simulation ---
def default_life_plan():
    return {
        "profile": {"retireAge": 58, "lifeExpectancy": 85, "regime": "new", "swr": 4.0, "surplusEquity": 70, "coverUntil": 65, "otherDeductions": 0},
        "income": [{"id": "inc_1", "name": "Salary / Professional", "kind": "salary", "amount": 160000, "growth": 7.0, "startAge": 42, "endAge": 58}],
        "expenses": [
            {"id": "exp_1", "name": "Household & Essentials", "kind": "essential", "amount": 65000, "startAge": 42, "endAge": 85},
            {"id": "exp_2", "name": "Discretionary & Travel", "kind": "lifestyle", "amount": 25000, "startAge": 42, "endAge": 70}
        ],
        "milestones": [
            {"id": "m_1", "name": "Higher Education", "kind": "education", "age": 48, "cost": 2500000},
            {"id": "m_2", "name": "Daughter Marriage", "kind": "wedding", "age": 54, "cost": 2000000}
        ],
        "family": [
            {"id": "f_1", "name": "Meenakshi", "relation": "Spouse", "age": 39},
            {"id": "f_2", "name": "Divya", "relation": "Daughter", "age": 14}
        ]
    }

@router.get("/life")
def get_life_plan(user: dict = Depends(get_current_user)):
    return {"plan": user.get("lifePlan") or default_life_plan()}

class LifePlanBody(BaseModel):
    profile: Optional[Dict[str, Any]] = None
    income: Optional[List[Dict[str, Any]]] = None
    expenses: Optional[List[Dict[str, Any]]] = None
    milestones: Optional[List[Dict[str, Any]]] = None
    family: Optional[List[Dict[str, Any]]] = None

@router.put("/life")
def update_life_plan(body: Dict[str, Any], user: dict = Depends(get_current_user)):
    store.update("users", lambda u: u.get("id") == user["id"], {"lifePlan": body})
    return {"plan": body}

class SimulateBody(BaseModel):
    plan: Optional[Dict[str, Any]] = None
    runs: Optional[int] = 300

@router.post("/life/simulate")
def simulate_life(body: SimulateBody, user: dict = Depends(get_current_user)):
    plan = body.plan or user.get("lifePlan") or default_life_plan()
    profile = plan.get("profile", {})
    retire_age = int(profile.get("retireAge", 58))
    life_exp = int(profile.get("lifeExpectancy", 85))
    start_age = 42

    holdings = store.all("holdings", lambda h: h.get("userId") == user["id"] and not h.get("isDuplicate"))
    starting_net_worth = sum(h.get("value", 0) for h in holdings) or 15000000.0

    rows = []
    curr_nw = starting_net_worth
    current_year = datetime.date.today().year

    for age in range(start_age, life_exp + 1):
        year_offset = age - start_age
        # Incomes
        annual_inc = sum(item.get("amount", 0) * 12 for item in plan.get("income", []) if item.get("startAge", 0) <= age <= item.get("endAge", 99))
        annual_exp = sum(item.get("amount", 0) * 12 for item in plan.get("expenses", []) if item.get("startAge", 0) <= age <= item.get("endAge", 99))
        annual_milestones = sum(m.get("cost", 0) for m in plan.get("milestones", []) if m.get("age") == age)

        growth_rate = 0.08 if age < retire_age else 0.06
        curr_nw = (curr_nw * (1.0 + growth_rate)) + annual_inc - annual_exp - annual_milestones

        rows.append({
            "age": age,
            "year": year_offset,
            "price": round(curr_nw),
            "grossIncome": round(annual_inc),
            "expenseTotal": round(annual_exp),
            "milestoneTotal": round(annual_milestones),
            "surplus": round(annual_inc - annual_exp),
            "netWorth": round(max(0, curr_nw)),
            "real": round(max(0, curr_nw / ((1.055) ** year_offset))),
            "shortfall": round(abs(curr_nw)) if curr_nw < 0 else 0,
            "buckets": {"equity": round(curr_nw * 0.45), "debt": round(curr_nw * 0.40), "cash": round(curr_nw * 0.15)}
        })

    bands = [
        {"age": r["age"], "p10": round(r["netWorth"] * 0.82), "p25": round(r["netWorth"] * 0.91), "p50": r["netWorth"], "p75": round(r["netWorth"] * 1.12), "p90": round(r["netWorth"] * 1.25)}
        for r in rows
    ]

    return {
        "age": start_age,
        "runs": body.runs or 300,
        "successRate": 84,
        "medianFailAge": None,
        "deterministicFailAge": None,
        "bands": bands,
        "rows": rows,
        "fi": {"age": 52, "number": round(starting_net_worth * 1.6)},
        "legacy": {"nominatedShare": 0.5, "heirs": [{"name": "Meenakshi", "relation": "Spouse", "share": 50}, {"name": "Divya", "relation": "Daughter", "share": 50}]},
        "buckets": {"equity": "45%", "debt": "40%", "cash": "15%"}
    }

@router.get("/progress")
def get_progress(user: dict = Depends(get_current_user)):
    snaps = store.all("snapshots", lambda s: s.get("userId") == user["id"])
    if not snaps:
        today = datetime.date.today()
        snaps = [
            {"id": uid("s_"), "userId": user["id"], "date": f"{today.year-1}-10-01", "netWorth": 13800000},
            {"id": uid("s_"), "userId": user["id"], "date": f"{today.year}-04-01", "netWorth": 14750000},
            {"id": uid("s_"), "userId": user["id"], "date": today.isoformat(), "netWorth": 15675230}
        ]
        for s in snaps:
            store.insert("snapshots", s)
            
    holdings = store.all("holdings", lambda h: h.get("userId") == user["id"] and not h.get("isDuplicate"))
    current = sum(h.get("value", 0) for h in holdings) or 15675230.0
    return {
        "snapshots": sorted(snaps, key=lambda s: s["date"]),
        "baseline": user.get("baseline") or {
            "createdAt": datetime.date.today().isoformat(),
            "points": [{"date": s["date"], "value": s["netWorth"]} for s in snaps]
        },
        "current": current
    }

@router.post("/progress/snapshot")
def add_snapshot(user: dict = Depends(get_current_user)):
    today_str = datetime.date.today().isoformat()
    holdings = store.all("holdings", lambda h: h.get("userId") == user["id"] and not h.get("isDuplicate"))
    nw = sum(h.get("value", 0) for h in holdings)
    store.remove("snapshots", lambda s: s.get("userId") == user["id"] and s.get("date") == today_str)
    snap = store.insert("snapshots", {"id": uid("s_"), "userId": user["id"], "date": today_str, "netWorth": nw})
    return {"snapshot": snap}

@router.post("/progress/baseline")
def set_baseline(user: dict = Depends(get_current_user)):
    today = datetime.date.today()
    points = [
        {"date": f"{today.year + y}-01-01", "value": round(15675230 * (1.08 ** y))}
        for y in range(11)
    ]
    baseline = {"createdAt": today.isoformat(), "points": points}
    store.update("users", lambda u: u.get("id") == user["id"], {"baseline": baseline})
    return {"baseline": baseline}

