import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Compass, Flag, HeartHandshake, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { api, type ExpenseItem, type FamilyMember, type IncomeItem, type LifePlan as Plan, type LifeResult, type Milestone, type Progress } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr, inrShort } from '../lib/format';
import { Badge, Button, Card, GlowCard, Input, PageHeader, Select, cx } from '../components/ui';
import { FanChart, LegacyChart, ProgressChart, Sankey, progressGap } from '../components/LifeCharts';
import DetentDial from '../components/kokonutui/detent-dial';
import LifeTimeline from '../components/LifeTimeline';

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'plan', label: 'Plan' },
  { id: 'chance', label: 'Chance of success' },
  { id: 'cash', label: 'Cash flow & tax' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'progress', label: 'Progress' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const MILESTONE_KINDS = [['education', 'Education'], ['wedding', 'Wedding'], ['home', 'Home'], ['car', 'Vehicle'], ['travel', 'Travel'], ['health', 'Health'], ['custom', 'Other']];
const uid = () => Math.random().toString(36).slice(2, 10);
const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];

/** The plan with a new retirement age; salaries that ended at retirement move with it. */
const withRetire = (p: Plan, age: number): Plan => ({
  ...p,
  profile: { ...p.profile, retireAge: age },
  income: p.income.map((i) => (i.kind === 'salary' && i.endAge === p.profile.retireAge ? { ...i, endAge: age } : i)),
});

