// Wealth forecast and portfolio analysis over a user's mapped holdings plus
// the contributions in their saved plan. Projections, not advice.
import { ASSET_CLASSES, OPTIONS, SCENARIOS, optionRate } from '../data/options.js';

const PROTECTION = /insurance|cover|policy/i;

/** Asset class + base-case return for an existing holding. Insurance → protection. */
export function classify(h) {
  const t = h.type;
  if (/matured/i.test(t) && !/certificate/i.test(t)) return { class: 'cash', rate: null }; // payout owed, not cover
  if (PROTECTION.test(t)) return { class: 'protection', rate: 0 };
  if (/savings account/i.test(t)) return { class: 'cash', rate: null };
  if (/fixed deposit/i.test(t)) return { class: 'debt', rate: 6.6 };
  if (/EPF/i.test(t)) return { class: 'debt', rate: 8.25 };
  if (/provident fund/i.test(t)) return { class: 'debt', rate: 7.1 };
  if (/savings certificate|NSC/i.test(t)) return { class: 'debt', rate: 7.7 };
  if (/gold/i.test(t)) return { class: 'gold', rate: null };
  if (/NPS/i.test(t)) return { class: 'pension', rate: null };
  if (/mutual fund|demat/i.test(t)) return { class: 'equity', rate: null };
  return { class: 'debt', rate: 6.5 };
}

function holdingRate(h, scenario) {
  const c = classify(h);
  const sc = SCENARIOS[scenario] || SCENARIOS.base;
  if (c.rate == null) return sc[c.class];
  return c.rate + sc.debtDelta;
}

const isIdle = (h) => h.status !== 'active';

export const DEFAULT_SETTINGS = { years: 15, inflation: 5.5, scenario: 'base', stepUp: 5, reclaimIdle: true };

/**
 * Month-by-month projection. Each stream = { class, rate, value, monthly }.
 * Idle (inoperative/unclaimed) money earns nothing unless reclaimed.
 */
export function forecast(holdings, plan, settingsIn = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settingsIn };
  const years = Math.min(40, Math.max(1, Number(s.years) || 15));
  const streams = [];

  for (const h of holdings) {
    const c = classify(h);
    if (c.class === 'protection') continue;
    const idle = isIdle(h) && !s.reclaimIdle;
    streams.push({ class: c.class, rate: idle ? 0 : holdingRate(h, s.scenario), value: h.value, monthly: idle ? 0 : h.sip || 0 });
  }
  for (const p of plan.contributions || []) {
    const opt = OPTIONS.find((o) => o.id === p.optionId);
    if (!opt) continue;
    streams.push({ class: opt.class, rate: optionRate(opt, s.scenario), value: Number(p.lumpSum) || 0, monthly: Number(p.monthly) || 0, cap: opt.maxMonthly });
  }

  const classes = Object.keys(ASSET_CLASSES);
  const snapshot = (year, contributed) => {
    const byClass = Object.fromEntries(classes.map((k) => [k, 0]));
    for (const st of streams) byClass[st.class] += st.value;
    const total = classes.reduce((t, k) => t + byClass[k], 0);
    const deflator = Math.pow(1 + s.inflation / 100, year);
    return { year, byClass: roundAll(byClass), total: Math.round(total), real: Math.round(total / deflator), contributed: Math.round(contributed) };
  };

  let contributed = streams.reduce((t, st) => t + st.value, 0);
  const points = [snapshot(0, contributed)];
  for (let y = 1; y <= years; y++) {
    const growth = 1 + s.stepUp / 100;
    for (let m = 0; m < 12; m++) {
      for (const st of streams) {
        st.value *= Math.pow(1 + st.rate / 100, 1 / 12);
        const add = st.cap ? Math.min(st.monthly, st.cap) : st.monthly;
        st.value += add;
        contributed += add;
      }
    }
    for (const st of streams) st.monthly *= growth; // annual SIP step-up
    points.push(snapshot(y, contributed));
  }

  const last = points.at(-1);
  const startMonthly = (plan.contributions || []).reduce((t, p) => t + (Number(p.monthly) || 0), 0) + holdings.filter((h) => !PROTECTION.test(h.type) && (s.reclaimIdle || !isIdle(h))).reduce((t, h) => t + (h.sip || 0), 0);
  return {
    settings: { ...s, years },
    points,
    summary: {
      start: points[0].total,
      end: last.total,
      endReal: last.real,
      contributed: last.contributed,
      growth: last.total - last.contributed,
      monthly: Math.round(startMonthly),
    },
  };
}

