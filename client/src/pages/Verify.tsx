import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDashed,
  RotateCcw,
  XCircle,
  FileDown,
} from 'lucide-react';
import { api, downloadClaimingDossierPdf, type User, type VerifyResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date } from '../lib/format';
import { Badge, Button, ErrorNote, Field, Input, RegChip, Select, cx } from '../components/ui';

const STATUS = {
  verified: {
    icon: CheckCircle2,
    cls: 'text-emerald-600 dark:text-emerald-400',
    label: 'Verified',
    tone: 'green' as const,
  },
  partial: {
    icon: CircleAlert,
    cls: 'text-amber-500 dark:text-amber-400',
    label: 'Partial match',
    tone: 'amber' as const,
  },
  mismatch: {
    icon: XCircle,
    cls: 'text-rose-600 dark:text-rose-400',
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
  const nav = useNavigate();
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
      await api<{ user: User }>('/identity', { body: form });
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
      {/* 3. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Identity verification
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {results
              ? `${regulatorCount} regulators · ${totalRecords} records found`
              : 'Confirm your identity to map your financial holdings.'}
          </p>
        </div>

        {results && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer self-start sm:self-center"
            title="Edit verification parameters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{showForm ? 'Hide form' : 'Re-verify'}</span>
          </button>
        )}
      </div>

      {/* Verification Form (shown when !results or when Re-verify is toggled) */}
      {(!results || showForm) && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Identity Parameters
            </h2>
            {results && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name (as on PAN)">
              <Input
                required
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Raghavan Sundaram"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="PAN">
                <Input
                  required
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </Field>
              <Field label="Date of birth">
                <Input
                  required
                  type="date"
                  value={form.dob}
                  onChange={set('dob')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Aadhaar (last 4 digits)" hint="We never store the full number.">
                <Input
                  value={form.aadhaarLast4}
                  onChange={set('aadhaarLast4')}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="e.g. 4417"
                />
              </Field>
              <Field label="Mobile number">
                <Input
                  value={form.mobile}
                  onChange={set('mobile')}
                  inputMode="tel"
                  placeholder="e.g. 9876543210"
                />
              </Field>
            </div>

            <Field
              label="State of residence"
              hint="Used to determine the relevant heir certificate process."
            >
              <Select value={form.state} onChange={set('state')}>
                {meta?.states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <ErrorNote msg={err} />

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button loading={busy} className="px-5">
                {results ? 'Re-verify with all regulators' : 'Verify with all regulators'}
              </Button>

              {meta && (
                <button
                  type="button"
                  onClick={() => setForm(meta.demoIdentity)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Fill demo identity (Raghavan)
                </button>
              )}
            </div>

            {meta?.personas && meta.personas.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <div className="text-[11px] font-medium text-slate-400 mb-2">
                  Sample testing personas:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {meta.personas.map((p) => (
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
                        'rounded-md border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer',
                        form.pan === p.pan
                          ? 'border-brand-500 bg-brand-50/70 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                      title={`${p.name} (${p.role} · ${p.state}): ${p.description}`}
                    >
                      {p.name.split(' ')[0]} ({p.state.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 4 & 5. Post-Verification Minimal State (Expandable Rows for All 7 Regulators) */}
      {!results ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 p-8 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Results will appear here after verification.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
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
                    className="w-full flex items-center justify-between p-3.5 sm:px-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${s.cls}`} />
                      <RegChip code={r.regulator} />
                      <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                        {regulatorTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        {r.recordsFound} {r.recordsFound === 1 ? 'record' : 'records'}
                      </span>
                      {/* Status indicator remains visible even when collapsed */}
                      <Badge tone={s.tone}>{s.label}</Badge>
                      <div className="text-slate-400 dark:text-slate-500">
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
                    <div className="border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/60 p-3.5 sm:px-5 space-y-2">
                      {r.checks.length > 0 ? (
                        r.checks.map((c) => (
                          <div
                            key={c.ref}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {c.institution}{' '}
                              <span className="font-mono text-slate-400">· {c.ref}</span>
                            </span>
                            <div className="shrink-0">
                              {c.name === 'exact' && c.dob === 'exact' ? (
                                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  name ✓ dob ✓
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  registered as “{c.registeredName}”
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-1">
                          No individual holding entries reported in this registry.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 6 & 7. Verification Summary & Next Action */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <div>
                Last verified:{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {date(user!.verification!.at)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {totalRecords} records found across {regulatorCount} registries
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadClaimingDossierPdf({ pan: form.pan })}
                className="gap-1.5"
                title="Download consolidated statutory claim dossier"
              >
                <FileDown className="h-4 w-4" />
                <span>Download Claim Dossier (PDF)</span>
              </Button>
              <Button type="button" onClick={() => nav('/app/aggregate')} className="px-5">
                <span>Continue to consent</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
