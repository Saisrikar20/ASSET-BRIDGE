import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Copy,
  Check,
  Send,
  Info,
  Clock,
  Landmark,
} from 'lucide-react';
import { api, type Case, type Heir, type Holding } from '../lib/api';
import { useAuth } from '../lib/auth';
import { inr, date } from '../lib/format';
import { Badge, Button, ErrorNote, Field, Input, RegChip, cx, useToast } from '../components/ui';

interface RecoveryRoadmapItem {
  category: string;
  regulator: string;
  authority: string;
  triggerCondition: string;
  requiredAction: string;
  statutoryDocs: string[];
  portalUrl?: string;
}

const STATUTORY_ROADMAPS: Record<string, RecoveryRoadmapItem> = {
  DEPOSIT: {
    category: 'Bank Savings & Term Deposits',
    regulator: 'RBI',
    authority: 'RBI Depositor Education and Awareness (DEA) Fund',
    triggerCondition: 'Inoperative for 10 consecutive years without transaction.',
    requiredAction: 'File physical DEA Fund claim application at operating branch or via RBI UDGAM portal.',
    statutoryDocs: ['Branch Claim Form 1', 'Death Certificate', 'Legal Heir Certificate', 'Indemnity Bond'],
    portalUrl: 'https://udgam.rbi.org.in',
  },
  MUTUAL_FUNDS: {
    category: 'Securities & Unclaimed Dividends',
    regulator: 'SEBI',
    authority: 'Investor Education and Protection Fund Authority (IEPF)',
    triggerCondition: 'Dividends unclaimed for 7 consecutive financial years.',
    requiredAction: 'Submit MCA e-Form IEPF-5 online and physical verification docket to Nodal Officer.',
    statutoryDocs: ['e-Form IEPF-5 Challan', 'Client Master List (CML)', 'Advance Stamped Receipt', 'Indemnity Bond'],
    portalUrl: 'https://www.iepf.gov.in',
  },
  EPF_SUMMARY: {
    category: 'Provident Fund & Pension',
    regulator: 'EPFO',
    authority: 'EPFO Inoperative Accounts Directorate',
    triggerCondition: 'No contributions for 36 months post-employment cessation.',
    requiredAction: 'Submit online Form 19 / 20 / 10D composite death claim via UAN Member Portal.',
    statutoryDocs: ['Joint Claim Declaration', 'Form 10D (Pension)', 'Cancelled Cheque Leaf', 'Aadhaar e-KYC'],
    portalUrl: 'https://unifiedportal-mem.epfindia.gov.in',
  },
  LIFE_POLICY: {
    category: 'Life & General Insurance',
    regulator: 'IRDAI',
    authority: "Senior Citizens' Welfare Fund (SCWF)",
    triggerCondition: 'Policy proceeds unclaimed for 10 years transferred to SCWF.',
    requiredAction: 'File discharge voucher with original policy bond at insurer grievance office or Bima Bharosa.',
    statutoryDocs: ['Original Policy Document', 'Form 3801 Death Claim', 'Deed of Assignment (if any)', 'KYC Dossier'],
    portalUrl: 'https://bimabharosa.irdai.gov.in',
  },
};

const STANDARD_DOCUMENT_CHECKLIST = [
  { id: 'doc_id', name: 'Identity Proof of Claimant', desc: 'Aadhaar / Voter ID / Passport with verified biometric e-KYC', required: true },
  { id: 'doc_pan', name: 'Permanent Account Number (PAN)', desc: 'PAN card copy of deceased and claiming legal heir', required: true },
  { id: 'doc_death', name: 'Civil Death Certificate', desc: 'Official death certificate issued under Section 12/17 of RBD Act 1969', required: true },
  { id: 'doc_heir', name: 'Legal Heir / Succession Certificate', desc: 'Revenue Tahsildar certificate or Civil Court succession grant', required: true },
  { id: 'doc_affidavit', name: 'No-Objection Affidavit', desc: 'Notarized affidavit on non-judicial stamp paper from all co-heirs', required: false },
  { id: 'doc_indemnity', name: 'Indemnity Bond', desc: 'Standard statutory indemnity bond holding the institution harmless', required: false },
];

