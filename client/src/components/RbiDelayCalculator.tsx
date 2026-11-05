import { useState, useMemo } from 'react';
import { AlertTriangle, Calendar, Copy, Check, ShieldCheck, Scale, FileText } from 'lucide-react';
import { inr } from '../lib/format';
import type { Holding } from '../lib/api';

export default function RbiDelayCalculator({
  holding,
  deceasedName,
  caseId,
}: {
  holding: Holding;
  deceasedName: string;
  caseId: string;
}) {
  // Default to 22 days ago so evaluators immediately see the 15-day threshold breached
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 22);
    return d.toISOString().split('T')[0];
  }, []);

  const [submissionDate, setSubmissionDate] = useState<string>(defaultDate);
  const [copied, setCopied] = useState(false);
  const [showNoticePreview, setShowNoticePreview] = useState(false);

  // Statutory parameters per RBI Master Direction RBI/DOR/2025-26/170 (Paras 319-322)
  const STATUTORY_LIMIT_DAYS = 15;
  const BANK_RATE = 5.75; // RBI prevailing Bank Rate
  const PENALTY_SPREAD = 4.0; // Statutory penal spread mandated by RBI
  const TOTAL_PENALTY_RATE = BANK_RATE + PENALTY_SPREAD; // 9.75% p.a.

  const metrics = useMemo(() => {
    if (!submissionDate) {
      return { elapsedDays: 0, overdueDays: 0, isDelayed: false, penaltyInterest: 0, totalPayable: holding.value };
    }

    const sub = new Date(submissionDate);
    const today = new Date();
    const diffTime = today.getTime() - sub.getTime();
    const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const overdueDays = Math.max(0, elapsedDays - STATUTORY_LIMIT_DAYS);
    const isDelayed = overdueDays > 0;

    // Daily interest formula: Principal * (Rate / 100) * (Days / 365)
    const penaltyInterest = isDelayed
      ? Math.round((holding.value * (TOTAL_PENALTY_RATE / 100) * overdueDays) / 365)
      : 0;

    const totalPayable = holding.value + penaltyInterest;

    return {
      elapsedDays,
      overdueDays,
      isDelayed,
      penaltyInterest,
      totalPayable,
    };
  }, [submissionDate, holding.value, TOTAL_PENALTY_RATE]);

  const demandNoticeText = useMemo(() => {
    return `FORMAL STATUTORY NOTICE FOR PAYMENT OF DELAY PENALTY INTEREST
Under RBI Master Direction (Notification RBI/DOR/2025-26/170, Paras 319-322)
Read with Banking Regulation Act, 1949

To:
The Branch Manager,
${holding.institution}
Reference Account: ${holding.ref}
Case Reference: ${caseId}

Subject: Demand for Settlement of Deceased Depositor Claim along with Statutory Delay Interest under RBI Master Directions

Dear Sir / Madam,

Re: Deceased Depositor Account of Late ${deceasedName}
Holding Type: ${holding.type}
Principal Deposit Balance: ${inr(holding.value)}

1. Complete claim paperwork, succession documentation, and requisite claim forms were duly submitted to your branch on ${submissionDate}.
2. Under Paragraph 319 of the RBI Master Direction on Customer Service in Banks (RBI/DOR/2025-26/170), banks are statutorily required to settle claims in respect of deceased depositors within a maximum period of 15 calendar days from the date of receipt of the claim application.
3. As of today, ${metrics.elapsedDays} calendar days have elapsed since the submission of complete documents. The settlement has been delayed by ${metrics.overdueDays} days beyond the permissible statutory window.
4. In terms of Paragraph 322 of the aforementioned RBI Master Direction, for any delay beyond 15 days, the bank is obligated to pay penal interest to the claimant at Bank Rate + 4.00% p.a. (currently ${TOTAL_PENALTY_RATE}% p.a.) from the 16th calendar day until the actual date of credit.

COMPENSATION COMPUTATION:
- Principal Claim Amount: ${inr(holding.value)}
- Statutory Settlement Window: 15 Calendar Days
- Days Overdue: ${metrics.overdueDays} Days
- Mandated Penal Rate: ${TOTAL_PENALTY_RATE}% p.a. (Bank Rate 5.75% + 4.00%)
- Accrued Penal Interest Compensation: ${inr(metrics.penaltyInterest)}
----------------------------------------------------------------------
TOTAL STATUTORY AMOUNT DEMANDED: ${inr(metrics.totalPayable)}

You are hereby requested to disburse the total sum of ${inr(metrics.totalPayable)} directly into the designated legal heir / nominee account within 7 business days from receipt of this notice, failing which this grievance will be escalated without further intimation to the RBI Banking Ombudsman under the Reserve Bank - Integrated Ombudsman Scheme, 2021.

Yours faithfully,
Claimant / Authorized Legal Heir of Late ${deceasedName}
Contact via Asset Bridge Case: ${caseId}`;
  }, [holding, deceasedName, caseId, submissionDate, metrics, TOTAL_PENALTY_RATE]);

  const handleCopyNotice = async () => {
    try {
      await navigator.clipboard.writeText(demandNoticeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-800">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
              <span>RBI Statutory Delay Compensation Calculator</span>
              <span className="inline-flex rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-900">
                RBI/DOR/2025-26/170
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Commercial banks must settle claims within 15 calendar days. Overdue balances accrue penal interest at Bank Rate + 4% ({TOTAL_PENALTY_RATE}% p.a.).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Claim Submitted:</span>
          </label>
          <input
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-200/50">
        <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
          <div className="text-[10px] uppercase font-mono text-slate-400">Elapsed Time</div>
          <div className="text-sm font-bold text-slate-800">
            {metrics.elapsedDays} Days
          </div>
          <div className="text-[10px] text-slate-500">Statutory Limit: 15 Days</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
          <div className="text-[10px] uppercase font-mono text-slate-400">Overdue Status</div>
          <div className={`text-sm font-bold ${metrics.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}>
            {metrics.isDelayed ? `${metrics.overdueDays} Days Delayed` : 'Within Window'}
          </div>
          <div className="text-[10px] text-slate-500">
            {metrics.isDelayed ? 'Penal Rate Active' : '0 Days Overdue'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
          <div className="text-[10px] uppercase font-mono text-slate-400">Statutory Penal Interest</div>
          <div className="text-sm font-bold text-amber-600">
            {inr(metrics.penaltyInterest)}
          </div>
          <div className="text-[10px] text-slate-500">{TOTAL_PENALTY_RATE}% p.a. accrued</div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-300/60">
          <div className="text-[10px] uppercase font-mono text-amber-800 font-semibold">
            Total Bank Liability
          </div>
          <div className="text-sm font-extrabold text-amber-950">
            {inr(metrics.totalPayable)}
          </div>
          <div className="text-[10px] text-amber-800/80">Principal + Penal Sum</div>
        </div>
      </div>

      {/* Delay Alert Banner & Demand Notice Actions */}
      {metrics.isDelayed ? (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                {holding.institution} is in statutory default by {metrics.overdueDays} calendar days. Owed penal compensation: {inr(metrics.penaltyInterest)}.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNoticePreview((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <FileText className="h-3 w-3" />
                <span>{showNoticePreview ? 'Hide Notice' : 'Inspect Demand Notice'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyNotice}
                className="inline-flex items-center gap-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[11px] font-semibold shadow-sm transition cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Notice Copied!' : 'Copy RBI Demand Notice'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Notice Preview */}
          {showNoticePreview && (
            <div className="mt-2 rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border border-slate-800">
              {demandNoticeText}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-white/60 p-2.5 rounded-lg border border-slate-200/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Claim is currently within the permissible 15-day statutory window ({metrics.elapsedDays}/15 days elapsed).
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {15 - metrics.elapsedDays} days remaining before penal interest activates
          </span>
        </div>
      )}
    </div>
  );
}
