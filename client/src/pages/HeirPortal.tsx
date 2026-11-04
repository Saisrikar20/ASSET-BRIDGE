import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
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
  const [demoCases, setDemoCases] = useState<{ id: string; deceasedName: string }[]>([]);

  useEffect(() => {
    api<{ cases: { id: string; deceasedName: string }[] }>('/cases')
      .then((r) => setDemoCases(r.cases || []))
      .catch(() => {});
  }, []);

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
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500">Heir portal</span>
            <Link to="/app" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Twin
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {!c ? (
          <Card className="mx-auto max-w-md p-7">
            <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-2 text-brand-700"><KeyRound className="h-5 w-5" /></div>
            <h1 className="text-xl font-bold text-ink">Open an estate case</h1>
            <p className="mt-1 text-sm text-slate-600">Enter the case ID from your notification SMS or email, and your registered PAN to unlock the estate claim workspace.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Case ID"><Input required value={f.caseId} onChange={(e) => setF({ ...f, caseId: e.target.value.toUpperCase() })} placeholder="AB-XXXX00" /></Field>
              <Field label="Your PAN"><Input required maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></Field>
              <ErrorNote msg={err} />
              <Button className="w-full" loading={busy}>Verify & open</Button>
            </form>

            {/* Demo Quick-Fill Helpers */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">Demo Shortcuts:</div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const cid = demoCases[0]?.id || 'AB-4581';
                    setF({ caseId: cid, pan: 'ABCPI5678M' });
                    open(cid, 'ABCPI5678M');
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs hover:border-brand-400 hover:bg-brand-50 transition cursor-pointer"
                >
                  <span className="font-semibold text-ink">Raghavan's Estate (Spouse Meenakshi)</span>
                  <span className="block text-[11px] text-slate-500 font-mono">Case: {demoCases[0]?.id || 'AB-4581'} · PAN: ABCPI5678M</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cid = demoCases[1]?.id || 'AB-4036';
                    setF({ caseId: cid, pan: 'BPCPS9988E' });
                    open(cid, 'BPCPS9988E');
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs hover:border-brand-400 hover:bg-brand-50 transition cursor-pointer"
                >
                  <span className="font-semibold text-ink">Vikramaditya Sengupta (Spouse Ananya)</span>
                  <span className="block text-[11px] text-slate-500 font-mono">Case: {demoCases[1]?.id || 'AB-4036'} · PAN: BPCPS9988E</span>
                </button>
              </div>
            </div>
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
