import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CircleDashed,
  RotateCcw,
  XCircle,
  Lock,
  User,
  CreditCard,
  MapPin,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { api, type User as ApiUser, type VerifyResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RegChip, Select, cx } from '../components/ui';

export const OFFICIAL_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Delhi',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
];

export interface VerifiedPersonaData {
  id: string;
  name: string;
  pan: string;
  dob: string;
  aadhaarLast4: string;
  mobile: string;
  state: string;
  role: string;
  label: string;
}

export const DEMO_PERSONAS: VerifiedPersonaData[] = [
  {
    id: 'raghavan',
    name: 'Raghavan',
    pan: 'ABCPI1234K',
    dob: '1984-03-14',
    aadhaarLast4: '4821',
    mobile: '9840012345',
    state: 'Tamil Nadu',
    role: 'Salaried IT Specialist',
    label: 'Raghavan (TN)',
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    pan: 'AABCS9876L',
    dob: '1994-08-22',
    aadhaarLast4: '7134',
    mobile: '9880011223',
    state: 'Karnataka',
    role: 'Medical Professional',
    label: 'Priya (KA)',
  },
  {
    id: 'vikram',
    name: 'Vikramaditya Sengupta',
    pan: 'BPCPS4321D',
    dob: '1957-06-18',
    aadhaarLast4: '9942',
    mobile: '9830022334',
    state: 'West Bengal',
    role: 'Retired Public Banker',
    label: 'Vikramaditya (WB)',
  },
  {
    id: 'sunita',
    name: 'Sunita Deshmukh',
    pan: 'AXCPD5566M',
    dob: '1973-11-05',
    aadhaarLast4: '5512',
    mobile: '9822033445',
    state: 'Maharashtra',
    role: 'Small Business Proprietor',
    label: 'Sunita (MH)',
  },
  {
    id: 'rajesh',
    name: 'Rajesh Patel',
    pan: 'AYCPP7788N',
    dob: '1978-04-12',
    aadhaarLast4: '3391',
    mobile: '9898044556',
    state: 'Gujarat',
    role: 'Cross-Border Depositor (NRI)',
    label: 'Rajesh (GJ)',
  },
];

const STATUS_CONFIG = {
  verified: {
    icon: CheckCircle2,
    colorClass: 'text-[#34765B]',
    label: 'Verified',
    tone: 'green' as const,
    badgeBg: 'bg-[#34765B]/10 text-[#34765B] border-[#34765B]/30',
  },
  partial: {
    icon: AlertTriangle,
    colorClass: 'text-[#C58B3C]',
    label: 'Partial match',
    tone: 'amber' as const,
    badgeBg: 'bg-[#C58B3C]/10 text-[#C58B3C] border-[#C58B3C]/30',
  },
  mismatch: {
    icon: XCircle,
    colorClass: 'text-[#C45D5D]',
    label: 'Mismatch',
    tone: 'red' as const,
    badgeBg: 'bg-[#C45D5D]/10 text-[#C45D5D] border-[#C45D5D]/30',
  },
  none: {
    icon: CircleDashed,
    colorClass: 'text-[#71808C]',
    label: 'No records',
    tone: 'slate' as const,
    badgeBg: 'bg-[#71808C]/10 text-[#71808C] border-[#71808C]/30',
  },
};

