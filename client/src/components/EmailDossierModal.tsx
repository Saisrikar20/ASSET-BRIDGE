import React, { useState, useEffect } from 'react';
import {
  Mail,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Check,
  Download,
  Info,
  Smartphone,
  History,
  FileDown,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import {
  sendClaimingDossierEmail,
  getClaimingDossierEmailHistory,
  downloadClaimingDossierPdf,
  type SentEmailRecord
} from '../lib/api';
import { Button, cx } from './ui';
import { time } from '../lib/format';

export interface EmailDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  pan?: string;
  personaId?: string;
  defaultEmail?: string;
  defaultName?: string;
  heirs?: Array<{ id: string; name: string; relation: string; email?: string }>;
  title?: string;
  subtitle?: string;
}

export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
}

export default function EmailDossierModal({
  isOpen,
  onClose,
  caseId,
  pan,
  personaId,
  defaultEmail = '',
  defaultName = '',
  heirs = [],
  title = 'Email Claiming Dossier',
  subtitle,
}: EmailDossierModalProps) {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'history'>('dispatch');
  const [toEmail, setToEmail] = useState(defaultEmail);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [history, setHistory] = useState<SentEmailRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    isMock: boolean;
    trackingId: string;
    toEmail: string;
    provider?: string;
    warning?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setToEmail(defaultEmail);
      setRecipientName(defaultName);
      setRecipientPhone('');
      setCustomNote('');
      setTouched(false);
      setEmailSuccess(null);
      setEmailError(null);
      setDispatchResult(null);
      setActiveTab('dispatch');
      loadHistory();
    }
  }, [isOpen, defaultEmail, defaultName, caseId]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getClaimingDossierEmailHistory(caseId);
      setHistory(res.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const trimmedEmail = toEmail.trim();
  const isEmailEmpty = trimmedEmail.length === 0;
  const isEmailValid = isValidEmail(trimmedEmail);

  let validationMessage: string | null = null;
  if (touched) {
    if (isEmailEmpty) {
      validationMessage = 'Email address is required.';
    } else if (!isEmailValid) {
      validationMessage = 'Incorrect email address. Please enter a valid email (e.g. nodal.officer@bank.in).';
    }
  }

  const handleDownloadPdfDirect = async () => {
    try {
      setDownloadingPdf(true);
      await downloadClaimingDossierPdf({
        caseId,
        pan,
        personaId,
      });
    } catch (e) {
      setEmailError((e as Error).message || 'Failed to download dossier PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isEmailValid) {
      setEmailError('Incorrect email address. Please enter a valid email.');
      return;
    }

    setEmailError(null);
    setEmailSuccess(null);
    setEmailSending(true);

    try {
      const res = await sendClaimingDossierEmail({
        toEmail: trimmedEmail,
        recipientName: recipientName.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        caseId,
        pan,
        personaId,
        customNote: customNote.trim() || undefined,
      });

      setDispatchResult({
        isMock: Boolean(res.isMock),
        trackingId: res.trackingId,
        toEmail: trimmedEmail,
        provider: res.provider,
        warning: res.warning,
      });

      if (res.isMock) {
        setEmailSuccess(`Dossier queued in Local Outbox mode (Tracking ID: ${res.trackingId})`);
      } else {
        const providerName =
          res.provider === 'smtp'
            ? 'Google SMTP'
            : res.provider === 'twilio_sendgrid'
              ? 'Twilio SendGrid'
              : res.provider === 'twilio_comms'
                ? 'Twilio Comms'
                : 'Direct Mail Server';
        setEmailSuccess(`Claiming dossier successfully transmitted to ${trimmedEmail} via ${providerName} (Tracking ID: ${res.trackingId})`);
      }
      loadHistory();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch email. Please check network and recipient address.');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 text-[#17232E] shadow-2xl border border-[#DDD7CA] space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#DDD7CA] pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#101D2B] p-2.5 text-white">
              <Mail className="h-5 w-5 text-[#55C6B0]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#101D2B]">
                {title}
              </h3>
              <p className="text-xs text-[#71808C]">
                {subtitle || (caseId ? `Case Reference: ${caseId} · Official PDF Attachment` : 'Statutory Succession Dossier Dispatch · PDF Attachment')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#71808C] hover:bg-[#F5F3ED] hover:text-[#101D2B] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation (Dispatch Form vs Audit History) */}
        <div className="flex items-center gap-2 border-b border-[#DDD7CA] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={cx(
              'px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer',
              activeTab === 'dispatch'
                ? 'bg-[#101D2B] text-white shadow-xs'
                : 'text-[#17232E] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
            )}
          >
            Dispatch Intimation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cx(
              'px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5',
              activeTab === 'history'
                ? 'bg-[#101D2B] text-white shadow-xs'
                : 'text-[#17232E] hover:bg-[#F5F3ED] border border-[#DDD7CA]'
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Transmission Ledger ({history.length})</span>
          </button>
        </div>

        {/* Tab 1: Dispatch Form */}
        {activeTab === 'dispatch' && (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Quick Select from Registered Legal Heirs */}
            {heirs && heirs.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-[#71808C] uppercase tracking-wider mb-1.5">
                  Select Destination Heir / Claimant
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {heirs.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        if (h.email) {
                          setToEmail(h.email);
                          setRecipientName(h.name);
                          setTouched(true);
                          setEmailError(null);
                        }
                      }}
                      className={cx(
                        'rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer flex items-center gap-1',
                        toEmail === h.email
                          ? 'border-[#101D2B] bg-[#101D2B] text-white shadow-xs'
                          : 'border-[#DDD7CA] bg-[#F5F3ED] text-[#17232E] hover:bg-white'
                      )}
                    >
                      {toEmail === h.email && <Check className="h-3 w-3 text-[#55C6B0]" />}
                      <span>{h.name} ({h.relation})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#101D2B]">
                  Recipient Institutional / Claimant Email <span className="text-[#C45D5D]">*</span>
                </label>
                {touched && isEmailValid && (
                  <span className="text-[11px] font-semibold text-[#34765B] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valid address
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                placeholder="e.g. nodal.officer@bank.in, heir@family.org"
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  setTouched(true);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => setTouched(true)}
                className={cx(
                  'w-full rounded-full border px-3.5 py-2 text-xs bg-white text-[#101D2B] placeholder-[#71808C] focus:outline-none transition',
                  validationMessage
                    ? 'border-[#C45D5D] focus:ring-1 focus:ring-[#C45D5D] bg-[#C45D5D]/5'
                    : 'border-[#DDD7CA] focus:border-[#101D2B]'
                )}
              />
              {validationMessage && (
                <p className="mt-1 text-xs text-[#C45D5D] flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationMessage}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recipient Name Field */}
              <div>
                <label className="block text-xs font-semibold text-[#101D2B] mb-1">
                  Recipient Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Branch Nodal Officer"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full rounded-full border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#101D2B] placeholder-[#71808C] focus:outline-none focus:border-[#101D2B]"
                />
              </div>

              {/* Recipient Mobile Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#101D2B] mb-1 flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5 text-[#71808C]" />
                  <span>SMS Dispatch Notice (Optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full rounded-full border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#101D2B] placeholder-[#71808C] focus:outline-none focus:border-[#101D2B] font-mono"
                />
              </div>
            </div>

            {/* Message Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#101D2B] mb-1">
                Statutory Notice Note / Filing Intimation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Formal request for claim registration under RBI 15-day deceased depositor circular..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full rounded-2xl border border-[#DDD7CA] bg-white p-3 text-xs text-[#101D2B] placeholder-[#71808C] focus:outline-none focus:border-[#101D2B]"
              />
            </div>

            {/* Provider and Mode Status Badge */}
            <div className="rounded-xl bg-[#F5F3ED] border border-[#DDD7CA] p-3 text-xs flex items-center justify-between text-[#71808C]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#34765B]" />
                <span className="font-semibold text-[#101D2B]">Active Dispatch Engine:</span>
                <span>Google App Password SMTP & Twilio Fallback</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdfDirect}
                disabled={downloadingPdf}
                className="text-xs font-bold text-[#101D2B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                title="Download direct PDF file to verify contents"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                <span>Direct PDF</span>
              </button>
            </div>

            {/* Mock / Outbox Mode Notification with direct .EML download */}
            {dispatchResult && dispatchResult.isMock && (
              <div className="rounded-2xl bg-[#C58B3C]/10 border border-[#C58B3C]/40 p-4 space-y-2.5 text-xs text-[#101D2B]">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-[#C58B3C] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-[#C58B3C]">
                      Local Server Outbox Fallback (Mock Mode)
                    </div>
                    <p className="text-[#71808C] leading-relaxed">
                      SMTP credentials are in developer sandbox mode. The complete RFC 822 MIME transmission packet with the binary ReportLab PDF attached has been safely compiled and stored in the server outbox.
                    </p>
                    <div className="font-mono text-[11px] text-[#101D2B]">
                      Reference: {dispatchResult.trackingId}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DDD7CA] flex items-center justify-between flex-wrap gap-2">
                  <a
                    href={`/api/reports/claiming-dossier/outbox/${dispatchResult.trackingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#101D2B] text-white font-semibold text-xs shadow-xs transition hover:bg-[#1C3041] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-[#55C6B0]" />
                    <span>Download .EML Message File</span>
                  </a>
                  <span className="text-[11px] text-[#71808C]">
                    Compatible with Outlook, Apple Mail & Thunderbird
                  </span>
                </div>
              </div>
            )}

            {/* Live Success Banner */}
            {dispatchResult && !dispatchResult.isMock && emailSuccess && (
              <div className="rounded-2xl bg-[#34765B]/10 border border-[#34765B]/30 p-3.5 text-xs text-[#34765B] flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#34765B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Transmission Dispatched Successfully</div>
                  <div className="mt-0.5 text-[#101D2B]">{emailSuccess}</div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {emailError && (
              <div className="rounded-2xl bg-[#C45D5D]/10 border border-[#C45D5D]/30 p-3 text-xs text-[#C45D5D] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#C45D5D] shrink-0 mt-0.5" />
                <span>{emailError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDD7CA]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={emailSending}
                className="rounded-full text-xs border-[#DDD7CA]"
              >
                {dispatchResult ? 'Close' : 'Cancel'}
              </Button>
              {!dispatchResult && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={emailSending || (touched && !isEmailValid)}
                  className="rounded-full text-xs font-semibold px-5 bg-[#101D2B] text-white hover:bg-[#1C3041] shadow-xs gap-1.5"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#55C6B0]" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 text-[#55C6B0]" />
                      <span>Transmit Claiming Dossier</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Tab 2: Transmission Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-[#71808C]">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#101D2B]" />
                Loading transmission audit ledger…
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71808C] space-y-1">
                <Mail className="h-6 w-6 mx-auto mb-2 text-[#71808C]" />
                <div className="font-bold text-[#101D2B]">No Prior Transmissions Recorded</div>
                <p>Emails and official claiming dockets dispatched for this dossier will appear in this audit log.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#DDD7CA]/60 overflow-hidden shadow-xs max-h-80 overflow-y-auto">
                {history.map((record) => (
                  <div key={record.id} className="p-3.5 text-xs hover:bg-[#F5F3ED]/40 transition space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#101D2B]">{record.toEmail}</span>
                        {record.recipientName && (
                          <span className="text-[#71808C]">({record.recipientName})</span>
                        )}
                      </div>
                      <span
                        className={cx(
                          'text-[10px] font-semibold px-2.5 py-0.5 rounded-full',
                          record.isMock
                            ? 'bg-[#C58B3C]/10 text-[#C58B3C] border border-[#C58B3C]/30'
                            : 'bg-[#34765B]/10 text-[#34765B] border border-[#34765B]/30'
                        )}
                      >
                        {record.isMock ? 'OUTBOX' : 'SENT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#71808C] font-mono">
                      <span>Ref: {record.id}</span>
                      <span>{time(record.createdAt)}</span>
                    </div>

                    {record.isMock && (
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-[#71808C]">Saved to local outbox</span>
                        <a
                          href={`/api/reports/claiming-dossier/outbox/${record.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1 text-[#101D2B] font-bold hover:underline"
                        >
                          <span>Download .EML</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
