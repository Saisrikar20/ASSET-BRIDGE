import { useMemo, useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Download,
  FileText,
  Mail,
  Landmark,
  Printer,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { api, uploadDocument, downloadClaimingDossierPdf, saveClaimingDossierToVault, type Case, type Regulator, type Task } from '../lib/api';
import EmailDossierModal from './EmailDossierModal';
import RbiDelayCalculator from './RbiDelayCalculator';
import { date, inr, inrShort, time } from '../lib/format';
import { Badge, Button, Progress, RegChip, cx, useToast } from './ui';
import GuideChat from './GuideChat';
import TransmissionsDrawer from './TransmissionsDrawer';
import ClaimFormWizardModal from './ClaimFormWizardModal';
import DocUploadDropzone from './DocUploadDropzone';
import { getStatePortal } from '../lib/statePortals';
import { ExternalLink } from 'lucide-react';


const ALL_REGS: Regulator[] = ['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'];

interface UploadedDoc {
  id?: string;
  taskId: string;
  docName: string;
  fileName: string;
  fileSize: number;
  hash: string;
  uploadedAt: string;
}

export default function CaseBody({
  c,
  onToggle,
}: {
  c: Case;
  onToggle: (t: Task) => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showOutbox, setShowOutbox] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [dropzoneForTask, setDropzoneForTask] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();


  const [copiedRef, setCopiedRef] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [indexingVault, setIndexingVault] = useState(false);
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadClaimingDossierPdf({
        caseId: c.id,
        filename: `Asset_Bridge_Claiming_Dossier_${c.id}.pdf`,
      });
    } catch (err) {
      toastError('Failed to download dossier', (err as Error).message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleIndexVault = async () => {
    try {
      setIndexingVault(true);
      setVaultFeedback(null);
      const res = await saveClaimingDossierToVault({ caseId: c.id });
      setVaultFeedback(res.message || 'Indexed in AI vault');
      toastSuccess('AI Vault Indexed', res.message || 'Indexed in AI vault');
      setTimeout(() => setVaultFeedback(null), 4000);
    } catch (err) {
      toastError('Failed to index dossier in vault', (err as Error).message);
    } finally {
      setIndexingVault(false);
    }
  };
  const [activeUploadTask, setActiveUploadTask] = useState<{
    taskId: string;
    docName: string;
  } | null>(null);

  // Filter & Accordion states
  const [filterReg, setFilterReg] = useState<string>('all');
  const [expandedPrereqs, setExpandedPrereqs] = useState<Record<string, boolean>>({});
  const [expandedHoldings, setExpandedHoldings] = useState<Record<string, boolean>>({});

  // Fetch persisted documents from SQLite vault
  useEffect(() => {
    api<{ documents: any[] }>(`/documents?caseId=${c.id}`)
      .then((res) => {
        if (res.documents) {
          const mapped: UploadedDoc[] = res.documents.map((d: any) => ({
            id: d.id,
            taskId: d.taskId || '',
            docName: d.docType || '',
            fileName: d.fileName,
            fileSize: d.fileSize,
            hash: d.sha256,
            uploadedAt: d.createdAt,
          }));
          setUploadedDocs(mapped);
        }
      })
      .catch(() => {});
  }, [c.id]);

  const total = c.holdings.reduce((s, h) => s + h.value, 0);
  const done = c.tasks.filter((t) => t.done).length;
  const pct = c.tasks.length > 0 ? Math.round((done / c.tasks.length) * 100) : 0;

  // Check for any registered name discrepancy across holdings
  const nameDiscrepancy = useMemo(() => {
    return c.holdings.find(
      (h) =>
        h.registeredName &&
        h.registeredName.toLowerCase() !== c.deceasedName.toLowerCase()
    );
  }, [c]);

  const groups = useMemo(() => {
    const general = c.tasks.filter((t) => !t.holdingId);
    const per = c.holdings.map((h) => ({
      h,
      tasks: c.tasks.filter((t) => t.holdingId === h.id),
    }));
    return { general, per };
  }, [c]);

  const filteredHoldings = useMemo(() => {
    if (filterReg === 'all') return groups.per;
    return groups.per.filter(({ h }) => h.regulator === filterReg);
  }, [groups.per, filterReg]);

  const toggle = async (t: Task) => {
    setPending(t.id);
    try {
      await onToggle(t);
    } finally {
      setPending(null);
    }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(c.id);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Compute SHA-256 cryptographic digest of a file to detect duplicates client-side
  const computeHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDuplicateWarning(null);
    const file = e.target.files?.[0];
    if (!file || !activeUploadTask) return;

    // MIME Validation
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setDuplicateWarning(
        'Unsupported file type. Please upload a PDF, PNG, or JPEG document.'
      );
      return;
    }

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setDuplicateWarning(
        `File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress the document.`
      );
      return;
    }

    try {
      const hash = await computeHash(file);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caseId', c.id);
      fd.append('taskId', activeUploadTask.taskId);
      fd.append('docType', activeUploadTask.docName);

      const res = await uploadDocument(fd);
      if (res.duplicate) {
        setDuplicateWarning(`Document already indexed in SQLite: ${res.message}`);
      }

      const newDoc: UploadedDoc = {
        id: res.document.id,
        taskId: activeUploadTask.taskId,
        docName: activeUploadTask.docName,
        fileName: file.name,
        fileSize: file.size,
        hash,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedDocs((prev) => [
        ...prev.filter(
          (d) =>
            !(
              d.taskId === activeUploadTask.taskId &&
              d.docName === activeUploadTask.docName
            )
        ),
        newDoc,
      ]);
    } catch (err: any) {
      setDuplicateWarning(
        err?.message || 'Error uploading document to vault. Please retry.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveUploadTask(null);
    }
  };

  const removeDoc = async (taskId: string, docName: string) => {
    const doc = uploadedDocs.find(
      (d) => d.taskId === taskId && d.docName === docName
    );
    if (doc?.id) {
      try {
        await api(`/documents/${doc.id}`, { method: 'DELETE' });
      } catch {}
    }
    setUploadedDocs((prev) =>
      prev.filter((d) => !(d.taskId === taskId && d.docName === docName))
    );
  };

  return (
    <>
      {/* Hidden file input for document attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
      />

      <div className="space-y-6">
        {/* STEP 2 & 3 — Estate Overview & Claim Progress */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                <span>ESTATE CLAIM WORKSPACE</span>
                <span>·</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {c.id}
                </span>
                <button
                  type="button"
                  onClick={copyRef}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Copy Case ID"
                >
                  {copiedRef ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Estate of {c.deceasedName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                <span>Died: {date(c.deceased.dateOfDeath)}</span>
                <span>·</span>
                <span>CRS Reg: {c.deceased.registrationNo}</span>
                <span>·</span>
                <span className="font-sans">Rules: {c.state}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={indexingVault}
                disabled={indexingVault || downloadingPdf}
                onClick={handleIndexVault}
                className="gap-1.5 text-xs py-2"
                title="Index statutory claim dossier into SQLite Document Vault for AI guidance"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span>{vaultFeedback || 'Index in AI Vault'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDossier(true)}
                className="gap-1.5 text-xs py-2"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Preview Dossier</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOutbox(true)}
                className="gap-1.5 text-xs py-2 cursor-pointer"
                title="Inspect transmission outbox audit log and tracking IDs"
              >
                <Mail className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Transmissions</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowWizard(true)}
                className="gap-1.5 text-xs py-2 cursor-pointer"
                title="Interactive pre-fill wizard for claimant IFSC, branch and employer codes"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Pre-Fill Wizard</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs py-2 cursor-pointer"
                title="Print hardcopy packet optimized for bank branch submission"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Print Hardcopy</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="gap-1.5 text-xs py-2"
                title="Send official statutory claim dossier with PDF attachment via email"
              >
                <Mail className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span>Email Dossier</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={downloadingPdf}
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
                className="gap-2 shadow-sm text-xs py-2"
                title="Download consolidated statutory claim dossier (PDF)"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadingPdf ? 'Generating PDF…' : 'Download Claim Dossier (PDF)'}</span>
              </Button>
            </div>
          </div>

          {/* Metrics & Progress Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <div className="text-[10px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400">
                Estate Total
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {inr(total)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {inrShort(total)} aggregated
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400">
                Total Holdings
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {c.holdings.length}
              </div>
              <div className="text-[11px] text-slate-500">Across 7 regulators</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400">
                Registered Heirs
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {c.heirs.length}
              </div>
              <div
                className="text-[11px] text-slate-500 truncate"
                title={c.heirs.map((h) => h.name).join(', ')}
              >
                {c.heirs.map((h) => h.name).join(', ') || 'None'}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Claim Progress
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                  {done}/{c.tasks.length} ({pct}%)
                </span>
              </div>
              <Progress value={c.tasks.length > 0 ? done / c.tasks.length : 0} />
              <div className="text-[11px] text-slate-500 mt-1">
                {c.tasks.length - done} action items remaining
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Name Discrepancy Advisory Banner */}
        {nameDiscrepancy && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-xs">
                Statutory Advisory: Minor Name Variation Detected
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                Registered name on {nameDiscrepancy.institution} is "{nameDiscrepancy.registeredName}" while PAN records "{c.deceasedName}". An Annexure-I Indemnity Bond and Notarized Name Affidavit are pre-appended to your Claim Dossier.
              </p>
            </div>
          </div>
        )}

        {/* Duplicate Warning or Upload Errors */}
        {duplicateWarning && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-200">
            <span className="font-medium">{duplicateWarning}</span>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 font-bold ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] items-start">
          {/* Main Left Column: Prerequisites & Holding Claims */}
          <div className="space-y-6">
            {/* STEP 4 — Statutory Prerequisites (Expandable) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Step 1: Statutory Prerequisites
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Core state civil documentation required before institutional asset release.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {groups.general.filter((t) => t.done).length}/{groups.general.length} done
                </span>
              </div>

              <div className="space-y-2">
                {groups.general.map((t) => {
                  const isExpanded = Boolean(expandedPrereqs[t.id]);
                  const taskDocs = uploadedDocs.filter((d) => d.taskId === t.id);
                  const docsAttached = taskDocs.length;
                  const docsRequired = t.docs.length;

                  return (
                    <div
                      key={t.id}
                      className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
                    >
                      {/* Collapsed Header */}
                      <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggle(t)}
                            disabled={pending === t.id}
                            className="mt-0.5 shrink-0 cursor-pointer"
                            aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {t.done ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Circle
                                className={cx(
                                  'h-5 w-5 text-slate-300 dark:text-slate-600 hover:text-brand-600',
                                  pending === t.id && 'animate-pulse'
                                )}
                              />
                            )}
                          </button>
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() =>
                              setExpandedPrereqs((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }))
                            }
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cx(
                                  'font-semibold text-sm',
                                  t.done
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-900 dark:text-white'
                                )}
                              >
                                {t.title}
                              </span>
                              {t.done ? (
                                <Badge tone="green">Completed</Badge>
                              ) : docsRequired > 0 ? (
                                <span className="text-[11px] font-mono text-slate-500">
                                  {docsAttached}/{docsRequired} docs attached
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {t.detail}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPrereqs((prev) => ({
                              ...prev,
                              [t.id]: !prev[t.id],
                            }))
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                          aria-label={isExpanded ? 'Collapse task' : 'Expand task'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/60 space-y-3 text-xs">
                          {t.docs.length > 0 && (
                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center justify-between pb-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Supporting Paperwork</span>
                                <button
                                  type="button"
                                  onClick={() => setDropzoneForTask(dropzoneForTask === t.id ? null : t.id)}
                                  className="text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                                >
                                  {dropzoneForTask === t.id ? 'Hide Dropzone' : 'Drag & Drop Zone'}
                                </button>
                              </div>
                              {dropzoneForTask === t.id && (
                                <DocUploadDropzone
                                  taskId={t.id}
                                  caseId={c.id}
                                  docName={t.docs[0] || 'Proof'}
                                  onUploaded={(doc) => {
                                    setUploadedDocs((prev) => [
                                      ...prev,
                                      {
                                        id: doc.id,
                                        taskId: doc.taskId || t.id,
                                        docName: doc.docType || '',
                                        fileName: doc.fileName,
                                        fileSize: doc.fileSize,
                                        hash: doc.sha256,
                                        uploadedAt: doc.createdAt,
                                      },
                                    ]);
                                    setDropzoneForTask(null);
                                  }}
                                />
                              )}
                              <div className="flex flex-wrap gap-2">
                                {t.docs.map((d) => {
                                  const uploaded = taskDocs.find((u) => u.docName === d);
                                  return (
                                    <div
                                      key={d}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {d}
                                      </span>
                                      {uploaded ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold ml-1">
                                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                          <span>
                                            {(uploaded.fileSize / 1024).toFixed(0)}KB
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeDoc(t.id, d)}
                                            className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                            title="Remove attachment"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveUploadTask({
                                              taskId: t.id,
                                              docName: d,
                                            });
                                            fileInputRef.current?.click();
                                          }}
                                          className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 hover:underline font-semibold ml-1 cursor-pointer"
                                        >
                                          <Upload className="h-3 w-3" />
                                          Attach
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Landmark className="h-3.5 w-3.5 text-slate-400" />
                              <span>Authority: {t.authority}</span>
                              {(() => {
                                const portal = getStatePortal(c.state);
                                if (!portal) return null;
                                return (
                                  <a
                                    href={portal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 dark:text-brand-400 hover:underline ml-1"
                                    title={`Launch official ${portal.name} portal`}
                                  >
                                    <span>· Launch {portal.name}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                );
                              })()}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent('guide:ask', {
                                    detail: `How do I complete "${t.title}" in ${c.state}? The authority involved is ${t.authority}.`,
                                  })
                                );
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Ask AI Guide</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 5 — Holdings and Individual Claims (Expandable per holding) */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Step 2: Holdings & Individual Claims ({filteredHoldings.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Individual transmission workflows based on nominee status and asset class.
                  </p>
                </div>

                {/* Regulator Filters */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                  <button
                    type="button"
                    onClick={() => setFilterReg('all')}
                    className={cx(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                      filterReg === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    All ({c.holdings.length})
                  </button>
                  {ALL_REGS.map((r) => {
                    const count = c.holdings.filter((h) => h.regulator === r).length;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFilterReg(r)}
                        className={cx(
                          'px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer',
                          filterReg === r
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <span>{r}</span>
                        {count > 0 && (
                          <span className="text-[10px] opacity-75 font-mono">
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsed/Expandable Holdings List */}
              <div className="space-y-2">
                {filteredHoldings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl bg-white dark:bg-slate-900">
                    No holdings match regulator filter "{filterReg}".
                    <div className="mt-2">
                      <button
                        onClick={() => setFilterReg('all')}
                        className="text-xs text-brand-600 hover:underline cursor-pointer"
                      >
                        Reset to all
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredHoldings.map(({ h, tasks }) => {
                    const isExpanded = Boolean(expandedHoldings[h.id]);
                    const doneTasks = tasks.filter((t) => t.done).length;
                    const isAllTasksDone = tasks.length > 0 && doneTasks === tasks.length;
                    const hasNominee = h.nominee && h.nominee.status === 'valid';
                    const nameMismatch = Boolean(
                      h.registeredName &&
                        h.registeredName.toLowerCase() !== c.deceasedName.toLowerCase()
                    );
                    const totalRequiredDocs = tasks.reduce(
                      (s, t) => s + t.docs.length,
                      0
                    );
                    const totalAttachedDocs = tasks.reduce((s, t) => {
                      return (
                        s + uploadedDocs.filter((d) => d.taskId === t.id).length
                      );
                    }, 0);

                    return (
                      <div
                        key={h.id}
                        className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
                      >
                        {/* Collapsed Holding Row */}
                        <div
                          onClick={() =>
                            setExpandedHoldings((prev) => ({
                              ...prev,
                              [h.id]: !prev[h.id],
                            }))
                          }
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <RegChip code={h.regulator} />
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {h.type}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                {h.institution} · {h.ref}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {hasNominee ? (
                                <Badge tone="green">
                                  Nominee Claim: {h.nominee!.name} ({h.nominee!.relation})
                                </Badge>
                              ) : (
                                <Badge tone="amber">
                                  Legal Heir Claim (No Nominee)
                                </Badge>
                              )}
                              {nameMismatch && (
                                <Badge tone="red">
                                  Name on record: {h.registeredName}
                                </Badge>
                              )}
                              <span className="text-[11px] text-slate-400 font-mono">
                                {doneTasks}/{tasks.length} steps complete
                                {totalRequiredDocs > 0 &&
                                  ` · ${totalAttachedDocs}/${totalRequiredDocs} docs attached`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                            <div className="text-right">
                              <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
                                {inr(h.value)}
                              </div>
                              <div className="text-[10px] uppercase font-mono text-slate-400">
                                {isAllTasksDone ? 'Ready to claim' : 'Claims pending'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                              aria-label={isExpanded ? 'Collapse holding' : 'Expand holding'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details: Claim Checklist */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 space-y-3 text-xs">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                              Holding Transmission & Claim Checklist
                            </div>

                            {h.regulator === 'RBI' && (
                              <RbiDelayCalculator
                                holding={h}
                                deceasedName={c.deceasedName}
                                caseId={c.id}
                              />
                            )}

                            <div className="space-y-2.5">
                              {tasks.map((t) => {
                                const taskDocs = uploadedDocs.filter(
                                  (d) => d.taskId === t.id
                                );
                                return (
                                  <div
                                    key={t.id}
                                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2"
                                  >
                                    <div className="flex items-start gap-3">
                                      <button
                                        type="button"
                                        onClick={() => toggle(t)}
                                        disabled={pending === t.id}
                                        className="mt-0.5 shrink-0 cursor-pointer"
                                        aria-label={
                                          t.done ? 'Mark incomplete' : 'Mark complete'
                                        }
                                      >
                                        {t.done ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                          <Circle
                                            className={cx(
                                              'h-4 w-4 text-slate-300 dark:text-slate-600 hover:text-brand-600',
                                              pending === t.id && 'animate-pulse'
                                            )}
                                          />
                                        )}
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className={cx(
                                            'font-semibold text-xs',
                                            t.done
                                              ? 'text-slate-400 line-through'
                                              : 'text-slate-900 dark:text-white'
                                          )}
                                        >
                                          {t.title}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                          {t.detail}
                                        </p>
                                      </div>
                                    </div>

                                    {t.docs.length > 0 && (
                                      <div className="pl-7 space-y-1.5">
                                        <div className="text-[10px] uppercase font-mono font-semibold text-slate-400">
                                          Required Paperwork
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {t.docs.map((d) => {
                                            const uploaded = taskDocs.find(
                                              (u) => u.docName === d
                                            );
                                            return (
                                              <div
                                                key={d}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[11px]"
                                              >
                                                <FileText className="h-3 w-3 text-slate-400" />
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                  {d}
                                                </span>
                                                {uploaded ? (
                                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold ml-1">
                                                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                                    <span>
                                                      {(
                                                        uploaded.fileSize / 1024
                                                      ).toFixed(0)}
                                                      KB
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        removeDoc(t.id, d)
                                                      }
                                                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                                      title="Remove attachment"
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </span>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveUploadTask({
                                                        taskId: t.id,
                                                        docName: d,
                                                      });
                                                      fileInputRef.current?.click();
                                                    }}
                                                    className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 hover:underline font-semibold ml-1 cursor-pointer"
                                                  >
                                                    <Upload className="h-3 w-3" />
                                                    Attach
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    <div className="pl-7 flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-1">
                                        <Landmark className="h-3 w-3" />
                                        <span>Authority: {t.authority}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          window.dispatchEvent(
                                            new CustomEvent('guide:ask', {
                                              detail: `How do I complete "${t.title}" for ${h.type} at ${h.institution} in ${c.state}?`,
                                            })
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                                      >
                                        <BookOpen className="h-3 w-3" />
                                        <span>Ask AI Guide</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: AI Succession Navigator, Registered Heirs, and Live Timeline */}
          <div className="space-y-6">
            {/* STEP 7 — AI Succession Navigator */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Succession Navigator
              </div>
              <GuideChat state={c.state} caseId={c.id} compact />
            </div>

            {/* STEP 8 — Registered Heirs */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Registered Heirs
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {c.heirs.length} heirs
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {c.heirs.map((h) => (
                  <div
                    key={h.id}
                    className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {h.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        PAN: {h.pan ? `${h.pan.slice(0, 5)}••••${h.pan.slice(-1)}` : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {h.relation}
                      </span>
                      <div className="text-xs text-brand-700 dark:text-brand-400 font-semibold tabular-nums">
                        {h.share}% share
                      </div>
                    </div>
                  </div>
                ))}
                {c.heirs.length === 0 && (
                  <div className="text-slate-400 text-xs italic">
                    No registered heirs recorded.
                  </div>
                )}
              </div>
            </div>

            {/* STEP 9 — Succession Timeline */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white">
                Succession Timeline
              </div>
              <ol className="space-y-3 border-l border-slate-200 dark:border-slate-800 pl-3.5 text-xs">
                {[...c.timeline].reverse().map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[19px] top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                      {e.text}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {date(e.at)} · {time(e.at)}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Filled Claim Dossier Modal (Printable) */}
      {showDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-8 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                  Official Claim Packet
                </span>
                <h2 className="text-xl font-bold">
                  Consolidated Estate Succession Dossier
                </h2>
                <p className="text-xs text-slate-500">
                  Reference: {c.id} · Generated on{' '}
                  {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="primary" 
                  size="sm" 
                  loading={downloadingPdf}
                  disabled={downloadingPdf}
                  onClick={handleDownloadPdf} 
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" /> {downloadingPdf ? 'Downloading…' : 'Download Official PDF'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <button
                  onClick={() => setShowDossier(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="mt-6 space-y-6 text-sm">
              {/* Section 1: Deceased Details */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  1. Deceased Individual Particulars
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Full Name:</span>
                    <span className="font-bold text-slate-800">{c.deceasedName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN:</span>
                    <span className="font-bold text-slate-800">{c.deceasedPan}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Death:</span>
                    <span className="font-bold text-slate-800">
                      {c.deceased.dateOfDeath}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CRS Reg No:</span>
                    <span className="font-bold text-slate-800">
                      {c.deceased.registrationNo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Asset Schedule */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  2. Schedule of Claimed Financial Holdings
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Regulator</th>
                        <th className="p-2.5">Institution & Asset</th>
                        <th className="p-2.5">Reference No</th>
                        <th className="p-2.5">Value (INR)</th>
                        <th className="p-2.5">Claim Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.holdings.map((h) => (
                        <tr key={h.id}>
                          <td className="p-2.5 font-bold text-slate-700">
                            {h.regulator}
                          </td>
                          <td className="p-2.5 font-medium">
                            {h.institution} · {h.type}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {h.ref}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-900">
                            {inr(h.value)}
                          </td>
                          <td className="p-2.5">
                            {h.nominee?.status === 'valid'
                              ? `Nominee (${h.nominee.name})`
                              : 'Legal Heirs'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Attached Supporting Documents */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  3. Attached Supporting Evidence & Verification Status
                </h3>
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-xs space-y-1.5">
                  {uploadedDocs.length > 0 ? (
                    uploadedDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0"
                      >
                        <span className="font-medium text-slate-800">
                          {doc.docName} ({doc.fileName})
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          SHA-256: {doc.hash.slice(0, 16)}...
                        </span>
                        <Badge tone="green">Verified</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">
                      No supporting documents attached yet. Attach files under each step to include SHA-256 integrity proofs.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Legal Heir Declarations */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  4. Legal Heir Signatory Declarations
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {c.heirs.map((h) => (
                    <div
                      key={h.id}
                      className="border border-slate-200 rounded-lg p-3 text-xs space-y-3"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{h.name}</span>{' '}
                        ({h.relation} — {h.share}%)
                        <span className="block text-slate-400">PAN: {h.pan}</span>
                      </div>
                      <div className="pt-6 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                        Signature of Claimant / Heir
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDossier(false)}
              >
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    

      {/* Sent Transmissions & Outbox Audit Drawer (future.md §1.2) */}
      <TransmissionsDrawer
        open={showOutbox}
        onClose={() => setShowOutbox(false)}
        caseId={c.id}
        deceasedName={c.deceasedName}
        onOpenEmailModal={() => setShowEmailModal(true)}
      />

      {/* Pre-Fill Claim Form Particulars Wizard (future.md §2.3) */}
      <ClaimFormWizardModal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        caseId={c.id}
        pan={c.deceasedPan}
        deceasedName={c.deceasedName}
        onEmailDossier={() => setShowEmailModal(true)}
      />

      {/* Email Dossier Modal Dialog */}
      <EmailDossierModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        caseId={c.id}
        defaultEmail={c.heirs[0]?.email || ''}
        defaultName={c.heirs[0]?.name || ''}
        heirs={c.heirs}
        title="Email Estate Claiming Dossier"
        subtitle={`Case Reference: ${c.id} · Official PDF Attached`}
      />
    </>
  );
}