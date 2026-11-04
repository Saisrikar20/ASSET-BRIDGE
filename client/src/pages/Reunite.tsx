import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  HeartHandshake,
  Radio,
  Send,
} from 'lucide-react';
import { api, type Case, type Heir, type Holding } from '../lib/api';
import { useAuth } from '../lib/auth';
import { inr, inrShort } from '../lib/format';
import { Badge, Button, ErrorNote, Field, Input, cx } from '../components/ui';

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
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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

  const existing = result?.case.id || cases[0]?.id;

  const copyId = () => {
    if (existing) {
      navigator.clipboard.writeText(existing);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyLink = () => {
    if (existing) {
      const url = `${window.location.origin}/heir/${existing}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  const steps = [
    {
      title: 'CRS feed',
      desc: 'Registrar records death; event arrives with PAN / Aadhaar linkage.',
      status: existing ? 'completed' : 'pending',
    },
    {
      title: 'Match',
      desc: `Linked to twin: ${holdings.length} holdings worth ${inrShort(totalValue)}.`,
      status: existing ? 'completed' : 'pending',
    },
    {
      title: 'Notify',
      desc: `${heirs.length} registered heir${heirs.length === 1 ? '' : 's'} notified with Case ID.`,
      status: existing ? 'completed' : 'pending',
    },
    {
      title: 'Verify heir',
      desc: 'Each heir unlocks the estate case using their individual PAN.',
      status: existing ? 'current' : 'pending',
    },
    {
      title: 'Transfer',
      desc: `State-specific checklist for ${user.identity.state || 'national'} generated.`,
      status: 'pending',
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
          {existing ? 'Estate case created' : 'Reunite'}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {existing
            ? 'The succession workflow is ready for the registered heirs.'
            : "See how your family's succession journey works."}
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

      {/* STEP 7 — Five-Step Process Connected Stepper */}
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
                <div
                  className={cx(
                    'h-6 w-6 rounded-full font-mono text-xs font-semibold flex items-center justify-center shrink-0',
                    st.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : st.status === 'current'
                        ? 'bg-brand-600 text-white ring-2 ring-brand-200 dark:ring-brand-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {st.status === 'completed' ? '✓' : i + 1}
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
              <div
                className={cx(
                  'absolute -left-[27px] top-0.5 h-5 w-5 rounded-full font-mono text-[10px] font-semibold flex items-center justify-center',
                  st.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : st.status === 'current'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}
              >
                {st.status === 'completed' ? '✓' : i + 1}
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

      {/* STEP 3, 4, 5, 6 — Post-CRS Success State or Pre-CRS Demo Control */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 sm:p-6 space-y-5 shadow-sm">
        {existing ? (
          <div className="space-y-4">
            {/* STEP 3 — Estate Case Reference Focus */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge tone="green">ACTIVE CASE</Badge>
                  <span className="text-[11px] uppercase font-mono font-semibold tracking-wider text-slate-400">
                    Estate Case Reference
                  </span>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white select-all">
                  {existing}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registered heirs unlock the succession twin using this case reference and their individual PAN.
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
                >
                  {copiedId ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Case ID</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 text-[11px] text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  {copiedLink ? 'Link copied!' : 'Copy heir access link'}
                </button>
              </div>
            </div>

            {/* STEP 4 — Heir Notifications Breakdown */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Heir Notification Dispatch
              </div>
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden bg-white dark:bg-slate-900/40">
                {heirs.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">
                    No heirs were registered on this twin prior to case creation.
                  </div>
                ) : (
                  heirs.map((h) => {
                    const notifEntry = result?.notified?.find((n) => n.name === h.name);
                    const hasSms = notifEntry?.via?.includes('SMS') || Boolean(h.mobile);
                    const hasEmail = notifEntry?.via?.includes('Email') || Boolean(h.email);

                    return (
                      <div
                        key={h.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {h.name}
                          </span>
                          <span className="text-slate-400 ml-1.5 font-normal">
                            · {h.relation}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <span
                              className={cx(
                                'h-1.5 w-1.5 rounded-full',
                                hasSms ? 'bg-emerald-500' : 'bg-slate-300'
                              )}
                            />
                            SMS:{' '}
                            {hasSms
                              ? h.mobile
                                ? `Sent (••••${h.mobile.slice(-4)})`
                                : 'Sent'
                              : 'No number'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <span
                              className={cx(
                                'h-1.5 w-1.5 rounded-full',
                                hasEmail ? 'bg-emerald-500' : 'bg-slate-300'
                              )}
                            />
                            Email: {hasEmail ? 'Sent' : 'No address'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                * Simulated notifications recorded in demonstration event ledger.
              </div>
            </div>

            {/* STEP 5 — Heir Portal Access */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Heir Access Portal:
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Each heir must open the case using their own PAN. No unauthorized party can access the estate.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  /heir/{existing}
                </span>
              </div>
            </div>

            {/* STEP 6 — Next Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                onClick={() => nav(`/app/cases/${existing}`)}
                className="flex-1 justify-between text-xs py-2.5"
              >
                <span>Open transfer workflow (Step 05)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => nav(`/heir/${existing}`)}
                className="text-xs gap-1.5 py-2.5"
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
                className="text-xs gap-1.5 py-2.5"
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