/** Allocation, liquidity, idle-money cost and protection for the current twin. */
export function analyze(holdings, identity, settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const inv = holdings.filter((h) => classify(h).class !== 'protection');
  const total = inv.reduce((t, h) => t + h.value, 0) || 1;

  const allocation = Object.entries(ASSET_CLASSES).map(([k, v]) => {
    const value = inv.filter((h) => classify(h).class === k).reduce((t, h) => t + h.value, 0);
    return { class: k, label: v.label, value, share: value / total };
  });

  const liquidOf = (h) => /savings account|mutual fund|demat/i.test(h.type);
  const liquid = inv.filter((h) => h.status === 'active' && liquidOf(h)).reduce((t, h) => t + h.value, 0);
  const idle = inv.filter(isIdle);
  const idleValue = idle.reduce((t, h) => t + h.value, 0);
  // What idle money would have earned in a year at its normal rate.
  const idleCostPerYear = idle.reduce((t, h) => t + (h.value * holdingRate(h, s.scenario)) / 100, 0);

  const age = identity?.dob ? Math.floor((Date.now() - new Date(identity.dob)) / (365.25 * 864e5)) : null;
  const equityShare = allocation.filter((a) => a.class === 'equity' || a.class === 'pension').reduce((t, a) => t + a.share * (a.class === 'pension' ? 0.5 : 1), 0);
  const protection = holdings.filter((h) => classify(h).class === 'protection').reduce((t, h) => t + h.value, 0);

  // Blended expected return across the portfolio (base scenario).
  const blended = inv.reduce((t, h) => t + h.value * (isIdle(h) ? 0 : holdingRate(h, s.scenario)), 0) / total;

  const insights = [];
  const top = [...allocation].sort((a, b) => b.share - a.share)[0];
  if (top.share > 0.6) insights.push({ tone: 'amber', title: `${Math.round(top.share * 100)}% sits in ${top.label.toLowerCase()}`, body: 'A single asset class this large means one kind of risk drives the whole portfolio.' });
  if (idleValue > 0) insights.push({ tone: 'red', title: `₹${Math.round(idleValue).toLocaleString('en-IN')} is idle`, body: `Inoperative and unclaimed holdings earn little or nothing — roughly ₹${Math.round(idleCostPerYear).toLocaleString('en-IN')} a year in forgone returns. Reactivating them is the cheapest win available.` });
  if (age != null) {
    const ref = Math.max(0, 100 - age) / 100;
    insights.push({ tone: 'slate', title: `Equity exposure ${Math.round(equityShare * 100)}%`, body: `A common rule of thumb ("100 minus age") suggests about ${Math.round(ref * 100)}% for age ${age}. It's a reference point, not a recommendation — your goals and other income matter more.` });
  }
  const goldShare = allocation.find((a) => a.class === 'gold').share;
  if (goldShare === 0) insights.push({ tone: 'slate', title: 'No gold in the portfolio', body: 'Many Indian households hold 5–10% in gold as a diversifier; gold ETFs and SGBs avoid making-charges and storage risk.' });
  if (blended < s.inflation) insights.push({ tone: 'red', title: `Blended return ${blended.toFixed(1)}% is below inflation`, body: `At ${s.inflation}% inflation, the portfolio is losing purchasing power on average.` });
  else insights.push({ tone: 'green', title: `Blended return ≈ ${blended.toFixed(1)}% a year`, body: `About ${(blended - s.inflation).toFixed(1)} points above the ${s.inflation}% inflation assumption.` });

  return {
    total: Math.round(total),
    allocation,
    liquidity: { liquid: Math.round(liquid), locked: Math.round(total - liquid - idleValue), idle: Math.round(idleValue) },
    idleCostPerYear: Math.round(idleCostPerYear),
    equityShare,
    age,
    blended,
    protection,
    familyToday: Math.round(total + protection),
    insights,
  };
}

const roundAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));
