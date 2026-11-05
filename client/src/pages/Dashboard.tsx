import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  FileDown,
  Loader2,
  Mail,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import EmailDossierModal from '../components/EmailDossierModal';
import {
  api,
  downloadClaimingDossierPdf,
  type Alert,
  type Heir,
  type Holding,
  type Summary,
  type Regulator,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLive, useLiveStatus } from '../lib/live';
import { inr, inrShort } from '../lib/format';
import { RegChip, cx } from '../components/ui';

const staggerContainer: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const REGULATOR_CATALOG: { code: Regulator; name: string; category: string }[] = [
  { code: 'RBI', name: 'RBI', category: 'Bank Deposits & Sovereign Bonds' },
  { code: 'EPFO', name: 'EPFO', category: 'Provident Fund & Pension (EPS)' },
  { code: 'IRDAI', name: 'IRDAI', category: 'Private Life & Accident Policies' },
  { code: 'SEBI', name: 'SEBI', category: 'Mutual Funds & Demat Equities' },
  { code: 'LIC', name: 'LIC', category: 'Life Insurance Corporation Policies' },
  { code: 'PFRDA', name: 'PFRDA', category: 'National Pension System (NPS)' },
  { code: 'DOP', name: 'DOP', category: 'PPF, NSC & Postal Small Savings' },
];

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const isLiveConnected = useLiveStatus();

  const [data, setData] = useState<{ holdings: Holding[]; summary: Summary } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const load = async () => {
    try {
      const [hRes, aRes, heirRes] = await Promise.all([
        api<{ holdings: Holding[]; summary: Summary }>('/holdings').catch(() => null),
        api<{ alerts: Alert[] }>('/alerts').catch(() => null),
        api<{ heirs: Heir[] }>('/heirs').catch(() => null),
      ]);

      if (hRes) setData(hRes);
      if (aRes) setAlerts(aRes.alerts || []);
      if (heirRes) setHeirs(heirRes.heirs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Real-time WebSocket event listener
  useLive((e) => {
    if (e.type === 'alert') {
      setAlerts((prev) => [...prev.filter((x) => x.id !== e.data.id), e.data]);
    } else if (
      e.type === 'alert_resolved' ||
      e.type === 'holding_updated' ||
      e.type === 'consent_updated'
    ) {
      load();
    }
  });

  const reset = async () => {
    if (
      !confirm(
        'Reset the demo? This clears your identity, consents, holdings, alerts and cases.'
      )
    )
      return;

    await api('/demo/reset', { method: 'POST', body: {} });
    await refresh();
    await load();
  };

  const openAlerts = alerts.filter((a) => !a.resolved);
  const holdings = data?.holdings || [];

  // Nomination metrics calculation from actual holdings
  const nominatedHoldings = holdings.filter(
    (h) => !h.isDuplicate && h.nominee && h.nominee.status === 'valid'
  );
  const totalCount = holdings.filter((h) => !h.isDuplicate).length;
  const coverageRatio = totalCount > 0 ? nominatedHoldings.length / totalCount : 0;

  // At-risk calculation (missing nominee, deceased nominee, or inoperative/unclaimed)
  const atRiskHoldings = holdings.filter(
    (h) =>
      !h.isDuplicate &&
      (!h.nominee ||
        h.nominee.status !== 'valid' ||
        h.status === 'inoperative' ||
        h.status === 'unclaimed')
  );
  const calculatedAtRiskValue = atRiskHoldings.reduce((sum, h) => sum + (h.value || 0), 0);
  const atRiskValue = data?.summary?.atRisk ?? calculatedAtRiskValue;

  const steps = [
    {
      done: !!user?.identity,
      label: 'Verify your statutory identity with all 7 regulators',
      to: '/app/verify',
    },
    {
      done: holdings.length > 0,
      label: 'Authorize Account Aggregator consent to map holdings',
      to: '/app/aggregate',
    },
    {
      done: holdings.length > 0 && openAlerts.filter((a) => a.severity === 'high').length === 0,
      label: 'Resolve high-priority unnominated estate gaps',
      to: '/app/alerts',
    },
    {
      done: heirs.length > 0,
      label: 'Register legal heirs for statutory succession transmission',
      to: '/app/heirs',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  const displayName = user?.identity?.name || user?.name || 'User';
  const firstName = displayName.split(' ')[0];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 1. Header & Live Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DDD7CA]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#17232E]">
              Namaste, {firstName}.
            </h1>

            {/* True Live Connection Badge */}
            {isLiveConnected ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#34765B]/10 text-[#34765B] text-[10px] font-semibold border border-[#34765B]/30"
                title="Active real-time WebSocket connection (/ws)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#34765B] animate-pulse" />
                <span>Live Synced</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#71808C]/10 text-[#71808C] text-[10px] font-medium border border-[#DDD7CA]"
                title="WebSocket offline or connecting"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#71808C]" />
                <span>Standby</span>
              </span>
            )}
          </div>

          <p className="text-xs text-[#71808C]">
            Consolidated financial twin across 7 statutory Indian regulators.
          </p>
        </div>

        {/* Quick Action Pill Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-medium text-[#17232E] hover:bg-[#F5F3ED] shadow-xs transition cursor-pointer"
            title="Dispatch official claiming dossier PDF via SendGrid / SMTP"
          >
            <Mail className="h-3.5 w-3.5 text-[#55C6B0]" />
            <span>Email Dossier</span>
          </button>

          <button
            type="button"
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
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#101D2B] text-white hover:bg-[#1C3041] text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title="Download publication-grade ReportLab PDF claiming packet"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#55C6B0]" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-[#55C6B0]" />
            )}
            <span>{downloadingPdf ? 'Generating…' : 'Download Dossier (PDF)'}</span>
          </button>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-[#71808C] hover:text-[#17232E] px-2 py-1 transition cursor-pointer"
            title="Reset demo data"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Deceased Estate Case Notice (if applicable) */}
      {user?.deceased && (
        <div className="rounded-2xl border border-[#C58B3C]/40 bg-[#C58B3C]/10 p-3.5 text-xs text-[#17232E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#C58B3C] shrink-0" />
            <span>
              Municipal death registration indexed for this twin (Reg No:{' '}
              <strong className="font-mono">{user.deceased.registrationNo}</strong>).
            </span>
          </div>
          <Link
            to="/app/cases"
            className="font-semibold text-[#101D2B] hover:text-[#55C6B0] transition underline shrink-0"
          >
            View Active Succession Case &rarr;
          </Link>
        </div>
      )}

      {/* 2. Setup Progress Tracker */}
      {nextStep && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] font-bold tracking-wider text-[#71808C] uppercase">
                ESTATE ONBOARDING
              </span>
              <span className="text-[#DDD7CA]">·</span>
              <span className="font-semibold text-[#17232E] truncate">
                Step {completedCount + 1}: {nextStep.label}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-[#101D2B] shrink-0 ml-2">
              {completedCount} of 4 Complete
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F3ED] my-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#55C6B0] to-[#34765B] transition-all duration-500"
              style={{ width: `${(completedCount / 4) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-end pt-1">
            <Link
              to={nextStep.to}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#101D2B] hover:text-[#55C6B0] transition"
            >
              <span>Proceed to {nextStep.to.replace('/app/', '')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Four Core Financial Metrics Cards */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
      >
        {/* Card 1: Total Discovered Assets */}
        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs hover:border-[#55C6B0]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Total Assets
            </span>
            <span className="h-2 w-2 rounded-full bg-[#55C6B0] shadow-[0_0_8px_rgba(85,198,176,0.6)]" />
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17232E] tabular-nums">
            {inrShort(data?.summary.total || 0)}
          </div>

          <div className="mt-1 text-xs text-[#71808C] font-medium flex items-center justify-between">
            <span>{totalCount} mapped holdings</span>
            <span className="font-mono text-[10px] text-[#71808C]">
              {data?.summary.total ? inr(data.summary.total) : '₹0'}
            </span>
          </div>
        </div>

        {/* Card 2: Nomination Coverage */}
        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs hover:border-[#55C6B0]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Nominee Coverage
            </span>
            <span className="text-[11px] font-bold text-[#55C6B0] font-mono">
              {Math.round(coverageRatio * 100)}%
            </span>
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17232E] tabular-nums">
            {Math.round(coverageRatio * 100)}%
          </div>

          <div className="mt-2 h-1.5 w-full bg-[#F5F3ED] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#55C6B0] to-[#34765B] rounded-full transition-all duration-500"
              style={{ width: `${Math.round(coverageRatio * 100)}%` }}
            />
          </div>

          <div className="mt-1 text-[11px] text-[#71808C] font-medium flex items-center justify-between pt-0.5">
            <span>
              {nominatedHoldings.length} of {totalCount} nominated
            </span>
            <span>{heirs.length} heirs</span>
          </div>
        </div>

        {/* Card 3: At-Risk Amount */}
        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs hover:border-[#C58B3C]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              At-Risk Capital
            </span>
            {atRiskValue > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C45D5D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C45D5D]"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-[#34765B]" />
            )}
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17232E] tabular-nums">
            {inrShort(atRiskValue)}
          </div>

          <div className="mt-1 text-xs font-medium">
            {atRiskValue > 0 ? (
              <span className="text-[#C45D5D] font-semibold">
                {atRiskHoldings.length} unnominated / dormant
              </span>
            ) : (
              <span className="text-[#34765B] font-semibold">
                All holdings compliant
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Verified Identity Status */}
        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs hover:border-[#101D2B]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Verified Identity
            </span>
            {user?.identity ? (
              <span className="h-2 w-2 rounded-full bg-[#34765B]" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-[#C58B3C]" />
            )}
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-[#17232E] font-mono truncate">
            {user?.identity ? user.identity.pan : 'Pending'}
          </div>

          <div className="mt-1 text-xs text-[#71808C] font-medium flex items-center justify-between">
            <span className="truncate">
              {user?.identity ? `${user.identity.state} Domicile` : 'Identity unverified'}
            </span>
            <Link
              to="/app/verify"
              className="text-[#101D2B] hover:text-[#55C6B0] font-semibold text-[11px] underline shrink-0 ml-1"
            >
              {user?.identity ? 'Audit' : 'Verify'}
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 4. Holdings by Regulator & Needs Attention */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Holdings by Regulator (7 columns) */}
        <div className="lg:col-span-7 rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DC]">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#55C6B0]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17232E]">
                Holdings by Statutory Regulator
              </h2>
            </div>
            <Link
              to="/app/aggregate"
              className="text-xs font-semibold text-[#101D2B] hover:text-[#55C6B0] transition"
            >
              All holdings &rarr;
            </Link>
          </div>

          {!holdings.length && !loading ? (
            <div className="py-10 text-center text-xs text-[#71808C] space-y-2">
              <p>No financial assets currently aggregated under consent.</p>
              <Link
                to="/app/aggregate"
                className="inline-flex items-center gap-1 font-semibold text-[#101D2B] hover:underline"
              >
                <span>Authorize Account Aggregator consent</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE6DC]">
              {REGULATOR_CATALOG.map((reg) => {
                const regData = (data?.summary.byRegulator || []).find(
                  (r) => r.regulator === reg.code
                );
                const hasData = regData && regData.count > 0;

                return (
                  <div
                    key={reg.code}
                    className="flex items-center justify-between py-2.5 text-xs hover:bg-[#F5F3ED]/40 px-1 rounded-lg transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RegChip code={reg.code} />
                      <div className="min-w-0">
                        <div className="truncate text-[#17232E] font-medium">
                          {reg.category}
                        </div>
                        <div className="text-[10px] text-[#71808C]">
                          {hasData ? `${regData.count} active accounts` : 'Zero active records'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      {hasData ? (
                        <div className="font-bold text-[#17232E]">
                          {inrShort(regData.value)}
                        </div>
                      ) : (
                        <span className="text-[#DDD7CA] font-normal">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Attention Alert Queue (5 columns) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#DDD7CA] bg-white p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DC]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#C58B3C]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17232E]">
                  Needs Attention
                </h2>
              </div>
              <Link
                to="/app/alerts"
                className="text-xs font-semibold text-[#101D2B] hover:text-[#55C6B0] transition"
              >
                View all ({openAlerts.length}) &rarr;
              </Link>
            </div>

            {openAlerts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#34765B]/10 text-[#34765B] mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-[#17232E]">
                  Estate Is Fully Compliant
                </div>
                <div className="text-[11px] text-[#71808C] mt-0.5">
                  Zero unnominated or dormant holdings detected.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#EAE6DC]">
                {openAlerts.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    to="/app/alerts"
                    className="py-3 flex items-start gap-2.5 text-xs hover:bg-[#F5F3ED]/60 px-1 rounded-lg transition group block"
                  >
                    <span
                      className={cx(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        a.severity === 'high'
                          ? 'bg-[#C45D5D]'
                          : a.severity === 'medium'
                            ? 'bg-[#C58B3C]'
                            : 'bg-[#71808C]'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#17232E] group-hover:text-[#55C6B0] transition truncate">
                        {a.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#71808C]">
                        <span className="font-semibold text-[#17232E]">{a.regulator}</span>
                        <span>·</span>
                        <span className="capitalize">{a.severity} Priority</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {openAlerts.length > 3 && (
            <div className="pt-3 border-t border-[#EAE6DC] mt-2 text-center">
              <Link
                to="/app/alerts"
                className="text-xs font-semibold text-[#101D2B] hover:text-[#55C6B0] transition"
              >
                +{openAlerts.length - 3} more actionable alerts in queue &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Claiming Dossier Email Modal */}
      <EmailDossierModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        pan={user?.identity?.pan}
        defaultEmail={user?.email || ''}
        defaultName={user?.name || ''}
        heirs={heirs}
        title="Email Claiming Dossier"
        subtitle="Personal Financial Twin · Consolidated Asset Packet"
      />
    </motion.div>
  );
}
