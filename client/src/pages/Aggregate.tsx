import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, RotateCcw, Search, ShieldAlert, FileDown, Mail, Database, Loader2 } from 'lucide-react';
import EmailDossierModal from '../components/EmailDossierModal';
import { downloadCsv } from '../lib/csv';
import { api, downloadClaimingDossierPdf, saveClaimingDossierToVault, type Consent, type Holding, type Regulator } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr } from '../lib/format';
import { Badge, Button, ErrorNote, Input, RegChip, Select, cx, useToast } from '../components/ui';

const ALL: Regulator[] = ['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'];

function NomineeIndicator({ nominee }: { nominee: Holding['nominee'] }) {
  if (!nominee) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>No nominee registered</span>
      </span>
    );
  }

  if (nominee.status === 'deceased') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>
          Nominee deceased · {nominee.name} ({nominee.relation})
        </span>
      </span>
    );
  }

  if (nominee.status === 'minor') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>
          Minor nominee · {nominee.name} ({nominee.relation})
          {nominee.guardian ? ` · Guardian: ${nominee.guardian}` : ''}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-xs text-slate-700 dark:text-slate-300 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span>
        Nominee:{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {nominee.name}
        </span>{' '}
        <span className="text-slate-400 dark:text-slate-500">
          ({nominee.relation})
        </span>
      </span>
    </span>
  );
}

