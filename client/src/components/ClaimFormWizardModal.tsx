import { useState } from 'react';
import {
  X,
  FileCheck2,
  CreditCard,
  Briefcase,
  TrendingUp,
  Download,
  Mail,
} from 'lucide-react';
import { Button, Input, Field, useToast } from './ui';
import { downloadClaimingDossierPdf } from '../lib/api';

export interface ClaimParticulars {
  claimantBankName: string;
  claimantAccountNumber: string;
  claimantIfsc: string;
  claimantBranch: string;
  epfoEstablishmentCode: string;
  epfoUan: string;
  targetDpId: string;
  targetClientId: string;
  placeOfDeclaration: string;
}

export default function ClaimFormWizardModal({
  open,
  onClose,
  caseId,
  pan,
  deceasedName,
  onEmailDossier,
}: {
  open: boolean;
  onClose: () => void;
  caseId?: string;
  pan?: string;
  deceasedName?: string;
  onEmailDossier?: () => void;
}) {
  const { success, error } = useToast();
  const [tab, setTab] = useState<'bank' | 'epfo' | 'demat'>('bank');
  const [downloading, setDownloading] = useState(false);
  const [f, setF] = useState<ClaimParticulars>({
    claimantBankName: 'State Bank of India',
    claimantAccountNumber: '38920199481',
    claimantIfsc: 'SBIN0001234',
    claimantBranch: 'Main Branch',
    epfoEstablishmentCode: 'TN/MAS/0048192',
    epfoUan: '100918239481',
    targetDpId: 'IN300126',
    targetClientId: '10984712',
    placeOfDeclaration: 'Chennai',
  });

  if (!open) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadClaimingDossierPdf({
        caseId,
        pan,
        filename: `PreFilled_Claiming_Dossier_${deceasedName?.replace(/\s+/g, '_') || 'Estate'}.pdf`,
      });
      success('Claiming Packet Downloaded', 'Pre-filled statutory forms generated successfully.');
      onClose();
    } catch (e) {
      error('Download Failed', (e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Statutory Claim Form Pre-Fill Wizard
              </h3>
              <p className="text-xs text-slate-500">
                {deceasedName ? `Estate of ${deceasedName}` : 'Custom Particulars for EPFO, RBI & SEBI Templates'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setTab('bank')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold cursor-pointer ${
              tab === 'bank'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Claimant Bank NEFT (RBI)
          </button>
          <button
            onClick={() => setTab('epfo')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold cursor-pointer ${
              tab === 'epfo'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            EPFO Form 20
          </button>
          <button
            onClick={() => setTab('demat')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold cursor-pointer ${
              tab === 'demat'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            SEBI / Demat TRF
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'bank' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="rounded-xl bg-brand-50/50 p-3 text-xs text-brand-900">
                <span className="font-semibold">RBI Master Direction:</span> Deceased claim proceeds are electronically settled via NEFT/RTGS into claimant account within 15 calendar days.
              </div>
              <Field label="Claimant Savings Bank Name">
                <Input
                  value={f.claimantBankName}
                  onChange={(e) => setF({ ...f, claimantBankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Number">
                  <Input
                    value={f.claimantAccountNumber}
                    onChange={(e) => setF({ ...f, claimantAccountNumber: e.target.value })}
                    placeholder="e.g. 11-18 digit account number"
                  />
                </Field>
                <Field label="IFSC Code">
                  <Input
                    value={f.claimantIfsc}
                    onChange={(e) => setF({ ...f, claimantIfsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                  />
                </Field>
              </div>
              <Field label="Home Branch Name">
                <Input
                  value={f.claimantBranch}
                  onChange={(e) => setF({ ...f, claimantBranch: e.target.value })}
                  placeholder="e.g. Anna Salai Main Branch"
                />
              </Field>
            </div>
          )}

          {tab === 'epfo' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold">EPFO Form 20 (PF) & Form 10D (Pension):</span> Required by the Regional PF Commissioner for releasing accumulated balance to legal heirs.
              </div>
              <Field label="Employer Establishment Code">
                <Input
                  value={f.epfoEstablishmentCode}
                  onChange={(e) => setF({ ...f, epfoEstablishmentCode: e.target.value })}
                  placeholder="e.g. DL/CPM/0012345"
                />
              </Field>
              <Field label="Deceased Member UAN (Universal Account Number)">
                <Input
                  value={f.epfoUan}
                  onChange={(e) => setF({ ...f, epfoUan: e.target.value })}
                  placeholder="12-digit UAN"
                />
              </Field>
            </div>
          )}

          {tab === 'demat' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold">SEBI Transmission Request Form (TRF):</span> Transmits listed securities and mutual fund units into surviving heir Demat account.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Surviving Heir DP ID">
                  <Input
                    value={f.targetDpId}
                    onChange={(e) => setF({ ...f, targetDpId: e.target.value })}
                    placeholder="e.g. IN300126"
                  />
                </Field>
                <Field label="Target Client ID / Demat BO ID">
                  <Input
                    value={f.targetClientId}
                    onChange={(e) => setF({ ...f, targetClientId: e.target.value })}
                    placeholder="8-digit Client ID"
                  />
                </Field>
              </div>
              <Field label="Place of Legal Declaration">
                <Input
                  value={f.placeOfDeclaration}
                  onChange={(e) => setF({ ...f, placeOfDeclaration: e.target.value })}
                  placeholder="e.g. Chennai / Bengaluru / Mumbai"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 px-6 py-4 bg-surface">
          <span className="text-xs text-slate-500">
            Auto-injected into statutory PDF schedules
          </span>
          <div className="flex items-center gap-2">
            {onEmailDossier && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEmailDossier();
                }}
              >
                <Mail className="h-3.5 w-3.5 mr-1" />
                Email Packet
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              loading={downloading}
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download Pre-Filled PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
