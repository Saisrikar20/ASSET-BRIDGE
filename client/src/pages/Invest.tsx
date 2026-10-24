import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Plus, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { api, type Catalog, type Forecast, type InvestOption, type Plan } from '../lib/api';
import { CLASS_COLOR, inr, inrShort } from '../lib/format';
import { Badge, Button, Card, Input, PageHeader, RegChip, Select, cx } from '../components/ui';

const RISKS = ['Low', 'Low–Moderate', 'Moderate', 'High'];

export default function Invest() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [cls, setCls] = useState('all');
  const [risk, setRisk] = useState('all');
  const [govtOnly, setGovtOnly] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    api<Catalog>('/options').then(setCatalog);
    api<{ plan: Plan }>('/plan').then((r) => setPlan(r.plan));
  }, []);
  useEffect(() => {
    if (plan) api<Forecast>('/forecast', { body: {} }).then(setFc);
  }, [plan]);

  const scenario = catalog?.scenarios[plan?.settings.scenario || 'base'];
  const rateOf = (o: InvestOption) => (o.rate != null ? o.rate : scenario ? (scenario as any)[o.class] : null);

  const shown = useMemo(
    () => (catalog?.options || []).filter((o) => (cls === 'all' || o.class === cls) && (risk === 'all' || o.risk === risk) && (!govtOnly || o.govt)),
    [catalog, cls, risk, govtOnly],
  );

  const save = async (contributions: Plan['contributions']) => {
    const r = await api<{ plan: Plan }>('/plan', { method: 'PUT', body: { contributions, settings: plan?.settings } });
    setPlan(r.plan);
  };

  const add = async (o: InvestOption) => {
    const v = Math.max(0, Number(amount) || 0);
    if (!v || !plan) return;
    const rest = plan.contributions.filter((c) => c.optionId !== o.id);
    await save([...rest, { optionId: o.id, monthly: o.mode === 'monthly' ? Math.min(v, o.maxMonthly || v) : 0, lumpSum: o.mode === 'lumpsum' ? v : 0 }]);
    setAdding(null);
    setAmount('');
  };
  const remove = (id: string) => plan && save(plan.contributions.filter((c) => c.optionId !== id));

  const optById = (id: string) => catalog?.options.find((o) => o.id === id);
  const monthly = plan?.contributions.reduce((t, c) => t + c.monthly, 0) || 0;
  const lump = plan?.contributions.reduce((t, c) => t + c.lumpSum, 0) || 0;

  return (
    <>
      <PageHeader
        title="Investment options"
        subtitle="Every major Indian option in one place — government small savings, retirement schemes, bonds, gold and mutual funds. Add any to your plan and see it in the forecast. Every option here supports a nominee."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select className="w-48" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Asset class">
              <option value="all">All asset classes</option>
              {Object.entries(catalog?.classes || {}).filter(([k]) => k !== 'cash').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select className="w-40" value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk">
              <option value="all">Any risk</option>
              {RISKS.map((r) => <option key={r}>{r}</option>)}
            </Select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="accent-brand-700" checked={govtOnly} onChange={(e) => setGovtOnly(e.target.checked)} />Government-backed only</label>
            <span className="ml-auto text-sm text-slate-500">{shown.length} options</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((o) => {
              const inPlan = plan?.contributions.find((c) => c.optionId === o.id);
              const r = rateOf(o);
              return (
                <Card key={o.id} className={cx('flex flex-col p-5', inPlan && 'border-brand-500 ring-1 ring-brand-500')}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <RegChip code={o.regulator} />
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><span className="h-2 w-2 rounded-sm" style={{ background: CLASS_COLOR[o.class] }} />{catalog?.classes[o.class].label}</span>
                      </div>
                      <h3 className="font-semibold leading-snug text-ink">{o.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-ink">{r != null ? `${r}%` : '—'}</div>
                      <div className="text-[11px] text-slate-500">{o.rate != null ? o.rateKind : `assumed · ${o.rateKind}`}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{o.bestFor}</p>
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex gap-2"><dt className="w-14 shrink-0 text-slate-400">Lock-in</dt><dd className="text-slate-700">{o.lockIn}</dd></div>
                    <div className="flex gap-2"><dt className="w-14 shrink-0 text-slate-400">Tax</dt><dd className="text-slate-700">{o.tax}</dd></div>
                    <div className="flex gap-2"><dt className="w-14 shrink-0 text-slate-400">Min</dt><dd className="text-slate-700">{o.min}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={o.risk === 'High' ? 'red' : o.risk === 'Moderate' ? 'amber' : 'green'}>{o.risk} risk</Badge>
                    {o.govt && <Badge tone="teal"><ShieldCheck className="h-3 w-3" />Sovereign / govt-backed</Badge>}
                  </div>
                  <div className="mt-auto pt-4">
                    {adding === o.id ? (
                      <div className="flex gap-2">
                        <Input autoFocus type="number" min={0} placeholder={o.mode === 'monthly' ? '₹ per month' : '₹ one-time'} value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(o)} />
                        <Button size="sm" onClick={() => add(o)} disabled={!Number(amount)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant={inPlan ? 'secondary' : 'primary'} onClick={() => { setAdding(o.id); setAmount(inPlan ? String(inPlan.monthly || inPlan.lumpSum) : ''); }}>
                        <Plus className="h-4 w-4" /> {inPlan ? `In plan · ${inPlan.monthly ? `${inr(inPlan.monthly)}/mo` : inr(inPlan.lumpSum)}` : o.mode === 'monthly' ? 'Add monthly SIP' : 'Add one-time amount'}
                      </Button>
                    )}
                    {adding === o.id && o.maxMonthly && <p className="mt-1 text-xs text-slate-500">Capped at {inr(o.maxMonthly)}/month (₹1.5 L a year).</p>}
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Small-savings rates are set by the Government each quarter; market-linked figures are long-run assumptions, not promises. Tax notes are simplified — 80C deductions apply only under the old tax regime. This is general information, not investment advice.
          </p>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink"><Landmark className="h-4 w-4 text-brand-700" /> Your plan</h2>
            <p className="mb-4 text-xs text-slate-500">New money on top of what you already hold.</p>
            {!plan?.contributions.length ? (
              <p className="text-sm text-slate-500">Nothing added yet. Pick an option to start.</p>
            ) : (
              <ul className="space-y-2">
                {plan.contributions.map((c) => {
                  const o = optById(c.optionId);
                  return (
                    <li key={c.optionId} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: o ? CLASS_COLOR[o.class] : '#ccc' }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{o?.name}</span>
                      <span className="font-semibold text-ink">{c.monthly ? `${inrShort(c.monthly)}/mo` : inrShort(c.lumpSum)}</span>
                      <button onClick={() => remove(c.optionId)} className="cursor-pointer text-slate-400 hover:text-rose-600" aria-label={`Remove ${o?.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Monthly</span><span className="font-semibold text-ink">{inr(monthly)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">One-time</span><span className="font-semibold text-ink">{inr(lump)}</span></div>
            </div>
          </Card>
          {fc && (
            <Card className="bg-gradient-to-br from-brand-800 to-night p-5 text-white">
              <div className="text-sm text-[#ccfbf1]/80">Whole twin in {fc.settings.years} years</div>
              <div className="mt-1 text-3xl font-extrabold">{inrShort(fc.summary.end)}</div>
              <div className="text-sm text-[#ccfbf1]/80">≈ {inrShort(fc.summary.endReal)} in today's rupees</div>
              <Link to="/app/forecast" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline"><TrendingUp className="h-4 w-4" /> Open full forecast</Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
