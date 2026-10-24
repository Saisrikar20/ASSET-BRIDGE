import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, RotateCcw, ShieldAlert, Users, Wallet } from 'lucide-react';
import { api, type Alert, type Heir, type Holding, type Summary } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLive } from '../lib/live';
import { inrShort, REG_STYLE } from '../lib/format';
import { Badge, Button, Card, PageHeader, RegChip, cx } from '../components/ui';

export default function Dashboard() {
  const { user, meta, refresh } = useAuth();
  const [data, setData] = useState<{ holdings: Holding[]; summary: Summary } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [heirs, setHeirs] = useState<Heir[]>([]);

  const load = () => {
    api<{ holdings: Holding[]; summary: Summary }>('/holdings').then(setData);
    api<{ alerts: Alert[] }>('/alerts').then((r) => setAlerts(r.alerts));
    api<{ heirs: Heir[] }>('/heirs').then((r) => setHeirs(r.heirs));
  };
  useEffect(load, []);
  useLive((e) => {
    if (e.type === 'alert') setAlerts((a) => [...a.filter((x) => x.id !== e.data.id), e.data]);
    if (e.type === 'alert_resolved') load();
  });

  const reset = async () => {
    if (!confirm('Reset the demo? This clears your identity, consents, holdings, alerts and cases.')) return;
    await api('/demo/reset', { body: {} });
    await refresh();
    load();
  };

  const open = alerts.filter((a) => !a.resolved);
  const steps = [
    { done: !!user?.identity, label: 'Verify your identity with every regulator', to: '/app/verify' },
    { done: !!data?.holdings.length, label: 'Give consent to map your holdings', to: '/app/aggregate' },
    { done: !!data?.holdings.length && open.filter((a) => a.severity === 'high').length === 0, label: 'Fix high-priority nominee gaps', to: '/app/alerts' },
    { done: heirs.length > 0, label: 'Register the heirs who should be reunited', to: '/app/heirs' },
  ];
  const holdings = data?.holdings || [];
  const nominated = holdings.filter((h) => h.nominee?.status === 'valid').length;
  const coverage = holdings.length ? nominated / holdings.length : 0;
  const max = Math.max(1, ...(data?.summary.byRegulator.map((r) => r.value) || [1]));

  return (
    <>
      <PageHeader
        title={`Namaste, ${user?.identity?.name.split(' ')[0] || user?.name.split(' ')[0]}`}
        subtitle="Your financial twin — every holding across every regulator, and how ready your family is to claim it."
        action={<Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset demo</Button>}
      />

      {user?.deceased && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A death registration was received for this twin ({user.deceased.registrationNo}). The estate case is under <Link to="/app/cases" className="font-semibold underline">Transfer</Link>.
        </Card>
      )}

      {steps.some((s) => !s.done) && (
        <Card className="mb-6 p-5">
          <div className="mb-3 text-sm font-semibold text-ink">Set up your twin · {steps.filter((s) => s.done).length}/4</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <Link key={s.label} to={s.to} className={cx('flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition', s.done ? 'border-emerald-100 bg-emerald-50/50 text-slate-500' : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50')}>
                {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
                <span className={cx('flex-1', s.done && 'line-through')}>{s.label}</span>
                {!s.done && <ArrowRight className="h-4 w-4 text-slate-400" />}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-5 w-5" />} label="Total mapped" value={inrShort(data?.summary.total || 0)} sub={`${data?.summary.count || 0} holdings`} />
        <Stat icon={<ShieldAlert className="h-5 w-5" />} label="At risk of going unclaimed" value={inrShort(data?.summary.atRisk || 0)} sub="No valid nominee or inactive" tone="red" />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Open alerts" value={String(open.length)} sub={`${open.filter((a) => a.severity === 'high').length} high priority`} tone="amber" />
        <Stat icon={<Users className="h-5 w-5" />} label="Nominee coverage" value={`${Math.round(coverage * 100)}%`} sub={`${heirs.length} heirs registered`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Holdings by regulator</h2>
            <Link to="/app/aggregate" className="text-sm font-semibold text-brand-700">All holdings →</Link>
          </div>
          <div className="space-y-4">
            {(data?.summary.byRegulator || []).map((r) => (
              <div key={r.regulator}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <RegChip code={r.regulator} />
                    <span className="text-slate-600">{meta?.regulators[r.regulator].covers}</span>
                  </div>
                  <span className="font-semibold text-ink">{r.count ? inrShort(r.value) : '—'}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cx('h-full rounded-full transition-all duration-700', REG_STYLE[r.regulator].bar)} style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {!holdings.length && <p className="mt-4 text-sm text-slate-500">Nothing mapped yet — give consent on the Aggregate step.</p>}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Needs attention</h2>
            <Link to="/app/alerts" className="text-sm font-semibold text-brand-700">All alerts →</Link>
          </div>
          {open.length === 0 ? (
            <p className="text-sm text-slate-500">{holdings.length ? 'All clear — every holding is ready to reach your family.' : 'Alerts appear here in real time once holdings are mapped.'}</p>
          ) : (
            <ul className="space-y-2.5">
              {open.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.severity === 'high' ? 'bg-rose-500' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="mt-0.5"><RegChip code={a.regulator} /></div>
                  </div>
                  <Badge tone={a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'slate'}>{a.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, label, value, sub, tone = 'teal' }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: 'teal' | 'red' | 'amber' }) {
  const t = { teal: 'bg-brand-50 text-brand-700', red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600' }[tone];
  return (
    <Card className="p-5">
      <div className={cx('mb-3 inline-flex rounded-lg p-2', t)}>{icon}</div>
      <div className="text-2xl font-bold tracking-tight text-ink">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-700">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </Card>
  );
}
