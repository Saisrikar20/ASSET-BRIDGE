import React, { useState, useEffect } from 'react';
import { Mail, X, AlertTriangle, CheckCircle2, Loader2, Send, Check, Download, Info, Smartphone } from 'lucide-react';
import { sendClaimingDossierEmail } from '../lib/api';
import { Button, cx } from './ui';

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
  // RFC 5322 compliant regex for practical email validation
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
  const [toEmail, setToEmail] = useState(defaultEmail);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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
    }
  }, [isOpen, defaultEmail, defaultName]);

  if (!isOpen) return null;

  const trimmedEmail = toEmail.trim();
  const isEmailEmpty = trimmedEmail.length === 0;
  const isEmailValid = isValidEmail(trimmedEmail);

  let validationMessage: string | null = null;
  if (touched) {
    if (isEmailEmpty) {
      validationMessage = 'Email address is required.';
    } else if (!isEmailValid) {
      validationMessage = 'Incorrect email address. Please enter a valid email (e.g. heir@family.org).';
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isEmailValid) {
      setEmailError('Incorrect email address. Please enter a valid email (e.g. heir@family.org).');
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
        setEmailSuccess(`Dossier generated in Mock Mode (Tracking ID: ${res.trackingId})`);
      } else {
        const providerName = res.provider === 'twilio_sendgrid' ? 'Twilio SendGrid' : res.provider === 'twilio_comms' ? 'Twilio Comms' : res.provider === 'smtp' ? 'Google App Password SMTP' : 'live transmission';
        setEmailSuccess(`Claiming dossier successfully dispatched to ${trimmedEmail} via ${providerName} (Tracking ID: ${res.trackingId})`);
        setTimeout(() => {
          onClose();
        }, 3500);
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch email. Please check your network and recipient address.');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-50 p-2 text-brand-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                {subtitle || (caseId ? `Case Reference: ${caseId} · Statutory Claiming Dossier Dispatch` : 'Statutory Claiming Dossier Dispatch · Statutory PDF Attached')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-3.5">
          {/* Quick Select from Registered Heirs (if provided) */}
          {heirs && heirs.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Select Registered Heir / Claimant
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
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition cursor-pointer flex items-center gap-1",
                      toEmail === h.email
                        ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {toEmail === h.email && <Check className="h-3 w-3 text-brand-600" />}
                    <span>{h.name} ({h.relation})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email Input Field with Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              {touched && isEmailValid && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Valid email
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="e.g. claimant@family.org, advocate@chambers.in"
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  setTouched(true);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => setTouched(true)}
                className={cx(
                  "w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none transition-colors",
                  validationMessage
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                )}
              />
            </div>
            {validationMessage && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 animate-in fade-in duration-100">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationMessage}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Recipient Name Field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recipient Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Meenakshi Sundaram"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Recipient Mobile Phone (Optional Twilio SMS) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                <span>Twilio SMS Alert (Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Optional Message Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Personal Message / Filing Instructions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add filing instructions or notes for the legal heir, bank nodal officer, or advocate..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Mock Mode Notice and Direct EML Downloader */}
          {dispatchResult && dispatchResult.isMock && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-950">
                    Twilio SendGrid Mock Mode Active (Local Outbox Delivery)
                  </div>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    Twilio SendGrid API key is not yet configured in your <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> file (<code className="font-mono">TWILIO_SENDGRID_API_KEY</code>).
                    To prevent loss of documents, the complete RFC 822 email packet with the attached statutory PDF was generated and stored in the local server outbox:
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-amber-700 break-all">
                    Tracking ID: {dispatchResult.trackingId}
                  </p>
                  {dispatchResult.warning && (
                    <p className="mt-1 text-[11px] text-rose-700 font-medium">
                      Note: {dispatchResult.warning}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between flex-wrap gap-2">
                <a
                  href={`/api/reports/claiming-dossier/outbox/${dispatchResult.trackingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .EML Email Packet</span>
                </a>
                <span className="text-[11px] text-amber-700/80">
                  Can be opened in Outlook, Apple Mail, or Thunderbird
                </span>
              </div>
            </div>
          )}

          {/* Live Dispatch Success Banner */}
          {dispatchResult && !dispatchResult.isMock && emailSuccess && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  {dispatchResult.provider === 'twilio_sendgrid' ? 'Live Email Dispatched via Twilio SendGrid' : 'Live Email Dispatched'}
                </div>
                <div className="mt-0.5">{emailSuccess}</div>
                <div className="mt-1 font-mono text-[11px] text-emerald-700">
                  Please check your inbox (or spam folder) for the statutory packet.
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {emailError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{emailError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={emailSending}
            >
              {dispatchResult ? 'Close' : 'Cancel'}
            </Button>
            {!dispatchResult && (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={emailSending || (touched && !isEmailValid)}
                className="gap-1.5"
              >
                {emailSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Dossier by Email</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
