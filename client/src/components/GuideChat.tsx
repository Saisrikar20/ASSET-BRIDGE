import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Database,
  FileText,
  Plus,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  api,
  uploadDocument,
  type ChatSession,
  type GuideAction,
  type GuideAnswer,
  type GuideSource,
} from '../lib/api';
import { Button, Input, cx } from './ui';

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

// Minimal markdown parser: **bold**, numbered / bulleted lines, paragraphs, and citations
function render(md: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(
        /\[(User Doc \d+|Law \d+|\d+)\]/g,
        '<span class="inline-block px-1.5 py-0.2 mx-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded">[$1]</span>'
      );

  const out: string[] = [];
  let list: 'ol' | 'ul' | null = null;
  for (const line of md.split('\n')) {
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const kind = ol ? 'ol' : ul ? 'ul' : null;
    if (list && kind !== list) {
      out.push(`</${list}>`);
      list = null;
    }
    if (kind && !list) {
      out.push(`<${kind} class="space-y-1 my-1.5 pl-4 list-decimal text-xs">`);
      list = kind;
    }
    if (kind) out.push(`<li>${inline((ol || ul)![1])}</li>`);
    else if (line.trim()) out.push(`<p class="my-1.5 leading-relaxed">${inline(line)}</p>`);
  }
  if (list) out.push(`</${list}>`);
  return out.join('');
}

export default function GuideChat({
  state,
  caseId,
  compact,
}: {
  state?: string;
  caseId?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', 'User Supporting Document');
      if (caseId) fd.append('caseId', caseId);

      const res = await uploadDocument(fd);
      setDocCount((n) => n + 1);
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: `I have indexed **${file.name}** into your SQLite Document Vault (${res.chunks_indexed} semantic chunks). You can now ask questions about this document or reference it for your succession filings.`,
          engine: 'vault-indexer',
        },
      ]);
    } catch (err: any) {
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Failed to upload document: ${err?.message || 'Upload error'}`,
          error: true,
        },
      ]);
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startNewSession = () => {
    setActiveSessionId(null);
    setMsgs([]);
  };

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs
      .filter((m) => !m.error)
      .map(({ role, content }) => ({ role, content }));
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
          history,
        },
      });

      if (r.sessionId && r.sessionId !== activeSessionId) {
        setActiveSessionId(r.sessionId);
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
          engine: r.engine,
        },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: (e as Error).message, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  return (
    <div
      className={cx(
        'rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden shadow-sm',
        compact ? 'h-[520px]' : 'h-[calc(100vh-230px)] min-h-[500px]'
      )}
    >
      {/* STEP 4 & 6 — Source and Grounding Information Bar + New Consultation */}
      <div className="p-3 sm:px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
            AI Succession Navigator
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              RBI
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              EPFO
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              IRDAI
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              SEBI
            </span>
            {docCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Database className="h-2.5 w-2.5" />
                {docCount} user doc{docCount === 1 ? '' : 's'}
              </span>
            )}
            {state && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {state}
              </span>
            )}
          </div>
        </div>

        {/* STEP 6 — New Consultation & Sessions selector */}
        <div className="flex items-center gap-2 ml-auto">
          {sessions.length > 0 && (
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title.slice(0, 24)}…
                </option>
              ))}
            </select>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={startNewSession}
            className="text-xs gap-1 py-1 px-2.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={uploadingDoc}
            className="text-xs gap-1 py-1 px-2.5"
            title="Upload and index Will, passbook, or death certificate into Document Vault"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Upload to Vault</span>
          </Button>
        </div>
      </div>

      {/* STEP 5 & 7 — Messages & Conversation Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {/* Empty State with Suggested Questions */}
        {msgs.length === 0 && (
          <div className="space-y-4 my-auto p-4 max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mb-2">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Statutory Succession Guidance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ask questions about asset transmission rules, required affidavits, court heirship procedures, or uploaded documents.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="p-3 text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-xs"
                >
                  <span className="line-clamp-2">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2.5 text-xs leading-relaxed shadow-xs"
            >
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className={cx(
                'max-w-[92%] rounded-2xl rounded-bl-sm p-4 text-xs shadow-xs space-y-3',
                m.error
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800'
              )}
            >
              {/* Answer Markdown Body */}
              <div
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: render(m.content) }}
              />

              {/* Action Navigation Buttons */}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {m.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      type="button"
                      onClick={() => navigate(act.url)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition hover:bg-brand-100 cursor-pointer"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Citations & Evidence Grounding */}
              {m.sources && m.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Statutory & Document References
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {m.sources.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        className={cx(
                          'flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] border',
                          s.type === 'user_doc'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {s.type === 'user_doc' ? (
                          <FileText className="h-3 w-3 text-emerald-600 shrink-0" />
                        ) : (
                          <BookOpen className="h-3 w-3 text-brand-600 shrink-0" />
                        )}
                        <span className="truncate">
                          <strong>{s.type === 'user_doc' ? '[User Doc]' : '[Law]'}</strong>{' '}
                          {s.title} — {s.section}
                        </span>
                      </div>
                    ))}
                  </div>
                  {m.engine && (
                    <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                      Engine: {m.engine} · Grounded RAG
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {busy && (
          <div className="w-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-400 font-mono">
            ···
          </div>
        )}
        <div ref={end} />
      </div>

      {/* Input bar & Legal Notice */}
      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 space-y-2">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about transmission requirements, documents, or legal heirs…"
            className="text-xs py-2"
          />
          <Button
            type="submit"
            disabled={!q.trim()}
            loading={busy}
            aria-label="Send query"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="text-[10px] text-center text-slate-400">
          Informational legal assistance grounded in regulator circulars. Verify statutory filings with qualified counsel.
        </div>
      </div>
    </div>
  );
}