export default function LifePlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [res, setRes] = useState<LifeResult | null>(null);
  const [tab, setTab] = useState<Tab>('timeline');
  const [span, setSpan] = useState(1);
  const [best, setBest] = useState<{ age: number; rate: number } | null | 'searching' | undefined>(undefined);
  const [age, setAge] = useState<number | null>(null);
  const [real, setReal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [levers, setLevers] = useState<{ label: string; rate: number }[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const leverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const simulate = useCallback(async (p: Plan) => {
    setBusy(true);
    try {
      const r = await api<LifeResult>('/life/simulate', { body: { plan: p } });
      setRes(r);
      setAge((a) => a ?? r.age);
    } finally {
      setBusy(false);
    }
  }, []);

  const runLevers = useCallback((p: Plan) => {
    clearTimeout(leverTimer.current);
    leverTimer.current = setTimeout(async () => {
      const variants: [string, Plan][] = [
        [`Retire at ${p.profile.retireAge + 2} instead of ${p.profile.retireAge}`, withRetire(p, p.profile.retireAge + 2)],
        ['Spend 10% less on lifestyle', { ...p, expenses: p.expenses.map((e) => (e.kind === 'lifestyle' ? { ...e, amount: e.amount * 0.9 } : e)) }],
        ['Invest surplus 80% in equity', { ...p, profile: { ...p.profile, surplusEquity: 80 } }],
      ];
      const out = await Promise.all(variants.map(([label, v]) => api<LifeResult>('/life/simulate', { body: { plan: v, runs: 500 } }).then((r) => ({ label, rate: r.successRate }))));
      setLevers(out);
    }, 600);
  }, []);

  useEffect(() => {
    api<{ plan: Plan }>('/life').then((r) => { setPlan(r.plan); simulate(r.plan); runLevers(r.plan); });
  }, [simulate, runLevers]);

  const update = (p: Plan) => {
    setPlan(p);
    setBest(undefined);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api('/life', { method: 'PUT', body: p });
      simulate(p);
      runLevers(p);
    }, 350);
  };

  if (!user?.identity) {
    return (
      <>
        <PageHeader title="Life plan" />
        <Card className="p-8 text-center text-sm text-slate-600">Verify your identity first — the plan needs your age. <Link className="font-semibold text-brand-700" to="/app/verify">Go to Verify</Link></Card>
      </>
    );
  }
  if (!plan || !res) return <PageHeader title="Life plan" subtitle="Running 1,000 simulations…" />;

  const row = res.rows.find((r) => r.age === age) || res.rows[0];

  // Earliest retirement age whose plan reaches an 85% chance of success.
  const findBest = async () => {
    setBest('searching');
    const P = plan.profile;
    const ages: number[] = [];
    for (let a = Math.max(res.age + 1, P.retireAge - 6); a <= Math.min(P.lifeExpectancy - 5, P.retireAge + 10); a++) ages.push(a);
    const rates = await Promise.all(ages.map((a) => api<LifeResult>('/life/simulate', { body: { plan: withRetire(plan, a), runs: 400 } }).then((r) => r.successRate)));
    const i = rates.findIndex((r) => r >= 0.85);
    setBest(i >= 0 ? { age: ages[i], rate: rates[i] } : null);
  };
  const people = [
    { name: user.avatar?.displayName || user.identity.name, relation: 'You', age: res.age, you: true, retireAge: plan.profile.retireAge },
    ...plan.family.map((f) => ({ ...f, retireAge: 60 })),
  ];
  const pct = Math.round(res.successRate * 100);
  const tone = pct >= 85 ? 'text-emerald-600' : pct >= 65 ? 'text-amber-600' : 'text-rose-600';

  return (
    <>
      <PageHeader
        title="Life plan"
        subtitle="Model the life you want — income, spending and milestones — on top of everything Asset Bridge has mapped. 1,000 market scenarios show how likely the plan is to hold."
        action={<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="accent-brand-700" checked={real} onChange={(e) => setReal(e.target.checked)} />Today's rupees</label>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlowCard>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Target className="h-4 w-4" />Chance of success</div>
          <DetentDial className="mx-auto my-1" readOnly label={pct >= 85 ? 'On track' : pct >= 65 ? 'Borderline' : 'At risk'} min={0} max={100} step={2} size={150} value={pct} formatValue={(v) => `${v}%`} />
          <div className={cx('text-center text-xs', tone)}>{res.medianFailAge ? `failing paths run short around age ${res.medianFailAge}` : `money lasts to ${plan.profile.lifeExpectancy} in every path`}</div>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
            <Fact k="Paths that last" v={`${Math.round(res.successRate * res.runs).toLocaleString('en-IN')} of ${res.runs.toLocaleString('en-IN')}`} />
            <Fact k={`Median left at ${plan.profile.lifeExpectancy}`} v={inrShort(res.bands.at(-1)!.p50 / (real ? res.rows.at(-1)!.price : 1))} />
            <Fact k={`Poor markets at ${plan.profile.lifeExpectancy}`} v={inrShort(res.bands.at(-1)!.p10 / (real ? res.rows.at(-1)!.price : 1))} />
          </div>
        </GlowCard>
        <RetirementCard res={res} plan={plan} real={real} />
        <FiCard res={res} plan={plan} />
        <FamilyCard res={res} />
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cx('cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition', tab === t.id ? 'bg-ink text-surface' : 'text-slate-600 hover:bg-slate-100')}>{t.label}</button>
        ))}
        {busy && <span className="ml-auto self-center pr-3 text-xs text-slate-400">simulating…</span>}
      </div>

      {tab === 'timeline' && (
        <LifeTimeline
          age0={res.age}
          lifeExpectancy={plan.profile.lifeExpectancy}
          people={people}
          milestones={plan.milestones}
          rows={res.rows}
          real={real}
          start={row.age}
          span={span}
          onChange={(a, sp) => { setAge(a); setSpan(sp); }}
          onFindBest={findBest}
          best={best}
          onApplyBest={() => { if (best && best !== 'searching') { update(withRetire(plan, best.age)); setAge(best.age); } }}
          onOpenYear={(a) => { setAge(a); setTab('cash'); }}
        />
      )}

      {tab === 'plan' && <PlanEditor plan={plan} age0={res.age} onChange={update} />}

      {tab === 'chance' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-ink">Net worth across {res.runs.toLocaleString('en-IN')} market scenarios</h2>
            <FanChart result={res} milestones={plan.milestones} retireAge={plan.profile.retireAge} real={real} onPick={(a) => { setAge(a); setTab('cash'); }} />
            <p className="mt-3 text-xs text-slate-400">Each scenario draws random yearly returns (equity σ 17%, NPS 10%, gold 14%, debt 2.5%) and inflation (σ 1.2 pts around your assumption). A plan “succeeds” when spending is covered every year to age {plan.profile.lifeExpectancy}.</p>
          </Card>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="p-5">
              <h2 className="mb-3 font-semibold text-ink">Levers to pull</h2>
              {!levers ? <p className="text-sm text-slate-500">Testing alternatives…</p> : (
                <ul className="space-y-2.5">
                  {levers.map((l) => {
                    const d = Math.round((l.rate - res.successRate) * 100);
                    return (
                      <li key={l.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                        <span className="text-slate-700">{l.label}</span>
                        <span className="whitespace-nowrap font-semibold text-ink">{Math.round(l.rate * 100)}% <span className={d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-slate-400'}>({d >= 0 ? '+' : ''}{d})</span></span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-400">Edit the plan tab to apply any of these.</p>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 font-semibold text-ink">Year by year <span className="text-xs font-normal text-slate-400">(expected path · click a row for its cash flow)</span></div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-2">Age</th><th className="px-3 py-2 text-right">Income</th><th className="px-3 py-2 text-right">Tax</th><th className="px-3 py-2 text-right">Spending</th><th className="px-3 py-2 text-right">Invested</th><th className="px-3 py-2 text-right">Withdrawn</th><th className="px-3 py-2 text-right">Net worth</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {res.rows.map((r) => {
                      const k = real ? r.price : 1;
                      return (
                        <tr key={r.age} onClick={() => { setAge(r.age); setTab('cash'); }} className={cx('cursor-pointer hover:bg-brand-50', r.shortfall > 0 && 'bg-rose-50')}>
                          <td className="px-3 py-1.5 font-medium text-ink">{r.age}{r.milestones.length > 0 && <span className="ml-1 text-amber-500" title={r.milestones.map((m) => m.name).join(', ')}>◆</span>}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{inrShort(r.grossIncome / k)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{inrShort(r.tax / k)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{inrShort((r.expenseTotal + r.milestoneTotal) / k)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{inrShort((r.contribTotal + r.surplus) / k)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{r.withdrawals ? inrShort(r.withdrawals / k) : '—'}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-ink">{inrShort(r.netWorth / k)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'cash' && row && (
        <div className="space-y-6">
          <AgeSlider rows={res.rows.map((r) => r.age)} age={row.age} onChange={setAge} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-ink">Where the money goes at age {row.age} <span className="text-xs font-normal text-slate-400">({new Date().getFullYear() + row.year}, nominal ₹)</span></h2>
              <Sankey row={row} />
            </Card>
            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="mb-3 font-semibold text-ink">Income tax · {plan.profile.regime} regime</h2>
                <dl className="space-y-1.5 text-sm">
                  {[['Gross income', row.grossIncome], ['Deductions', row.deductions], ['Taxable income', row.taxable], ['Tax incl. cess', row.tax]].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-ink">{inr(v as number)}</dd></div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Effective rate</dt><dd className="font-semibold text-ink">{(row.effectiveRate * 100).toFixed(1)}%</dd></div>
                </dl>
                {row.grossIncome > 0 && (
                  <div className={cx('mt-3 rounded-lg p-3 text-sm', row.taxAlt < row.tax ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
                    {row.taxAlt < row.tax
                      ? <>The {plan.profile.regime === 'new' ? 'old' : 'new'} regime would cost {inr(row.tax - row.taxAlt)} less this year. <button className="cursor-pointer font-semibold underline" onClick={() => update({ ...plan, profile: { ...plan.profile, regime: plan.profile.regime === 'new' ? 'old' : 'new' } })}>Switch</button></>
                      : <>The {plan.profile.regime} regime is cheaper here by {inr(row.taxAlt - row.tax)}.</>}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">FY 2025-26 slabs, indexed to inflation in later years. Old regime counts 80C (EPF/PPF, ₹1.5 L) and 80CCD(1B) NPS (₹50k). Capital-gains tax on investments isn't modelled.</p>
              </Card>
              <Card className="p-5 text-sm">
                <h2 className="mb-2 font-semibold text-ink">This year</h2>
                {row.surplus > 0 && <p className="text-slate-600">{inr(row.surplus)} left over is invested ({plan.profile.surplusEquity}% equity).</p>}
                {row.withdrawals > 0 && <p className="text-slate-600">{inr(row.withdrawals)} is drawn from: {Object.entries(row.drawn).map(([k, v]) => `${res.buckets[k]} ${inrShort(v)}`).join(', ')}.</p>}
                {row.shortfall > 0 && <p className="mt-1 font-semibold text-rose-600">Shortfall of {inr(row.shortfall)} — accessible assets run out.</p>}
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === 'legacy' && row && <LegacyTab res={res} row={row} real={real} onPick={setAge} />}

      {tab === 'progress' && <ProgressTab />}
    </>
  );
}

function Stat({ icon, label, value, sub, children }: { icon: React.ReactNode; label: string; value: string; sub: string; children?: React.ReactNode }) {
  return (
    <GlowCard className="flex flex-col">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
      {children && <div className="mt-4 flex flex-1 flex-col gap-3 border-t border-slate-100 pt-4 text-xs">{children}</div>}
    </GlowCard>
  );
}

const Fact = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-baseline justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-ink">{v}</span></div>
);

function RetirementCard({ res, plan, real }: { res: LifeResult; plan: Plan; real: boolean }) {
  const P = plan.profile;
  const band = res.bands.find((b) => b.age === P.retireAge);
  const row = res.rows.find((r) => r.age === P.retireAge);
  const k = real && row ? row.price : 1;
  if (!band || !row) return <Stat icon={<Flag className="h-4 w-4" />} label={`At retirement (${P.retireAge})`} value="—" sub="retirement age is outside the plan" />;
  const lo = band.p10 / k;
  const hi = band.p90 / k;
  const mid = band.p50 / k;
  const yearsOfSpending = row.expenseTotal ? band.p50 / row.expenseTotal : 0;
  return (
    <Stat icon={<Flag className="h-4 w-4" />} label={`At retirement (${P.retireAge})`} value={inrShort(mid)} sub={`median net worth${real ? ", today's ₹" : ''}`}>
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] text-slate-500"><span>Poor markets</span><span>Great markets</span></div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-200">
          <span className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `calc(${((mid - lo) / Math.max(1, hi - lo)) * 100}% - 2px)` }} title="Median" />
        </div>
        <div className="mt-1 flex justify-between font-semibold text-ink"><span>{inrShort(lo)}</span><span>{inrShort(hi)}</span></div>
      </div>
      <Fact k="Years to go" v={`${Math.max(0, P.retireAge - res.age)} years`} />
      <Fact k="Covers" v={`≈ ${Math.round(yearsOfSpending)} years of spending`} />
      <Fact k="Retirement lasts" v={`${Math.max(0, P.lifeExpectancy - P.retireAge)} years (to ${P.lifeExpectancy})`} />
      <p className="mt-auto leading-relaxed text-slate-500">The range is the 10th–90th percentile of 1,000 market paths; the mark is the median.</p>
    </Stat>
  );
}

function FiCard({ res, plan }: { res: LifeResult; plan: Plan }) {
  const P = plan.profile;
  const today = res.rows[0];
  const needToday = today.expenseTotal / (P.swr / 100);
  const progress = needToday ? Math.min(1, today.netWorth / needToday) : 0;
  const gap = res.fi ? res.fi.age - P.retireAge : null;
  return (
    <Stat
      icon={<Compass className="h-4 w-4" />}
      label="Financial independence"
      value={res.fi ? `Age ${res.fi.age}` : 'Not reached'}
      sub={res.fi ? `needs ${inrShort(res.fi.number)} at ${P.swr}% withdrawal` : `at a ${P.swr}% withdrawal rate`}
    >
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] text-slate-500"><span>Progress today</span><span className="font-semibold text-ink">{Math.round(progress * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${progress * 100}%` }} /></div>
        <p className="mt-1.5 text-slate-500">You have {inrShort(today.netWorth)} of the {inrShort(needToday)} you'd need today to live off investments.</p>
      </div>
      <Fact k="Rule of thumb" v={`${Math.round(100 / P.swr)}× yearly spending`} />
      <p className="mt-auto leading-relaxed text-slate-500">
        {gap == null
          ? 'Spending grows faster than the portfolio in this plan — the levers on the Chance tab show what closes the gap.'
          : gap > 0
            ? `That's ${gap} years after you plan to retire at ${P.retireAge}; those years are funded by drawing down savings.`
            : `That's before your planned retirement at ${P.retireAge} — from then on, working becomes optional.`}
      </p>
    </Stat>
  );
}

function FamilyCard({ res }: { res: LifeResult }) {
  const r = res.rows[0];
  const nom = res.legacy.nominatedShare;
  const inv = r.netWorth;
  const ins = r.cover;
  const total = Math.max(1, inv + ins);
  return (
    <Stat icon={<HeartHandshake className="h-4 w-4" />} label="Family receives today" value={inrShort(r.legacy)} sub="investments + insurance payouts">
      <div>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          <div className="h-full bg-brand-600" style={{ width: `${(inv / total) * 100}%` }} />
          <div className="h-full bg-sky-500" style={{ width: `${(ins / total) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-sm bg-brand-600" />Investments <b className="text-ink">{inrShort(inv)}</b></span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-sm bg-sky-500" />Cover <b className="text-ink">{inrShort(ins)}</b></span>
        </div>
      </div>
      <Fact k="Via a nominee" v={`${Math.round(nom * 100)}% · ${inrShort(inv * nom)}`} />
      <Fact k="Needs heir certificate" v={inrShort(inv * (1 - nom))} />
      <Fact k="Shared between" v={res.legacy.heirs.length ? `${res.legacy.heirs.length} heirs` : 'no heirs yet'} />
      <p className="mt-auto leading-relaxed text-slate-500">
        {nom < 1 ? <>Every rupee without a valid nominee waits on paperwork. <Link to="/app/alerts" className="font-semibold text-brand-700">Fix nominee gaps →</Link></> : 'Every investment has a valid nominee.'}
      </p>
    </Stat>
  );
}

function AgeSlider({ rows, age, onChange }: { rows: number[]; age: number; onChange: (a: number) => void }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="text-sm font-medium text-slate-600">Age</span>
      <input type="range" min={rows[0]} max={rows.at(-1)} value={age} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-brand-700" aria-label="Year of the plan" />
      <span className="w-12 text-right text-lg font-bold text-ink">{age}</span>
    </Card>
  );
}

// ---------------- Plan editor ----------------
function PlanEditor({ plan, age0, onChange }: { plan: Plan; age0: number; onChange: (p: Plan) => void }) {
  const P = plan.profile;
  const setP = (k: keyof Plan['profile'], v: number | string) =>
    onChange({
      ...plan,
      profile: { ...P, [k]: v },
      // Salaries that ended at retirement keep ending at retirement.
      income: k === 'retireAge' ? plan.income.map((i) => (i.kind === 'salary' && i.endAge === P.retireAge ? { ...i, endAge: Number(v) } : i)) : plan.income,
    });
  const setList = <K extends 'income' | 'expenses' | 'milestones'>(k: K, list: Plan[K]) => onChange({ ...plan, [k]: list });
  const patch = <K extends 'income' | 'expenses' | 'milestones'>(k: K, id: string, v: Partial<Plan[K][number]>) =>
    setList(k, (plan[k] as Plan[K][number][]).map((x) => (x.id === id ? { ...x, ...v } : x)) as Plan[K]);
  const remove = (k: 'income' | 'expenses' | 'milestones', id: string) => setList(k, (plan[k] as { id: string }[]).filter((x) => x.id !== id) as never);
  const num = (e: { target: { value: string } }) => Number(e.target.value);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">You</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <F label="Current age"><Input disabled value={age0} /></F>
          <F label="Retire at"><Input type="number" value={P.retireAge} onChange={(e) => setP('retireAge', num(e))} /></F>
          <F label="Plan until age"><Input type="number" value={P.lifeExpectancy} onChange={(e) => setP('lifeExpectancy', num(e))} /></F>
          <F label="Tax regime"><Select value={P.regime} onChange={(e) => setP('regime', e.target.value)}><option value="new">New</option><option value="old">Old</option></Select></F>
          <F label="Life cover until age"><Input type="number" value={P.coverUntil} onChange={(e) => setP('coverUntil', num(e))} /></F>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-10 sm:justify-start">
          <DetentDial label="Surplus → equity" min={0} max={100} step={5} defaultValue={60} size={150} value={P.surplusEquity} onValueChange={(v) => setP('surplusEquity', v)} formatValue={(v) => `${v}%`} />
          <DetentDial label="Safe withdrawal" min={2} max={6} step={0.25} defaultValue={3.5} size={150} value={P.swr} onValueChange={(v) => setP('swr', v)} formatValue={(v) => `${v.toFixed(2)}%`} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Ongoing SIPs, EPF and PPF contributions come from your mapped holdings and <Link to="/app/invest" className="font-semibold text-brand-700">investment plan</Link>; they run until retirement. Scenario, inflation and SIP step-up are shared with <Link to="/app/forecast" className="font-semibold text-brand-700">Forecast</Link>.
        </p>
      </Card>

      <ListCard title="Family" hint="one ring each on the Timeline dial (up to 4)" onAdd={() => plan.family.length < 4 && onChange({ ...plan, family: [...plan.family, { id: uid(), name: 'Family member', relation: 'Son', age: 10 } as FamilyMember] })}>
        {plan.family.map((x) => (
          <Line key={x.id} onRemove={() => onChange({ ...plan, family: plan.family.filter((f) => f.id !== x.id) })}>
            <Input className="min-w-40 flex-[2]" value={x.name} onChange={(e) => onChange({ ...plan, family: plan.family.map((f) => (f.id === x.id ? { ...f, name: e.target.value } : f)) })} aria-label="Name" />
            <Select className="w-32" value={x.relation} onChange={(e) => onChange({ ...plan, family: plan.family.map((f) => (f.id === x.id ? { ...f, relation: e.target.value } : f)) })} aria-label="Relation">{RELATIONS.map((r) => <option key={r}>{r}</option>)}</Select>
            <Small label="age today" value={x.age} onChange={(v) => onChange({ ...plan, family: plan.family.map((f) => (f.id === x.id ? { ...f, age: v } : f)) })} />
          </Line>
        ))}
      </ListCard>

      <ListCard title="Income" hint="₹ a year, today" onAdd={() => setList('income', [...plan.income, { id: uid(), name: 'New income', kind: 'other', amount: 100000, growth: 5, startAge: age0, endAge: P.retireAge } as IncomeItem])}>
        {plan.income.map((x) => (
          <Line key={x.id} onRemove={() => remove('income', x.id)}>
            <Input className="min-w-40 flex-[2]" value={x.name} onChange={(e) => patch('income', x.id, { name: e.target.value })} aria-label="Income name" />
            <Select className="w-28" value={x.kind} onChange={(e) => patch('income', x.id, { kind: e.target.value as IncomeItem['kind'] })} aria-label="Type"><option value="salary">Salary</option><option value="rental">Rental</option><option value="pension">Pension</option><option value="other">Other</option></Select>
            <Money value={x.amount} onChange={(v) => patch('income', x.id, { amount: v })} />
            <DetentDial label="growth / yr" min={0} max={15} step={0.5} defaultValue={5} size={100} value={x.growth} onValueChange={(v) => patch('income', x.id, { growth: v })} formatValue={(v) => `${v}%`} />
            <Small label="from" value={x.startAge} onChange={(v) => patch('income', x.id, { startAge: v })} />
            <Small label="to" value={x.endAge} onChange={(v) => patch('income', x.id, { endAge: v })} />
          </Line>
        ))}
      </ListCard>

      <ListCard title="Expenses" hint="₹ a year in today's money — grows with inflation" onAdd={() => setList('expenses', [...plan.expenses, { id: uid(), name: 'New expense', kind: 'lifestyle', amount: 100000, startAge: age0, endAge: P.lifeExpectancy } as ExpenseItem])}>
        {plan.expenses.map((x) => (
          <Line key={x.id} onRemove={() => remove('expenses', x.id)}>
            <Input className="min-w-40 flex-[2]" value={x.name} onChange={(e) => patch('expenses', x.id, { name: e.target.value })} aria-label="Expense name" />
            <Select className="w-28" value={x.kind} onChange={(e) => patch('expenses', x.id, { kind: e.target.value as ExpenseItem['kind'] })} aria-label="Type"><option value="essential">Essential</option><option value="lifestyle">Lifestyle</option></Select>
            <Money value={x.amount} onChange={(v) => patch('expenses', x.id, { amount: v })} />
            <Small label="from" value={x.startAge} onChange={(v) => patch('expenses', x.id, { startAge: v })} />
            <Small label="to" value={x.endAge} onChange={(v) => patch('expenses', x.id, { endAge: v })} />
          </Line>
        ))}
      </ListCard>

      <ListCard title="Milestones" hint="one-time costs in today's money; optionally repeat" onAdd={() => setList('milestones', [...plan.milestones, { id: uid(), name: 'New milestone', kind: 'custom', age: age0 + 5, cost: 500000 } as Milestone])}>
        {plan.milestones.map((x) => (
          <Line key={x.id} onRemove={() => remove('milestones', x.id)}>
            <Input className="min-w-40 flex-[2]" value={x.name} onChange={(e) => patch('milestones', x.id, { name: e.target.value })} aria-label="Milestone name" />
            <Select className="w-28" value={x.kind} onChange={(e) => patch('milestones', x.id, { kind: e.target.value })} aria-label="Type">{MILESTONE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            <Money value={x.cost} onChange={(v) => patch('milestones', x.id, { cost: v })} />
            <Small label="at age" value={x.age} onChange={(v) => patch('milestones', x.id, { age: v })} />
            <Small label="every N yrs" value={x.every || 0} onChange={(v) => patch('milestones', x.id, { every: v || undefined, until: v ? x.until ?? 75 : undefined })} />
            {x.every ? <Small label="until" value={x.until ?? 75} onChange={(v) => patch('milestones', x.id, { until: v })} /> : null}
          </Line>
        ))}
      </ListCard>
    </div>
  );
}

const F = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>{children}</label>;

function ListCard({ title, hint, onAdd, children }: { title: string; hint: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="font-semibold text-ink">{title}</h2><p className="text-xs text-slate-500">{hint}</p></div>
        <Button size="sm" variant="secondary" onClick={onAdd}><Plus className="h-4 w-4" />Add</Button>
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}
const Line = ({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) => (
  <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
    {children}
    <button onClick={onRemove} className="mb-2 cursor-pointer p-1 text-slate-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
  </div>
);
function Money({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="block w-36"><span className="block text-[10px] text-slate-400">₹ / {inrShort(value)}</span><Input type="number" min={0} step={10000} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>
  );
}
function Small({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="block w-20"><span className="block text-[10px] text-slate-400">{label}</span><Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

// ---------------- Legacy ----------------
function LegacyTab({ res, row, real, onPick }: { res: LifeResult; row: LifeResult['rows'][number]; real: boolean; onPick: (a: number) => void }) {
  const k = real ? row.price : 1;
  const nom = res.legacy.nominatedShare;
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">What your family would inherit, by age</h2>
        <LegacyChart rows={res.rows} real={real} selected={row.age} onPick={onPick} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-brand-800 to-night p-5 text-white">
          <div className="text-sm text-[#ccfbf1]">If something happened at age {row.age}</div>
          <div className="mt-1 text-3xl font-extrabold">{inrShort(row.legacy / k)}</div>
          <div className="mt-1 text-sm text-[#ccfbf1]/80">{inrShort(row.netWorth / k)} investments + {inrShort(row.cover / k)} insurance</div>
          <p className="mt-3 text-xs text-[#ccfbf1]/70">India has no inheritance tax — Estate Duty was abolished in 1985. Heirs pay tax only on future income from what they inherit.</p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-ink">How it reaches them</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${nom * 100}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${(1 - nom) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex justify-between"><span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Via a valid nominee</span><span className="font-semibold text-ink">{inrShort((row.netWorth * nom) / k)}</span></li>
            <li className="flex justify-between"><span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-amber-400" />Needs a legal-heir certificate</span><span className="font-semibold text-ink">{inrShort((row.netWorth * (1 - nom)) / k)}</span></li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">Based on today's nominee coverage ({Math.round(nom * 100)}%). <Link to="/app/alerts" className="font-semibold text-brand-700">Fix nominee gaps</Link> to move money into the green.</p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-ink">Per heir (intended shares)</h2>
          {res.legacy.heirs.length === 0 ? <p className="text-sm text-slate-500">No heirs registered. <Link className="font-semibold text-brand-700" to="/app/heirs">Add heirs</Link></p> : (
            <ul className="space-y-2 text-sm">
              {res.legacy.heirs.map((h) => (
                <li key={h.name} className="flex items-center justify-between">
                  <span><span className="font-medium text-ink">{h.name}</span> <span className="text-slate-500">· {h.relation} · {Math.round(h.share * 100)}%</span></span>
                  <span className="font-semibold text-ink">{inrShort((row.legacy * h.share) / k)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">Actual division follows your will, or succession law if there isn't one. A nominee receives money as a trustee for the legal heirs.</p>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Progress ----------------
function ProgressTab() {
  const [p, setP] = useState<Progress | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api<Progress>('/progress').then(setP);
  useEffect(() => void load(), []);
  const act = async (path: string, kind: string) => {
    if (kind === 'baseline' && !confirm('Replace the baseline with today’s plan projection?')) return;
    setBusy(kind);
    await api(path, { body: {} });
    await load();
    setBusy(null);
  };
  if (!p) return null;
  const gap = progressGap(p);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Latest net worth" value={inrShort(p.snapshots.at(-1)?.netWorth ?? p.current)} sub={p.snapshots.length ? `snapshot of ${date(p.snapshots.at(-1)!.date)}` : 'not recorded yet'} />
        <Stat icon={<Target className="h-4 w-4" />} label="Baseline expected" value={gap ? inrShort(gap.expected) : '—'} sub={p.baseline ? `baseline set ${date(p.baseline.createdAt)}` : 'no baseline yet'} />
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-600">Versus plan</div>
          <div className={cx('mt-1 text-2xl font-bold', !gap ? 'text-ink' : gap.diff >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{gap ? `${gap.diff >= 0 ? '+' : '−'}${inrShort(Math.abs(gap.diff))}` : '—'}</div>
          <div className="text-xs text-slate-500">{gap ? `${gap.diff >= 0 ? 'ahead of' : 'behind'} baseline (${((gap.diff / gap.expected) * 100).toFixed(1)}%)` : 'record a snapshot and set a baseline'}</div>
        </Card>
      </div>
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Actual vs projected</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={busy === 'snap'} onClick={() => act('/progress/snapshot', 'snap')}><Camera className="h-4 w-4" />Record snapshot</Button>
            <Button size="sm" variant="ghost" loading={busy === 'baseline'} onClick={() => act('/progress/baseline', 'baseline')}>Set baseline from plan</Button>
          </div>
        </div>
        <ProgressChart progress={p} />
        {(p.baseline?.demo || p.snapshots.some((s) => s.demo)) && <div className="mt-3"><Badge tone="amber">Demo history</Badge> <span className="text-xs text-slate-500">Past snapshots and the baseline are generated for the demo account.</span></div>}
        <p className="mt-2 text-xs text-slate-400">Snapshots record the value of all mapped investments (excluding insurance cover) on that day. Record one each month — or after each consent refresh — to see whether you're on track.</p>
      </Card>
    </div>
  );
}
