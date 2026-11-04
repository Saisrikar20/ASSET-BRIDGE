import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, ShieldAlert, FileDown } from 'lucide-react';
import { api, downloadClaimingDossierPdf, type Consent, type Holding, type Regulator } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr } from '../lib/format';
import { Badge, Button, ErrorNote, Input, RegChip, Select, cx } from '../components/ui';

const ALL: Regulator[] = ['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'];

export default function Aggregate() {
  const { user, meta } = useAuth();
  const nav = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [picked, setPicked] = useState<Regulator[]>(ALL);
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<string>('all');

  const load = () => {
    api<{ consents: Consent[] }>('/consents').then((r) => setConsents(r.consents)).catch(() => {});
    api<{ holdings: Holding[] }>('/holdings').then((r) => setHoldings(r.holdings)).catch(() => {});
  };
  useEffect(load, []);

  const active = consents.find((c) => c.status === 'ACTIVE');

  const approve = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api('/consents', { body: { regulators: picked, months } });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke consent? Mapped holdings and alerts will be deleted.')) return;
    await api(`/consents/${id}/revoke`, { body: {} });
    load();
  };

  const shown = useMemo(
    () =>
      holdings.filter(
        (h) =>
          (reg === 'all' || h.regulator === reg) &&
          `${h.institution} ${h.type} ${h.ref}`.toLowerCase().includes(q.toLowerCase())
      ),
    [holdings, q, reg]
  );

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const gapCount = holdings.filter((h) => !h.nominee || h.nominee.status !== 'valid').length;

  if (!user?.identity) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            STEP 02 / AGGREGATE
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Connect your financial assets.
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Approve what Asset Bridge can access. You stay in control.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900/40">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            We need a verified identity before requesting consent from any regulator.
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

  return (
    <div className="space-y-6">
      {/* STEP 3 — Page Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          STEP 02 / AGGREGATE
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Connect your financial assets.
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Approve what Asset Bridge can access. You stay in control.
        </p>
      </div>

      {/* Active Consent Bar (when consent is already approved) */}
      {active && (
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge tone="green">ACTIVE</Badge>
            <span className="font-mono text-slate-500">{active.id}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-400">
              {active.regulators.length} regulators · expires {date(active.expiresAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={approve}>
              Refresh data
            </Button>
            <button
              onClick={() => revoke(active.id)}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer"
            >
              Revoke
            </button>
          </div>
        </div>
      )}

      {/* Consent Configuration Box (when not active or refreshing) */}
      {!active && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 sm:p-6 space-y-5">
          {/* STEP 4 — Compact Consent Request Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 uppercase font-mono text-[10px]">From:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">Asset Bridge (FIU)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 uppercase font-mono text-[10px]">To:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                {user.identity.mobile || user.identity.pan || 'you'}@assetbridge-aa
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* STEP 5 — Information to fetch (7 regulators list) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Information to fetch ({picked.length} of 7)
              </div>
              <div className="space-y-1.5">
                {ALL.map((r) => {
                  const isChecked = picked.includes(r);
                  const covers = meta?.regulators[r]?.covers || r;
                  const fiType = meta?.regulators[r]?.fiType || 'FINANCIAL_INFO';
                  return (
                    <label
                      key={r}
                      className={cx(
                        'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors',
                        isChecked
                          ? 'border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-950/20'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70 hover:opacity-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-brand-700 h-3.5 w-3.5 rounded"
                        checked={isChecked}
                        onChange={(e) =>
                          setPicked(e.target.checked ? [...picked, r] : picked.filter((x) => x !== r))
                        }
                      />
                      <RegChip code={r} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {covers}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-slate-400">
                        {fiType}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* STEP 6 & 7 — Consent details & Primary action */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 sm:p-5 text-xs space-y-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                Consent Parameters
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Purpose</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    Wealth mapping & succession planning
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Fetch type</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    Periodic
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Data life</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    1 year, then deleted
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-slate-500">Consent validity</span>
                  <Select
                    className="w-32 py-1 text-xs"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    {[3, 6, 12, 24].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800">
                Data stays under your control. Encrypted in transit and revocable at any time.
              </div>

              <ErrorNote msg={err} />

              <Button
                className="w-full py-2.5"
                loading={busy}
                disabled={!picked.length}
                onClick={approve}
              >
                Approve & fetch from {picked.length} regulator{picked.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Holdings Listing (when holdings exist) */}
      {holdings.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mapped Holdings ({holdings.length})
              </h2>

              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    className="w-48 sm:w-56 pl-8 py-1.5 text-xs"
                    placeholder="Search holdings…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <Select
                  className="w-28 py-1.5 text-xs"
                  value={reg}
                  onChange={(e) => setReg(e.target.value)}
                >
                  <option value="all">All</option>
                  {ALL.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Holding</th>
                    <th className="px-4 py-2.5">Value</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Nominee</th>
                    <th className="px-4 py-2.5">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {shown.map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <RegChip code={h.regulator} />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {h.type}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
                          {h.institution} · {h.ref}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white tabular-nums">
                        {inr(h.value)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            h.status === 'active'
                              ? 'green'
                              : h.status === 'inoperative'
                                ? 'amber'
                                : 'red'
                          }
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!h.nominee ? (
                          <Badge tone="red">none</Badge>
                        ) : h.nominee.status === 'valid' ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {h.nominee.name}{' '}
                            <span className="text-[11px] text-slate-400">
                              ({h.nominee.relation})
                            </span>
                          </span>
                        ) : (
                          <Badge tone="amber">
                            {h.nominee.name} · {h.nominee.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 tabular-nums">
                        {date(h.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Connected Next-Step Action Banner */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Mapped {holdings.length} holdings ({inr(totalValue)})
                </span>
                {gapCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <Badge tone="red">
                      {gapCount} nominee gap{gapCount === 1 ? '' : 's'}
                    </Badge>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Holdings mapped under your consent. Review nominee gaps to protect your family.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadClaimingDossierPdf({ pan: user?.identity?.pan })}
                className="gap-1.5"
                title="Export statutory claim schedule as PDF"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Export Claim Schedule (PDF)</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  nav(
                    '/app/guide?q=' +
                      encodeURIComponent(
                        'What are the statutory requirements for claiming my mapped holdings?'
                      )
                  )
                }
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ask AI Guide</span>
              </Button>
              <Button size="sm" onClick={() => nav('/app/alerts')}>
                <span>Next: Review Alerts (Step 03)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
