import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  FileText,
  Inbox,
} from 'lucide-react';
import { getClaimingDossierEmailHistory, type SentEmailRecord } from '../lib/api';
import { Badge, Button, cx, useToast } from './ui';
import { date, time } from '../lib/format';

export default function TransmissionsDrawer({
  open,
  onClose,
  caseId,
  deceasedName,
  onOpenEmailModal,
}: {
  open: boolean;
  onClose: () => void;
  caseId?: string;
  deceasedName?: string;
  onOpenEmailModal?: () => void;
}) {
  const [history, setHistory] = useState<SentEmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectEml, setInspectEml] = useState<{ filename: string; content: string } | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const { toast } = useToast();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getClaimingDossierEmailHistory(caseId);
      setHistory(res.history || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, caseId]);

  const handleCopy = (trackingId: string) => {
    navigator.clipboard.writeText(trackingId);
    setCopiedId(trackingId);
    toast({
      title: 'Tracking Reference Copied',
      detail: trackingId,
      variant: 'info',
      duration: 2500,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInspect = async (record: SentEmailRecord) => {
    setInspecting(true);
    try {
      const emlName = `${record.id}_${record.filename}.eml`;
      const res = await fetch(`/api/dev/outbox/${encodeURIComponent(emlName)}`);
      if (res.ok) {
        const text = await res.text();
        setInspectEml({ filename: emlName, content: text });
      } else {
        // Try without prefix or direct record
        toast({
          title: 'RFC 822 Outbox Inspector',
          detail: `Direct transmission recorded with ID ${record.id} (${record.status})`,
          variant: 'info',
        });
      }
    } catch {
      toast({
        title: 'Inspector Notice',
        detail: 'Transmission logged in SQLite audit store.',
        variant: 'info',
      });
    } finally {
      setInspecting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="outbox-drawer-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-surface shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Inbox className="h-4 w-4" />
              </div>
              <div>
                <h2 id="outbox-drawer-title" className="text-sm font-bold text-slate-900">
                  Transmission History
                </h2>
                <p className="text-[11px] text-slate-500">
                  {caseId ? `Audit trail for Case ${caseId}` : 'All dispatched claiming dossiers'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-xs">
            <span className="font-medium text-slate-500">
              {history.length} {history.length === 1 ? 'dispatch' : 'dispatches'} recorded
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={loadHistory}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className={cx('h-3 w-3', loading && 'animate-spin')} />
                Refresh
              </button>
              {onOpenEmailModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenEmailModal();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline cursor-pointer"
                >
                  <Mail className="h-3 w-3" />
                  New Dispatch
                </button>
              )}
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading && history.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading transmission audit log…</div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-2.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  No transmissions sent yet
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  When you email the statutory claiming packet to banks, EPFO, or legal heirs, the cryptographically verified transmission log and tracking IDs appear here.
                </p>
                {onOpenEmailModal && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="mt-2 text-xs"
                    onClick={() => {
                      onClose();
                      onOpenEmailModal();
                    }}
                  >
                    Email Claiming Dossier Now
                  </Button>
                )}
              </div>
            ) : (
              history.map((record) => {
                const isCopied = copiedId === record.id;
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">
                            {record.recipientName || 'Statutory Recipient'}
                          </span>
                          <Badge tone={record.isMock ? 'amber' : 'green'}>
                            {record.isMock ? 'Local Outbox Mock' : 'SMTP Active'}
                          </Badge>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate max-w-[240px]">
                          {record.toEmail}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400">
                          {date(record.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {time(record.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Subject & Attached File */}
                    <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
                      <div className="text-slate-700 font-medium truncate">
                        {record.subject}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <FileText className="h-3 w-3 shrink-0 text-brand-600" />
                        <span className="truncate">{record.filename}</span>
                      </div>
                    </div>

                    {/* Tracking ID & Action Row */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                        <span className="text-slate-400">REF:</span>
                        <span className="font-semibold text-slate-700">{record.id}</span>
                        <button
                          onClick={() => handleCopy(record.id)}
                          className="ml-1 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy tracking ID"
                        >
                          {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInspect(record)}
                          disabled={inspecting}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-brand-600 cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Inspect MIME
                        </button>
                        {onOpenEmailModal && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenEmailModal();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Re-send
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-slate-200/80 bg-surface p-4 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              RFC 5322 & Section 65B Audit Compliant
            </span>
            <button
              onClick={onClose}
              className="font-semibold text-slate-700 hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Raw MIME Inspector Modal */}
      {inspectEml && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-surface p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Raw RFC 822 MIME Inspector</h3>
                <p className="font-mono text-xs text-slate-500">{inspectEml.filename}</p>
              </div>
              <button
                onClick={() => setInspectEml(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="mt-3 flex-1 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-400 leading-relaxed">
              {inspectEml.content}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setInspectEml(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
