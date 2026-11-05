import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import {
  api,
  getRegulations,
  pollRegulations,
  crawlRegulations,
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
} from "../components/ui";
import { motion } from "motion/react";

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
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-[#34765B]" />
        Resolved
      </span>
    );
  }

  if (severity === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full ring-1 ring-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
        High
      </span>
    );
  }

  if (severity === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        Medium
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#71808C] bg-white px-2.5 py-0.5 rounded-full ring-1 ring-[#DDD7CA]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#71808C]" />
      Low
    </span>
  );
}

function getConciseSummary(a: Alert, h?: Holding): string {
  if (a.kind === "nominee_missing") {
    return `No nominee is registered for this ${h?.type ? h.type.toLowerCase() : "asset"}.`;
  }
  if (a.kind === "nominee_minor") {
    return "The registered nominee is a minor and requires a legal guardian appointment.";
  }
  if (a.kind === "nominee_deceased") {
    return "The registered nominee is recorded as deceased in civil registration records.";
  }
  if (a.kind === "name_mismatch") {
    return "Account holder name differs from the verified statutory PAN registry.";
  }
  if (a.kind === "inoperative" || a.kind === "dormant") {
    return "Asset is flagged inoperative due to statutory 24-month inactivity.";
  }
  if (a.kind === "stale_kyc") {
    return "Periodic regulatory KYC refresh is overdue under Master Directions.";
  }
  return a.detail.split(".")[0] + ".";
}

