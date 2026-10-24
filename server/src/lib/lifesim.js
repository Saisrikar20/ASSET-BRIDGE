// Life-plan simulator: yearly cash flow (income → tax → expenses →
// milestones → contributions), surplus investing / drawdown across asset
// buckets, Monte Carlo over market returns and inflation, and legacy.
import { OPTIONS, SCENARIOS } from '../data/options.js';
import { classify } from './forecast.js';
import { incomeTax } from './tax.js';

export const BUCKETS = {
  cash: { label: 'Cash', sd: 0.5, liquid: true },
  debt: { label: 'Debt (liquid)', sd: 2.5, liquid: true },
  gold: { label: 'Gold', sd: 14, liquid: true },
  equity: { label: 'Equity', sd: 17, liquid: true },
  locked: { label: 'EPF / PPF / small savings', sd: 0.5, liquid: false },
  pension: { label: 'NPS', sd: 10, liquid: false, unlockAge: 60 },
};
const ORDER = ['cash', 'debt', 'gold', 'equity', 'locked', 'pension']; // drawdown order

const LOCKED = /EPF|provident|savings certificate|NSC/i;
const OPTION_BUCKET = { ppf: 'locked', vpf: 'locked', ssy: 'locked', nsc: 'locked', kvp: 'locked', scss: 'locked', pomis: 'locked', frsb: 'locked', nps: 'pension' };

export function bucketOf(h) {
  const c = classify(h).class;
  if (c === 'protection') return null;
  if (c === 'pension') return 'pension';
  if (c === 'debt' && LOCKED.test(h.type)) return 'locked';
  return c;
}
const optionBucket = (o) => OPTION_BUCKET[o.id] || (o.class === 'pension' ? 'pension' : o.class);

export const ageOf = (dob) => (dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 864e5)) : 35);

// ---------- default plans ----------
let n = 0;
const id = () => `l${Date.now().toString(36)}${(n++).toString(36)}`;

export function defaultLifePlan(identity, isDemo) {
  const age = ageOf(identity?.dob);
  const profile = { retireAge: 60, lifeExpectancy: 85, regime: 'new', swr: 3.5, surplusEquity: 60, coverUntil: 70, otherDeductions: 0 };
  if (isDemo) {
    return {
      profile: { ...profile, retireAge: 57 },
      income: [
        { id: id(), name: 'Salary (CTC)', kind: 'salary', amount: 2400000, growth: 7, startAge: age, endAge: 57 },
        { id: id(), name: 'Rent from Adyar flat', kind: 'rental', amount: 240000, growth: 5, startAge: age, endAge: 85 },
      ],
      expenses: [
        { id: id(), name: 'Household essentials', kind: 'essential', amount: 780000, startAge: age, endAge: 85 },
        { id: id(), name: 'Lifestyle & travel', kind: 'lifestyle', amount: 350000, startAge: age, endAge: 75 },
        { id: id(), name: 'Health insurance & medical', kind: 'essential', amount: 60000, startAge: age, endAge: 85, growthExtra: 4 },
      ],
      milestones: [
        { id: id(), name: "Arjun's engineering college", kind: 'education', age: age + 4, cost: 2500000 },
        { id: id(), name: "Arjun's master's abroad", kind: 'education', age: age + 8, cost: 3500000 },
        { id: id(), name: "Divya's wedding", kind: 'wedding', age: age + 10, cost: 2000000 },
        { id: id(), name: 'New car', kind: 'car', age: age + 3, cost: 1200000, every: 8, until: 72 },
        { id: id(), name: 'Home renovation', kind: 'home', age: 55, cost: 1500000 },
      ],
    };
  }
  return {
    profile,
    income: [{ id: id(), name: 'Salary (CTC)', kind: 'salary', amount: 1200000, growth: 6, startAge: age, endAge: 60 }],
    expenses: [{ id: id(), name: 'Household', kind: 'essential', amount: 600000, startAge: age, endAge: 85 }],
    milestones: [],
  };
}

// ---------- randomness (seeded so results don't jitter between renders) ----------
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// ---------- one simulated life ----------
function startState(holdings, invPlan, reclaimIdle) {
  const b = Object.fromEntries(ORDER.map((k) => [k, 0]));
  const sips = []; // { bucket, monthly }
  let lockedRateNum = 0;
  let lockedValue = 0;
  for (const h of holdings) {
    const k = bucketOf(h);
    if (!k) continue;
    if (h.status !== 'active' && !reclaimIdle) continue;
    b[k] += h.value;
    if (k === 'locked') {
      lockedRateNum += h.value * (classify(h).rate || 7.5);
      lockedValue += h.value;
    }
    if (h.sip) sips.push({ bucket: k, monthly: h.sip });
  }
  for (const c of invPlan?.contributions || []) {
    const o = OPTIONS.find((x) => x.id === c.optionId);
    if (!o) continue;
    const k = optionBucket(o);
    b[k] += c.lumpSum || 0;
    if (c.monthly) sips.push({ bucket: k, monthly: Math.min(c.monthly, o.maxMonthly || Infinity) });
  }
  const lockedRate = lockedValue ? lockedRateNum / lockedValue : 7.8;
  return { b, sips, lockedRate: Math.min(9, Math.max(6.5, lockedRate)) };
}