export default function Aggregate() {
  const { user, meta } = useAuth();
  const nav = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [picked, setPicked] = useState<Regulator[]>(ALL);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<string>('all');
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = async () => {
    try {
      const [cRes, hRes] = await Promise.all([
        api<{ consents: Consent[] }>('/consents'),
        api<{ holdings: Holding[] }>('/holdings'),
      ]);
      setConsents(cRes.consents);
      setHoldings(hRes.holdings);
    } catch {
      // Keep existing data on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = consents.find((c) => c.status === 'ACTIVE');
  const currentConsent = active || (consents.length > 0 ? consents[0] : null);

  const approve = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api('/consents', { body: { regulators: picked, months } });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setErr(null);
    setRefreshing(true);
    try {
      if (active) {
        await api('/consents', {
          body: { regulators: active.regulators, months },
        });
      }
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const revoke = async (id: string) => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/consents/${id}/revoke`, { body: {} });
      setConfirmRevoke(false);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(
    () =>
      holdings.filter((h) => {
        const matchesReg = reg === 'all' || h.regulator === reg;
        const query = q.trim().toLowerCase();
        if (!query) return matchesReg;
        const matchesQuery =
          `${h.institution} ${h.type} ${h.ref} ${h.registeredName || ''} ${h.nominee?.name || ''}`
            .toLowerCase()
            .includes(query);
        return matchesReg && matchesQuery;
      }),
    [holdings, q, reg]
  );

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const gapCount = holdings.filter(
    (h) => !h.nominee || h.nominee.status !== 'valid'
  ).length;

  if (!user?.identity) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Connect your financial assets.
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Approve what Asset Bridge can access. You stay in control.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
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

  const handleExportCsv = () => {
    downloadCsv(
      `Asset_Bridge_Schedule_${user?.identity?.pan || 'portfolio'}.csv`,
      [
        'Holding ID',
        'Regulator',
        'Asset Category',
        'Financial Institution',
        'Account / Folio Reference',
        'Registered Owner Name',
        'Valuation (INR)',
        'Operating Status',
        'Nominee Registered',
        'Nominee Relationship',
        'Nominee Status',
        'Nominee Guardian',
        'Last Verified KYC',
        'Last Activity Date',
      ],
      holdings.map((h) => [
        h.id,
        h.regulator,
        h.type,
        h.institution,
        h.ref,
        h.registeredName || user?.name || '',
        h.value,
        h.status,
        h.nominee?.name || 'None',
        h.nominee?.relation || '',
        h.nominee?.status || 'missing',
        h.nominee?.guardian || '',
        h.kycUpdated || '',
        h.lastActivity || '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* STEP 3 — Page Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Connect your financial assets.
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Approve what Asset Bridge can access. You stay in control.
        </p>
      </div>

      {/* STEP 3 — Compact Consent Status Header */}
      {currentConsent && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:px-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                tone={
                  currentConsent.status === 'ACTIVE'
                    ? 'green'
                    : currentConsent.status === 'REVOKED'
                      ? 'red'
                      : 'amber'
                }
              >
                {currentConsent.status}
              </Badge>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">
                {currentConsent.id}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {currentConsent.regulators?.length || ALL.length} regulators
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {currentConsent.status === 'REVOKED'
                  ? 'Consent revoked'
                  : currentConsent.status === 'EXPIRED'
                    ? `Expired ${date(currentConsent.expiresAt)}`
                    : `Expires ${date(currentConsent.expiresAt)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={refreshing}
                onClick={handleRefresh}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Refresh data
              </Button>
              {currentConsent.status === 'ACTIVE' && !confirmRevoke && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  onClick={() => setConfirmRevoke(true)}
                >
                  Revoke
                </Button>
              )}
            </div>
          </div>

          {/* Revocation Confirmation Protection */}
          {confirmRevoke && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  Are you sure you want to revoke consent? Mapped holdings and active monitoring will be stopped.
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmRevoke(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={busy}
                  onClick={() => revoke(currentConsent.id)}
                >
                  Confirm revocation
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consent Configuration Box (when no active consent exists) */}
      {!active && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <span className="text-slate-400 uppercase font-mono text-[10px]">
                From:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Asset Bridge (FIU)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <span className="text-slate-400 uppercase font-mono text-[10px]">
                To:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                {user.identity.mobile || user.identity.pan || 'you'}@assetbridge-aa
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
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
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-brand-700 h-3.5 w-3.5 rounded"
                        checked={isChecked}
                        onChange={(e) =>
                          setPicked(
                            e.target.checked
                              ? [...picked, r]
                              : picked.filter((x) => x !== r)
                          )}
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
                Approve & fetch from {picked.length} regulator
                {picked.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 & 5 & 6 — Holdings Section (Post-Fetch) */}
      {holdings.length > 0 && (
        <div className="space-y-4">
          {/* STEP 4 — Holdings Summary & Step 5 — Filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  Mapped Holdings
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {shown.length} {shown.length === 1 ? 'holding' : 'holdings'}
                  {shown.length !== holdings.length && ` (filtered from ${holdings.length})`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">
                    Total mapped asset value:
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                    {inr(totalValue)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportCsv}
                  className="text-xs py-1.5 h-8 gap-1.5 cursor-pointer"
                  title="Export full verified asset schedule to CSV spreadsheet"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Export .CSV</span>
                </Button>
              </div>
            </div>

            {/* STEP 5 — Regulator Horizontal Filter Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setReg('all')}
                  className={cx(
                    'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                    reg === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                      : 'text-xs text-slate-700 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  All ({holdings.length})
                </button>
                {ALL.map((r) => {
                  const count = holdings.filter((h) => h.regulator === r).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReg(r)}
                      className={cx(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                        reg === r
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-xs text-slate-700 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <span>{r}</span>
                      {count > 0 && (
                        <span
                          className={cx(
                            'text-[10px] tabular-nums px-1.5 py-0.2 rounded-full font-mono',
                            reg === r
                              ? 'bg-slate-800 text-slate-200 dark:bg-black/10 dark:text-black'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  className="w-full sm:w-60 pl-8 py-1.5 text-xs"
                  placeholder="Search institution, type, ID…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* STEP 6 & 7 — Minimal Holdings List */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
            {shown.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No holdings found matching {reg !== 'all' ? `regulator "${reg}"` : ''}{' '}
                {q ? `query "${q}"` : ''}.
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setReg('all');
                      setQ('');
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              shown.map((h) => (
                <div
                  key={h.id}
                  className="p-4 sm:px-5 sm:py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    {/* Left Column: Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top line: Regulator & Holding Name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <RegChip code={h.regulator} />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {h.type}
                        </span>
                        {h.status !== 'active' && (
                          <Badge tone={h.status === 'inoperative' ? 'amber' : 'red'}>
                            {h.status}
                          </Badge>
                        )}
                      </div>

                      {/* Second line: Institution · Masked ID */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>{h.institution}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{h.ref}</span>
                        {h.registeredName && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">
                              ·
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-sans hidden sm:inline">
                              Name: {h.registeredName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Third line: Nominee status (Critical Succession Information) */}
                      <div className="pt-0.5">
                        <NomineeIndicator nominee={h.nominee} />
                      </div>
                    </div>

                    {/* Right Column: Asset value & Last activity */}
                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                      <div className="text-base sm:text-sm font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
                        {inr(h.value)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Last activity: {date(h.lastActivity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Connected Next-Step Action Banner */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
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
                onClick={() => setShowEmailModal(true)}
                className="gap-1.5"
                title="Send official statutory claim schedule with PDF attachment via email"
              >
                <Mail className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span>Email Dossier</span>
              </Button>
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={async () => {
                  try {
                    setDownloadingPdf(true);
                    await downloadClaimingDossierPdf({ pan: user?.identity?.pan });
                  } catch (e) {
                    alert((e as Error).message || 'Failed to download dossier');
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#244B3C] text-white hover:bg-[#1E3E32] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download consolidated statutory claim dossier PDF"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400 dark:text-brand-600" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 text-brand-400 dark:text-brand-600" />
                )}
                <span>{downloadingPdf ? 'Generating PDF…' : 'Download Claim Dossier (PDF)'}</span>
              </button>
              <Button
                variant="secondary"
                size="sm"
                loading={savingVault}
                disabled={savingVault}
                onClick={async () => {
                  try {
                    setSavingVault(true);
                    const res = await saveClaimingDossierToVault({ pan: user?.identity?.pan });
                    toastSuccess('Dossier Saved to AI Vault', res.message || 'Indexed in SQLite document vault for AI consultation.');
                  } catch (e) {
                    toastError('Failed to save to vault', (e as Error).message);
                  } finally {
                    setSavingVault(false);
                  }
                }}
                className="gap-1.5"
                title="Index official claim schedule into SQLite Document Vault for AI consultation"
              >
                <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{savingVault ? 'Indexing…' : 'Save to Vault'}</span>
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
                <span>Next: Review Alerts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && holdings.length === 0 && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400">
          Loading mapped holdings…
        </div>
      )}

      <EmailDossierModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        pan={user?.identity?.pan}
        defaultEmail={user?.email || ''}
        defaultName={user?.name || ''}
        title="Email Statutory Claim Schedule"
        subtitle="Consolidated 7-Regulator Mapped Holdings Schedule"
      />
    </div>
  );
}
