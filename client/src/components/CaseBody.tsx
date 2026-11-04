import { useMemo, useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, Circle, FileText, Landmark, Upload, AlertTriangle, 
  Download, Printer, X, ShieldCheck, BookOpen 
} from 'lucide-react';
import { api, uploadDocument, type Case, type Task } from '../lib/api';
import { date, inr, inrShort, time } from '../lib/format';
import { Badge, Card, Progress, RegChip, Button, cx } from './ui';
import GuideChat from './GuideChat';

interface UploadedDoc {
  id?: string;
  taskId: string;
  docName: string;
  fileName: string;
  fileSize: number;
  hash: string;
  uploadedAt: string;
}

export default function CaseBody({ c, onToggle }: { c: Case; onToggle: (t: Task) => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTask, setActiveUploadTask] = useState<{ taskId: string; docName: string } | null>(null);

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

  // Check for any registered name discrepancy across holdings (e.g. "R. Raghavan" vs "Raghavan")
  const nameDiscrepancy = useMemo(() => {
    return c.holdings.find(
      (h) => h.registeredName && h.registeredName.toLowerCase() !== c.deceasedName.toLowerCase()
    );
  }, [c]);

  const groups = useMemo(() => {
    const general = c.tasks.filter((t) => !t.holdingId);
    const per = c.holdings.map((h) => ({ h, tasks: c.tasks.filter((t) => t.holdingId === h.id) }));
    return { general, per };
  }, [c]);

  const toggle = async (t: Task) => {
    setPending(t.id);
    try {
      await onToggle(t);
    } finally {
      setPending(null);
    }
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
      setDuplicateWarning('Unsupported file type. Please upload a PDF, PNG, or JPEG document.');
      return;
    }

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setDuplicateWarning(`File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress the document.`);
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

      setUploadedDocs((prev) => [...prev.filter((d) => !(d.taskId === activeUploadTask.taskId && d.docName === activeUploadTask.docName)), newDoc]);
    } catch (err: any) {
      setDuplicateWarning(err?.message || 'Error uploading document to SQLite vault. Please retry.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveUploadTask(null);
    }
  };

  const removeDoc = async (taskId: string, docName: string) => {
    const doc = uploadedDocs.find((d) => d.taskId === taskId && d.docName === docName);
    if (doc?.id) {
      try {
        await api(`/documents/${doc.id}`, { method: 'DELETE' });
      } catch {}
    }
    setUploadedDocs((prev) => prev.filter((d) => !(d.taskId === taskId && d.docName === docName)));
  };

  const TaskRow = ({ t }: { t: Task }) => {
    const taskDocs = uploadedDocs.filter((d) => d.taskId === t.id);

    return (
      <li className="py-4">
        <div className="flex gap-3">
          <button onClick={() => toggle(t)} disabled={pending === t.id} className="mt-0.5 shrink-0 cursor-pointer" aria-label={t.done ? 'Mark not done' : 'Mark done'}>
            {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className={cx('h-5 w-5 text-slate-300 hover:text-brand-600', pending === t.id && 'animate-pulse')} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className={cx('text-sm font-semibold', t.done ? 'text-slate-400 line-through' : 'text-ink')}>{t.title}</div>
            <p className="mt-0.5 text-sm text-slate-600">{t.detail}</p>
            
            {/* Required Supporting Documents & Upload Dropzone */}
            {t.docs.length > 0 && (
              <div className="mt-2.5 space-y-2">
                <div className="text-xs font-medium text-slate-500">Supporting Paperwork:</div>
                <div className="flex flex-wrap gap-2">
                  {t.docs.map((d) => {
                    const uploaded = taskDocs.find((u) => u.docName === d);
                    return (
                      <div key={d} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-medium text-slate-700">{d}</span>
                        {uploaded ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold ml-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>{(uploaded.fileSize / 1024).toFixed(0)}KB</span>
                            <button onClick={() => removeDoc(t.id, d)} className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer" title="Remove attachment">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveUploadTask({ taskId: t.id, docName: d });
                              fileInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-900 font-semibold ml-1 cursor-pointer"
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

            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                <span>Authority: {t.authority}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('guide:ask', {
                      detail: `How do I complete "${t.title}" in ${c.state}? The authority involved is ${t.authority}.`
                    })
                  );
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 px-2 py-0.5 rounded cursor-pointer"
                title="Ask AI succession guide about this step"
              >
                <BookOpen className="h-3 w-3" />
                <span>Ask AI Guide</span>
              </button>
            </div>
          </div>
        </div>
      </li>
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

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Top Estate Header Card with Download Dossier Action */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Estate Reference: {c.id}</span>
                <h1 className="text-xl font-bold text-ink">{c.deceasedName}'s Estate Claim Workspace</h1>
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setShowDossier(true)}
                className="gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download Claim Dossier
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs text-slate-500">Estate Total</div>
                <div className="text-2xl font-bold text-ink">{inrShort(total)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Holdings</div>
                <div className="text-2xl font-bold text-ink">{c.holdings.length}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">State Rules</div>
                <div className="text-lg font-bold text-ink">{c.state}</div>
              </div>
              <div className="min-w-48 flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Claim Progress</span>
                  <span className="font-semibold text-ink">{done}/{c.tasks.length} steps</span>
                </div>
                <Progress value={done / c.tasks.length} />
              </div>
            </div>
          </Card>

          {/* Statutory Name Discrepancy Advisory Banner */}
          {nameDiscrepancy && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Statutory Advisory: Minor Name Variation Detected</div>
                <p className="mt-0.5 text-xs text-amber-800">
                  Registered name on {nameDiscrepancy.institution} is "{nameDiscrepancy.registeredName}" while PAN records "{c.deceasedName}". 
                  To guarantee branch counter acceptance, an Annexure-I Indemnity Bond and Notarized Name Affidavit are automatically pre-appended to your Claim Dossier.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate Document or Validation Warning */}
          {duplicateWarning && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <span className="font-medium">{duplicateWarning}</span>
              <button onClick={() => setDuplicateWarning(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">Dismiss</button>
            </div>
          )}

          {/* General Immediate Tasks */}
          <Card className="p-5">
            <h2 className="font-semibold text-ink text-base">Step 1: Statutory Prerequisites</h2>
            <p className="text-xs text-slate-500 mb-2">Obtain core state civil registration documents before approaching individual institutions.</p>
            <ul className="divide-y divide-slate-100">{groups.general.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
          </Card>

          {/* Asset-Specific Claim Tasks */}
          {groups.per.map(({ h, tasks }) => (
            <Card key={h.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <RegChip code={h.regulator} />
                <span className="font-semibold text-ink">{h.type}</span>
                <span className="text-sm text-slate-500">· {h.institution}</span>
                <span className="ml-auto font-semibold text-ink">{inr(h.value)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {h.nominee?.status === 'valid' ? (
                  <Badge tone="green">Nominee Claim: {h.nominee.name} ({h.nominee.relation})</Badge>
                ) : (
                  <Badge tone="amber">Legal Heir Claim (No Valid Nominee)</Badge>
                )}
                {h.registeredName && h.registeredName.toLowerCase() !== c.deceasedName.toLowerCase() && (
                  <Badge tone="red">Name: {h.registeredName}</Badge>
                )}
              </div>
              <ul className="divide-y divide-slate-100 mt-2">{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
            </Card>
          ))}
        </div>

        {/* Sidebar: AI Guide, Registered Heirs, and Live Timeline */}
        <div className="space-y-6">
          <GuideChat state={c.state} caseId={c.id} compact />
          
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-ink">Registered Heirs</h2>
              <span className="text-xs text-slate-500">{c.heirs.length} heirs</span>
            </div>
            <ul className="space-y-2 text-sm">
              {c.heirs.map((h) => (
                <li key={h.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="font-medium text-ink">{h.name}</div>
                    <div className="text-xs text-slate-400">PAN: {h.pan}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-600">{h.relation}</span>
                    <div className="text-xs text-brand-700 font-semibold">{h.share}% share</div>
                  </div>
                </li>
              ))}
              {c.heirs.length === 0 && <li className="text-slate-500 text-xs">No heirs were registered.</li>}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-ink">Succession Timeline</h2>
            <ol className="space-y-3 border-l border-slate-200 pl-4 text-sm">
              {[...c.timeline].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-600" />
                  <div className="text-slate-700 text-xs leading-relaxed">{e.text}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{date(e.at)} · {time(e.at)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {/* Pre-Filled Claim Dossier Modal (Printable) */}
      {showDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-8 text-ink shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Official Claim Packet</span>
                <h2 className="text-xl font-bold">Consolidated Estate Succession Dossier</h2>
                <p className="text-xs text-slate-500">Reference: {c.id} · Generated on {new Date().toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </Button>
                <button onClick={() => setShowDossier(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="mt-6 space-y-6 text-sm">
              {/* Section 1: Deceased Details */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">1. Deceased Individual Particulars</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-slate-500 block">Full Name:</span> <span className="font-bold text-slate-800">{c.deceasedName}</span></div>
                  <div><span className="text-slate-500 block">PAN:</span> <span className="font-bold text-slate-800">{c.deceasedPan}</span></div>
                  <div><span className="text-slate-500 block">Date of Death:</span> <span className="font-bold text-slate-800">{c.deceased.dateOfDeath}</span></div>
                  <div><span className="text-slate-500 block">CRS Reg No:</span> <span className="font-bold text-slate-800">{c.deceased.registrationNo}</span></div>
                </div>
              </div>

              {/* Section 2: Asset Schedule */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">2. Schedule of Claimed Financial Holdings</h3>
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
                          <td className="p-2.5 font-bold text-slate-700">{h.regulator}</td>
                          <td className="p-2.5 font-medium">{h.institution} · {h.type}</td>
                          <td className="p-2.5 font-mono text-slate-600">{h.ref}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{inr(h.value)}</td>
                          <td className="p-2.5">
                            {h.nominee?.status === 'valid' ? `Nominee (${h.nominee.name})` : 'Legal Heirs'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Attached Supporting Documents */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">3. Attached Supporting Evidence & Verification Status</h3>
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-xs space-y-1.5">
                  {uploadedDocs.length > 0 ? (
                    uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                        <span className="font-medium text-slate-800">{doc.docName} ({doc.fileName})</span>
                        <span className="font-mono text-[10px] text-slate-500">SHA-256: {doc.hash.slice(0, 16)}...</span>
                        <Badge tone="green">Verified</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">No supporting documents attached yet. Attach files under each step to include SHA-256 integrity proofs.</div>
                  )}
                </div>
              </div>

              {/* Section 4: Legal Heir Declarations */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">4. Legal Heir Signatory Declarations</h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {c.heirs.map((h) => (
                    <div key={h.id} className="border border-slate-200 rounded-lg p-3 text-xs space-y-3">
                      <div>
                        <span className="font-bold text-slate-800">{h.name}</span> ({h.relation} — {h.share}%)
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
              <Button variant="secondary" size="sm" onClick={() => setShowDossier(false)}>
                Close Preview
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> Print Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
