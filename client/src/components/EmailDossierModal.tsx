import React, { useState, useEffect } from 'react';
import { Mail, X, AlertTriangle, CheckCircle2, Loader2, Send, Check } from 'lucide-react';
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
  const [customNote, setCustomNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setToEmail(defaultEmail);
      setRecipientName(defaultName);
      setCustomNote('');
      setTouched(false);
      setEmailSuccess(null);
      setEmailError(null);
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
        caseId,
        pan,
        personaId,
        customNote: customNote.trim() || undefined,
      });

      setEmailSuccess(`Claiming dossier successfully dispatched to ${trimmedEmail} (Tracking ID: ${res.trackingId})`);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch email. Please check your network and recipient address.');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-50 dark:bg-brand-950/60 p-2 text-brand-700 dark:text-brand-300">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle || (caseId ? `Case Reference: ${caseId} · Official PDF Attached` : 'Official Statutory PDF Dossier Attached')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Quick Select from Registered Heirs (if provided) */}
          {heirs && heirs.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300 font-semibold"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {toEmail === h.email && <Check className="h-3 w-3 text-brand-600 dark:text-brand-400" />}
                    <span>{h.name} ({h.relation})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email Input Field with Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              {touched && isEmailValid && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
                  "w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors",
                  validationMessage
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                    : "border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                )}
              />
            </div>
            {validationMessage && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-in fade-in duration-100">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationMessage}</span>
              </p>
            )}
          </div>

          {/* Recipient Name Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Meenakshi Sundaram"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Optional Message Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Personal Message / Filing Instructions (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add filing instructions or notes for the legal heir, bank nodal officer, or advocate..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Success Banner */}
          {emailSuccess && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {emailError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{emailError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={emailSending}
            >
              Cancel
            </Button>
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
          </div>
        </form>
      </div>
    </div>
  );
}
