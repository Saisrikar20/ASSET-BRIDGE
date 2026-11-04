import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Lightbulb, Sprout, Table2, TrendingUp, ShieldAlert, Users } from 'lucide-react';
import { api, type Analysis, type Catalog, type Forecast, type Plan, type PlanSettings } from '../lib/api';
import { CLASS_COLOR, CLASS_ORDER, inr, inrShort } from '../lib/format';
import { Button, Card, Empty, GlowCard, PageHeader, cx } from '../components/ui';
import ForecastChart from '../components/ForecastChart';
import DetentDial from '../components/kokonutui/detent-dial';

const TONE: Record<string, string> = { red: 'border-rose-200 bg-rose-50', amber: 'border-amber-200 bg-amber-50', green: 'border-emerald-200 bg-emerald-50', slate: 'border-slate-200 bg-slate-50' };

export default function ForecastPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [an, setAn] = useState<Analysis | null>(null);
  const [real, setReal] = useState(false);
  const [table, setTable] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api<Catalog>('/options').then(setCatalog);
    api<{ plan: Plan }>('/plan').then((r) => { setPlan(r.plan); setSettings(r.plan.settings); });
    api<Analysis>('/analysis').then(setAn);
  }, []);

  // Recompute on every settings change; persist settings shortly after.
  useEffect(() => {
    if (!settings) return;
    const t = setTimeout(() => api<Forecast>('/forecast', { body: { settings } }).then(setFc), 120);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api('/plan', { method: 'PUT', body: { contributions: plan?.contributions, settings } }), 800);
    return () => clearTimeout(t);
  }, [settings]);

  const set = <K extends keyof PlanSettings>(k: K, v: PlanSettings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));
  const labels = Object.fromEntries(Object.entries(catalog?.classes || {}).map(([k, v]) => [k, v.label]));

  if (an && an.total <= 1) {
    return (
      <>
        <PageHeader title="Forecast & analysis" />
        <Empty icon={<TrendingUp />} title="Map your holdings first" body="The forecast starts from what you already own. Give consent on the Aggregate step to bring your holdings in." action={<Link to="/app/aggregate"><Button>Go to Aggregate</Button></Link>} />
      </>
    );
  }

  const s = settings;
  const sum = fc?.summary;
  const d = real && s ? Math.pow(1 + s.inflation / 100, s.years) : 1;

  return (
    <>
      <PageHeader
        title="Financial forecast & analysis"
        subtitle="Where your twin is heading: today's holdings, ongoing SIPs and your investment plan, compounded forward. Projections use assumptions — markets don't move in straight lines."
        action={<Link to="/app/invest"><Button variant="secondary"><Sprout className="h-4 w-4" /> Add investments</Button></Link>}
      />

      {s && (
        <Card className="mb-6 grid items-center gap-5 p-5 md:grid-cols-[auto_1fr_auto_auto]">
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-500">Scenario</div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {Object.entries(catalog?.scenarios || {}).map(([k, v]) => (
                <button key={k} onClick={() => set('scenario', k)} className={cx('cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition', s.scenario === k ? 'bg-surface text-ink shadow-sm' : 'text-slate-500 hover:text-ink')}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500"><span>Horizon</span><span className="font-semibold text-ink">{s.years} years{fc?.age != null && ` · to age ${fc.age + s.years}`}</span></div>
            <input type="range" min={1} max={30} value={s.years} onChange={(e) => set('years', Number(e.target.value))} className="w-full accent-brand-700" aria-label="Horizon in years" />
          </div>
          <div className="flex justify-center gap-6">
            <DetentDial label="Inflation" min={0} max={12} step={0.5} defaultValue={5.5} size={136} value={s.inflation} onValueChange={(v) => set('inflation', v)} formatValue={(v) => `${v.toFixed(1)}%`} />
            <DetentDial label="SIP step-up / yr" min={0} max={20} step={1} defaultValue={5} size={136} value={s.stepUp} onValueChange={(v) => set('stepUp', v)} formatValue={(v) => `${v}%`} />
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-brand-700" checked={s.reclaimIdle} onChange={(e) => set('reclaimIdle', e.target.checked)} />Reclaim idle money</label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-brand-700" checked={real} onChange={(e) => setReal(e.target.checked)} />In today's rupees</label>
          </div>
        </Card>
      )}

      {sum && s && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={`Projected in ${s.years} years`} value={inrShort(sum.end / d)} sub={real ? "in today's rupees" : `≈ ${inrShort(sum.endReal)} in today's rupees`} strong />
          <Tile label="Worth today" value={inrShort(sum.start)} sub="holdings + one-time plan amounts, excl. insurance" />
          <Tile label="Total invested by then" value={inrShort(sum.contributed / d)} sub={`incl. ${inr(sum.monthly)}/month now, +${s.stepUp}%/yr`} />
          <Tile label="Growth from compounding" value={inrShort(sum.growth / d)} sub={`${sum.contributed ? Math.round((sum.growth / sum.contributed) * 100) : 0}% on top of what's invested`} />
        </div>
      )}

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Projected wealth by asset class</h2>
          <Button size="sm" variant="ghost" onClick={() => setTable(!table)}><Table2 className="h-4 w-4" /> {table ? 'Chart' : 'Table'}</Button>
        </div>
        {fc && s && !table && <ForecastChart points={fc.points} labels={labels} real={real} inflation={s.inflation} age={fc.age} />}
        {fc && s && table && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Year</th>{CLASS_ORDER.map((k) => <th key={k} className="px-3 py-2 text-right">{labels[k]}</th>)}<th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Invested</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fc.points.filter((p) => p.year % (s.years > 15 ? 5 : s.years > 6 ? 2 : 1) === 0 || p.year === s.years).map((p) => {
                  const dd = real ? Math.pow(1 + s.inflation / 100, p.year) : 1;
                  return (
                    <tr key={p.year}>
                      <td className="px-3 py-2 font-medium text-ink">{p.year === 0 ? 'Now' : p.year}{fc.age != null && <span className="text-xs text-slate-400"> · {fc.age + p.year}y</span>}</td>
                      {CLASS_ORDER.map((k) => <td key={k} className="px-3 py-2 text-right text-slate-600">{inrShort(p.byClass[k] / dd)}</td>)}
                      <td className="px-3 py-2 text-right font-semibold text-ink">{inrShort(p.total / dd)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{inrShort(p.contributed / dd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Assumed returns ({catalog?.scenarios[s?.scenario || 'base']?.label.toLowerCase()}): equity {catalog?.scenarios[s?.scenario || 'base']?.equity}%, NPS {catalog?.scenarios[s?.scenario || 'base']?.pension}%, gold {catalog?.scenarios[s?.scenario || 'base']?.gold}%, savings {catalog?.scenarios[s?.scenario || 'base']?.cash}%; EPF, PPF, FDs and small savings at their own rates. Insurance cover is excluded — it pays out, it doesn't grow.
        </p>
      </Card>

      {an && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-ink">Current allocation · {inrShort(an.total)}</h2>
              <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
                {an.allocation.filter((a) => a.value > 0).map((a) => (
                  <div key={a.class} title={`${a.label}: ${inr(a.value)}`} style={{ width: `${a.share * 100}%`, background: CLASS_COLOR[a.class] }} />
                ))}
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {an.allocation.map((a) => (
                  <li key={a.class} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CLASS_COLOR[a.class] }} />
                    <span className="flex-1 text-slate-600">{a.label}</span>
                    <span className="font-semibold text-ink">{Math.round(a.share * 100)}%</span>
                    <span className="w-20 text-right text-xs text-slate-500">{inrShort(a.value)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-ink">Liquidity — how fast could the family reach it?</h2>
              {[
                { k: 'Available within days', v: an.liquidity.liquid, c: 'bg-emerald-500', note: 'Savings, mutual funds, shares' },
                { k: 'Locked until maturity / age', v: an.liquidity.locked, c: 'bg-sky-500', note: 'EPF, PPF, NPS, FDs, SGBs' },
                { k: 'Idle — needs reclaiming', v: an.liquidity.idle, c: 'bg-rose-500', note: `Forgoing ≈ ${inr(an.idleCostPerYear)} a year` },
              ].map((r) => (
                <div key={r.k} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{r.k}</span><span className="font-semibold text-ink">{inrShort(r.v)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', r.c)} style={{ width: `${(r.v / an.total) * 100}%` }} /></div>
                  <div className="mt-0.5 text-xs text-slate-500">{r.note}</div>
                </div>
              ))}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-brand-800 to-night p-5 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#b9d3f5]"><HeartHandshake className="h-4 w-4" /> If something happened today</div>
              <div className="mt-2 text-3xl font-extrabold">{inrShort(an.familyToday)}</div>
              <p className="mt-1 text-sm text-[#b9d3f5]/80">would reach your family: {inrShort(an.total)} in investments + {inrShort(an.protection)} in insurance payouts — provided every nominee is in place.</p>
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/10">
                <Link to="/app/alerts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-lg hover:bg-white/25 transition">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                  <span>Review Nominee Gaps</span>
                </Link>
                <Link to="/app/heirs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-lg hover:bg-white/25 transition">
                  <Users className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Manage Registered Heirs</span>
                </Link>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Lightbulb className="h-4 w-4 text-brand-700" /> Analysis</h2>
              <ul className="space-y-2.5">
                {an.insights.map((i) => (
                  <li key={i.title} className={cx('rounded-lg border p-3', TONE[i.tone] || TONE.slate)}>
                    <div className="text-sm font-semibold text-ink">{i.title}</div>
                    <p className="mt-0.5 text-sm text-slate-600">{i.body}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">General analysis, not personalised investment advice. Talk to a SEBI-registered adviser before acting.</p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Tile({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <GlowCard className={cx(strong && 'ring-2 ring-brand-500')}>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={cx('mt-1 text-2xl font-bold tracking-tight', strong ? 'text-brand-700' : 'text-ink')}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{sub}</div>
    </GlowCard>
  );
}
