import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDashed,
  RotateCcw,
  XCircle,
  Lock,
  User,
  CreditCard,
  MapPin,
  Building2,
} from 'lucide-react';
import { api, type User as ApiUser, type VerifyResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, ErrorNote, RegChip, Select, cx } from '../components/ui';

const STATUS = {
  verified: {
    icon: CheckCircle2,
    cls: 'text-emerald-600',
    label: 'Verified',
    tone: 'green' as const,
  },
  partial: {
    icon: CircleAlert,
    cls: 'text-amber-500',
    label: 'Partial match',
    tone: 'amber' as const,
  },
  mismatch: {
    icon: XCircle,
    cls: 'text-rose-600',
    label: 'Mismatch',
    tone: 'red' as const,
  },
  none: {
    icon: CircleDashed,
    cls: 'text-slate-400',
    label: 'No records',
    tone: 'slate' as const,
  },
};

export default function Verify() {
  const { user, meta, refresh } = useAuth();
    const results = user?.verification?.results;

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

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api<{ user: ApiUser }>('/identity', { body: form });
      await refresh();
      setShowForm(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const totalRecords = results?.reduce((n, r) => n + r.recordsFound, 0) || 0;
  const regulatorCount = results?.length || 7;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
            Identity Verification
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {results
              ? `Consolidated check across ${regulatorCount} statutory registries · ${totalRecords} matching records detected`
              : 'Authenticate identity credentials against central registries to map disparate financial holdings.'}
          </p>
        </div>

        {results && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#DDD7CA] bg-white text-xs font-medium text-[#17232E] hover:bg-[#F5F3ED] transition cursor-pointer self-start sm:self-center shadow-xs"
            title="Edit verification parameters"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>{showForm ? 'Hide credentials form' : 'Modify parameters'}</span>
          </button>
        )}
      </div>

      {/* 2. Structured Verification Form */}
      {(!results || showForm) && (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          {/* Header & Persona Quick Fill */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Statutory KYC Parameters
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Inputs match Form 16, PAN database, and UIDAI validation standards.
              </p>
            </div>

            {meta?.personas && meta.personas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">
                  Demo Autofill:
                </span>
                {meta.personas.map((p) => {
                  const isActive = form.pan === p.pan;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          name: p.name,
                          pan: p.pan,
                          dob: p.dob,
                          aadhaarLast4: p.aadhaarLast4,
                          mobile: p.mobile,
                          state: p.state,
                        })
                      }
                      className={cx(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer',
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      )}
                      title={`${p.name} (${p.state}): ${p.description}`}
                    >
                      {p.name.split(' ')[0]} ({p.state.split(' ')[0]})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Section 1: Demographics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    1. Particulars
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={set('name')}
                      placeholder="e.g. Raghavan Sundaram"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="text-[10.5px] text-slate-400 mt-1">Exact name as registered with income tax records.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.dob}
                      onChange={set('dob')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="text-[10.5px] text-slate-400 mt-1">Required for EPFO & pension record triangulation.</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Statutory Identifiers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CreditCard className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    2. Identifiers
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Permanent Account Number (PAN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.pan}
                      onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500 uppercase tracking-wider"
                    />
                    <p className="text-[10.5px] text-slate-400 mt-1">10-character alphanumeric PAN key.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Aadhaar (Last 4)
                      </label>
                      <input
                        type="text"
                        value={form.aadhaarLast4}
                        onChange={set('aadhaarLast4')}
                        maxLength={4}
                        inputMode="numeric"
                        placeholder="4417"
                        className="w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={form.mobile}
                        onChange={set('mobile')}
                        inputMode="tel"
                        placeholder="9876543210"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400">UIDAI compliant: Full Aadhaar is never stored or cached.</p>
                </div>
              </div>

              {/* Section 3: Geographic Jurisdiction */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    3. Jurisdiction
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      State of Legal Domicile
                    </label>
                    <Select value={form.state} onChange={set('state')}>
                      {meta?.states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Determines local Tehsildar succession portal & e-District certificate guidelines.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Lock className="h-3.5 w-3.5 text-brand-600" />
                      <span>Statutory Privacy Assurance</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[10.5px]">
                      Identity matching executes via 256-bit encrypted protocol directly against regulatory APIs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <ErrorNote msg={err} />

            {/* Submit Action Row */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Matches are cross-checked across 7 registries: RBI, EPFO, IRDAI, SEBI, LIC, PFRDA & DOP.
              </div>
              <Button loading={busy} className="px-6 py-2.5 text-xs font-semibold">
                {results ? 'Re-verify with all 7 regulators' : 'Verify across all 7 regulators'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Multi-Regulator Results List */}
      {!results ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-8 text-center">
          <Building2 className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium text-slate-600">
            Awaiting credential verification.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Submit the particulars above or select a demo profile to preview live regulatory matching.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
            {results.map((r: VerifyResult) => {
              const s = STATUS[r.status] || STATUS.none;
              const Icon = s.icon;
              const isExpanded = !!expanded[r.regulator];
              const regulatorTitle = meta?.regulators[r.regulator]?.name || r.name;

              return (
                <div key={r.regulator} className="transition-colors">
                  {/* Collapsed State Bar */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.regulator)}
                    className="w-full flex items-center justify-between p-3.5 sm:px-5 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${s.cls}`} />
                      <RegChip code={r.regulator} />
                      <span className="truncate text-xs font-semibold text-slate-900">
                        {regulatorTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs font-medium text-slate-500 tabular-nums">
                        {r.recordsFound} {r.recordsFound === 1 ? 'record' : 'records'}
                      </span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      <div className="text-slate-400">
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
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:px-5 space-y-2.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Registry Match Triangulation:
                      </div>
                      {r.checks.length > 0 ? (
                        r.checks.map((c) => (
                          <div
                            key={c.ref}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs py-2 border-b border-slate-200/60 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {c.institution}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                · {c.ref}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {c.name === 'exact' && c.dob === 'exact' ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                  <span>Name ✓</span>
                                  <span>DOB ✓</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                                  Registered as “{c.registeredName}”
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-1">
                          No active individual holding records currently indexed for this PAN in this registry.
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
    </div>
  );
}
