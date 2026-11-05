import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Copy,
  BookOpen,
  RotateCcw,
  Search,
  ShieldAlert,
  FileDown,
  Mail,
  Database,
  Loader2,
  CheckCircle2,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import EmailDossierModal from '../components/EmailDossierModal';
import { downloadCsv } from '../lib/csv';
import {
  api,
  downloadClaimingDossierPdf,
  saveClaimingDossierToVault,
  type Consent,
  type Holding,
  type Regulator
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr } from '../lib/format';
import { Badge, Button, ErrorNote, Input, RegChip, Select, cx, useToast } from '../components/ui';

const ALL: Regulator[] = ['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'];

const REGULATOR_META: Record<Regulator, { name: string; subtitle: string; fiType: string }> = {
  RBI: {
    name: 'Reserve Bank of India',
    subtitle: 'Scheduled Commercial Banks, Term Deposits, Savings Accounts',
    fiType: 'DEPOSIT',
  },
  EPFO: {
    name: "Employees' Provident Fund",
    subtitle: 'EPF Balances, EPS Pension Accounts, Universal Account Number (UAN)',
    fiType: 'EPF_SUMMARY',
  },
  IRDAI: {
    name: 'Insurance Regulatory Authority',
    subtitle: 'General Insurance Policies, Life Covers, Annuities',
    fiType: 'INSURANCE_POLICIES',
  },
  SEBI: {
    name: 'Securities and Exchange Board',
    subtitle: 'Mutual Funds (CAMS/KFintech), CDSL/NSDL Demat Equity Portfolios',
    fiType: 'MUTUAL_FUNDS',
  },
  LIC: {
    name: 'Life Insurance Corporation',
    subtitle: 'Sovereign Life Policies, Endowment Plans, Death Benefit Accruals',
    fiType: 'LIFE_POLICY',
  },
  PFRDA: {
    name: 'Pension Regulatory Authority',
    subtitle: 'National Pension System (PRAN Tier-I & II), Atal Pension Yojana',
    fiType: 'NPS_BALANCES',
  },
  DOP: {
    name: 'Department of Posts',
    subtitle: 'Post Office Savings, National Savings Certificate (NSC), Kisan Vikas Patra (KVP)',
    fiType: 'POST_OFFICE_SAVINGS',
  },
};

const CONSENT_PURPOSES = [
  {
    code: 'STATUTORY_SUCCESSION_AUDIT',
    label: 'Statutory Succession & Estate Twin Audit',
    description: 'Permits cross-registry asset aggregation, nominee reconciliation, and statutory succession docket compilation.',
  },
  {
    code: 'ESTATE_DISCOVERY',
    label: 'Deceased Depositor & Unclaimed Asset Recovery',
    description: 'Enables deep-dormancy scans across inoperative bank accounts, unclaimed dividends (IEPF), and lapsed policy registers.',
  },
];

function NomineeIndicator({ nominee }: { nominee: Holding['nominee'] }) {
  if (!nominee) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C45D5D]">
        <span className="h-2 w-2 rounded-full bg-[#C45D5D] shrink-0 animate-pulse" />
        <span>No nominee registered · Statutory Risk</span>
      </span>
    );
  }

  if (nominee.status === 'deceased') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C45D5D]">
        <span className="h-2 w-2 rounded-full bg-[#C45D5D] shrink-0" />
        <span>
          Nominee deceased · {nominee.name} ({nominee.relation})
        </span>
      </span>
    );
  }

  if (nominee.status === 'minor') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C58B3C]">
        <span className="h-2 w-2 rounded-full bg-[#C58B3C] shrink-0" />
        <span>
          Minor nominee · {nominee.name} ({nominee.relation})
          {nominee.guardian ? ` · Guardian: ${nominee.guardian}` : ''}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#17232E] font-medium">
      <span className="h-2 w-2 rounded-full bg-[#34765B] shrink-0" />
      <span>
        Nominee:{' '}
        <span className="font-semibold text-[#101D2B]">{nominee.name}</span>{' '}
        <span className="text-[#71808C]">({nominee.relation})</span>
      </span>
    </span>
  );
}

