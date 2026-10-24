import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Send, Sparkles } from 'lucide-react';
import { api, type GuideAnswer } from '../lib/api';
import { Button, Card, Input, cx } from './ui';

interface Msg { role: 'user' | 'assistant'; content: string; sources?: GuideAnswer['sources']; engine?: string; error?: boolean }

const SUGGESTIONS = [
  'There was no nominee on the bank FD. What do we need?',
  'How do we claim the EPF and family pension?',
  'Where do we get a legal heir certificate?',
  'How do we find old mutual fund folios?',
];

// Minimal markdown: **bold**, numbered / bulleted lines, paragraphs.
function render(md: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>').replace(/\[(\d)\]/g, '<sup class="text-brand-700 font-semibold">[$1]</sup>');
  const out: string[] = [];
  let list: 'ol' | 'ul' | null = null;
  for (const line of md.split('\n')) {
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const kind = ol ? 'ol' : ul ? 'ul' : null;
    if (list && kind !== list) { out.push(`</${list}>`); list = null; }
    if (kind && !list) { out.push(`<${kind}>`); list = kind; }
    if (kind) out.push(`<li>${inline((ol || ul)![1])}</li>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`</${list}>`);
  return out.join('');
}

export default function GuideChat({ state, caseId, compact }: { state?: string; caseId?: string; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [msgs, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setQ('');
    setBusy(true);
    try {
      const r = await api<GuideAnswer>('/assistant', { body: { question, state, caseId, history } });
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, sources: r.sources, engine: r.engine }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(q); };

  return (
    <Card className={cx('flex flex-col overflow-hidden', compact ? 'h-[520px]' : 'h-[calc(100vh-220px)] min-h-[480px]')}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
        <Sparkles className="h-4 w-4 text-brand-700" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">AI succession guide</div>
          <div className="text-xs text-slate-500">Grounded in {state ? `${state} rules &` : ''} RBI / EPFO / IRDAI / SEBI / LIC / NPS / India Post procedures</div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Ask anything about claiming what was left behind.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="block w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-500 hover:bg-brand-50">{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 px-3.5 py-2 text-sm text-white">{m.content}</div>
          ) : (
            <div key={i} className={cx('max-w-[95%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm', m.error ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-800')}>
              <div className="prose-answer" dangerouslySetInnerHTML={{ __html: render(m.content) }} />
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  {m.sources.map((s) => (
                    <div key={s.n} className="flex items-center gap-1.5 text-xs text-slate-500"><BookOpen className="h-3 w-3" />[{s.n}] {s.title} — {s.section}</div>
                  ))}
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">engine: {m.engine}</div>
                </div>
              )}
            </div>
          ),
        )}
        {busy && <div className="w-16 animate-pulse rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">···</div>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which form for EPF pension?" />
        <Button disabled={!q.trim()} loading={busy} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
