import { useEffect, useState } from "react";

import { motion } from "motion/react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  FileDown,
  Loader2,
  Mail,
} from "lucide-react";

import EmailDossierModal from "../components/EmailDossierModal";

import {
  api,
  downloadClaimingDossierPdf,
  type Alert,
  type Heir,
  type Holding,
  type Summary,
  type Regulator,
} from "../lib/api";

import { useAuth } from "../lib/auth";

import { useLive } from "../lib/live";

import { inrShort } from "../lib/format";

import { RegChip, cx } from "../components/ui";

const staggerContainer: any = {
  hidden: { opacity: 0 },

  show: {
    opacity: 1,

    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 14 },

  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const REGULATOR_CATALOG: { code: Regulator; name: string; category: string }[] =
  [
    { code: "RBI", name: "RBI", category: "Bank deposits" },

    { code: "EPFO", name: "EPFO", category: "Provident fund & pension" },

    { code: "IRDAI", name: "IRDAI", category: "Private life insurance" },

    { code: "SEBI", name: "SEBI", category: "Mutual funds & demat" },

    { code: "LIC", name: "LIC", category: "LIC policies" },

    { code: "PFRDA", name: "PFRDA", category: "NPS & Atal Pension" },

    { code: "DOP", name: "DOP", category: "PPF, NSC & small savings" },
  ];

export default function Dashboard() {
  const { user, refresh } = useAuth();

  const [data, setData] = useState<{
    holdings: Holding[];
    summary: Summary;
  } | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [heirs, setHeirs] = useState<Heir[]>([]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);

  const load = () => {
    api<{ holdings: Holding[]; summary: Summary }>("/holdings")
      .then(setData)
      .catch(() => {});

    api<{ alerts: Alert[] }>("/alerts")
      .then((r) => setAlerts(r.alerts))
      .catch(() => {});

    api<{ heirs: Heir[] }>("/heirs")
      .then((r) => setHeirs(r.heirs))
      .catch(() => {});
  };

  useEffect(load, []);

  useLive((e) => {
    if (e.type === "alert")
      setAlerts((a) => [...a.filter((x) => x.id !== e.data.id), e.data]);

    if (e.type === "alert_resolved") load();
  });

  const reset = async () => {
    if (
      !confirm(
        "Reset the demo? This clears your identity, consents, holdings, alerts and cases.",
      )
    )
      return;

    await api("/demo/reset", { body: {} });

    await refresh();

    load();
  };

  const open = alerts.filter((a) => !a.resolved);

  const steps = [
    {
      done: !!user?.identity,
      label: "Verify your identity with every regulator",
      to: "/app/verify",
    },

    {
      done: !!data?.holdings.length,
      label: "Give consent to map your holdings",
      to: "/app/aggregate",
    },

    {
      done:
        !!data?.holdings.length &&
        open.filter((a) => a.severity === "high").length === 0,
      label: "Fix high-priority nominee gaps",
      to: "/app/alerts",
    },

    {
      done: heirs.length > 0,
      label: "Register the heirs who should be reunited",
      to: "/app/heirs",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  const nextStep = steps.find((s) => !s.done);

  const holdings = data?.holdings || [];

  const nominated = holdings.filter(
    (h) => h.nominee?.status === "valid",
  ).length;

  const coverage = holdings.length ? nominated / holdings.length : 0;

  const firstName = user?.identity?.name
    ? user.identity.name.split(" ")[0]
    : user?.name
      ? user.name.split(" ")[0]
      : "Raghavan";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* A. Welcome header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#DDD7CA]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#17232E]">
            Namaste, {firstName}.
          </h1>

          <p className="mt-0.5 text-xs text-[#71808C]">
            Your financial life, in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => setShowEmailModal(true)}

            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-medium text-[#17232E] hover:bg-[#F5F3ED] shadow-xs transition-colors cursor-pointer"

            title="Email statutory claiming dossier with PDF attachment"
          >
            <Mail className="h-3.5 w-3.5 text-[#55C6B0]" />

            <span>Email Dossier</span>
          </button>

          <button
            onClick={async () => {
              try {
                setDownloadingPdf(true);

                await downloadClaimingDossierPdf({ pan: user?.identity?.pan });
              } catch (e) {
                alert((e as Error).message || "Failed to download dossier");
              } finally {
                setDownloadingPdf(false);
              }
            }}

            disabled={downloadingPdf}

            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#101D2B] text-white hover:bg-[#1C3041] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"

            title="Download statutory asset claiming dossier PDF"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#55C6B0]" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-[#55C6B0]" />
            )}

            <span>
              {downloadingPdf ? "Generating…" : "Download Claim Dossier (PDF)"}
            </span>
          </button>

          <button
            onClick={reset}

            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"

            title="Reset demo data"
          >
            <RotateCcw className="h-3.5 w-3.5" />

            <span>Reset demo</span>
          </button>
        </div>
      </div>

      {/* Deceased Estate Case Notice (if applicable) */}

      {user?.deceased && (
        <div className="rounded-lg border border-amber-300/80 bg-amber-50/90 p-3 text-xs text-amber-900 flex items-center justify-between">
          <span>
            A death registration was received for this twin (
            {user.deceased.registrationNo}).
          </span>

          <Link
            to="/app/cases"
            className="font-semibold underline ml-2 text-amber-950 hover:text-amber-700"
          >
            Transfer Case &rarr;
          </Link>
        </div>
      )}

      {/* B. Compact Setup progress */}

      {nextStep && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 transition-all">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
                SETUP YOUR TWIN
              </span>

              <span className="text-slate-300">·</span>

              <span className="font-medium text-slate-800">
                Step {completedCount + 1}: {nextStep.label}
              </span>
            </div>

            <span className="font-mono text-xs font-semibold text-[#71808C]">
              {completedCount}/4
            </span>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 mb-3">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500"

              style={{ width: `${(completedCount / 4) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-end">
            <Link
              to={nextStep.to}

              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
            >
              <span>Continue</span>

              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* C. Four Financial Metrics — Animated Elevated Metric Cards */}

      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* Total mapped */}

        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white/95 p-4 sm:p-5 shadow-xs hover:border-[#55C6B0]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Total Mapped
            </span>

            <span className="h-2 w-2 rounded-full bg-[#55C6B0] shadow-[0_0_8px_rgba(85,198,176,0.6)]" />
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#17232E] tabular-nums">
            {inrShort(data?.summary.total || 0)}
          </div>

          <div className="mt-1 text-xs text-[#71808C] flex items-center gap-1 font-medium">
            <span>{data?.summary.count || 0} holdings across registries</span>
          </div>
        </div>

        {/* At risk */}

        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white/95 p-4 sm:p-5 shadow-xs hover:border-amber-400/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              At Risk
            </span>

            {(data?.summary.atRisk || 0) > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>

                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-[#34765B]" />
            )}
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#17232E] tabular-nums">
            {inrShort(data?.summary.atRisk || 0)}
          </div>

          <div className="mt-1 text-xs text-[#71808C] font-medium">
            {(data?.summary.atRisk || 0) > 0 ? (
              <span className="text-rose-600 font-semibold">
                Missing statutory nominee
              </span>
            ) : (
              <span className="text-[#34765B] font-semibold">
                All holdings nominated
              </span>
            )}
          </div>
        </div>

        {/* Open alerts */}

        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white/95 p-4 sm:p-5 shadow-xs hover:border-[#101D2B]/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Open Alerts
            </span>

            {open.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                {open.filter((a) => a.severity === "high").length} High
              </span>
            )}
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#17232E] tabular-nums">
            {open.length}
          </div>

          <div className="mt-1 text-xs text-[#71808C] font-medium">
            Regulatory & nominee actions
          </div>
        </div>

        {/* Nominee coverage */}

        <div className="card-shine rounded-2xl border border-[#DDD7CA] bg-white/95 p-4 sm:p-5 shadow-xs hover:border-[#55C6B0]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-wider uppercase text-[#71808C]">
              Nominee Coverage
            </span>

            <span className="text-[10px] font-bold text-[#55C6B0]">
              {Math.round(coverage * 100)}%
            </span>
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#17232E] tabular-nums">
            {Math.round(coverage * 100)}%
          </div>

          <div className="mt-1 text-xs text-[#71808C] font-medium flex items-center gap-1">
            <span>{heirs.length} registered family heirs</span>
          </div>
        </div>
      </motion.div>

      {/* D & E. Holdings by Regulator + Needs Attention */}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* D. Holdings by regulator (7 cols) */}

        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71808C]">
              Holdings by Regulator
            </h2>

            <Link
              to="/app/aggregate"

              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              All holdings &rarr;
            </Link>
          </div>

          {!holdings.length ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p>Nothing mapped yet.</p>

              <Link
                to="/app/aggregate"

                className="mt-2 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
              >
                Map holdings under consent &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {REGULATOR_CATALOG.map((reg) => {
                const regData = (data?.summary.byRegulator || []).find(
                  (r) => r.regulator === reg.code,
                );

                const hasData = regData && regData.count > 0;

                return (
                  <div
                    key={reg.code}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RegChip code={reg.code} />

                      <span className="truncate text-slate-700 font-medium">
                        {reg.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      {hasData ? (
                        <span className="font-semibold text-[#17232E]">
                          {inrShort(regData.value)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* E. Needs attention (5 cols) */}

        <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71808C]">
                Needs Attention
              </h2>

              <Link
                to="/app/alerts"

                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                View all ({open.length}) &rarr;
              </Link>
            </div>

            {open.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div className="text-xs font-medium text-slate-800">
                  You're all caught up.
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5">
                  Zero unresolved nominee gaps.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {open.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="py-2.5 flex items-start gap-2.5 text-xs"
                  >
                    <span
                      className={cx(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",

                        a.severity === "high"
                          ? "bg-rose-500"
                          : a.severity === "medium"
                            ? "bg-amber-500"
                            : "bg-slate-400",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#17232E] truncate">
                        {a.title}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#71808C]">
                        <span>{a.regulator}</span>

                        <span>·</span>

                        <span className="capitalize">{a.severity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {open.length > 3 && (
            <div className="pt-2.5 border-t border-slate-100 mt-2 text-center">
              <Link
                to="/app/alerts"

                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                +{open.length - 3} more alerts in queue &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      <EmailDossierModal
        isOpen={showEmailModal}

        onClose={() => setShowEmailModal(false)}

        pan={user?.identity?.pan}

        defaultEmail={user?.email || ""}

        defaultName={user?.name || ""}

        heirs={heirs}

        title="Email Claiming Dossier"

        subtitle="Personal Financial Twin · Consolidated Asset Packet"
      />
    </motion.div>
  );
}
