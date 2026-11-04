import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, CircleDashed, XCircle } from 'lucide-react';
import { api, type User, type VerifyResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date } from '../lib/format';
import { Badge, Button, ErrorNote, Field, Input, RegChip, Select, cx } from '../components/ui';

const STATUS = {
  verified: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Verified', tone: 'green' as const },
  partial: { icon: CircleAlert, cls: 'text-amber-500', label: 'Partial match', tone: 'amber' as const },
  mismatch: { icon: XCircle, cls: 'text-rose-600 dark:text-rose-400', label: 'Mismatch', tone: 'red' as const },
  none: { icon: CircleDashed, cls: 'text-slate-400', label: 'No records', tone: 'slate' as const },
};

export default function Verify() {
  const { user, meta, refresh } = useAuth();
  const nav = useNavigate();
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
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = user?.verification?.results;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api<{ user: User }>('/identity', { body: form });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const totalRecords = results?.reduce((n, r) => n + r.recordsFound, 0) || 0;

  return (
    <div className="space-y-6">
      {/* 3. Page Header Structure */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          STEP 01 / VERIFY
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Verify your identity
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Confirm your identity to map your financial holdings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* 4 & 5. Identity Verification Form (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 sm:p-6">
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

            {/* Optional Demo Personas */}
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

        {/* 6. Regulator Results Area (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {!results ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 p-8 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Results will appear here after verification.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {results.map((r: VerifyResult) => {
                  const s = STATUS[r.status] || STATUS.none;
                  const Icon = s.icon;
                  return (
                    <div
                      key={r.regulator}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 shrink-0 ${s.cls}`} />
                        <RegChip code={r.regulator} />
                        <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {r.name}
                        </span>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>

                      {r.checks.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 space-y-1">
                          {r.checks.map((c) => (
                            <div
                              key={c.ref}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <span className="truncate text-slate-500 dark:text-slate-400">
                                {c.institution} · {c.ref}
                              </span>
                              {c.name === 'exact' && c.dob === 'exact' ? (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                  name ✓ dob ✓
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 truncate shrink-0">
                                  “{c.registeredName}”
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Completion & Next Step Bar */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  Verified {date(user!.verification!.at)} · {totalRecords} records found
                </span>
                <Button size="sm" onClick={() => nav('/app/aggregate')}>
                  <span>Next: Consent</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