function means(scenario, lockedRate) {
  const s = SCENARIOS[scenario] || SCENARIOS.base;
  return { cash: s.cash, debt: 7 + s.debtDelta, gold: s.gold, equity: s.equity, locked: lockedRate + s.debtDelta, pension: s.pension };
}

/**
 * Simulate year by year from current age to life expectancy.
 * rand = null → deterministic (mean returns, mean inflation) with full detail rows.
 */
function simulate(ctx, rand) {
  const { plan, settings, age0, protection, startB, sips0, mu } = ctx;
  const p = plan.profile;
  const b = { ...startB };
  const sips = sips0.map((s) => ({ ...s }));
  const rows = [];
  let price = 1; // cumulative inflation index
  let failedAt = null;
  const years = Math.max(1, p.lifeExpectancy - age0);

  for (let t = 0; t <= years; t++) {
    const age = age0 + t;
    const infl = rand ? Math.max(-1, settings.inflation + normal(rand) * 1.2) : settings.inflation;
    const active = (x) => age >= (x.startAge ?? age0) && age <= (x.endAge ?? p.lifeExpectancy);

    // Income (each stream compounds at its own growth from today)
    const inc = { salary: 0, pension: 0, rental: 0, other: 0 };
    const incomeItems = [];
    for (const x of plan.income) {
      if (!active(x)) continue;
      const v = x.amount * Math.pow(1 + (x.growth ?? settings.inflation) / 100, t);
      inc[x.kind in inc ? x.kind : 'other'] += v;
      incomeItems.push({ name: x.name, value: v });
    }
    const grossIncome = incomeItems.reduce((s, x) => s + x.value, 0);

    // Contributions (SIPs, EPF, PPF…) only while working
    const working = age < p.retireAge;
    const contrib = {};
    if (working) for (const s of sips) contrib[s.bucket] = (contrib[s.bucket] || 0) + s.monthly * 12;
    const contribTotal = Object.values(contrib).reduce((s, v) => s + v, 0);

    const taxOpts = { age, k: price, d80c: Math.min(contrib.locked || 0, 150000 * price), d80ccd1b: Math.min(contrib.pension || 0, 50000 * price), otherDeductions: (p.otherDeductions || 0) * price };
    const taxRes = incomeTax(inc, { ...taxOpts, regime: p.regime });
    const taxAlt = rand ? null : incomeTax(inc, { ...taxOpts, regime: p.regime === 'new' ? 'old' : 'new' });

    const expenseItems = plan.expenses.filter(active).map((x) => ({ name: x.name, kind: x.kind, value: x.amount * price * Math.pow(1 + (x.growthExtra || 0) / 100, t) }));
    const expenses = expenseItems.reduce((s, x) => s + x.value, 0);

    const msItems = [];
    for (const m of plan.milestones) {
      const hit = m.every ? age >= m.age && age <= (m.until ?? p.lifeExpectancy) && (age - m.age) % m.every === 0 : age === m.age;
      if (hit) msItems.push({ name: m.name, kind: m.kind, value: m.cost * price });
    }
    const milestones = msItems.reduce((s, x) => s + x.value, 0);

    // Put contributions into their buckets, then settle the remaining surplus / deficit.
    for (const [k, v] of Object.entries(contrib)) b[k] += v;
    let net = grossIncome - taxRes.tax - expenses - milestones - contribTotal;
    let withdrawals = 0;
    let shortfall = 0;
    const drawn = {};
    if (net >= 0) {
      const eq = (p.surplusEquity ?? 60) / 100;
      b.equity += net * eq;
      b.debt += net * (1 - eq);
    } else {
      let need = -net;
      for (const k of ORDER) {
        if (need <= 0) break;
        const unlock = BUCKETS[k].liquid || age >= (BUCKETS[k].unlockAge ?? p.retireAge);
        if (!unlock) continue;
        const take = Math.min(b[k], need);
        b[k] -= take;
        need -= take;
        if (take > 0) drawn[k] = take;
        withdrawals += take;
      }
      if (need > 1) {
        shortfall = need;
        if (failedAt == null) failedAt = age;
      }
    }

    const netWorth = ORDER.reduce((s, k) => s + b[k], 0);
    const cover = age < (p.coverUntil ?? 70) ? protection : 0;
    if (rand) rows.push(netWorth);
    else {
      rows.push({
        age, year: t, price,
        income: incomeItems.map(r), grossIncome: r(grossIncome),
        tax: taxRes.tax, taxable: taxRes.taxable, deductions: taxRes.deductions, effectiveRate: taxRes.effectiveRate, taxAlt: taxAlt.tax,
        expenses: expenseItems.map(r), expenseTotal: r(expenses),
        milestones: msItems.map(r), milestoneTotal: r(milestones),
        contributions: Object.entries(contrib).map(([k, v]) => ({ name: BUCKETS[k].label, value: Math.round(v) })), contribTotal: r(contribTotal),
        surplus: r(Math.max(0, net)), withdrawals: r(withdrawals), drawn: Object.fromEntries(Object.entries(drawn).map(([k, v]) => [k, Math.round(v)])), shortfall: r(shortfall),
        buckets: Object.fromEntries(ORDER.map((k) => [k, Math.round(b[k])])),
        netWorth: r(netWorth), real: r(netWorth / price), legacy: r(netWorth + cover), cover: r(cover),
      });
    }

    // Grow for the year
    for (const k of ORDER) {
      const ret = rand ? mu[k] + normal(rand) * BUCKETS[k].sd : mu[k];
      b[k] = Math.max(0, b[k] * (1 + ret / 100));
    }
    for (const s of sips) s.monthly *= 1 + settings.stepUp / 100;
    price *= 1 + infl / 100;
  }
  return { rows, failedAt };
}

