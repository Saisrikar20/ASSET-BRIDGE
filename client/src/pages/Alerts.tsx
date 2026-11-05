import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellOff,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Landmark,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api, getRegulations, pollRegulations, crawlRegulations, type Alert, type Heir, type Holding, type RegulatoryCircular } from '../lib/api';
import { useLive, useLiveStatus } from '../lib/live';
import { inr, time } from '../lib/format';
import { Button, ErrorNote, Input, RegChip, Select, cx } from '../components/ui';

const NOMINEE_KINDS = ['nominee_missing', 'nominee_deceased', 'nominee_minor'];
const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];

type FilterKey = 'all' | 'high' | 'medium' | 'low' | 'resolved';

function SeverityChip({
  severity,
  resolved,
}: {
  severity: Alert['severity'];
  resolved: boolean;
}) {
  if (resolved) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full ring-1 ring-emerald-200 dark:ring-emerald-900/60">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Resolved
      </span>
    );
  }

  if (severity === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full ring-1 ring-rose-200 dark:ring-rose-900/60">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        High
      </span>
    );
  }

  if (severity === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full ring-1 ring-amber-200 dark:ring-amber-900/60">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Medium
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Low
    </span>
  );
}

export default function Alerts() {
  const nav = useNavigate();
  const connected = useLiveStatus();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [holdings, setHoldings] = useState<Record<string, Holding>>({});
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [regulations, setRegulations] = useState<RegulatoryCircular[]>([]);
  const [pollingRegs, setPollingRegs] = useState(false);
  const [crawlingScrapy, setCrawlingScrapy] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [selectedRegulator, setSelectedRegulator] = useState<string>('all');
  const [showRegs, setShowRegs] = useState<boolean>(true);

  const load = () => {
    api<{ alerts: Alert[] }>('/alerts')
      .then((r) => setAlerts(r.alerts))
      .catch(() => {});
    api<{ holdings: Holding[] }>('/holdings')
      .then((r) => setHoldings(Object.fromEntries(r.holdings.map((h) => [h.id, h]))))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    api<{ heirs: Heir[] }>('/heirs')
      .then((r) => setHeirs(r.heirs))
      .catch(() => {});
    getRegulations()
      .then((r) => setRegulations(r.regulations))
      .catch(() => {});
  }, []);

  const handleRunScrapy = async () => {
    setCrawlingScrapy(true);
    setPollResult(null);
    try {
      const spiderMap: Record<string, string> = {
        RBI: 'rbi_notifications',
        SEBI: 'sebi_circulars',
        EPFO: 'epfo_circulars',
        IRDAI: 'irdai_circulars',
      };
      const spider = selectedRegulator !== 'all' ? spiderMap[selectedRegulator.toUpperCase()] : undefined;
      const res = await crawlRegulations({ spider, limit: 3 });
      if (res.ok) {
        setPollResult(`Scrapy Crawl Complete: executed ${res.spidersRun} spiders (${res.totalRegulationsInVault} circulars in vault)`);
      }
      const fresh = await getRegulations();
      setRegulations(fresh.regulations);
      load();
    } catch (e: any) {
      setPollResult('Scrapy Crawl Error: ' + (e?.message || 'Crawler execution failed'));
    } finally {
      setCrawlingScrapy(false);
    }
  };

  const handlePollRegulations = async () => {
    setPollingRegs(true);
    setPollResult(null);
    try {
      const res = await pollRegulations({
        regulator: selectedRegulator !== 'all' ? selectedRegulator : undefined,
      });
      if (res.ok && res.summary) {
        setPollResult(`Polled ${res.summary.totalPolled} statutory sources (${res.summary.newlyIngested} newly indexed, ${res.summary.alreadyIndexed} up-to-date)`);
      }
      const fresh = await getRegulations();
      setRegulations(fresh.regulations);
      load();
    } catch (e: any) {
      setPollResult('Sync error: ' + (e?.message || 'Failed to poll government portals'));
    } finally {
      setPollingRegs(false);
    }
  };

  useLive((e) => {
    if (e.type === 'alert') {
      setAlerts((a) => [e.data, ...a.filter((x) => x.id !== e.data.id)]);
      setFlash(e.data.id);
      setTimeout(() => setFlash(null), 1500);
      api<{ holdings: Holding[] }>('/holdings')
        .then((r) => setHoldings(Object.fromEntries(r.holdings.map((h) => [h.id, h]))))
        .catch(() => {});
    }
    if (e.type === 'alert_resolved') {
      setAlerts((a) => a.map((x) => (x.id === e.data.id ? e.data : x)));
    }
  });

  const reactivate = async (holdingId: string) => {
    await api(`/holdings/${holdingId}/reactivate`, { body: {} });
    load();
  };

  const dismiss = async (id: string) => {
    await api(`/alerts/${id}/resolve`, { body: {} });
    load();
  };

  // Metrics
  const openAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);
  const highCount = openAlerts.filter((a) => a.severity === 'high').length;
  const medCount = openAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = openAlerts.filter((a) => a.severity === 'low').length;

  // Filtered List
  const list = useMemo(() => {
    if (filter === 'resolved') return resolvedAlerts;
    if (filter === 'all') return openAlerts;
    return openAlerts.filter((a) => a.severity === filter);
  }, [openAlerts, resolvedAlerts, filter]);

  return (
    <div className="space-y-6">
      {/* STEP 2 — Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-end justify-between gap-3">
        <div>
          
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Alerts
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Issues that need your attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePollRegulations}
disabled={pollingRegs || crawlingScrapy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#C8BEAA] bg-[#EFE9DC] text-xs font-semibold text-[#26352D] hover:bg-[#E9E0CC] transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            {pollingRegs ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            )}
            <span>{pollingRegs ? 'Polling Portals...' : 'Sync (Fast)'}</span>
          </button>
          <button
            type="button"
            onClick={handleRunScrapy}
            disabled={pollingRegs || crawlingScrapy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#A8B7A1] bg-[#E9E0CC] text-xs font-semibold text-[#244B3C] hover:bg-[#D8CDBA] transition cursor-pointer shadow-xs disabled:opacity-60"
            title="Execute Scrapy crawler suite with Redis deduplication and Document Vault indexing"
          >
            {crawlingScrapy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            )}
            <span>{crawlingScrapy ? 'Crawling Scrapy...' : 'Scrapy Deep Crawl'}</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span
              className={cx(
                'h-2 w-2 rounded-full',
                connected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
            <span>{connected ? 'Live AA sync' : 'Demo mode'}</span>
          </div>
        </div>
      </div>

      {/* Regulatory Intelligence Banner & Live Feed */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-600 text-white p-2">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Regulatory Intelligence & Master Directions
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                  Weekly Scrapy Feed
                </span>
              </div>
              
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRegs(!showRegs)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            {showRegs ? 'Collapse' : `View ${regulations.length} Indexed Regulations`}
          </button>
        </div>

        {pollResult && (
          <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-2.5 text-xs text-teal-800 dark:text-teal-300 flex items-center justify-between animate-in fade-in">
            <span>{pollResult}</span>
            <button type="button" onClick={() => setPollResult(null)} className="text-teal-600 hover:text-teal-900 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {showRegs && (
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Regulator:</span>
              {['all', 'RBI', 'SEBI', 'EPFO', 'IRDAI'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegulator(r)}
                  className={cx(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer",
                    selectedRegulator.toUpperCase() === r.toUpperCase()
                      ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Circulars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(selectedRegulator === 'all'
                ? regulations
                : regulations.filter((x) => x.regulator.toUpperCase() === selectedRegulator.toUpperCase())
              ).map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3.5 space-y-2 text-xs shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {reg.regulator}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {reg.publicationDate || 'Recent'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {reg.fileName.replace(/^\[[^\]]+\]\s*/, '')}
                  </div>
                  {reg.circularNo && (
                    <div className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                      Ref: {reg.circularNo}
                    </div>
                  )}
                  {reg.extractedText && (
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-[11px] leading-relaxed">
                      {reg.extractedText}
                    </p>
                  )}
                  {reg.sourceUrl && (
                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                      <a
                        href={reg.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium"
                      >
                        <span>Official Portal Notice</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-slate-400 font-mono text-[10px]">Vault Indexed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STEP 3 — Compact Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cx(
            'rounded-xl border p-3 text-left transition cursor-pointer',
            filter === 'all'
              ? 'border-[#244B3C] bg-[#244B3C] text-white shadow-sm ring-1 ring-[#244B3C]'
              : 'border-[#E2D9C5] bg-white text-[#26352D] hover:border-[#244B3C]/50'
          )}
        >
          <div
            className={cx(
              'text-[10px] uppercase font-mono font-semibold',
              filter === 'all' ? 'text-[#E9E0CC]' : 'text-[#5A6B54]'
            )}
          >
            Open Alerts
          </div>
          <div className={cx("text-xl font-bold tracking-tight mt-0.5 tabular-nums", filter === 'all' ? 'text-white' : 'text-[#26352D]')}>
            {openAlerts.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('high')}
          className={cx(
            'rounded-xl border p-3 text-left transition cursor-pointer',
            filter === 'high'
              ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-rose-300'
          )}
        >
          <div
            className={cx(
              'text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5',
              filter === 'high' ? 'text-rose-100' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <span
              className={cx('h-1.5 w-1.5 rounded-full', filter === 'high' ? 'bg-white' : 'bg-rose-500')}
            />
            High
          </div>
          <div
            className={cx(
              'text-xl font-bold tracking-tight mt-0.5 tabular-nums',
              filter === 'high' ? 'text-white' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {highCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('medium')}
          className={cx(
            'rounded-xl border p-3 text-left transition cursor-pointer',
            filter === 'medium'
              ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-amber-300'
          )}
        >
          <div
            className={cx(
              'text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5',
              filter === 'medium' ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                filter === 'medium' ? 'bg-white' : 'bg-amber-500'
              )}
            />
            Medium
          </div>
          <div
            className={cx(
              'text-xl font-bold tracking-tight mt-0.5 tabular-nums',
              filter === 'medium' ? 'text-white' : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {medCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('low')}
          className={cx(
            'rounded-xl border p-3 text-left transition cursor-pointer',
            filter === 'low'
              ? 'border-slate-700 bg-slate-700 text-white shadow-sm'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300'
          )}
        >
          <div
            className={cx(
              'text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5',
              filter === 'low' ? 'text-slate-200' : 'text-slate-400'
            )}
          >
            <span
              className={cx('h-1.5 w-1.5 rounded-full', filter === 'low' ? 'bg-white' : 'bg-slate-400')}
            />
            Low
          </div>
          <div className={cx("text-xl font-bold tracking-tight mt-0.5 tabular-nums", filter === 'low' ? 'text-white' : 'text-slate-900 dark:text-white')}>
            {lowCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={cx(
            'rounded-xl border p-3 text-left transition cursor-pointer col-span-2 sm:col-span-1',
            filter === 'resolved'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-emerald-300'
          )}
        >
          <div
            className={cx(
              'text-[10px] uppercase font-mono font-semibold flex items-center gap-1.5',
              filter === 'resolved' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                filter === 'resolved' ? 'bg-white' : 'bg-emerald-500'
              )}
            />
            Resolved
          </div>
          <div
            className={cx(
              'text-xl font-bold tracking-tight mt-0.5 tabular-nums',
              filter === 'resolved' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {resolvedAlerts.length}
          </div>
        </button>
      </div>

      {/* Alert List */}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
            {filter === 'resolved' ? (
              <BellOff className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {filter === 'resolved'
              ? 'No resolved alerts yet'
              : filter === 'all'
                ? 'No open alerts'
                : `No ${filter}-severity alerts`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {filter === 'resolved'
              ? 'Resolve an alert above and it will be recorded here.'
              : 'All holdings are compliant or no issues have been detected.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
          {list.map((a) => {
            const h = holdings[a.holdingId];
            const isNominee = NOMINEE_KINDS.includes(a.kind);
            return (
              <div
                key={a.id}
                className={cx(
                  'p-4 sm:px-5 sm:py-3.5 transition-colors',
                  flash === a.id && 'bg-brand-50/60 dark:bg-brand-950/30',
                  a.resolved
                    ? 'opacity-65 hover:opacity-100'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                  {/* Left Column: Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityChip severity={a.severity} resolved={a.resolved} />
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {a.title}
                      </span>
                      <RegChip code={a.regulator} />
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {a.detail}
                    </p>

                    {h && (
                      <div className="pt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap font-mono">
                        <span>{h.institution}</span>
                        <span>·</span>
                        <span>{h.ref}</span>
                        <span>·</span>
                        <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                          {h.type}
                        </span>
                        <span>·</span>
                        <span className="font-sans font-semibold text-slate-900 dark:text-white tabular-nums">
                          {inr(h.value)}
                        </span>
                        <span>·</span>
                        <span className="font-sans">
                          Raised {time(a.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  {!a.resolved && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Primary Action */}
                      {isNominee ? (
                        <Button
                          size="sm"
                          onClick={() => setEditing(editing === a.id ? null : a.id)}
                        >
                          {editing === a.id
                            ? 'Close'
                            : a.kind === 'nominee_minor'
                              ? 'Add guardian'
                              : 'Update nominee'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => reactivate(a.holdingId)}
                        >
                          {a.kind === 'name_mismatch'
                            ? 'Correct name'
                            : 'Re-KYC & reactivate'}
                        </Button>
                      )}

                      {/* Secondary Action: Ask AI */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          nav(
                            '/app/guide?q=' +
                              encodeURIComponent(
                                `How do I resolve this alert: ${a.title} on ${a.regulator}?`
                              )
                          )
                        }
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Ask AI</span>
                      </Button>

                      {/* Tertiary Action: Dismiss */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismiss(a.id)}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {a.resolved && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0 pt-1 lg:pt-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolved</span>
                    </div>
                  )}
                </div>

                {/* Inline NomineeForm */}
                {editing === a.id && h && (
                  <NomineeForm
                    holding={h}
                    heirs={heirs}
                    minor={a.kind === 'nominee_minor'}
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

      </div>
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
    name: minor ? holding.nominee?.name || '' : '',
    relation: minor ? holding.nominee?.relation || 'Son' : 'Spouse',
    guardian: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/holdings/${holding.id}/nominee`, { method: 'PATCH', body: f });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
      {heirs.length > 0 && !minor && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Quick pick heir:</span>
          {heirs.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setF({ ...f, name: h.name, relation: h.relation })}
              className="cursor-pointer rounded-full bg-white dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
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
        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
          Submits a statutory nomination update request to {holding.institution}.
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
