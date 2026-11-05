import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellOff,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Landmark,
  Loader2,
  RefreshCw,
  Check
} from "lucide-react";
import {
  api,
  getRegulations,
  pollRegulations,
  type Alert,
  type Heir,
  type Holding,
  type RegulatoryCircular,
} from "../lib/api";
import { useLive, useLiveStatus } from "../lib/live";
import { inr, time } from "../lib/format";
import {
  Button,
  ErrorNote,
  Input,
  RegChip,
  Select,
  cx,
  useToast
} from "../components/ui";

const NOMINEE_KINDS = ["nominee_missing", "nominee_deceased", "nominee_minor"];
const RELATIONS = [
  "Spouse",
  "Son",
  "Daughter",
  "Mother",
  "Father",
  "Brother",
  "Sister",
  "Other",
];

type FilterKey = "all" | "high" | "medium" | "low" | "resolved";

function SeverityChip({
  severity,
  resolved,
}: {
  severity: Alert["severity"];
  resolved: boolean;
}) {
  if (resolved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#34765B] bg-[#34765B]/10 px-2.5 py-0.5 rounded-full ring-1 ring-[#34765B]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[#34765B]" />
        Resolved
      </span>
    );
  }

  if (severity === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C45D5D] bg-[#C45D5D]/10 px-2.5 py-0.5 rounded-full ring-1 ring-[#C45D5D]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C45D5D] animate-pulse" />
        High Severity
      </span>
    );
  }

  if (severity === "medium") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C58B3C] bg-[#C58B3C]/10 px-2.5 py-0.5 rounded-full ring-1 ring-[#C58B3C]/30">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C58B3C]" />
        Medium
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#71808C] bg-[#F5F3ED] px-2.5 py-0.5 rounded-full ring-1 ring-[#DDD7CA]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#71808C]" />
      Low
    </span>
  );
}

function getConciseSummary(a: Alert, h?: Holding): string {
  if (a.kind === "nominee_missing") {
    return `No nominee is registered for this ${h?.type ? h.type.toLowerCase() : "asset"}. Under statutory rules, claims will require succession certification.`;
  }
  if (a.kind === "nominee_minor") {
    return "The registered nominee is a minor and requires a designated legal appointee/guardian.";
  }
  if (a.kind === "nominee_deceased") {
    return "The registered nominee is recorded as deceased in civil registration records. Immediate nomination update required.";
  }
  if (a.kind === "name_mismatch") {
    return "Account holder name differs from verified statutory PAN records.";
  }
  if (a.kind === "inoperative" || a.kind === "dormant") {
    return "Asset is flagged inoperative due to 24-month statutory inactivity. At risk of DEA Fund / IEPF transfer.";
  }
  if (a.kind === "stale_kyc") {
    return "Periodic regulatory KYC refresh is overdue under RBI/SEBI Master Directions.";
  }
  return a.detail.split(".")[0] + ".";
}