export default function Alerts() {
  const nav = useNavigate();
  const connected = useLiveStatus();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [holdings, setHoldings] = useState<Record<string, Holding>>({});
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<string, boolean>
  >({});
  const [flash, setFlash] = useState<string | null>(null);
  const [regulations, setRegulations] = useState<RegulatoryCircular[]>([]);
  const [pollingRegs, setPollingRegs] = useState(false);
  const [crawlingScrapy, setCrawlingScrapy] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [selectedRegulator, setSelectedRegulator] = useState<string>("all");
  const [showRegs, setShowRegs] = useState<boolean>(false);

  const load = () => {
    api<{ alerts: Alert[] }>("/alerts")
      .then((r) => setAlerts(r.alerts))
      .catch(() => {});
    api<{ holdings: Holding[] }>("/holdings")
      .then((r) =>
        setHoldings(Object.fromEntries(r.holdings.map((h) => [h.id, h]))),
      )
      .catch(() => {});
  };

  useEffect(() => {
    load();
    api<{ heirs: Heir[] }>("/heirs")
      .then((r) => setHeirs(r.heirs))
      .catch(() => {});
    getRegulations()
      .then((r) => setRegulations(r.regulations))
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

  const dismiss = async (id: string) => {
    try {
      await api(`/alerts/${id}/dismiss`, { method: "POST" });
      setAlerts((all) =>
        all.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
      );
    } catch {
      setAlerts((all) =>
        all.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
      );
    }
  };

  const reactivate = async (holdingId: string) => {
    try {
      await api(`/holdings/${holdingId}/reactivate`, { method: "POST" });
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
      setRegulations(regs.regulations);
    } catch (e) {
      setPollResult(
        (e as Error).message || "Failed to poll regulatory circulars",
      );
    } finally {
      setPollingRegs(false);
    }
  };

  const handleRunScrapy = async () => {
    setCrawlingScrapy(true);
    setPollResult(null);
    try {
      const res = await crawlRegulations();
      setPollResult(
        `Scrapy complete: ${res.spidersRun} spiders run, ${res.totalRegulationsInVault} indexed into Document Vault.`,
      );
      const regs = await getRegulations();
      setRegulations(regs.regulations);
    } catch (e) {
      setPollResult((e as Error).message || "Failed to execute Scrapy crawler");
    } finally {
      setCrawlingScrapy(false);
    }
  };

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

  const openAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  const highCount = openAlerts.filter((a) => a.severity === "high").length;
  const medCount = openAlerts.filter((a) => a.severity === "medium").length;
  const lowCount = openAlerts.filter((a) => a.severity === "low").length;

  const list = useMemo(() => {
    if (filter === "resolved") return resolvedAlerts;
    if (filter === "all") return openAlerts;
    return openAlerts.filter((a) => a.severity === filter);
  }, [openAlerts, resolvedAlerts, filter]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Clean Page Header */}
      <div className="pb-4 border-b border-[#DDD7CA] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17232E]">
            Alerts
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Issues that need your attention.
          </p>
        </div>
      </div>

      {/* Compact Interactive Summary Metrics Cards (The ONLY Filter Control) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cx(
            "rounded-xl border p-3 text-left transition cursor-pointer",
            filter === "all"
              ? "border-[#101D2B] bg-[#101D2B] text-white shadow-sm ring-1 ring-[#55C6B0]"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#101D2B]/50",
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold",
              filter === "all" ? "text-[#9BA7B2]" : "text-[#71808C]",
            )}
          >
            Open Alerts
          </div>
          <div
            className={cx(
              "text-xl font-bold tracking-tight mt-0.5 tabular-nums",
              filter === "all" ? "text-white" : "text-[#17232E]",
            )}
          >
            {openAlerts.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("high")}
          className={cx(
            "rounded-xl border p-3 text-left transition cursor-pointer",
            filter === "high"
              ? "border-rose-600 bg-rose-600 text-white shadow-sm"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-rose-300",
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "high" ? "text-rose-100" : "text-[#71808C]",
            )}
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                filter === "high" ? "bg-white" : "bg-rose-500",
              )}
            />
            High
          </div>
          <div
            className={cx(
              "text-xl font-bold tracking-tight mt-0.5 tabular-nums",
              filter === "high" ? "text-white" : "text-[#C45D5D]",
            )}
          >
            {highCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("medium")}
          className={cx(
            "rounded-xl border p-3 text-left transition cursor-pointer",
            filter === "medium"
              ? "border-amber-600 bg-amber-600 text-white shadow-sm"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-amber-300",
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "medium" ? "text-amber-100" : "text-[#71808C]",
            )}
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                filter === "medium" ? "bg-white" : "bg-amber-500",
              )}
            />
            Medium
          </div>
          <div
            className={cx(
              "text-xl font-bold tracking-tight mt-0.5 tabular-nums",
              filter === "medium" ? "text-white" : "text-[#C58B3C]",
            )}
          >
            {medCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("low")}
          className={cx(
            "rounded-xl border p-3 text-left transition cursor-pointer",
            filter === "low"
              ? "border-[#1C3041] bg-[#1C3041] text-white shadow-sm"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-[#1C3041]",
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "low" ? "text-slate-200" : "text-[#71808C]",
            )}
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                filter === "low" ? "bg-white" : "bg-[#71808C]",
              )}
            />
            Low
          </div>
          <div
            className={cx(
              "text-xl font-bold tracking-tight mt-0.5 tabular-nums",
              filter === "low" ? "text-white" : "text-[#17232E]",
            )}
          >
            {lowCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("resolved")}
          className={cx(
            "rounded-xl border p-3 text-left transition cursor-pointer col-span-2 sm:col-span-1",
            filter === "resolved"
              ? "border-emerald-600 bg-[#34765B] text-white shadow-sm"
              : "border-[#DDD7CA] bg-white text-[#17232E] hover:border-emerald-300",
          )}
        >
          <div
            className={cx(
              "text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5",
              filter === "resolved" ? "text-emerald-100" : "text-[#71808C]",
            )}
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                filter === "resolved" ? "bg-white" : "bg-emerald-500",
              )}
            />
            Resolved
          </div>
          <div
            className={cx(
              "text-xl font-bold tracking-tight mt-0.5 tabular-nums",
              filter === "resolved" ? "text-white" : "text-[#34765B]",
            )}
          >
            {resolvedAlerts.length}
          </div>
        </button>
      </div>

      {/* Actionable Personal Alerts Stream */}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-8 text-center bg-white">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3ED] text-[#71808C] mb-2">
            {filter === "resolved" ? (
              <BellOff className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-[#34765B]" />
            )}
          </div>
          <p className="text-xs font-semibold text-[#17232E]">
            {filter === "resolved"
              ? "No resolved alerts yet"
              : filter === "all"
                ? "No open alerts"
                : `No ${filter}-severity alerts`}
          </p>
          <p className="mt-0.5 text-xs text-[#71808C]">
            {filter === "resolved"
              ? "Resolve an alert above and it will be recorded here."
              : "All holdings are compliant or no statutory issues have been detected."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#EAE6DC] overflow-hidden shadow-xs">
          {list.map((a) => {
            const h = holdings[a.holdingId];
            const isNominee = NOMINEE_KINDS.includes(a.kind);
            const isExpanded = !!expandedDetails[a.id];

            return (
              <div
                key={a.id}
                className={cx(
                  "p-4 sm:px-5 sm:py-3.5 transition-colors",
                  flash === a.id && "bg-[#55C6B0]/10",
                  a.resolved
                    ? "opacity-70 hover:opacity-100"
                    : "hover:bg-[#F5F3ED]/50",
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                  {/* Left Column: Top line + Main content + Supporting info */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Top line: Severity + Alert title + Regulator */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityChip
                        severity={a.severity}
                        resolved={a.resolved}
                      />
                      <span className="font-bold text-sm text-[#17232E]">
                        {a.title}
                      </span>
                      <RegChip code={a.regulator} />
                    </div>

                    {/* Main content: Concise explanation */}
                    <p className="text-xs text-[#17232E] font-medium leading-relaxed">
                      {getConciseSummary(a, h)}
                    </p>

                    {/* Supporting info: Institution, masked ref, asset type, value */}
                    {h && (
                      <div className="pt-0.5 text-xs text-[#71808C] flex items-center gap-2 flex-wrap font-mono">
                        <span className="font-semibold text-[#17232E]">
                          {h.institution}
                        </span>
                        <span>·</span>
                        <span>{h.ref}</span>
                        <span>·</span>
                        <span className="font-sans font-medium text-[#17232E]">
                          {h.type}
                        </span>
                        <span>·</span>
                        <span className="font-sans font-bold text-[#101D2B] tabular-nums">
                          {inr(h.value)}
                        </span>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => toggleDetails(a.id)}
                          className="font-sans text-[11px] text-[#71808C] hover:text-[#17232E] underline cursor-pointer"
                        >
                          {isExpanded ? "Hide details" : "More details"}
                        </button>
                      </div>
                    )}

                    {/* Expandable Technical Detail View */}
                    {isExpanded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#F5F3ED] border border-[#DDD7CA] text-[11px] text-[#17232E] space-y-1">
                        <div className="leading-relaxed">{a.detail}</div>
                        <div className="text-[10px] text-[#71808C] font-mono">
                          Raised {time(a.createdAt)} · Category: {a.kind}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  {!a.resolved && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#EAE6DC]">
                      {/* Primary Contextual Action */}
                      {isNominee ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            setEditing(editing === a.id ? null : a.id)
                          }
                        >
                          {editing === a.id
                            ? "Close"
                            : a.kind === "nominee_minor"
                              ? "Add guardian"
                              : "Update nominee"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => reactivate(a.holdingId)}
                        >
                          {a.kind === "name_mismatch"
                            ? "Correct name"
                            : "Re-KYC & reactivate"}
                        </Button>
                      )}

                      {/* Secondary Action: Ask AI */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          nav(
                            "/app/guide?q=" +
                              encodeURIComponent(
                                `How do I resolve this alert: ${a.title} on ${a.regulator}?`,
                              ),
                          )
                        }
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Ask AI</span>
                      </Button>

                      {/* Subtle Action: Dismiss */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismiss(a.id)}
                        className="text-[#71808C] hover:text-[#17232E]"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {a.resolved && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium shrink-0 pt-1 lg:pt-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolved</span>
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

      {/* Optional Collapsible Regulatory Updates Section (Collapsed by Default) */}
      <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/60 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-[#101D2B] text-white p-2">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17232E]">
                  Regulatory Circulars & Statutory Rules
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#EAE6DC] text-[#101D2B] font-semibold border border-[#DDD7CA]">
                  {groupedRegulations.length} unique ({regulations.length}{" "}
                  indexed)
                </span>
              </div>
              <p className="text-xs text-[#71808C]">
                Official gazette settlement timelines and penalty directions
                from RBI, SEBI, EPFO & IRDAI.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowRegs(!showRegs)}
            className="text-xs font-semibold gap-1.5"
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
          <div className="rounded-xl bg-white border border-[#DDD7CA] p-2.5 text-xs text-[#17232E] flex items-center justify-between">
            <span>{pollResult}</span>
            <button
              type="button"
              onClick={() => setPollResult(null)}
              className="text-[#71808C] hover:text-[#17232E] cursor-pointer text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {showRegs && (
          <div className="space-y-4 pt-3 border-t border-[#DDD7CA]">
            {/* Technical Tools Bar moved inside the collapsible section */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#DDD7CA] text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePollRegulations}
                  disabled={pollingRegs || crawlingScrapy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-semibold text-[#17232E] hover:bg-[#F5F3ED] transition cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {pollingRegs ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#101D2B]" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-[#101D2B]" />
                  )}
                  <span>
                    {pollingRegs ? "Polling Portals..." : "Sync (Fast)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRunScrapy}
                  disabled={pollingRegs || crawlingScrapy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#DDD7CA] bg-[#EAE6DC] text-xs font-semibold text-[#101D2B] hover:bg-[#DDD7CA] transition cursor-pointer shadow-xs disabled:opacity-60"
                  title="Execute Scrapy crawler suite with Redis deduplication and Document Vault indexing"
                >
                  {crawlingScrapy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#101D2B]" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-[#101D2B]" />
                  )}
                  <span>
                    {crawlingScrapy
                      ? "Crawling Scrapy..."
                      : "Scrapy Deep Crawl"}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#71808C] font-mono">
                <span
                  className={cx(
                    "h-2 w-2 rounded-full",
                    connected ? "bg-[#34765B]" : "bg-[#71808C]",
                  )}
                />
                <span>
                  {connected ? "Live AA sync active" : "Demo feed mode"}
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-[#71808C] uppercase tracking-wider mr-1">
                Filter Regulator:
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
                      : "bg-white border border-[#DDD7CA] text-[#17232E] hover:bg-white",
                  )}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Grouped Circulars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(selectedRegulator === "all"
                ? groupedRegulations
                : groupedRegulations.filter(
                    (x) =>
                      x.rep.regulator.toUpperCase() ===
                      selectedRegulator.toUpperCase(),
                  )
              ).map(({ rep: reg, count }) => (
                <div
                  key={reg.id}
                  className="rounded-xl border border-[#DDD7CA] bg-white p-3.5 space-y-2 text-xs shadow-xs hover:border-[#101D2B]/50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F3ED] text-[#101D2B] border border-[#DDD7CA]">
                        {reg.regulator}
                      </span>
                      {count > 1 && (
                        <span className="text-[10px] bg-[#EAE6DC] text-[#17232E] font-semibold rounded-full px-2 py-0.2 border border-[#DDD7CA]">
                          {count} matching records
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#71808C] font-medium">
                      {reg.publicationDate || "Recent"}
                    </span>
                  </div>

                  <div className="font-bold text-[#17232E] line-clamp-2">
                    {reg.fileName.replace(/^\[[^\]]+\]\s*/, "")}
                  </div>

                  {reg.circularNo && (
                    <div className="font-mono text-[11px] text-[#101D2B] font-medium">
                      Ref: {reg.circularNo}
                    </div>
                  )}

                  {reg.extractedText && (
                    <p className="text-[#17232E] line-clamp-2 text-[11px] leading-relaxed">
                      {reg.extractedText}
                    </p>
                  )}

                  {reg.sourceUrl && (
                    <div className="pt-1.5 flex items-center justify-between border-t border-[#EAE6DC] text-[11px]">
                      <a
                        href={reg.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#101D2B] hover:underline font-semibold"
                      >
                        <span>Official Portal Notice</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-[#71808C] font-mono text-[10px]">
                        Vault Indexed
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
    <div className="mt-3.5 rounded-xl border border-[#DDD7CA] bg-[#F5F3ED] p-4 space-y-3">
      {heirs.length > 0 && !minor && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#71808C] text-[11px]">Quick pick heir:</span>
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
        />
        <Select
          value={f.relation}
          onChange={(e) => setF({ ...f, relation: e.target.value })}
        >
          {RELATIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {minor && (
          <Input
            placeholder="Guardian / appointee name"
            value={f.guardian}
            onChange={(e) => setF({ ...f, guardian: e.target.value })}
          />
        )}
      </div>
      <ErrorNote msg={err} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <span className="text-[#71808C] text-[11px]">
          Submits a statutory nomination update request to {holding.institution}
          .
        </span>
        <Button
          size="sm"
          loading={busy}
          disabled={!f.name || (minor && !f.guardian)}
          onClick={save}
        >
          Submit nomination update
        </Button>
      </div>
    </div>
  );
}