const r = (x) => (typeof x === 'number' ? Math.round(x) : { ...x, value: Math.round(x.value) });

function percentile(sorted, q) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo);
}

export function runLifePlan({ plan, invPlan, holdings, identity, heirs, settings, runs = 1000, seed = 7 }) {
  const age0 = ageOf(identity?.dob);
  const protection = holdings.filter((h) => !bucketOf(h) && h.status === 'active').reduce((s, h) => s + h.value, 0);
  const { b: startB, sips: sips0, lockedRate } = startState(holdings, invPlan, settings.reclaimIdle);
  const ctx = { plan, settings, age0, protection, startB, sips0, mu: means(settings.scenario, lockedRate) };

  const det = simulate(ctx, null);
  const rand = mulberry32(seed);
  const paths = [];
  let ok = 0;
  const failAges = [];
  for (let i = 0; i < runs; i++) {
    const sim = simulate(ctx, rand);
    paths.push(sim.rows);
    if (sim.failedAt == null) ok++;
    else failAges.push(sim.failedAt);
  }
  const bands = det.rows.map((row, t) => {
    const col = paths.map((p) => p[t]).sort((a, b) => a - b);
    return { age: row.age, p10: Math.round(percentile(col, 0.1)), p25: Math.round(percentile(col, 0.25)), p50: Math.round(percentile(col, 0.5)), p75: Math.round(percentile(col, 0.75)), p90: Math.round(percentile(col, 0.9)) };
  });

  // Financial independence: first age where accessible assets cover expenses at the safe withdrawal rate.
  const swr = (plan.profile.swr || 3.5) / 100;
  const fiRow = det.rows.find((row) => {
    const access = ORDER.reduce((s, k) => s + (BUCKETS[k].liquid || row.age >= (BUCKETS[k].unlockAge ?? plan.profile.retireAge) ? row.buckets[k] : 0), 0);
    return row.expenseTotal > 0 && access * swr >= row.expenseTotal;
  });

  // Legacy split: how much of today's estate already has a valid nominee, and each heir's intended share.
  const inv = holdings.filter((h) => bucketOf(h));
  const invTotal = inv.reduce((s, h) => s + h.value, 0) || 1;
  const nominatedShare = inv.filter((h) => h.nominee?.status === 'valid').reduce((s, h) => s + h.value, 0) / invTotal;
  const shareSum = heirs.reduce((s, h) => s + (h.share || 0), 0);

  failAges.sort((a, b) => a - b);
  return {
    age: age0,
    runs,
    successRate: ok / runs,
    medianFailAge: failAges.length ? failAges[Math.floor(failAges.length / 2)] : null,
    bands,
    rows: det.rows,
    deterministicFailAge: det.failedAt,
    fi: fiRow ? { age: fiRow.age, number: Math.round(fiRow.expenseTotal / swr) } : null,
    legacy: {
      nominatedShare,
      heirs: heirs.map((h) => ({ name: h.name, relation: h.relation, share: shareSum ? (h.share || 0) / shareSum : 1 / heirs.length })),
    },
    buckets: Object.fromEntries(Object.entries(BUCKETS).map(([k, v]) => [k, v.label])),
  };
}