export default function Alerts() {
  const nav = useNavigate();
  const connected = useLiveStatus();
  const { success: toastSuccess, error: toastError } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [holdings, setHoldings] = useState<Record<string, Holding>>({});
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [regulations, setRegulations] = useState<RegulatoryCircular[]>([]);
  const [pollingRegs, setPollingRegs] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [selectedRegulator, setSelectedRegulator] = useState<string>("all");
  const [showRegs, setShowRegs] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const load = () => {
    api<{ alerts: Alert[] }>("/alerts")
      .then((r) => setAlerts(r.alerts || []))
      .catch(() => {});
    api<{ holdings: Holding[] }>("/holdings")
      .then((r) =>
        setHoldings(Object.fromEntries((r.holdings || []).map((h) => [h.id, h]))),
      )
      .catch(() => {});
  };

  useEffect(() => {
    load();
    api<{ heirs: Heir[] }>("/heirs")
      .then((r) => setHeirs(r.heirs || []))
      .catch(() => {});
    getRegulations()
      .then((r) => setRegulations(r.regulations || []))
      .catch(() => {});
  }, []);

  useLive((e) => {
    if (e.type === "alert") {
      setAlerts((all) => {
        const next = [e.data, ...all.filter((x) => x.id !== e.data.id)];
        return next;
      });
      setFlash(e.data.id);
      setTimeout(() => setFlash(null), 2500);
    }
    if (e.type === "alert_resolved") {
      setAlerts((all) =>
        all.map((a) => (a.id === e.data.id ? { ...a, resolved: true } : a)),
      );
    }
  });

  const handleResolveAlert = async (id: string) => {
    setActionBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await api(`/alerts/${id}/resolve`, { method: "POST" });
      setAlerts((all) =>
        all.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
      );
      toastSuccess("Alert Resolved", "Status updated on backend store.");
    } catch (e) {
      toastError("Failed to Resolve", (e as Error).message);
    } finally {
      setActionBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  const reactivate = async (holdingId: string) => {
    try {
      await api(`/holdings/${holdingId}/reactivate`, { method: "POST" });
      toastSuccess("Asset Reactivated", "Statutory reactivation notice submitted to CBS.");
      load();
    } catch {
      load();
    }
  };

  const handlePollRegulations = async () => {
    setPollingRegs(true);
    setPollResult(null);
    try {
      const res = await pollRegulations();
      const s = (res as any)?.summary || {};
      setPollResult(
        `Indexed ${s.total_new ?? 0} new circulars (${s.total_existing ?? 0} verified up-to-date).`,
      );
      const regs = await getRegulations();
      setRegulations(regs.regulations || []);
    } catch (e) {
      setPollResult((e as Error).message || "Failed to poll regulatory circulars");
    } finally {
      setPollingRegs(false);
    }
  };

  // Group identical alerts (matching kind, holdingId, regulator, resolved state)
  const groupedAlerts = useMemo(() => {
    const map = new Map<string, { rep: Alert; count: number; items: Alert[] }>();
    for (const a of alerts) {
      const key = `${a.kind}::${a.holdingId}::${a.regulator}::${a.resolved ? 'res' : 'open'}`;
      if (!map.has(key)) {
        map.set(key, { rep: a, count: 1, items: [a] });
      } else {
        const entry = map.get(key)!;
        entry.count += 1;
        entry.items.push(a);
      }
    }
    return Array.from(map.values());
  }, [alerts]);

  const openAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  const highCount = openAlerts.filter((a) => a.severity === "high").length;
  const medCount = openAlerts.filter((a) => a.severity === "medium").length;
  const lowCount = openAlerts.filter((a) => a.severity === "low").length;

  // Filter grouped alerts based on active filter card
  const filteredGroups = useMemo(() => {
    if (filter === "resolved") {
      return groupedAlerts.filter((g) => g.rep.resolved);
    }
    const openGroups = groupedAlerts.filter((g) => !g.rep.resolved);
    if (filter === "all") return openGroups;
    return openGroups.filter((g) => g.rep.severity === filter);
  }, [groupedAlerts, filter]);

  // Group duplicate regulations by canonical key (regulator + normalized title)
  const groupedRegulations = useMemo(() => {
    const map = new Map<
      string,
      { rep: RegulatoryCircular; count: number; items: RegulatoryCircular[] }
    >();
    for (const reg of regulations) {
      const normTitle = reg.fileName
        .replace(/^\[[^\]]+\]\s*/, "")
        .trim()
        .toLowerCase();
      const key = `${reg.regulator.toLowerCase()}::${normTitle}`;
      if (!map.has(key)) {
        map.set(key, { rep: reg, count: 1, items: [reg] });
      } else {
        const entry = map.get(key)!;
        entry.count += 1;
        entry.items.push(reg);
      }
    }
    return Array.from(map.values());
  }, [regulations]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-12"
    >
      {/* Step 2 — Clean Simplified Page Header */}
      <div className="pb-4 border-b border-[#DDD7CA] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101D2B]">
            Alerts
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Issues that need your attention
          </p>
        </div>

        {/* Real-time Connection Status */}
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[#DDD7CA] bg-white px-3 py-1 flex items-center gap-2 shadow-xs text-xs">
            <span
              className={cx(
                "h-2 w-2 rounded-full",
                connected ? "bg-[#34765B] animate-pulse" : "bg-[#71808C]"
              )}
            />
            <span className="font-medium text-[#17232E]">
              {connected ? "Live Telemetry Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Step 3 — Summary Counters as Interactive Filters (No duplicate filter rows) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cx(
            "rounded-2xl border p-4 text-left transition cursor-pointer shadow-xs",
            filter === "all"
              ? "border-[#101D2B] bg-[#101D2B] text-white shadow-sm ring-1 ring-[#55C6B0]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#101D2B]/50"
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold",
              filter === "all" ? "text-[#55C6B0]" : "text-[#71808C]"
            )}
          >
            Open Alerts
          </div>
          <div
            className={cx(
              "text-2xl font-bold tracking-tight mt-1 tabular-nums",
              filter === "all" ? "text-white" : "text-[#101D2B]"
            )}
          >
            {openAlerts.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("high")}
          className={cx(
            "rounded-2xl border p-4 text-left transition cursor-pointer shadow-xs",
            filter === "high"
              ? "border-[#C45D5D] bg-[#C45D5D] text-white shadow-sm ring-1 ring-[#F5F3ED]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#C45D5D]/50"
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "high" ? "text-white/80" : "text-[#71808C]"
            )}
          >
            <span
              className={cx(
                "h-2 w-2 rounded-full",
                filter === "high" ? "bg-white" : "bg-[#C45D5D]"
              )}
            />
            High Severity
          </div>
          <div
            className={cx(
              "text-2xl font-bold tracking-tight mt-1 tabular-nums",
              filter === "high" ? "text-white" : "text-[#C45D5D]"
            )}
          >
            {highCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("medium")}
          className={cx(
            "rounded-2xl border p-4 text-left transition cursor-pointer shadow-xs",
            filter === "medium"
              ? "border-[#C58B3C] bg-[#C58B3C] text-white shadow-sm ring-1 ring-[#F5F3ED]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#C58B3C]/50"
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "medium" ? "text-white/80" : "text-[#71808C]"
            )}
          >
            <span
              className={cx(
                "h-2 w-2 rounded-full",
                filter === "medium" ? "bg-white" : "bg-[#C58B3C]"
              )}
            />
            Medium
          </div>
          <div
            className={cx(
              "text-2xl font-bold tracking-tight mt-1 tabular-nums",
              filter === "medium" ? "text-white" : "text-[#C58B3C]"
            )}
          >
            {medCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("low")}
          className={cx(
            "rounded-2xl border p-4 text-left transition cursor-pointer shadow-xs",
            filter === "low"
              ? "border-[#1C3041] bg-[#1C3041] text-white shadow-sm ring-1 ring-[#55C6B0]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#1C3041]/50"
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "low" ? "text-[#55C6B0]" : "text-[#71808C]"
            )}
          >
            <span
              className={cx(
                "h-2 w-2 rounded-full",
                filter === "low" ? "bg-[#55C6B0]" : "bg-[#71808C]"
              )}
            />
            Low Severity
          </div>
          <div
            className={cx(
              "text-2xl font-bold tracking-tight mt-1 tabular-nums",
              filter === "low" ? "text-white" : "text-[#101D2B]"
            )}
          >
            {lowCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("resolved")}
          className={cx(
            "rounded-2xl border p-4 text-left transition cursor-pointer col-span-2 sm:col-span-1 shadow-xs",
            filter === "resolved"
              ? "border-[#34765B] bg-[#34765B] text-white shadow-sm ring-1 ring-[#55C6B0]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#34765B]/50"
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "resolved" ? "text-white/80" : "text-[#71808C]"
            )}
          >
            <span
              className={cx(
                "h-2 w-2 rounded-full",
                filter === "resolved" ? "bg-white" : "bg-[#34765B]"
              )}
            />
            Resolved
          </div>
          <div
            className={cx(
              "text-2xl font-bold tracking-tight mt-1 tabular-nums",
              filter === "resolved" ? "text-white" : "text-[#34765B]"
            )}
          >
            {resolvedAlerts.length}
          </div>
        </button>
      </div>

      {/* Step 4 & 5 — Actionable Alerts Stream with Deduplication */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-12 text-center bg-white shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3ED] text-[#71808C] mb-3">
            {filter === "resolved" ? (
              <BellOff className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-[#34765B]" />
            )}
          </div>
          <p className="text-sm font-bold text-[#101D2B]">
            {filter === "resolved"
              ? "No resolved alerts recorded"
              : filter === "all"
                ? "No open compliance issues"
                : `No ${filter}-severity alerts`}
          </p>
          <p className="mt-1 text-xs text-[#71808C] max-w-sm mx-auto">
            {filter === "resolved"
              ? "Resolving or dismissing compliance notices above will record them in this ledger."
              : "All audited financial holdings adhere to current statutory guidelines."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#DDD7CA]/60 overflow-hidden shadow-xs">
          {filteredGroups.map(({ rep: a, count }) => {
            const h = holdings[a.holdingId];
            const isNominee = NOMINEE_KINDS.includes(a.kind);
            const isExpanded = !!expandedDetails[a.id];
            const isBusy = !!actionBusy[a.id];

            return (
              <div
                key={a.id}
                className={cx(
                  "p-4 sm:px-5 sm:py-4 transition-colors",
                  flash === a.id && "bg-[#55C6B0]/10",
                  a.resolved
                    ? "opacity-75 hover:opacity-100 bg-[#F5F3ED]/30"
                    : "hover:bg-[#F5F3ED]/40"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                  {/* Left Column: Top line + Concise Explanation + Asset metadata */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Top line: Severity + Short Title + Regulator + Duplicate Counter */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityChip severity={a.severity} resolved={a.resolved} />
                      <span className="font-bold text-sm text-[#101D2B]">
                        {a.title}
                      </span>
                      <RegChip code={a.regulator} />
                      {count > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F3ED] text-[#17232E] border border-[#DDD7CA] font-mono">
                          {count} matching folios
                        </span>
                      )}
                    </div>

                    {/* Concise Explanation */}
                    <p className="text-xs text-[#17232E] font-medium leading-relaxed">
                      {getConciseSummary(a, h)}
                    </p>

                    {/* Supporting Asset Information */}
                    {h && (
                      <div className="pt-0.5 text-xs text-[#71808C] flex items-center gap-2 flex-wrap font-mono">
                        <span className="font-semibold text-[#101D2B]">
                          {h.institution}
                        </span>
                        <span className="text-[#DDD7CA]">·</span>
                        <span>{h.ref}</span>
                        <span className="text-[#DDD7CA]">·</span>
                        <span className="font-sans font-medium text-[#17232E]">
                          {h.type}
                        </span>
                        <span className="text-[#DDD7CA]">·</span>
                        <span className="font-sans font-bold text-[#101D2B] tabular-nums">
                          {inr(h.value)}
                        </span>
                        <span className="text-[#DDD7CA]">·</span>
                        <button
                          type="button"
                          onClick={() => toggleDetails(a.id)}
                          className="font-sans text-[11px] text-[#71808C] hover:text-[#101D2B] underline cursor-pointer"
                        >
                          {isExpanded ? "Hide details" : "More details"}
                        </button>
                      </div>
                    )}

                    {/* Expandable Technical Details Area */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-xl bg-[#F5F3ED] border border-[#DDD7CA] text-xs text-[#17232E] space-y-1.5"
                        >
                          <div className="leading-relaxed">{a.detail}</div>
                          <div className="text-[11px] text-[#71808C] font-mono flex items-center gap-2 pt-1 border-t border-[#DDD7CA]">
                            <span>Raised: {time(a.createdAt)}</span>
                            <span>·</span>
                            <span>Classification: {a.kind}</span>
                            <span>·</span>
                            <span>Holding ID: {a.holdingId}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right Column: Contextual Actions */}
                  {!a.resolved && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#DDD7CA]/60">
                      {/* Contextual remediation action */}
                      {isNominee ? (
                        <Button
                          size="sm"
                          onClick={() => setEditing(editing === a.id ? null : a.id)}
                          className="rounded-full text-xs font-semibold px-4 bg-[#101D2B] text-white hover:bg-[#1C3041]"
                        >
                          {editing === a.id
                            ? "Close Form"
                            : a.kind === "nominee_minor"
                              ? "Designate Guardian"
                              : "Update Nominee"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => reactivate(a.holdingId)}
                          className="rounded-full text-xs font-semibold px-4 bg-[#101D2B] text-white hover:bg-[#1C3041]"
                        >
                          {a.kind === "name_mismatch" ? "Submit PAN Match" : "Re-KYC & Reactivate"}
                        </Button>
                      )}

                      {/* Ask AI Contextual Guide */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          nav(
                            "/app/guide?q=" +
                              encodeURIComponent(
                                `How do I resolve this statutory alert: ${a.title} on ${a.regulator}?`,
                              ),
                          )
                        }
                        className="rounded-full text-xs font-semibold border-[#DDD7CA] text-[#17232E] hover:bg-[#F5F3ED]"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#101D2B]" />
                        <span>Ask AI</span>
                      </Button>

                      {/* Dismiss / Resolve Action */}
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={isBusy}
                        onClick={() => handleResolveAlert(a.id)}
                        className="rounded-full text-xs text-[#71808C] hover:text-[#101D2B] hover:bg-[#DDD7CA]/30"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {a.resolved && (
                    <div className="flex items-center gap-1.5 text-xs text-[#34765B] font-semibold shrink-0 pt-1 lg:pt-0">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Compliant / Resolved</span>
                    </div>
                  )}
                </div>

                {/* Inline Nominee Form when editing */}
                {editing === a.id && h && (
                  <NomineeForm
                    holding={h}
                    heirs={heirs}
                    minor={a.kind === "nominee_minor"}
                    onDone={() => {
                      setEditing(null);
                      load();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step 6 — Collapsible Regulatory Intelligence Section (Collapsed by Default) */}
      <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/60 p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#101D2B] text-white p-2.5">
              <Landmark className="h-4 w-4 text-[#55C6B0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#101D2B]">
                  Regulatory Circulars & Statutory Directions
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#101D2B] font-semibold border border-[#DDD7CA]">
                  {groupedRegulations.length} Circulars Indexed
                </span>
              </div>
              <p className="text-xs text-[#71808C]">
                Official gazette settlement timelines and penalty directions from RBI, SEBI, EPFO & IRDAI.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowRegs(!showRegs)}
            className="rounded-full text-xs font-semibold gap-1.5 border-[#DDD7CA] text-[#17232E] hover:bg-white"
          >
            {showRegs ? (
              <>
                <span>Hide Regulatory Feed</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>View Regulatory Feed</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>

        {pollResult && (
          <div className="rounded-xl bg-white border border-[#DDD7CA] p-3 text-xs text-[#101D2B] flex items-center justify-between shadow-xs">
            <span>{pollResult}</span>
            <button
              type="button"
              onClick={() => setPollResult(null)}
              className="text-[#71808C] hover:text-[#101D2B] cursor-pointer text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence>
          {showRegs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-3 border-t border-[#DDD7CA]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#DDD7CA] text-xs">
                {/* Regulator Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#71808C] uppercase tracking-wider mr-1">
                    Regulator:
                  </span>
                  {["all", "RBI", "SEBI", "EPFO", "IRDAI"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRegulator(r)}
                      className={cx(
                        "px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer",
                        selectedRegulator.toUpperCase() === r.toUpperCase()
                          ? "bg-[#101D2B] text-white shadow-xs"
                          : "bg-[#F5F3ED] border border-[#DDD7CA] text-[#17232E] hover:bg-white"
                      )}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePollRegulations}
                    disabled={pollingRegs}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-semibold text-[#101D2B] hover:bg-[#F5F3ED] transition cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {pollingRegs ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#101D2B]" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-[#101D2B]" />
                    )}
                    <span>{pollingRegs ? "Polling Portals..." : "Sync Regulations"}</span>
                  </button>
                </div>
              </div>

              {/* Grouped Circulars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedRegulator === "all"
                  ? groupedRegulations
                  : groupedRegulations.filter(
                      (x) =>
                        x.rep.regulator.toUpperCase() === selectedRegulator.toUpperCase(),
                    )
                ).map(({ rep: reg, count }) => (
                  <div
                    key={reg.id}
                    className="rounded-2xl border border-[#DDD7CA] bg-white p-4 space-y-2 text-xs shadow-xs hover:border-[#101D2B]/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F3ED] text-[#101D2B] border border-[#DDD7CA]">
                          {reg.regulator}
                        </span>
                        {count > 1 && (
                          <span className="text-[10px] bg-[#DDD7CA]/50 text-[#17232E] font-semibold rounded-full px-2 py-0.5 border border-[#DDD7CA]">
                            {count} notices
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#71808C] font-medium">
                        {reg.publicationDate || "Recent Circular"}
                      </span>
                    </div>

                    <div className="font-bold text-[#101D2B] line-clamp-2">
                      {reg.fileName.replace(/^\[[^\]]+\]\s*/, "")}
                    </div>

                    {reg.circularNo && (
                      <div className="font-mono text-[11px] text-[#101D2B] font-semibold">
                        Ref: {reg.circularNo}
                      </div>
                    )}

                    {reg.extractedText && (
                      <p className="text-[#17232E] line-clamp-2 text-[11px] leading-relaxed">
                        {reg.extractedText}
                      </p>
                    )}

                    {reg.sourceUrl && (
                      <div className="pt-2 flex items-center justify-between border-t border-[#DDD7CA]/60 text-[11px]">
                        <a
                          href={reg.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#101D2B] hover:underline font-semibold"
                        >
                          <span>Official Gazette Notice</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-[#34765B] font-mono text-[10px] font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>Indexed in Vault</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function NomineeForm({
  holding,
  heirs,
  minor,
  onDone,
}: {
  holding: Holding;
  heirs: Heir[];
  minor: boolean;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    name: minor ? holding.nominee?.name || "" : "",
    relation: minor ? holding.nominee?.relation || "Son" : "Spouse",
    guardian: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/holdings/${holding.id}/nominee`, {
        method: "PATCH",
        body: f,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED] p-4 sm:p-5 space-y-3.5 shadow-xs">
      {heirs.length > 0 && !minor && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#71808C] text-[11px] font-semibold">Assign from Legal Heirs:</span>
          {heirs.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setF({ ...f, name: h.name, relation: h.relation })}
              className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#101D2B] border border-[#DDD7CA] hover:bg-[#F5F3ED] transition"
            >
              {h.name} ({h.relation})
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Nominee full name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          className="rounded-full border-[#DDD7CA] bg-white text-xs"
        />
        <Select
          value={f.relation}
          onChange={(e) => setF({ ...f, relation: e.target.value })}
          className="rounded-full border-[#DDD7CA] bg-white text-xs"
        >
          {RELATIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {minor && (
          <Input
            placeholder="Guardian / Appointee Name"
            value={f.guardian}
            onChange={(e) => setF({ ...f, guardian: e.target.value })}
            className="rounded-full border-[#DDD7CA] bg-white text-xs"
          />
        )}
      </div>
      <ErrorNote msg={err} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <span className="text-[#71808C] text-[11px]">
          Transmits nomination revision form to {holding.institution} registrar.
        </span>
        <Button
          size="sm"
          loading={busy}
          disabled={!f.name || (minor && !f.guardian)}
          onClick={save}
          className="rounded-full px-5 bg-[#101D2B] text-white hover:bg-[#1C3041]"
        >
          Submit Nomination Update
        </Button>
      </div>
    </div>
  );
}
