import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, BellOff, BookOpen, CheckCircle2, Compass, 
  HeartHandshake, Radio, Users 
} from 'lucide-react';
import { api, type Alert, type Heir, type Holding } from '../lib/api';
import { useLive, useLiveStatus } from '../lib/live';
import { inr, time } from '../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Input, PageHeader, RegChip, Select, cx } from '../components/ui';

const NOMINEE_KINDS = ['nominee_missing', 'nominee_deceased', 'nominee_minor'];
const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];

export default function Alerts() {
  const nav = useNavigate();
  const connected = useLiveStatus();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [holdings, setHoldings] = useState<Record<string, Holding>>({});
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [editing, setEditing] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => {
    api<{ alerts: Alert[] }>('/alerts').then((r) => setAlerts(r.alerts));
    api<{ holdings: Holding[] }>('/holdings').then((r) => setHoldings(Object.fromEntries(r.holdings.map((h) => [h.id, h]))));
  };
  useEffect(() => {
    load();
    api<{ heirs: Heir[] }>('/heirs').then((r) => setHeirs(r.heirs));
  }, []);

  useLive((e) => {
    if (e.type === 'alert') {
      setAlerts((a) => [e.data, ...a.filter((x) => x.id !== e.data.id)]);
      setFlash(e.data.id);
      setTimeout(() => setFlash(null), 1500);
      api<{ holdings: Holding[] }>('/holdings').then((r) => setHoldings(Object.fromEntries(r.holdings.map((h) => [h.id, h]))));
    }
    if (e.type === 'alert_resolved') setAlerts((a) => a.map((x) => (x.id === e.data.id ? e.data : x)));
  });

  const reactivate = async (holdingId: string) => {
    await api(`/holdings/${holdingId}/reactivate`, { body: {} });
    load();
  };
  const dismiss = async (id: string) => {
    await api(`/alerts/${id}/resolve`, { body: {} });
    load();
  };

  const list = alerts.filter((a) => (tab === 'open' ? !a.resolved : a.resolved));
  const counts = { high: 0, medium: 0, low: 0 };
  alerts.filter((a) => !a.resolved).forEach((a) => counts[a.severity]++);

  return (
    <>
      <PageHeader
        step="Step 03 · Alert"
        title="Nominee-gap alerts"
        subtitle="Every gap here is something your family would otherwise discover only after it's too late to fix with a single form."
        action={<div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Radio className={cx('h-4 w-4', connected ? 'text-emerald-500' : 'text-slate-400')} />{connected ? 'Live' : 'Offline'}</div>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['open', 'resolved'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition', tab === t ? 'bg-ink text-surface' : 'bg-surface text-slate-600 ring-1 ring-slate-200')}>
            {t} ({alerts.filter((a) => (t === 'open' ? !a.resolved : a.resolved)).length})
          </button>
        ))}
        <div className="ml-auto flex gap-2 text-xs">
          <Badge tone="red">{counts.high} high</Badge><Badge tone="amber">{counts.medium} medium</Badge><Badge>{counts.low} low</Badge>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon={tab === 'open' ? <CheckCircle2 /> : <BellOff />} title={tab === 'open' ? 'No open alerts' : 'Nothing resolved yet'} body={tab === 'open' ? 'Either everything is in order, or you haven\'t mapped holdings yet.' : 'Fix an alert and it will move here.'} />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const h = holdings[a.holdingId];
            const isNominee = NOMINEE_KINDS.includes(a.kind);
            return (
              <Card key={a.id} className={cx('p-4 transition', flash === a.id && 'ring-2 ring-brand-500', a.resolved && 'opacity-70')}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', a.resolved ? 'bg-emerald-500' : a.severity === 'high' ? 'bg-rose-500' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{a.title}</span>
                      <RegChip code={a.regulator} />
                      {!a.resolved && <Badge tone={a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'slate'}>{a.severity}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.detail}</p>
                    {h && <p className="mt-1 text-xs text-slate-400">{h.type} · {inr(h.value)} · raised {time(a.createdAt)}</p>}
                  </div>
                  {!a.resolved && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => nav('/app/guide?q=' + encodeURIComponent(`How do I resolve this alert: ${a.title} on ${a.regulator}?`))}
                        className="gap-1 text-xs"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Ask AI
                      </Button>
                      {isNominee ? (
                        <Button size="sm" onClick={() => setEditing(editing === a.id ? null : a.id)}>{a.kind === 'nominee_minor' ? 'Add guardian' : 'Update nominee'}</Button>
                      ) : (
                        <Button size="sm" onClick={() => reactivate(a.holdingId)}>{a.kind === 'name_mismatch' ? 'Correct name' : 'Re-KYC & reactivate'}</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}>Dismiss</Button>
                    </div>
                  )}
                </div>
                {editing === a.id && h && <NomineeForm holding={h} heirs={heirs} minor={a.kind === 'nominee_minor'} onDone={() => { setEditing(null); load(); }} />}
              </Card>
            );
          })}
        </div>
      )}

      {/* Connected Next-Step Journey Cards */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Next Steps in Your Succession Journey</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 flex flex-col justify-between hover:border-brand-400 transition">
            <div>
              <div className="inline-flex p-2 rounded-lg bg-brand-50 text-brand-700 mb-2">
                <Compass className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-ink text-sm">Plan Financial Life</h4>
              <p className="text-xs text-slate-500 mt-1">Run simulations for retirement, goals, and inheritance distributions.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => nav('/app/plan')} className="mt-3 w-full justify-between">
              <span>Open Life Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Card>

          <Card className="p-4 flex flex-col justify-between hover:border-brand-400 transition">
            <div>
              <div className="inline-flex p-2 rounded-lg bg-emerald-50 text-emerald-700 mb-2">
                <Users className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-ink text-sm">Register Family Heirs</h4>
              <p className="text-xs text-slate-500 mt-1">Add legal heirs with PAN verification so they can claim your estate.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => nav('/app/heirs')} className="mt-3 w-full justify-between">
              <span>Manage Heirs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Card>

          <Card className="p-4 flex flex-col justify-between hover:border-brand-400 transition">
            <div>
              <div className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-700 mb-2">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-ink text-sm">Simulate Succession</h4>
              <p className="text-xs text-slate-500 mt-1">Test the Civil Registration System (CRS) death notification flow.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => nav('/app/reunite')} className="mt-3 w-full justify-between">
              <span>Go to Reunite (Step 04)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}

function NomineeForm({ holding, heirs, minor, onDone }: { holding: Holding; heirs: Heir[]; minor: boolean; onDone: () => void }) {
  const [f, setF] = useState({ name: minor ? holding.nominee?.name || '' : '', relation: minor ? holding.nominee?.relation || 'Son' : 'Spouse', guardian: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/holdings/${holding.id}/nominee`, { method: 'PATCH', body: f });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {heirs.length > 0 && !minor && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Quick pick:</span>
          {heirs.map((h) => (
            <button key={h.id} onClick={() => setF({ ...f, name: h.name, relation: h.relation })} className="cursor-pointer rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50">{h.name}</button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Nominee name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</Select>
        {minor && <Input placeholder="Guardian / appointee name" value={f.guardian} onChange={(e) => setF({ ...f, guardian: e.target.value })} />}
      </div>
      <ErrorNote msg={err} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">Submits a nomination update request to {holding.institution}.</span>
        <Button size="sm" loading={busy} disabled={!f.name || (minor && !f.guardian)} onClick={save}>Submit update</Button>
      </div>
    </div>
  );
}
