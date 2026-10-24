import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDashed, CircleAlert, XCircle } from 'lucide-react';
import { api, type User, type VerifyResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date } from '../lib/format';
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, RegChip, Select } from '../components/ui';

const STATUS = {
  verified: { icon: CheckCircle2, cls: 'text-emerald-600', label: 'Verified', tone: 'green' as const },
  partial: { icon: CircleAlert, cls: 'text-amber-500', label: 'Partial match', tone: 'amber' as const },
  mismatch: { icon: XCircle, cls: 'text-rose-600', label: 'Mismatch', tone: 'red' as const },
  none: { icon: CircleDashed, cls: 'text-slate-400', label: 'No records', tone: 'slate' as const },
};

export default function Verify() {
  const { user, meta, refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(user?.identity || { name: user?.name || '', pan: '', dob: '', aadhaarLast4: '', mobile: '', state: 'Tamil Nadu' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const results = user?.verification?.results;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

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

  return (
    <>
      <PageHeader step="Step 01 · Verify" title="Cross-check your identity" subtitle="We match your PAN-linked identity against each regulator's records. Name and date-of-birth mismatches are the #1 reason family claims get rejected — catch them now." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name (as on PAN)"><Input required value={form.name} onChange={set('name')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PAN"><Input required value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} /></Field>
              <Field label="Date of birth"><Input required type="date" value={form.dob} onChange={set('dob')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aadhaar (last 4)" hint="We never store the full number"><Input value={form.aadhaarLast4} onChange={set('aadhaarLast4')} maxLength={4} inputMode="numeric" /></Field>
              <Field label="Mobile"><Input value={form.mobile} onChange={set('mobile')} inputMode="tel" /></Field>
            </div>
            <Field label="State of residence" hint="Decides which heir certificate your family will need">
              <Select value={form.state} onChange={set('state')}>{meta?.states.map((s) => <option key={s}>{s}</option>)}</Select>
            </Field>
            <ErrorNote msg={err} />
            <div className="flex flex-wrap gap-2">
              <Button loading={busy}>{results ? 'Re-verify' : 'Verify with all regulators'}</Button>
              {meta && <Button type="button" variant="ghost" onClick={() => setForm(meta.demoIdentity)}>Fill demo identity</Button>}
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          {!results && (
            <Card className="p-6 text-sm text-slate-500">Results from RBI, EPFO, IRDAI, SEBI and LIC registries will appear here.</Card>
          )}
          {results?.map((r: VerifyResult) => {
            const s = STATUS[r.status];
            return (
              <Card key={r.regulator} className="p-4">
                <div className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.cls}`} />
                  <RegChip code={r.regulator} />
                  <span className="flex-1 truncate text-sm text-slate-600">{r.name}</span>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                {r.checks.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
                    {r.checks.map((c) => (
                      <li key={c.ref} className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-600">{c.institution} · {c.ref}</span>
                        {c.name === 'exact' && c.dob === 'exact' ? (
                          <span className="font-medium text-emerald-600">name ✓ dob ✓</span>
                        ) : (
                          <span className="font-medium text-amber-600">registered as “{c.registeredName}”</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
          {results && (
            <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4 text-sm">
              <span className="text-brand-800">Verified {date(user!.verification!.at)} · {results.reduce((n, r) => n + r.recordsFound, 0)} records found</span>
              <Button size="sm" onClick={() => nav('/app/aggregate')}>Next: consent <ArrowRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
