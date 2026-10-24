import { useEffect, useState, type FormEvent } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { api, type Heir } from '../lib/api';
import { Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Select } from '../components/ui';

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];
const blank = { name: '', relation: 'Spouse', pan: '', mobile: '', email: '', share: '' };

export default function Heirs() {
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ heirs: Heir[] }>('/heirs').then((r) => setHeirs(r.heirs));
  useEffect(() => void load(), []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api('/heirs', { body: f });
      setF(blank);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    await api(`/heirs/${id}`, { method: 'DELETE' });
    load();
  };

  const totalShare = heirs.reduce((s, h) => s + (h.share || 0), 0);

  return (
    <>
      <PageHeader title="Your heirs" subtitle="The people Asset Bridge will reunite with your holdings. Each heir verifies with their own PAN — so no one else can open your estate." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          {heirs.length === 0 ? (
            <Empty icon={<Users />} title="No heirs yet" body="Add at least one family member so they can be notified and verified when the time comes." />
          ) : (
            heirs.map((h) => (
              <Card key={h.id} className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">{h.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{h.name} <span className="text-sm font-normal text-slate-500">· {h.relation}</span></div>
                  <div className="text-xs text-slate-500">PAN {h.pan.slice(0, 5)}XXXX{h.pan.slice(-1)} {h.mobile && `· ${h.mobile}`} {h.email && `· ${h.email}`}</div>
                </div>
                {h.share > 0 && <div className="text-right"><div className="font-bold text-ink">{h.share}%</div><div className="text-xs text-slate-400">share</div></div>}
                <button onClick={() => remove(h.id)} className="cursor-pointer p-1 text-slate-400 hover:text-rose-600" aria-label={`Remove ${h.name}`}><Trash2 className="h-4 w-4" /></button>
              </Card>
            ))
          )}
          {heirs.length > 0 && totalShare > 0 && totalShare !== 100 && (
            <p className="text-sm text-amber-700">Shares add up to {totalShare}% — intended shares usually total 100%. (Actual division follows your will or succession law.)</p>
          )}
        </div>

        <Card className="h-fit p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink"><UserPlus className="h-4 w-4 text-brand-700" /> Add an heir</h2>
          <form onSubmit={add} className="space-y-3">
            <Field label="Full name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Relation"><Select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
              <Field label="PAN"><Input required maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mobile"><Input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
              <Field label="Intended share %"><Input type="number" min={0} max={100} value={f.share} onChange={(e) => setF({ ...f, share: e.target.value })} /></Field>
            </div>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <ErrorNote msg={err} />
            <Button className="w-full" loading={busy}>Add heir</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
