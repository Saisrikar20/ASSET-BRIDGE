import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, FileText, Landmark } from 'lucide-react';
import type { Case, Task } from '../lib/api';
import { date, inr, inrShort, time } from '../lib/format';
import { Badge, Card, Progress, RegChip, cx } from './ui';
import GuideChat from './GuideChat';

export default function CaseBody({ c, onToggle }: { c: Case; onToggle: (t: Task) => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  const total = c.holdings.reduce((s, h) => s + h.value, 0);
  const done = c.tasks.filter((t) => t.done).length;

  const groups = useMemo(() => {
    const general = c.tasks.filter((t) => !t.holdingId);
    const per = c.holdings.map((h) => ({ h, tasks: c.tasks.filter((t) => t.holdingId === h.id) }));
    return { general, per };
  }, [c]);

  const toggle = async (t: Task) => {
    setPending(t.id);
    try {
      await onToggle(t);
    } finally {
      setPending(null);
    }
  };

  const TaskRow = ({ t }: { t: Task }) => (
    <li className="flex gap-3 py-3">
      <button onClick={() => toggle(t)} disabled={pending === t.id} className="mt-0.5 shrink-0 cursor-pointer" aria-label={t.done ? 'Mark not done' : 'Mark done'}>
        {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className={cx('h-5 w-5 text-slate-300 hover:text-brand-600', pending === t.id && 'animate-pulse')} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cx('text-sm font-semibold', t.done ? 'text-slate-400 line-through' : 'text-ink')}>{t.title}</div>
        <p className="mt-0.5 text-sm text-slate-600">{t.detail}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.docs.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"><FileText className="h-3 w-3" />{d}</span>)}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><Landmark className="h-3 w-3" />{t.authority}</div>
      </div>
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">Estate total</div>
              <div className="text-2xl font-bold text-ink">{inrShort(total)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Holdings</div>
              <div className="text-2xl font-bold text-ink">{c.holdings.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">State rules</div>
              <div className="text-lg font-bold text-ink">{c.state}</div>
            </div>
            <div className="min-w-48 flex-1">
              <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Progress</span><span className="font-semibold text-ink">{done}/{c.tasks.length} steps</span></div>
              <Progress value={done / c.tasks.length} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-ink">Start here</h2>
          <ul className="divide-y divide-slate-100">{groups.general.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        </Card>

        {groups.per.map(({ h, tasks }) => (
          <Card key={h.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <RegChip code={h.regulator} />
              <span className="font-semibold text-ink">{h.type}</span>
              <span className="text-sm text-slate-500">· {h.institution}</span>
              <span className="ml-auto font-semibold text-ink">{inr(h.value)}</span>
            </div>
            <div className="mt-1 text-xs">
              {h.nominee?.status === 'valid' ? <Badge tone="green">Nominee: {h.nominee.name}</Badge> : <Badge tone="amber">No valid nominee — legal heirs claim</Badge>}
            </div>
            <ul className="divide-y divide-slate-100">{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <GuideChat state={c.state} caseId={c.id} compact />
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-ink">Heirs</h2>
          <ul className="space-y-2 text-sm">
            {c.heirs.map((h) => <li key={h.id} className="flex justify-between"><span className="text-ink">{h.name}</span><span className="text-slate-500">{h.relation}</span></li>)}
            {c.heirs.length === 0 && <li className="text-slate-500">No heirs were registered.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-ink">Timeline</h2>
          <ol className="space-y-3 border-l border-slate-200 pl-4 text-sm">
            {[...c.timeline].reverse().map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-600" />
                <div className="text-slate-700">{e.text}</div>
                <div className="text-xs text-slate-400">{date(e.at)} · {time(e.at)}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
