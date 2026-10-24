import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api, type Case, type Task } from '../lib/api';
import { date } from '../lib/format';
import { Button, Card, ErrorNote, Field, Input, Logo, PageHeader } from '../components/ui';
import CaseBody from '../components/CaseBody';

const PAN_KEY = 'ab_heir_pan';

export default function HeirPortal() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ caseId: caseId || '', pan: sessionStorage.getItem(PAN_KEY) || '' });
  const [c, setC] = useState<Case | null>(null);
  const [actor, setActor] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async (id: string, pan: string) => {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ case: Case; actor: string }>(`/cases/${id.trim()}`, { heirPan: pan.trim().toUpperCase() });
      sessionStorage.setItem(PAN_KEY, pan.trim().toUpperCase());
      setC(r.case);
      setActor(r.actor);
      if (!caseId) nav(`/heir/${r.case.id}`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
      setC(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (caseId && f.pan) open(caseId, f.pan);
  }, [caseId]);

  const submit = (e: FormEvent) => { e.preventDefault(); open(f.caseId, f.pan); };
  const toggle = async (t: Task) => {
    const r = await api<{ case: Case }>(`/cases/${c!.id}/tasks/${t.id}`, { method: 'PATCH', body: { done: !t.done }, heirPan: f.pan.toUpperCase() });
    setC(r.case);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Logo />
          <span className="text-sm font-medium text-slate-500">Heir portal</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {!c ? (
          <Card className="mx-auto max-w-md p-7">
            <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-2 text-brand-700"><KeyRound className="h-5 w-5" /></div>
            <h1 className="text-xl font-bold text-ink">Open an estate case</h1>
            <p className="mt-1 text-sm text-slate-600">We're sorry for your loss. Enter the case ID from your SMS or email, and your own PAN so we can confirm you're a registered heir.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Case ID"><Input required value={f.caseId} onChange={(e) => setF({ ...f, caseId: e.target.value.toUpperCase() })} placeholder="AB-XXXX00" /></Field>
              <Field label="Your PAN"><Input required maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></Field>
              <ErrorNote msg={err} />
              <Button className="w-full" loading={busy}>Verify & open</Button>
            </form>
          </Card>
        ) : (
          <>
            <PageHeader step={`Estate case ${c.id} · signed in as ${actor}`} title={`Everything ${c.deceasedName} left for the family`} subtitle={`Died ${date(c.deceased.dateOfDeath)}. Work through each step below — Asset Bridge has already found every holding on record.`} />
            <CaseBody c={c} onToggle={toggle} />
          </>
        )}
      </main>
    </div>
  );
}
