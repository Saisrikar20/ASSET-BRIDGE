import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, FileText, Send, Sparkles, ArrowRight, 
  Plus, Database 
} from 'lucide-react';
import { api, type GuideAnswer, type GuideSource, type GuideAction, type ChatSession } from '../lib/api';
import { Button, Card, Input, cx } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  sources?: GuideSource[];
  actions?: GuideAction[];
  engine?: string;
  error?: boolean;
}

const SUGGESTIONS = [
  'There was no nominee on the bank FD. What do we need?',
  'How do we claim the EPF and family pension?',
  'What documents do I still need based on my uploaded files?',
  'Where do we get a legal heir certificate?',
];

// Minimal markdown: **bold**, numbered / bulleted lines, paragraphs.
function render(md: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = (s: string) => 
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/\[(User Doc \d+|Law \d+|\d+)\]/g, '<span class="inline-block px-1.5 py-0.2 mx-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded">[$1]</span>');
  
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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);
  const end = useRef<HTMLDivElement>(null);
  const initialTriggered = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [msgs, busy]);

  // Handle URL query parameter ?q=
  useEffect(() => {
    const initialQuery = params.get('q');
    if (initialQuery && !initialTriggered.current) {
      initialTriggered.current = true;
      ask(initialQuery);
    }
  }, [params]);

  // Listen to custom in-page window event for cross-component triggers
  useEffect(() => {
    const handleCustomAsk = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        ask(customEvent.detail);
      }
    };
    window.addEventListener('guide:ask', handleCustomAsk);
    return () => window.removeEventListener('guide:ask', handleCustomAsk);
  }, [activeSessionId, state, caseId]);

  // Load chat sessions and user document count from SQLite vault
  useEffect(() => {
    api<{ documents: any[] }>('/documents')
      .then((r) => setDocCount(r.documents?.length || 0))
      .catch(() => {});

    api<{ sessions: ChatSession[] }>('/assistant/sessions')
      .then((r) => {
        if (r.sessions && r.sessions.length > 0) {
          setSessions(r.sessions);
          if (!activeSessionId) {
            setActiveSessionId(r.sessions[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // When active session changes, load messages
  useEffect(() => {
    if (!activeSessionId) return;
    api<{ messages: any[] }>(`/assistant/sessions/${activeSessionId}/messages`)
      .then((r) => {
        if (r.messages && r.messages.length > 0) {
          setMsgs(
            r.messages.map((m) => ({
              role: m.role,
              content: m.content,
              sources: m.sources,
              actions: m.actions,
              engine: m.engine,
            }))
          );
        }
      })
      .catch(() => {});
  }, [activeSessionId]);

  const startNewSession = () => {
    setActiveSessionId(null);
    setMsgs([]);
  };

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setQ('');
    setBusy(true);

    try {
      const r = await api<GuideAnswer>('/assistant', { 
        body: { 
          question, 
          state, 
          caseId, 
          sessionId: activeSessionId, 
          history 
        } 
      });

      if (r.sessionId && r.sessionId !== activeSessionId) {
        setActiveSessionId(r.sessionId);
        // Refresh sessions list
        api<{ sessions: ChatSession[] }>('/assistant/sessions')
          .then((res) => setSessions(res.sessions || []))
          .catch(() => {});
      }

      setMsgs((m) => [
        ...m, 
        { 
          role: 'assistant', 
          content: r.answer, 
          sources: r.sources, 
          actions: r.actions, 
          engine: r.engine 
        }
      ]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); ask(q); };

  return (
    <Card className={cx('flex flex-col overflow-hidden', compact ? 'h-[520px]' : 'h-[calc(100vh-220px)] min-h-[480px]')}>
      {/* Header bar with SQLite status & Session selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-brand-50 via-white to-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-700" />
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span>AI Succession Navigator</span>
              {docCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                  <Database className="h-3 w-3" />
                  <span>Vault: {docCount} docs indexed</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Grounded in {state ? `${state} rules, ` : ''}RBI / EPFO / IRDAI / SEBI + User Documents
            </div>
          </div>
        </div>

        {/* Sessions toggle & New Chat */}
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <select 
              value={activeSessionId || ''} 
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title.slice(0, 24)}...
                </option>
              ))}
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={startNewSession} className="text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Ask anything about succession, claiming inoperative deposits, or navigating your uploaded paperwork.
            </p>
            {SUGGESTIONS.map((s) => (
              <button 
                key={s} 
                onClick={() => ask(s)} 
                className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:border-brand-500 hover:bg-brand-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 px-4 py-2.5 text-sm text-white shadow-xs">
              {m.content}
            </div>
          ) : (
            <div key={i} className={cx('max-w-[95%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-xs', m.error ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-800 border border-slate-100')}>
              <div className="prose-answer text-slate-800" dangerouslySetInnerHTML={{ __html: render(m.content) }} />

              {/* Action Pills */}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                  {m.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      onClick={() => navigate(act.url)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 border border-brand-200 transition hover:bg-brand-100 cursor-pointer"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Dual Sources Cited (Statutory vs User Documents) */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-2 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grounding References:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {m.sources.map((s, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={cx(
                          'flex items-center gap-1.5 rounded px-2 py-1 text-xs border',
                          s.type === 'user_doc' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        {s.type === 'user_doc' ? (
                          <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                        )}
                        <span className="truncate">
                          <strong>{s.type === 'user_doc' ? '[User Doc]' : '[Law]'}</strong> {s.title} — {s.section}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                    Engine: {m.engine} · Stored in SQLite
                  </div>
                </div>
              )}
            </div>
          ),
        )}
        {busy && <div className="w-16 animate-pulse rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">···</div>}
        <div ref={end} />
      </div>

      {/* Input bar */}
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 bg-white">
        <Input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="e.g. What documents do I still need for Canara Bank based on my uploads?" 
        />
        <Button disabled={!q.trim()} loading={busy} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
