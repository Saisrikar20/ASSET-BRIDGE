import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, FileLock2, Layers, Search, ShieldAlert } from 'lucide-react';
import { api, type Consent, type Holding, type Regulator } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr } from '../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Input, PageHeader, RegChip, Select, cx } from '../components/ui';

const ALL: Regulator[] = ['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'];

export default function Aggregate() {
  const { user, meta } = useAuth();
  const nav = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [picked, setPicked] = useState<Regulator[]>(ALL);
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<string>('all');

  const load = () => {
    api<{ consents: Consent[] }>('/consents').then((r) => setConsents(r.consents));
    api<{ holdings: Holding[] }>('/holdings').then((r) => setHoldings(r.holdings));
  };
  useEffect(load, []);

  const active = consents.find((c) => c.status === 'ACTIVE');

  const approve = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api('/consents', { body: { regulators: picked, months } });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke consent? Mapped holdings and alerts will be deleted.')) return;
    await api(`/consents/${id}/revoke`, { body: {} });
    load();
  };

  const shown = useMemo(
    () => holdings.filter((h) => (reg === 'all' || h.regulator === reg) && `${h.institution} ${h.type} ${h.ref}`.toLowerCase().includes(q.toLowerCase())),
    [holdings, q, reg],
  );

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const gapCount = holdings.filter((h) => !h.nominee || h.nominee.status !== 'valid').length;

  if (!user?.identity) {
    return (
      <>
        <PageHeader step="Step 02 · Aggregate" title="Map your holdings" />
        <Empty icon={<Layers />} title="Verify first" body="We need a verified identity before requesting data from any regulator." action={<Link to="/app/verify"><Button>Go to Verify</Button></Link>} />
      </>
    );
  }

  return (
    <>
      <PageHeader step="Step 02 · Aggregate" title="Consent-based mapping" subtitle="Like India's Account Aggregator network: you approve a consent artefact, we fetch only what it allows, and you can revoke it any time." />

      {!active ? (
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 font-semibold text-ink"><FileLock2 className="h-4 w-4 text-brand-700" /> Consent request</div>
            <div className="mt-1 text-xs text-slate-500">From Asset Bridge (FIU) · to {user.identity.mobile || 'you'}@assetbridge-aa</div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Information to fetch</div>
              <div className="space-y-2">
                {ALL.map((r) => (
                  <label key={r} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition', picked.includes(r) ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                    <input type="checkbox" className="accent-brand-700" checked={picked.includes(r)} onChange={(e) => setPicked(e.target.checked ? [...picked, r] : picked.filter((x) => x !== r))} />
                    <RegChip code={r} />
                    <span className="text-sm text-slate-700">{meta?.regulators[r].covers}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{meta?.regulators[r].fiType}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <Row k="Purpose" v="Wealth mapping & succession planning" />
              <Row k="Fetch type" v="Periodic — keeps your twin up to date" />
              <Row k="Data life" v="1 year, then deleted" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Consent valid for</span>
                <Select className="w-36" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                  {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
                </Select>
              </div>
              <ErrorNote msg={err} />
              <Button className="w-full" loading={busy} disabled={!picked.length} onClick={approve}>Approve & fetch from {picked.length} regulator{picked.length === 1 ? '' : 's'}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 flex flex-wrap items-center gap-4 p-4">
          <Badge tone="green">ACTIVE</Badge>
          <div className="text-sm text-slate-700">
            Consent <span className="font-mono text-xs">{active.id}</span> · {active.regulators.join(', ')} · expires {date(active.expiresAt)}
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={approve}>Refresh data</Button>
            <Button size="sm" variant="ghost" onClick={() => revoke(active.id)}>Revoke</Button>
          </div>
        </Card>
      )}

      {holdings.length > 0 && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
              <h2 className="font-semibold text-ink">{holdings.length} holdings</h2>
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="w-56 pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select className="w-32" value={reg} onChange={(e) => setReg(e.target.value)}>
                <option value="all">All</option>
                {ALL.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-2.5">Holding</th><th className="px-4 py-2.5">Value</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Nominee</th><th className="px-4 py-2.5">Last activity</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2"><RegChip code={h.regulator} /><span className="font-medium text-ink">{h.type}</span></div>
                        <div className="mt-0.5 text-xs text-slate-500">{h.institution} · {h.ref}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{inr(h.value)}</td>
                      <td className="px-4 py-3"><Badge tone={h.status === 'active' ? 'green' : h.status === 'inoperative' ? 'amber' : 'red'}>{h.status}</Badge></td>
                      <td className="px-4 py-3">
                        {!h.nominee ? <Badge tone="red">none</Badge> : h.nominee.status === 'valid' ? <span className="text-slate-700">{h.nominee.name} <span className="text-xs text-slate-400">({h.nominee.relation})</span></span> : <Badge tone="amber">{h.nominee.name} · {h.nominee.status}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{date(h.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Connected Next-Step Action Banner */}
          <Card className="p-5 bg-gradient-to-r from-brand-50 via-white to-slate-50 border border-brand-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">Mapped {holdings.length} holdings ({inr(totalValue)})</span>
                  {gapCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                      <Badge tone="red">{gapCount} nominee gap{gapCount === 1 ? '' : 's'}</Badge>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Holdings are ready for succession review. Proceed to Nominee Alerts to secure unassigned accounts, or consult the AI guide.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => nav('/app/guide?q=' + encodeURIComponent('What are the statutory requirements for claiming my mapped holdings?'))}
                  className="gap-1.5"
                >
                  <BookOpen className="h-4 w-4" />
                  Ask AI Guide
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => nav('/app/alerts')}
                  className="gap-1.5"
                >
                  <span>Next: Review Alerts (Step 03)</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>
);