export default function Reunite() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
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
  const [activeTab, setActiveTab] = useState<'dormant' | 'checklist' | 'simulate'>('dormant');
  const [result, setResult] = useState<{
    case: Case;
    notified: { name: string; via: string[] }[];
  } | null>(null);

  useEffect(() => {
    api<{ heirs: Heir[] }>('/heirs')
      .then((r) => setHeirs(r.heirs || []))
      .catch(() => {});
    api<{ holdings: Holding[] }>('/holdings')
      .then((r) => setHoldings(r.holdings || []))
      .catch(() => {});
    api<{ cases: { id: string }[] }>('/cases')
      .then((r) => setCases(r.cases || []))
      .catch(() => {});
  }, []);

  const fire = async () => {
    if (
      !confirm(
        `Simulate an official CRS death registration for ${user?.identity?.name}? This initiates an estate case and dispatches automated notices to registered heirs.`
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
      toastSuccess('Estate Case Initiated', `Case ${r.case.id} created. ${r.notified.length} heirs notified.`);
      await refresh();
    } catch (e) {
      const msg = (e as Error).message || 'Failed to dispatch CRS notification';
      setErr(msg);
      toastError('CRS Dispatch Failed', msg);
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
        <div className="pb-4 border-b border-[#DDD7CA]">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
            STATUTORY RECOVERY · REUNITE ENGINE
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Reunite Unclaimed Financial Assets
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Identity verification required before evaluating dormancy status.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-10 text-center bg-white shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3ED] text-[#C58B3C] mb-3">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-[#101D2B]">
            Verify and Map Financial Holdings First
          </p>
          <p className="mt-1 text-xs text-[#71808C] max-w-sm mx-auto">
            Reunite matches statutory inactivity rules against verified PAN records across RBI, SEBI, and EPFO.
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

  const totalValue = holdings.reduce((s, h) => s + (h.value || 0), 0);
  const dormantHoldings = holdings.filter(
    (h) => h.status === 'inoperative' || h.status === 'unclaimed' || h.isDuplicate
  );
  const dormantValue = dormantHoldings.reduce((s, h) => s + (h.value || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-12"
    >
      {/* Page Header */}
      <div className="pb-4 border-b border-[#DDD7CA] flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
            STATUTORY RECOVERY · UNCLAIMED ASSET REUNITE
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Reunite Dormant & Inactive Assets
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Identify assets at statutory risk of transfer to DEA Fund, IEPF, or Inoperative PF accounts.
          </p>
        </div>

        {/* Action shortcut to Cases */}
        {existing && (
          <div className="flex items-center gap-2">
            <Link to={`/app/cases/${existing}`}>
              <Button size="sm" className="rounded-full px-4 text-xs font-semibold gap-1.5 bg-[#101D2B] text-white hover:bg-[#1C3041]">
                <span>Open Active Case</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Simulated Discovery Callout */}
      <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/70 p-4 flex items-start gap-3 text-xs shadow-xs">
        <Info className="h-4 w-4 text-[#71808C] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#101D2B]">
            Regulatory Notice: Simulated Discovery vs. Institutional Portals
          </div>
          <p className="text-[#71808C] leading-relaxed">
            Asset Bridge cross-references Account Aggregator telemetry with RBI Master Directions on Inoperative Accounts and Section 205C of the Companies Act. Final claims must be submitted to the respective statutory custodial authorities (RBI UDGAM, MCA IEPF, or EPFO).
          </p>
        </div>
      </div>

      {/* High-Level Overview Grid */}
      <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-xs">
        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-[#71808C]">
            Total Aggregated Assets
          </div>
          <div className="text-xl font-bold tracking-tight text-[#101D2B] mt-1 tabular-nums">
            {inr(totalValue)}
          </div>
          <div className="text-[11px] text-[#71808C]">
            Across {holdings.length} total mapped accounts
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-[#71808C]">
            Inoperative / At-Risk Capital
          </div>
          <div
            className={cx(
              'text-xl font-bold tracking-tight mt-1 tabular-nums',
              dormantValue > 0 ? 'text-[#C45D5D]' : 'text-[#34765B]'
            )}
          >
            {inr(dormantValue)}
          </div>
          <div className="text-[11px] text-[#71808C]">
            {dormantHoldings.length} {dormantHoldings.length === 1 ? 'account' : 'accounts'} flagged
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-[#71808C]">
            Registered Legal Heirs
          </div>
          <div className="text-xl font-bold tracking-tight text-[#101D2B] mt-1 tabular-nums">
            {heirs.length}
          </div>
          <div className="text-[11px] text-[#71808C] truncate" title={heirs.map((h) => h.name).join(', ')}>
            {heirs.map((h) => h.name).join(', ') || 'None registered'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase font-semibold text-[#71808C]">
            Estate Case Status
          </div>
          <div className="text-xl font-bold tracking-tight text-[#101D2B] mt-1">
            {existing ? 'Case Opened' : 'Pre-Succession'}
          </div>
          <div className="text-[11px] text-[#71808C] font-mono">
            {existing ? existing : `PAN: ${user.identity.pan}`}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Dormant Assets, Claim Roadmap, Document Checklist, CRS Simulation) */}
      <div className="flex items-center gap-2 border-b border-[#DDD7CA] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('dormant')}
          className={cx(
            'px-4 py-1.5 rounded-full font-semibold transition cursor-pointer',
            activeTab === 'dormant'
              ? 'bg-[#101D2B] text-white shadow-xs'
              : 'text-[#17232E] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
          )}
        >
          Flagged Inactive Assets ({dormantHoldings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={cx(
            'px-4 py-1.5 rounded-full font-semibold transition cursor-pointer',
            activeTab === 'checklist'
              ? 'bg-[#101D2B] text-white shadow-xs'
              : 'text-[#17232E] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
          )}
        >
          Statutory Document Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('simulate')}
          className={cx(
            'px-4 py-1.5 rounded-full font-semibold transition cursor-pointer',
            activeTab === 'simulate'
              ? 'bg-[#101D2B] text-white shadow-xs'
              : 'text-[#17232E] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
          )}
        >
          CRS Succession Dispatch
        </button>
      </div>

      {/* Tab 1: Flagged Dormant / Inactive Holdings with Recovery Roadmap */}
      {activeTab === 'dormant' && (
        <div className="space-y-4">
          {dormantHoldings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-10 text-center bg-white shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-[#34765B] mx-auto mb-2" />
              <div className="font-bold text-sm text-[#101D2B]">No Inoperative or Unclaimed Accounts Detected</div>
              <p className="mt-1 text-xs text-[#71808C] max-w-sm mx-auto">
                All currently mapped holdings show recent operational activity within the 24-month regulatory window.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#DDD7CA]/60 overflow-hidden shadow-xs">
              {dormantHoldings.map((h) => {
                const roadmap = STATUTORY_ROADMAPS[h.regulator] || STATUTORY_ROADMAPS['DEPOSIT'];

                return (
                  <div key={h.id} className="p-4 sm:p-5 hover:bg-[#F5F3ED]/40 transition space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <RegChip code={h.regulator} />
                          <span className="font-bold text-sm text-[#101D2B]">{h.type}</span>
                          <Badge tone="red">
                            {h.status === 'inoperative' ? 'INOPERATIVE' : 'UNCLAIMED RISK'}
                          </Badge>
                          {h.isDuplicate && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C58B3C]/10 text-[#C58B3C] border border-[#C58B3C]/30">
                              Duplicate Account
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#71808C] font-mono flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#101D2B]">{h.institution}</span>
                          <span className="text-[#DDD7CA]">·</span>
                          <span>Account / Folio: {h.ref}</span>
                          <span className="text-[#DDD7CA]">·</span>
                          <span>Last Activity: {date(h.lastActivity)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-[#101D2B] tabular-nums">
                          {inr(h.value)}
                        </div>
                        <div className="text-[10px] text-[#C45D5D] font-semibold uppercase font-mono">
                          Unclaimed Principal
                        </div>
                      </div>
                    </div>

                    {/* Roadmap Accordion Card */}
                    <div className="p-3.5 rounded-xl bg-[#F5F3ED] border border-[#DDD7CA] text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#101D2B]">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="h-3.5 w-3.5 text-[#101D2B]" />
                          Custodial Body: {roadmap.authority}
                        </span>
                        {roadmap.portalUrl && (
                          <a
                            href={roadmap.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#101D2B] hover:underline"
                          >
                            <span>Search Official Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div className="text-[#71808C] text-[11px] leading-relaxed">
                        <strong>Required Action:</strong> {roadmap.requiredAction}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-[#71808C] uppercase">Required Docket:</span>
                        {roadmap.statutoryDocs.map((doc) => (
                          <span key={doc} className="px-2 py-0.5 rounded-full bg-white text-[10px] font-medium text-[#17232E] border border-[#DDD7CA]">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Document Checklist */}
      {activeTab === 'checklist' && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD7CA]">
            <div>
              <h2 className="text-sm font-bold text-[#101D2B]">Statutory Succession & Claim Document Checklist</h2>
              <p className="text-xs text-[#71808C]">Documents required to reclaim inactive assets and establish legal heir entitlement.</p>
            </div>
            <Link to="/app/cases">
              <Button size="sm" variant="secondary" className="rounded-full text-xs border-[#DDD7CA]">
                Open Claim Vault &rarr;
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-[#DDD7CA]/60">
            {STANDARD_DOCUMENT_CHECKLIST.map((doc) => (
              <div key={doc.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#101D2B]">{doc.name}</span>
                    {doc.required ? (
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#C45D5D]/10 text-[#C45D5D] border border-[#C45D5D]/30">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-[#F5F3ED] text-[#71808C]">
                        Optional / Co-heir
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#71808C]">{doc.desc}</p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#71808C]">
                    <Clock className="h-3.5 w-3.5" />
                    Pending Filing
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: CRS Succession Simulation */}
      {activeTab === 'simulate' && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 sm:p-6 space-y-5 shadow-xs">
          {existing ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone="green">ACTIVE CASE</Badge>
                    <span className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#71808C]">
                      Succession Case Reference
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-tight text-[#101D2B]">
                    {existing}
                  </div>
                  <p className="text-xs text-[#71808C]">
                    Registered heirs unlock the succession twin using this case reference and their individual PAN.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyId}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-mono font-medium text-[#101D2B] hover:bg-[#F5F3ED] transition cursor-pointer shadow-xs"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#34765B]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#71808C]" />
                        <span>Copy Case ID</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-semibold text-[#101D2B] hover:bg-[#F5F3ED] transition cursor-pointer shadow-xs"
                  >
                    {copiedLink ? 'Link Copied!' : 'Copy Portal Link'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => nav(`/app/cases/${existing}`)}
                  className="rounded-full px-5 bg-[#101D2B] text-white hover:bg-[#1C3041] text-xs font-semibold"
                >
                  <span>Open Estate Claims Workspace</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => nav(`/heir/${existing}`)}
                  className="rounded-full px-4 text-xs font-semibold border-[#DDD7CA]"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
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
                          `What are the statutory requirements for claiming assets in case ${existing}?`
                        )
                    )
                  }
                  className="rounded-full px-4 text-xs font-semibold border-[#DDD7CA]"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  <span>Ask AI Guide</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="pb-3 border-b border-[#DDD7CA] space-y-0.5">
                <div className="text-xs font-bold text-[#101D2B]">
                  Simulate Civil Registration System (CRS) Death Event
                </div>
                <p className="text-[11px] text-[#71808C]">
                  In production, this event is transmitted by the municipal registrar. In this hackathon environment, you can trigger it to verify the automatic creation of succession cases.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <Field label="Deceased Person Profile">
                  <Input disabled value={`${user.identity.name} · PAN: ${user.identity.pan}`} className="rounded-full border-[#DDD7CA]" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Date of Demise">
                    <Input
                      type="date"
                      value={f.dateOfDeath}
                      onChange={(e) => setF({ ...f, dateOfDeath: e.target.value })}
                      className="rounded-full border-[#DDD7CA]"
                    />
                  </Field>

                  <Field label="Registration Reference (Optional)">
                    <Input
                      value={f.registrationNo}
                      onChange={(e) => setF({ ...f, registrationNo: e.target.value })}
                      placeholder="e.g. CRS/2026/894120"
                      className="rounded-full border-[#DDD7CA]"
                    />
                  </Field>
                </div>

                {heirs.length === 0 && (
                  <div className="p-3 rounded-xl border border-[#C58B3C]/40 bg-[#C58B3C]/10 text-xs text-[#C58B3C]">
                    No heirs registered yet —{' '}
                    <Link to="/app/heirs" className="font-bold underline">
                      register legal heirs first
                    </Link>{' '}
                    so notification dispatches have valid recipient endpoints.
                  </div>
                )}

                <ErrorNote msg={err} />

                <Button
                  className="w-full py-2.5 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white font-semibold shadow-xs"
                  loading={busy}
                  disabled={busy}
                  onClick={fire}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  <span>Dispatch Simulated Death Registration</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
