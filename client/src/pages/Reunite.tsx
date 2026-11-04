import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ExternalLink, HeartHandshake, Radio, Send } from 'lucide-react';
import { api, type Case, type Heir, type Holding } from '../lib/api';
import { useAuth } from '../lib/auth';
import { inrShort } from '../lib/format';
import { Button, Card, Empty, ErrorNote, Field, Input, PageHeader } from '../components/ui';

export default function Reunite() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cases, setCases] = useState<{ id: string }[]>([]);
  const [f, setF] = useState({ dateOfDeath: new Date().toISOString().slice(0, 10), registrationNo: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ case: Case; notified: { name: string; via: string[] }[] } | null>(null);

  useEffect(() => {
    api<{ heirs: Heir[] }>('/heirs').then((r) => setHeirs(r.heirs));
    api<{ holdings: Holding[] }>('/holdings').then((r) => setHoldings(r.holdings));
    api<{ cases: { id: string }[] }>('/cases').then((r) => setCases(r.cases));
  }, []);

  const fire = async () => {
    if (!confirm(`Simulate a CRS death registration for ${user?.identity?.name}? This opens an estate case and notifies all heirs.`)) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ case: Case; notified: { name: string; via: string[] }[] }>('/crs/death', { body: { pan: user!.identity!.pan, ...f } });
      setResult(r);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user?.identity) {
    return (
      <>
        <PageHeader step="Step 04 · Reunite" title="Reunite heirs" />
        <Empty icon={<HeartHandshake />} title="Verify and map holdings first" body="Reunite needs a verified twin to match a death registration against." action={<Link to="/app/verify"><Button>Go to Verify</Button></Link>} />
      </>
    );
  }

  const existing = result?.case.id || cases[0]?.id;

  return (
    <>
      <PageHeader step="Step 04 · Reunite" title="When the time comes" subtitle="Asset Bridge listens to India's Civil Registration System. When a death is registered against a twin's PAN, every holding is matched and every heir is notified — automatically." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2 font-semibold text-ink"><Radio className="h-4 w-4 text-brand-700" /> What happens</div>
          <ol className="space-y-4 text-sm">
            {[
              ['CRS feed', 'Registrar records the death; the event arrives with PAN / Aadhaar linkage.'],
              ['Match', `Linked to this twin: ${holdings.length} holdings worth ${inrShort(holdings.reduce((s, h) => s + h.value, 0))}.`],
              ['Notify', `${heirs.length} heir${heirs.length === 1 ? '' : 's'} get an SMS/email with a case ID — ${heirs.map((h) => h.name).join(', ') || 'none registered yet'}.`],
              ['Verify heir', 'Each heir opens the case with their own PAN. Nobody else can.'],
              ['Transfer', `A checklist for ${user.identity.state} is generated for every holding.`],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
                <div><div className="font-medium text-ink">{t}</div><div className="text-slate-600">{d}</div></div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-6">
          {existing ? (
            <div className="flex h-full flex-col items-start justify-center gap-3">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">Estate case open</div>
              <div className="font-mono text-3xl font-bold text-ink">{existing}</div>
              {result && (
                <ul className="text-sm text-slate-600 space-y-1">
                  {result.notified.map((n) => <li key={n.name}>✓ {n.name} notified {n.via.length ? `via ${n.via.join(' & ')}` : ''}</li>)}
                </ul>
              )}
              <p className="text-sm text-slate-600">Heirs can open it at <span className="font-mono font-semibold">/heir/{existing}</span> with this ID and their PAN.</p>

              <div className="mt-2 flex flex-col gap-2 w-full">
                <Button onClick={() => nav(`/app/cases/${existing}`)} className="w-full justify-between">
                  <span>Open transfer workflow (Step 05)</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => nav(`/heir/${existing}`)} className="flex-1 gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview Heir Portal
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => nav('/app/guide?caseId=' + existing + '&q=' + encodeURIComponent('What are the estate succession requirements for case ' + existing + '?'))}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Ask AI Guide
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 font-semibold text-ink">Demo control · simulate CRS event</div>
              <p className="mb-4 text-sm text-slate-500">In production this arrives from the registrar. Here you can trigger it to see the full reunite flow.</p>
              <div className="space-y-3">
                <Field label="Deceased (this twin)"><Input disabled value={`${user.identity.name} · ${user.identity.pan}`} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of death"><Input type="date" value={f.dateOfDeath} onChange={(e) => setF({ ...f, dateOfDeath: e.target.value })} /></Field>
                  <Field label="Registration no." hint="Optional"><Input value={f.registrationNo} onChange={(e) => setF({ ...f, registrationNo: e.target.value })} placeholder="auto" /></Field>
                </div>
                {heirs.length === 0 && <p className="text-sm text-amber-700">No heirs registered — <Link to="/app/heirs" className="font-semibold underline">add some</Link> so someone gets notified.</p>}
                <ErrorNote msg={err} />
                <Button variant="danger" className="w-full" loading={busy} onClick={fire}><Send className="h-4 w-4" /> Send death registration</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