export default function Verify() {
  const { user, meta, refresh } = useAuth();
  const results = user?.verification?.results;
  const verificationTime = user?.verification?.at;

  const [form, setForm] = useState(
    user?.identity || {
      name: user?.name || '',
      pan: '',
      dob: '',
      aadhaarLast4: '',
      mobile: '',
      state: 'Tamil Nadu',
    }
  );

  const [showForm, setShowForm] = useState(!results);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleExpand = (code: string) => {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleFieldChange = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const populatePersona = (p: VerifiedPersonaData) => {
    setErr(null);
    setForm({
      name: p.name,
      pan: p.pan,
      dob: p.dob,
      aadhaarLast4: p.aadhaarLast4,
      mobile: p.mobile,
      state: p.state,
    });
  };

  /**
   * Submit Identity Validation & Triangulation
   * Connects to POST /api/identity with strict statutory rules
   */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    const pan = form.pan.trim().toUpperCase();
    const aadhaarLast4 = form.aadhaarLast4.trim();
    const name = form.name.trim();

    // Client-side validation consistent with backend schemas
    if (!name || name.length < 2) {
      setErr('Please enter full legal name (minimum 2 characters as per PAN card).');
      return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan)) {
      setErr('PAN must be in standard statutory format (e.g. ABCDE1234F).');
      return;
    }
    if (!form.dob) {
      setErr('Please select date of birth (required for registry triangulation).');
      return;
    }
    if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) {
      setErr('Enter only the last 4 digits of Aadhaar (4 numbers). Full Aadhaar is never requested.');
      return;
    }
    if (form.mobile && !/^\d{10}$/.test(form.mobile.trim())) {
      setErr('Mobile number should be 10 digits.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name,
        pan,
        dob: form.dob,
        aadhaarLast4,
        mobile: form.mobile.trim(),
        state: form.state,
      };

      await api<{ user: ApiUser }>('/identity', {
        method: 'POST',
        body: payload,
      });

      await refresh();
      setShowForm(false);
    } catch (apiError) {
      setErr(
        (apiError as Error).message ||
          'Identity verification failed. Please check your credentials or ensure the server is online.'
      );
    } finally {
      setBusy(false);
    }
  };

  const totalRecords = results?.reduce((sum, r) => sum + r.recordsFound, 0) || 0;
  const regulatorCount = results?.length || 7;
  const stateOptions = meta?.states && meta.states.length > 0 ? meta.states : OFFICIAL_STATES;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#DDD7CA]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#101D2B]/10 text-[10px] font-semibold text-[#101D2B] mb-1 font-mono uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3 text-[#55C6B0]" />
            <span>Statutory Verification Gate</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17232E]">
            Identity Verification
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            {results
              ? `Consolidated verification across ${regulatorCount} statutory registries · ${totalRecords} matching records discovered`
              : 'Cross-check central banking and securities databases to map unnominated or inoperative holdings.'}
          </p>
        </div>

        {results && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-medium text-[#17232E] hover:bg-[#F5F3ED] transition cursor-pointer self-start sm:self-center shadow-xs"
            title="Edit verification parameters"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#71808C]" />
            <span>{showForm ? 'Hide parameters' : 'Modify credentials'}</span>
          </button>
        )}
      </div>

      {/* 2. Structured Verification Form */}
      {(!results || showForm) && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white overflow-hidden shadow-xs">
          {/* Header & Persona Quick Fill */}
          <div className="p-4 sm:p-5 border-b border-[#EAE6DC] bg-[#F5F3ED]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#17232E]">
                Statutory KYC Parameters
              </h2>
              <p className="text-[11px] text-[#71808C] mt-0.5">
                Inputs match Income Tax PAN registry, Form 16, and UIDAI validation standards.
              </p>
            </div>

            {/* Demo Personas Quick Fill */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-[#71808C] uppercase mr-1">
                Demo Presets:
              </span>
              {DEMO_PERSONAS.map((p) => {
                const isActive = form.pan.toUpperCase() === p.pan;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => populatePersona(p)}
                    className={cx(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer',
                      isActive
                        ? 'bg-[#101D2B] text-white shadow-xs ring-1 ring-[#55C6B0]'
                        : 'bg-white text-[#17232E] border border-[#DDD7CA] hover:bg-[#F5F3ED]'
                    )}
                    title={`${p.name} (${p.state}): ${p.role}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={submit} className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Particulars */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EAE6DC]">
                  <User className="h-4 w-4 text-[#55C6B0]" />
                  <span className="text-xs font-semibold text-[#17232E] uppercase tracking-wider">
                    1. Particulars
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#17232E] mb-1">
                      Full Legal Name <span className="text-[#C45D5D]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={handleFieldChange('name')}
                      placeholder="e.g. Raghavan Sundaram"
                      className="w-full rounded-xl border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#17232E] placeholder:text-[#71808C] outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                    />
                    <p className="text-[10.5px] text-[#71808C] mt-1">
                      Exact name as registered with income tax records.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#17232E] mb-1">
                      Date of Birth <span className="text-[#C45D5D]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.dob}
                      onChange={handleFieldChange('dob')}
                      className="w-full rounded-xl border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#17232E] outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                    />
                    <p className="text-[10.5px] text-[#71808C] mt-1">
                      Required for EPFO pension & bank deposit triangulation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 2: Identifiers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EAE6DC]">
                  <CreditCard className="h-4 w-4 text-[#55C6B0]" />
                  <span className="text-xs font-semibold text-[#17232E] uppercase tracking-wider">
                    2. Identifiers
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#17232E] mb-1">
                      Permanent Account Number (PAN) <span className="text-[#C45D5D]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.pan}
                      onChange={(e) =>
                        setForm({ ...form, pan: e.target.value.toUpperCase() })
                      }
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full font-mono rounded-xl border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#17232E] placeholder:text-[#71808C] outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30 uppercase tracking-wider"
                    />
                    <p className="text-[10.5px] text-[#71808C] mt-1">
                      10-character statutory alphanumeric key (`^[A-Z]{5}[0-9]{4}[A-Z]$`).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-[#17232E] mb-1">
                        Aadhaar (Last 4)
                      </label>
                      <input
                        type="text"
                        value={form.aadhaarLast4}
                        onChange={handleFieldChange('aadhaarLast4')}
                        maxLength={4}
                        inputMode="numeric"
                        placeholder="4821"
                        className="w-full font-mono rounded-xl border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#17232E] placeholder:text-[#71808C] outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#17232E] mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={form.mobile}
                        onChange={handleFieldChange('mobile')}
                        inputMode="tel"
                        maxLength={10}
                        placeholder="9840012345"
                        className="w-full rounded-xl border border-[#DDD7CA] bg-white px-3.5 py-2 text-xs text-[#17232E] placeholder:text-[#71808C] outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[#71808C]">
                    UIDAI compliant: Complete 12-digit Aadhaar is never requested or stored.
                  </p>
                </div>
              </div>

              {/* Column 3: Geographic Jurisdiction */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EAE6DC]">
                  <MapPin className="h-4 w-4 text-[#55C6B0]" />
                  <span className="text-xs font-semibold text-[#17232E] uppercase tracking-wider">
                    3. Jurisdiction
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#17232E] mb-1">
                      State of Legal Domicile <span className="text-[#C45D5D]">*</span>
                    </label>
                    <Select value={form.state} onChange={handleFieldChange('state')}>
                      {stateOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[10.5px] text-[#71808C] mt-1">
                      Determines applicable state succession rules (Tahsildar Legal Heir Certificate vs Civil Court Succession Certificate thresholds).
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F5F3ED] p-3 border border-[#DDD7CA] text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-[#17232E]">
                      <Lock className="h-3.5 w-3.5 text-[#55C6B0]" />
                      <span>Statutory Privacy Assurance</span>
                    </div>
                    <p className="text-[#71808C] leading-relaxed text-[10.5px]">
                      Identity matching executes via 256-bit encrypted protocol directly against regulatory APIs without exposing third-party cookies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {err && (
              <div className="rounded-xl border border-[#C45D5D]/30 bg-[#C45D5D]/10 p-3 text-xs text-[#C45D5D] flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {/* Submit Action Row */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#EAE6DC]">
              <div className="text-xs text-[#71808C]">
                Verification scans all 7 statutory regulators: RBI, EPFO, IRDAI, SEBI, LIC, PFRDA & DOP.
              </div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white px-6 py-2.5 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                {busy ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cross-Checking 7 Regulators…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-[#55C6B0]" />
                    <span>
                      {results
                        ? 'Re-Verify Across All 7 Regulators'
                        : 'Verify Identity Across All 7 Regulators'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Multi-Regulator Results List */}
      {!results ? (
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] bg-white p-8 text-center">
          <Building2 className="h-8 w-8 text-[#71808C] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[#17232E]">
            Awaiting Credential Triangulation
          </p>
          <p className="text-[11px] text-[#71808C] mt-0.5 max-w-md mx-auto">
            Submit your legal particulars above or select one of the 5 demo presets to trigger live statutory cross-matching.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results Summary Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#DDD7CA] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-[#34765B]/10 flex items-center justify-center text-[#34765B]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#17232E]">
                  Statutory Audit Complete ({totalRecords} Holdings Identified)
                </div>
                <div className="text-[10px] text-[#71808C] font-mono">
                  {verificationTime
                    ? `Timestamp: ${new Date(verificationTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
                    : 'Verified Session'}
                </div>
              </div>
            </div>

            <Link
              to="/app/aggregate"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white text-xs font-medium transition cursor-pointer shadow-xs"
            >
              <span>Map Holdings Under Consent</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Regulator Checklist Accordion */}
          <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#EAE6DC] overflow-hidden shadow-xs">
            {results.map((r: VerifyResult) => {
              const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.none;
              const Icon = s.icon;
              const isExpanded = !!expanded[r.regulator];
              const regulatorTitle = meta?.regulators[r.regulator]?.name || r.name;

              return (
                <div key={r.regulator} className="transition-colors">
                  {/* Collapsed State Bar */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.regulator)}
                    className="w-full flex items-center justify-between p-3.5 sm:px-5 text-left hover:bg-[#F5F3ED]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${s.colorClass}`} />
                      <RegChip code={r.regulator} />
                      <span className="truncate text-xs font-semibold text-[#17232E]">
                        {regulatorTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs font-medium text-[#71808C] tabular-nums">
                        {r.recordsFound} {r.recordsFound === 1 ? 'record' : 'records'}
                      </span>
                      <span
                        className={cx(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          s.badgeBg
                        )}
                      >
                        {s.label}
                      </span>
                      <div className="text-[#71808C]">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded State Details */}
                  {isExpanded && (
                    <div className="border-t border-[#EAE6DC] bg-[#F5F3ED]/40 p-4 sm:px-5 space-y-2.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#71808C] font-semibold mb-1">
                        Registry Match Triangulation:
                      </div>
                      {r.checks.length > 0 ? (
                        r.checks.map((c, ci) => (
                          <div
                            key={ci}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs py-2 border-b border-[#EAE6DC] last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-[#17232E] truncate">
                                {c.institution}
                              </span>
                              <span className="font-mono text-[11px] text-[#71808C] shrink-0">
                                · {c.ref}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {c.name === 'exact' && c.dob === 'exact' ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#34765B] font-medium bg-[#34765B]/10 border border-[#34765B]/20 px-2 py-0.5 rounded-full">
                                  <span>Name Exact ✓</span>
                                  <span>·</span>
                                  <span>DOB Match ✓</span>
                                </span>
                              ) : c.name === 'partial' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#C58B3C] font-medium bg-[#C58B3C]/10 border border-[#C58B3C]/20 px-2.5 py-0.5 rounded-full">
                                  <span>Partial Name:</span>
                                  <strong className="font-semibold">"{c.registeredName}"</strong>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#C45D5D] font-medium bg-[#C45D5D]/10 border border-[#C45D5D]/20 px-2.5 py-0.5 rounded-full">
                                  <span>Mismatch:</span>
                                  <strong>"{c.registeredName || 'Unknown'}"</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#71808C] py-1">
                          No active individual holding records currently indexed for this PAN in this central registry.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