export default function Aggregate() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [picked, setPicked] = useState<Regulator[]>(ALL);
  const [purpose, setPurpose] = useState<string>('STATUTORY_SUCCESSION_AUDIT');
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<string>('all');
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = async () => {
    try {
      const [cRes, hRes] = await Promise.all([
        api<{ consents: Consent[] }>('/consents'),
        api<{ holdings: Holding[] }>('/holdings'),
      ]);
      setConsents(cRes.consents || []);
      setHoldings(hRes.holdings || []);
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
    if (picked.length === 0) {
      setErr('Please select at least one statutory regulator to discover holdings.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ consent: Consent; holdingsCount: number }>('/consents', {
        body: { regulators: picked, months, purpose },
      });
      await load();
      toastSuccess(
        'Consent Established',
        `Discovered ${res.holdingsCount} assets across ${picked.length} statutory registries.`
      );
    } catch (e) {
      const msg = (e as Error).message || 'Failed to establish consent';
      setErr(msg);
      toastError('Consent Creation Failed', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSyncHoldings = async () => {
    setErr(null);
    setSyncing(true);
    try {
      const res = await api<{ ok: boolean; holdingsCount: number; totalValue: number }>(
        '/holdings/sync',
        { body: {} }
      );
      await load();
      toastSuccess(
        'Holdings Synchronized',
        `Successfully re-polled ${res.holdingsCount} assets (${inr(res.totalValue)}) across active registries.`
      );
    } catch (e) {
      const msg = (e as Error).message || 'Holdings synchronization failed';
      setErr(msg);
      toastError('Sync Failed', msg);
    } finally {
      setSyncing(false);
    }
  };

  const revoke = async (id: string) => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/consents/${id}/revoke`, { body: {} });
      setConfirmRevoke(false);
      await load();
      toastSuccess('Consent Revoked', 'Periodic telemetry monitoring stopped for this handle.');
    } catch (e) {
      const msg = (e as Error).message || 'Failed to revoke consent';
      setErr(msg);
      toastError('Revocation Failed', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyHandle = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
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

  const totalValue = holdings.reduce((s, h) => s + (h.value || 0), 0);
  const gapCount = holdings.filter(
    (h) => !h.nominee || h.nominee.status !== 'valid'
  ).length;

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

  if (!user?.identity) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-[#DDD7CA]">
          <div className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
            ACCOUNT AGGREGATOR · STATUTORY CONSENT GATEWAY
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Connect Financial Registries
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Identity verification required before generating Account Aggregator consent handles.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-10 text-center bg-white shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3ED] text-[#C58B3C] mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-[#101D2B]">Identity Verification Required</h2>
          <p className="mt-1 text-xs text-[#71808C] max-w-md mx-auto">
            Under Reserve Bank of India (RBI) Account Aggregator Directions, statutory consent handles must be linked to a verified PAN and identity profile.
          </p>
          <div className="mt-6">
            <Link to="/app/verify">
              <Button size="sm" className="rounded-full px-5 py-2 bg-[#101D2B] text-white hover:bg-[#1C3041]">
                Complete PAN Verification &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#DDD7CA] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
              ACCOUNT AGGREGATOR · REBIT AA GATEWAY
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F3ED] text-[#17232E] border border-[#DDD7CA]">
              <Sparkles className="h-3 w-3 text-[#55C6B0]" />
              Sandbox Telemetry v2.1
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Financial Asset Consent Gateway
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Granular, revocable statutory access across RBI, EPFO, IRDAI, SEBI, LIC, PFRDA, and Department of Posts.
          </p>
        </div>

        {/* Real-Time AA Sandbox Protocol Badge */}
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[#DDD7CA] bg-white px-3.5 py-1.5 flex items-center gap-2 shadow-xs text-xs">
            <span className="h-2 w-2 rounded-full bg-[#34765B] animate-pulse" />
            <span className="font-medium text-[#17232E]">ReBIT AA Protocol</span>
            <span className="text-[#71808C]">|</span>
            <span className="font-mono text-[11px] text-[#71808C]">OneMoney AA</span>
          </div>
        </div>
      </div>

      {/* ReBIT Sandbox Technical Notice */}
      <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/70 p-4 flex items-start gap-3 text-xs">
        <Info className="h-4 w-4 text-[#71808C] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#101D2B]">
            Regulatory Framework: Reserve Bank of India Master Directions (NBFC-AA)
          </div>
          <p className="text-[#71808C] leading-relaxed">
            Asset Bridge operates as a Financial Information User (FIU). Asset telemetry is discovered via end-to-end encrypted ReBIT-compliant consent handles. In this hackathon environment, simulated responses are deterministically mapped to the verified persona PAN.
          </p>
        </div>
      </div>

      {/* Active Consent Management Card */}
      {currentConsent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#DDD7CA] bg-white p-5 sm:p-6 space-y-4 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDD7CA]/60">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={cx(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide',
                    currentConsent.status === 'ACTIVE'
                      ? 'bg-[#34765B]/10 text-[#34765B] ring-1 ring-[#34765B]/30'
                      : currentConsent.status === 'REVOKED'
                        ? 'bg-[#C45D5D]/10 text-[#C45D5D] ring-1 ring-[#C45D5D]/30'
                        : 'bg-[#C58B3C]/10 text-[#C58B3C] ring-1 ring-[#C58B3C]/30'
                  )}
                >
                  <span
                    className={cx(
                      'h-1.5 w-1.5 rounded-full',
                      currentConsent.status === 'ACTIVE' ? 'bg-[#34765B]' : 'bg-[#C45D5D]'
                    )}
                  />
                  {currentConsent.status === 'ACTIVE'
                    ? 'Active Consent Handle'
                    : currentConsent.status === 'REVOKED'
                      ? 'Consent Revoked'
                      : 'Consent Expired'}
                </span>

                {/* AA Handle with copy tool */}
                <button
                  type="button"
                  onClick={() => handleCopyHandle(currentConsent.handle || currentConsent.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F3ED] text-[11px] font-mono text-[#17232E] border border-[#DDD7CA] hover:bg-[#EAE6DE] transition cursor-pointer"
                  title="Click to copy consent handle"
                >
                  <span>{currentConsent.handle || `consent-${currentConsent.id.slice(0, 8)}@onemoney`}</span>
                  {copiedHandle ? (
                    <Check className="h-3 w-3 text-[#34765B]" />
                  ) : (
                    <Copy className="h-3 w-3 text-[#71808C]" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#71808C] flex-wrap">
                <span className="font-semibold text-[#101D2B]">
                  Purpose: {currentConsent.purpose || 'Statutory Succession & Estate Audit'}
                </span>
                <span>·</span>
                <span>Fetch: {currentConsent.fetchType || 'PERIODIC'}</span>
                <span>·</span>
                <span>
                  {currentConsent.status === 'REVOKED'
                    ? 'Telemetry monitoring halted'
                    : `Expires: ${date(currentConsent.expiresAt)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={syncing}
                onClick={handleSyncHoldings}
                className="rounded-full px-4 text-xs font-semibold gap-1.5 cursor-pointer border-[#DDD7CA] text-[#17232E] hover:bg-[#F5F3ED]"
                title="Trigger automated re-polling of holdings across mapped registries"
              >
                <RotateCcw className={cx('h-3.5 w-3.5', syncing && 'animate-spin')} />
                <span>{syncing ? 'Syncing…' : 'Sync Holdings'}</span>
              </Button>
              {currentConsent.status === 'ACTIVE' && !confirmRevoke && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full px-4 text-xs font-semibold text-[#C45D5D] hover:text-[#C45D5D] hover:bg-[#C45D5D]/10 cursor-pointer"
                  onClick={() => setConfirmRevoke(true)}
                >
                  Revoke Consent
                </Button>
              )}
            </div>
          </div>

          {/* Covered Regulators Badge Row */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#71808C] uppercase tracking-wider">
              Connected Statutory Registries ({currentConsent.regulators?.length || ALL.length} of 7)
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(currentConsent.regulators || ALL).map((r) => (
                <div
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] text-xs font-semibold text-[#17232E]"
                >
                  <RegChip code={r} />
                  <span>{REGULATOR_META[r]?.name || r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revocation Confirmation Dialog */}
          <AnimatePresence>
            {confirmRevoke && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl border border-[#C45D5D]/40 bg-[#C45D5D]/5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 text-[#101D2B]">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-[#C45D5D]" />
                  <div>
                    <div className="font-semibold text-[#C45D5D]">Confirm Revocation of Account Aggregator Consent?</div>
                    <div className="text-[#71808C]">
                      Periodic telemetry, automatic drift monitoring, and nominee risk alerting will be stopped immediately.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirmRevoke(false)}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy}
                    onClick={() => revoke(currentConsent.id)}
                    className="rounded-full text-xs px-4 bg-[#C45D5D] hover:bg-[#C45D5D]/90 text-white"
                  >
                    Confirm Revocation
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Consent Gateway Form (When no active consent exists, or user wants to issue new) */}
      {!active && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#DDD7CA] bg-white p-5 sm:p-6 space-y-6 shadow-xs"
        >
          {/* Institutional Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F5F3ED] text-xs border border-[#DDD7CA]">
            <div className="flex items-center gap-2 text-[#17232E] font-medium">
              <span className="text-[#71808C] uppercase font-mono text-[10px]">FIU Entity:</span>
              <span className="font-bold text-[#101D2B]">Asset Bridge Services (FIU-AB-2026)</span>
            </div>
            <div className="flex items-center gap-2 text-[#17232E] font-medium">
              <span className="text-[#71808C] uppercase font-mono text-[10px]">User Handle:</span>
              <span className="font-bold text-[#101D2B] font-mono">
                {user.identity.mobile || user.identity.pan}@onemoney
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#17232E] font-medium">
              <span className="text-[#71808C] uppercase font-mono text-[10px]">Protocol:</span>
              <span className="font-semibold text-[#34765B]">ReBIT Technical Gateway 2.1</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left: Registry Selector (7 Statutory Regulators) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71808C]">
                  Select Registries to Discover ({picked.length} of 7 selected)
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPicked(ALL)}
                    className="text-xs text-[#101D2B] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[#DDD7CA]">|</span>
                  <button
                    type="button"
                    onClick={() => setPicked([])}
                    className="text-xs text-[#71808C] hover:text-[#101D2B] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {ALL.map((r) => {
                  const isChecked = picked.includes(r);
                  const meta = REGULATOR_META[r];
                  return (
                    <label
                      key={r}
                      className={cx(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-all',
                        isChecked
                          ? 'border-[#101D2B] bg-[#F5F3ED]/50 shadow-xs'
                          : 'border-[#DDD7CA] bg-white opacity-70 hover:opacity-100 hover:border-[#71808C]'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#101D2B] h-4 w-4 rounded cursor-pointer"
                        checked={isChecked}
                        onChange={(e) =>
                          setPicked(
                            e.target.checked
                              ? [...picked, r]
                              : picked.filter((x) => x !== r)
                          )
                        }
                      />
                      <RegChip code={r} />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#101D2B]">{meta.name}</div>
                        <div className="text-[11px] text-[#71808C] truncate">{meta.subtitle}</div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] text-[#71808C]">
                        {meta.fiType}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Right: Consent Parameters & Purpose Configuration */}
            <div className="lg:col-span-5 rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/40 p-5 text-xs space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71808C] pb-2 border-b border-[#DDD7CA]">
                Consent Parameters & Scope
              </div>

              <div className="space-y-3">
                {/* Purpose Selection */}
                <div>
                  <label className="block text-[#71808C] font-medium mb-1.5">
                    Statutory Consent Purpose
                  </label>
                  <div className="space-y-2">
                    {CONSENT_PURPOSES.map((p) => (
                      <label
                        key={p.code}
                        className={cx(
                          'flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition',
                          purpose === p.code
                            ? 'border-[#101D2B] bg-white shadow-xs'
                            : 'border-[#DDD7CA] bg-white/50 opacity-70 hover:opacity-100'
                        )}
                      >
                        <input
                          type="radio"
                          name="consentPurpose"
                          value={p.code}
                          checked={purpose === p.code}
                          onChange={() => setPurpose(p.code)}
                          className="accent-[#101D2B] mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-[#101D2B]">{p.label}</div>
                          <div className="text-[11px] text-[#71808C] mt-0.5 leading-snug">
                            {p.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fetch Frequency */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[#71808C]">Fetch Frequency</span>
                  <span className="font-semibold text-[#101D2B]">PERIODIC (Monthly drift check)</span>
                </div>

                {/* Data Life */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#71808C]">Data Life</span>
                  <span className="font-semibold text-[#101D2B]">{months} Months (Strict purge)</span>
                </div>

                {/* Consent Validity Selector */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#DDD7CA]">
                  <span className="text-[#71808C]">Consent Validity</span>
                  <Select
                    className="w-32 py-1 text-xs rounded-full border-[#DDD7CA] bg-white text-[#101D2B]"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    {[3, 6, 12, 24].map((m) => (
                      <option key={m} value={m}>
                        {m} Months
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-[#71808C] border-t border-[#DDD7CA] leading-relaxed">
                By clicking below, you authorize Asset Bridge to request encrypted account telemetry from the selected Financial Information Providers (FIPs). You can revoke this authorization at any time.
              </div>

              <ErrorNote msg={err} />

              <Button
                className="w-full py-2.5 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white font-semibold shadow-xs"
                loading={busy}
                disabled={!picked.length}
                onClick={approve}
              >
                Authorize & Discover from {picked.length} Registry
                {picked.length === 1 ? '' : 'ies'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Discovered Holdings Portfolio Section (Post-Fetch) */}
      {holdings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Executive Holdings Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-4 shadow-xs">
              <div className="text-[10px] font-semibold text-[#71808C] uppercase tracking-wider">
                Total Aggregated Assets
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-[#101D2B] tabular-nums">
                {inr(totalValue)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#71808C]">
                {holdings.length} total mapped accounts
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-4 shadow-xs">
              <div className="text-[10px] font-semibold text-[#71808C] uppercase tracking-wider">
                Nominee Gap Alerts
              </div>
              <div
                className={cx(
                  'mt-1 text-xl font-bold tracking-tight tabular-nums',
                  gapCount > 0 ? 'text-[#C45D5D]' : 'text-[#34765B]'
                )}
              >
                {gapCount} {gapCount === 1 ? 'Holding' : 'Holdings'}
              </div>
              <div className="mt-0.5 text-[11px] text-[#71808C]">
                {gapCount > 0 ? 'Action required for succession' : '100% nominee coverage'}
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-4 shadow-xs">
              <div className="text-[10px] font-semibold text-[#71808C] uppercase tracking-wider">
                Regulatory Coverage
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-[#101D2B]">
                {new Set(holdings.map((h) => h.regulator)).size} / 7
              </div>
              <div className="mt-0.5 text-[11px] text-[#71808C]">
                Registries responding
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-4 shadow-xs">
              <div className="text-[10px] font-semibold text-[#71808C] uppercase tracking-wider">
                Audited Identity PAN
              </div>
              <div className="mt-1 text-xl font-bold font-mono tracking-tight text-[#101D2B]">
                {user.identity.pan}
              </div>
              <div className="mt-0.5 text-[11px] text-[#34765B] font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Verified Match</span>
              </div>
            </div>
          </div>

          {/* Holdings Filters & Search */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold tracking-tight text-[#101D2B]">
                  Mapped Financial Holdings
                </h2>
                <span className="text-xs text-[#71808C]">
                  {shown.length} {shown.length === 1 ? 'record' : 'records'}
                  {shown.length !== holdings.length && ` (filtered from ${holdings.length})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportCsv}
                  className="rounded-full text-xs py-1.5 h-8 gap-1.5 cursor-pointer border-[#DDD7CA] text-[#17232E] hover:bg-[#F5F3ED]"
                  title="Export full verified asset schedule to CSV spreadsheet"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Horizontal Filter Tabs + Search Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setReg('all')}
                  className={cx(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                    reg === 'all'
                      ? 'bg-[#101D2B] text-white shadow-xs'
                      : 'text-[#17232E] hover:text-[#101D2B] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
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
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                        reg === r
                          ? 'bg-[#101D2B] text-white shadow-xs'
                          : 'text-[#17232E] hover:text-[#101D2B] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
                      )}
                    >
                      <span>{r}</span>
                      {count > 0 && (
                        <span
                          className={cx(
                            'text-[10px] tabular-nums px-1.5 py-0.2 rounded-full font-mono',
                            reg === r
                              ? 'bg-white/20 text-white'
                              : 'bg-[#DDD7CA]/50 text-[#17232E]'
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
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#71808C]" />
                <Input
                  className="w-full sm:w-64 pl-8.5 py-1.5 text-xs rounded-full border-[#DDD7CA] bg-white text-[#101D2B]"
                  placeholder="Search institution, type, ID…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Minimal Holdings List */}
          <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#DDD7CA]/60 overflow-hidden shadow-xs">
            {shown.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#71808C]">
                No holdings found matching {reg !== 'all' ? `regulator "${reg}"` : ''}{' '}
                {q ? `query "${q}"` : ''}.
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setReg('all');
                      setQ('');
                    }}
                    className="text-xs text-[#101D2B] font-bold hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              shown.map((h) => (
                <div
                  key={h.id}
                  className="p-4 sm:px-5 sm:py-3.5 hover:bg-[#F5F3ED]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    {/* Left Column: Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <RegChip code={h.regulator} />
                        <span className="font-bold text-sm text-[#101D2B]">
                          {h.type}
                        </span>
                        {h.status !== 'active' && (
                          <Badge tone={h.status === 'inoperative' ? 'amber' : 'red'}>
                            {h.status.toUpperCase()}
                          </Badge>
                        )}
                        {h.isDuplicate && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C58B3C]/10 text-[#C58B3C] border border-[#C58B3C]/30">
                            Duplicate Detected
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#71808C] font-mono flex items-center gap-1.5 flex-wrap">
                        <span className="text-[#101D2B] font-sans font-medium">{h.institution}</span>
                        <span className="text-[#DDD7CA]">·</span>
                        <span>{h.ref}</span>
                        {h.registeredName && (
                          <>
                            <span className="text-[#DDD7CA] hidden sm:inline">·</span>
                            <span className="text-[#71808C] text-xs font-sans hidden sm:inline">
                              Owner: {h.registeredName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Nominee Status */}
                      <div className="pt-0.5">
                        <NomineeIndicator nominee={h.nominee} />
                      </div>
                    </div>

                    {/* Right Column: Asset Value & Last Activity */}
                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#DDD7CA]/60">
                      <div className="text-base sm:text-sm font-bold tracking-tight text-[#101D2B] tabular-nums">
                        {inr(h.value)}
                      </div>
                      <div className="text-xs text-[#71808C] tabular-nums">
                        Last activity: {date(h.lastActivity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Toolbar & Navigation Banner */}
          <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#101D2B]">
                  Aggregated Portfolio: {holdings.length} Assets ({inr(totalValue)})
                </span>
                {gapCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#C45D5D]" />
                    <Badge tone="red">
                      {gapCount} nominee gap{gapCount === 1 ? '' : 's'}
                    </Badge>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[#71808C]">
                Ready for succession planning. Download legal dossier or initiate statutory claims.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="rounded-full gap-1.5 border-[#DDD7CA] text-[#17232E] hover:bg-white"
                title="Send official statutory claim schedule with PDF attachment via email"
              >
                <Mail className="h-3.5 w-3.5 text-[#101D2B]" />
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
                    toastError('PDF Generation Failed', (e as Error).message);
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#101D2B] text-white hover:bg-[#1C3041] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download consolidated statutory claim dossier PDF"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#55C6B0]" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 text-[#55C6B0]" />
                )}
                <span>{downloadingPdf ? 'Generating PDF…' : 'Download Dossier (PDF)'}</span>
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
                className="rounded-full gap-1.5 border-[#DDD7CA] text-[#17232E] hover:bg-white"
                title="Index official claim schedule into SQLite Document Vault for AI consultation"
              >
                <Database className="h-3.5 w-3.5 text-[#34765B]" />
                <span>{savingVault ? 'Indexing…' : 'Save to AI Vault'}</span>
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
                className="rounded-full gap-1.5 border-[#DDD7CA] text-[#17232E] hover:bg-white"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ask AI Guide</span>
              </Button>

              <Button
                size="sm"
                onClick={() => nav('/app/alerts')}
                className="rounded-full gap-1.5 bg-[#101D2B] text-white hover:bg-[#1C3041]"
              >
                <span>Review Alerts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading state indicator */}
      {loading && holdings.length === 0 && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-12 text-center text-xs text-[#71808C]">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#101D2B] mb-2" />
          Loading mapped statutory holdings…
        </div>
      )}

      {/* Email Modal */}
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
