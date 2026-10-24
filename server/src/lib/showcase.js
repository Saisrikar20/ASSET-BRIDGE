// Numbers for the public home page, computed from the demo twin with the same
// engines the app uses (verification, alerts, succession, Monte Carlo) — not
// written by hand. Cached: the demo registry is deterministic.
import { REGULATORS, DEMO_IDENTITY, queryRegulator } from '../data/regulators.js';
import { buildTasks } from '../data/succession.js';
import { alertsFor, summarize, verifyIdentity } from './engine.js';
import { DEFAULT_SETTINGS } from './forecast.js';
import { defaultLifePlan, runLifePlan, bucketOf } from './lifesim.js';

let cached = null;

export function showcase() {
  if (cached) return cached;
  const holdings = Object.keys(REGULATORS).flatMap((code) => queryRegulator(code, DEMO_IDENTITY)).map((h, i) => ({ ...h, id: `demo${i}` }));
  const alerts = holdings.flatMap((h) => alertsFor(h, DEMO_IDENTITY).map((a) => ({ ...a, regulator: h.regulator })));
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const byKind = {};
  for (const a of alerts) {
    bySeverity[a.severity]++;
    byKind[a.kind] = (byKind[a.kind] || 0) + 1;
  }
  const investments = holdings.filter((h) => bucketOf(h));
  const nominated = investments.filter((h) => h.nominee?.status === 'valid');
  const heirs = [
    { name: 'Meenakshi Iyer', relation: 'Spouse', share: 50 },
    { name: 'Divya Iyer', relation: 'Daughter', share: 50 },
  ];
  const plan = defaultLifePlan(DEMO_IDENTITY, true);
  const life = runLifePlan({ plan, invPlan: { contributions: [] }, holdings, identity: DEMO_IDENTITY, heirs, settings: DEFAULT_SETTINGS, runs: 600 });
  const tasks = buildTasks(holdings, DEMO_IDENTITY.state);
  const verify = verifyIdentity(DEMO_IDENTITY);

  cached = {
    persona: { name: DEMO_IDENTITY.name, state: DEMO_IDENTITY.state, age: life.age },
    sources: Object.keys(REGULATORS).length,
    regulators: Object.entries(REGULATORS).map(([code, r]) => ({ code, covers: r.covers })),
    summary: summarize(holdings),
    holdings: holdings.length,
    verify: verify.map((v) => ({ regulator: v.regulator, status: v.status, records: v.recordsFound })),
    alerts: { total: alerts.length, bySeverity, byKind, examples: alerts.filter((a) => a.severity === 'high').slice(0, 4).map((a) => ({ title: a.title, regulator: a.regulator })) },
    nominees: { coverage: nominated.reduce((s, h) => s + h.value, 0) / Math.max(1, investments.reduce((s, h) => s + h.value, 0)), missing: investments.filter((h) => !h.nominee).length },
    idle: investments.filter((h) => h.status !== 'active').reduce((s, h) => s + h.value, 0),
    transfer: { steps: tasks.length, forms: [...new Set(tasks.flatMap((t) => t.docs))].length, state: DEMO_IDENTITY.state },
    life: {
      successRate: life.successRate,
      runs: life.runs,
      retireAge: plan.profile.retireAge,
      retireMedian: life.bands.find((b) => b.age === plan.profile.retireAge)?.p50 ?? 0,
      fiAge: life.fi?.age ?? null,
      legacyToday: life.rows[0].legacy,
      milestones: plan.milestones.length,
    },
  };
  return cached;
}
