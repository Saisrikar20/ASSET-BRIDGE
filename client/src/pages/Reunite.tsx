import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Radio,
  Send,
} from 'lucide-react';
import { api, type Case, type Heir, type Holding } from '../lib/api';
import { useAuth } from '../lib/auth';
import { inr, inrShort } from '../lib/format';
import { Badge, Button, ErrorNote, Field, Input } from '../components/ui';

export default function Reunite() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cases, setCases] = useState<{ id: string }[]>([]);
  const [f, setF] = useState({
    dateOfDeath: new Date().toISOString().slice(0, 10),
    registrationNo: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    case: Case;
    notified: { name: string; via: string[] }[];
  } | null>(null);

  useEffect(() => {
    api<{ heirs: Heir[] }>('/heirs')
      .then((r) => setHeirs(r.heirs))
      .catch(() => {});
    api<{ holdings: Holding[] }>('/holdings')
      .then((r) => setHoldings(r.holdings))
      .catch(() => {});
    api<{ cases: { id: string }[] }>('/cases')
      .then((r) => setCases(r.cases))
      .catch(() => {});
  }, []);

  const fire = async () => {
    if (
      !confirm(
        `Simulate a CRS death registration for ${user?.identity?.name}? This opens an estate case and notifies all heirs.`
      )
    )
      return;
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{
        case: Case;
        notified: { name: string; via: string[] }[];
      }>('/crs/death', { body: { pan: user!.identity!.pan, ...f } });
      setResult(r);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user?.identity) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            STEP 04 / REUNITE
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Reunite
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            See how your family's succession journey works.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900/40">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Verify and map holdings first
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Reunite requires a verified financial twin to match a death registration against.
          </p>
          <div className="mt-4">
            <Link to="/app/verify">
              <Button size="sm">Go to Verify &rarr;</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const existing = result?.case.id || cases[0]?.id;
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  const steps = [
    {
      title: 'CRS feed',
      desc: 'Registrar records death; event arrives with PAN / Aadhaar linkage.',
    },
    {
      title: 'Match',
      desc: `Linked to twin: ${holdings.length} holdings worth ${inrShort(totalValue)}.`,
    },
    {
      title: 'Notify',
      desc: `${heirs.length} registered heir${heirs.length === 1 ? '' : 's'} receive case ID notification.`,
    },
    {
      title: 'Verify heir',
      desc: 'Each heir unlocks the estate case using their individual PAN.',
    },
    {
      title: 'Transfer',
      desc: `State-specific checklist for ${user.identity.state || 'national'} generated for every holding.`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* STEP 2 — Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          STEP 04 / REUNITE
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Reunite
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          See how your family's succession journey works.
        </p>
      </div>

      {/* STEP 4 — Twin Summary */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-sm">
        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">
            Matched Holdings
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {holdings.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {new Set(holdings.map((h) => h.regulator)).size} regulators
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">
            Total Matched Value
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {inr(totalValue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Aggregated financial twin
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">
            Registered Heirs
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {heirs.length}
          </div>
          <div
            className="text-[11px] text-slate-500 dark:text-slate-400 truncate"
            title={heirs.map((h) => h.name).join(', ')}
          >
            {heirs.map((h) => h.name).join(', ') || 'None registered'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">
            Estate Jurisdiction
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 truncate">
            {user.identity.state || 'National'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            PAN: {user.identity.pan}
          </div>
        </div>
      </div>

      {/* STEP 3 — Five-Step Process Connected Stepper */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Radio className="h-4 w-4 text-brand-700 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Succession sequence
          </h2>
        </div>

        {/* Desktop Stepper */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-3.5 relative">
          {steps.map((st, i) => (
            <div key={st.title} className="space-y-1.5 relative">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                  {st.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile Stepper (Vertical connected line) */}
        <div className="sm:hidden space-y-3.5 relative pl-5 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
          {steps.map((st, i) => (
            <div key={st.title} className="relative space-y-0.5">
              <div className="absolute -left-[27px] top-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-[10px] font-semibold flex items-center justify-center">
                {i + 1}
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                {st.title}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 5 & 6 — CRS Demo Control & Open Case State */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 sm:p-6 space-y-4 shadow-sm">
        {existing ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Badge tone="green">ESTATE CASE OPEN</Badge>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {existing}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                CRS notification active
              </span>
            </div>

            {result?.notified && result.notified.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5 text-xs">
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Notification dispatch:
                </div>
                {result.notified.map((n) => (
                  <div
                    key={n.name}
                    className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {n.name} notified {n.via.length ? `via ${n.via.join(' & ')}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Heirs can access this case at{' '}
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                /heir/{existing}
              </span>{' '}
              using their individual verified PAN.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                onClick={() => nav(`/app/cases/${existing}`)}
                className="flex-1 justify-between text-xs"
              >
                <span>Open transfer workflow (Step 05)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => nav(`/heir/${existing}`)}
                className="text-xs gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Preview Heir Portal</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  nav(
                    '/app/guide?caseId=' +
                      existing +
                      '&q=' +
                      encodeURIComponent(
                        'What are the estate succession requirements for case ' + existing + '?'
                      )
                  )
                }
                className="text-xs gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ask AI Guide</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-0.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Demo control · Simulate CRS event
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                In production, this event arrives via registrar API. In this demo environment, you can trigger it to test the full succession notification flow.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <Field label="Deceased (this twin)">
                <Input disabled value={`${user.identity.name} · ${user.identity.pan}`} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date of death">
                  <Input
                    type="date"
                    value={f.dateOfDeath}
                    onChange={(e) => setF({ ...f, dateOfDeath: e.target.value })}
                  />
                </Field>

                <Field label="Registration no." hint="Optional official registry reference">
                  <Input
                    value={f.registrationNo}
                    onChange={(e) => setF({ ...f, registrationNo: e.target.value })}
                    placeholder="auto (e.g. CRS/2026/894120)"
                  />
                </Field>
              </div>

              {heirs.length === 0 && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300">
                  No heirs registered yet —{' '}
                  <Link to="/app/heirs" className="font-semibold underline">
                    register family heirs
                  </Link>{' '}
                  so they can be notified when the case opens.
                </div>
              )}

              <ErrorNote msg={err} />

              <Button
                variant="danger"
                className="w-full py-2.5 text-xs"
                loading={busy}
                onClick={fire}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send death registration</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
