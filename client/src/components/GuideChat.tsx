import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Database,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  Scale,
  Sparkles,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  api,
  uploadDocument,
  type ChatSession,
  type GuideAction,
  type GuideAnswer,
  type GuideSource,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { cx } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  sources?: GuideSource[];
  actions?: GuideAction[];
  engine?: string;
  error?: boolean;
}

const ACTION_SUGGESTIONS = [
  {
    icon: Landmark,
    label: 'Claim bank deposits (15-day rule)',
    desc: 'RBI 15-day claim settlement rule for accounts without nominee',
    query: 'What is the RBI 15-day claim settlement rule for bank deposits without nominee?',
  },
  {
    icon: FileSpreadsheet,
    label: 'EPFO Form 20 & pension checklist',
    desc: 'Document requirements for PF transfer & widow pension claims',
    query: 'What documents are required for EPFO Form 20 and widow pension claim?',
  },
  {
    icon: Scale,
    label: 'Missing nominee succession rules',
    desc: 'Statutory asset devolution under the Hindu Succession Act',
    query: 'How are assets divided under Hindu Succession Act when no nominee is registered?',
  },
  {
    icon: FileText,
    label: 'Draft claim intimation letter',
    desc: 'Statutory notice template for bank & mutual fund transmission',
    query: 'Please draft a statutory claim intimation letter for bank and mutual fund transmission.',
  },
];

// Clean and safe markdown parser with correct classes
function renderMarkdown(md: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[#101D2B]">$1</strong>')
      .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
      .replace(
        /\[(User Doc \d+|Law \d+|\d+)\]/g,
        '<span class="inline-block px-1.5 py-0.5 mx-0.5 text-[10px] font-semibold bg-[#EAE6DC] text-[#101D2B] border border-[#DDD7CA] rounded-sm">[$1]</span>'
      );

  const out: string[] = [];
  let list: 'ol' | 'ul' | null = null;

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('### ')) {
      if (list) {
        out.push(`</${list}>`);
        list = null;
      }
      out.push(`<h4 class="font-bold text-xs uppercase tracking-wider text-[#101D2B] mt-3 mb-1.5">${inline(line.slice(4))}</h4>`);
      continue;
    }

    const ol = rawLine.match(/^\s*\d+[.)]\s+(.*)/);
    const ul = rawLine.match(/^\s*[-*•]\s+(.*)/);
    const kind = ol ? 'ol' : ul ? 'ul' : null;

    if (list && kind !== list) {
      out.push(`</${list}>`);
      list = null;
    }

    if (kind && !list) {
      out.push(
        `<${kind} class="space-y-1.5 my-2 pl-4 ${kind === 'ol' ? 'list-decimal' : 'list-disc'} text-xs leading-relaxed text-[#17232E]">`
      );
      list = kind;
    }

    if (kind) {
      out.push(`<li>${inline((ol || ul)![1])}</li>`);
    } else if (line) {
      out.push(`<p class="my-2 leading-relaxed text-xs text-[#17232E]">${inline(rawLine)}</p>`);
    }
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
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(' ')[0] : '';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    if (file.size > 15 * 1024 * 1024) {
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'The selected file exceeds the 15MB size limit. Please upload a smaller PDF or image.',
          error: true,
        },
      ]);
      return;
    }

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
          content: `Document indexed: **${file.name}** was added to your estate vault (${res.chunks_indexed} semantic chunks parsed). You can now ask questions referencing this file.`,
          engine: 'sqlite-fts5-vault',
        },
      ]);
    } catch (err: any) {
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Document upload failed: ${err?.message || 'Network error'}`,
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setBusy(true);

    try {
      // Connect to official endpoint POST /api/ai/ask
      const r = await api<GuideAnswer>('/ai/ask', {
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
        {
          role: 'assistant',
          content: `Unable to complete request: ${(e as Error).message || 'Server error'}. Please try again or rephrase your question.`,
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(q);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQ(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div
      className={cx(
        'rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED] flex flex-col overflow-hidden shadow-xs transition-all',
        compact ? 'h-[520px]' : 'h-[calc(100vh-210px)] min-h-[560px]'
      )}
    >
      {/* Top Header Bar: Grounding & Regulatory Context */}
      <div className="px-4 py-2.5 border-b border-[#DDD7CA] bg-white flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[#101D2B] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#55C6B0]" />
            AI Succession Navigator
          </span>
          <span className="text-[#DDD7CA]">|</span>
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-[#71808C]">
            <span className="px-2 py-0.5 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] font-medium text-[#17232E]">
              RBI
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] font-medium text-[#17232E]">
              EPFO
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] font-medium text-[#17232E]">
              IRDAI
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] font-medium text-[#17232E]">
              SEBI
            </span>

            {docCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#EAE6DC] text-[#101D2B] border border-[#DDD7CA] flex items-center gap-1 font-semibold">
                <Database className="h-3 w-3 text-[#34765B]" />
                {docCount} {docCount === 1 ? 'doc' : 'docs'} in vault
              </span>
            )}

            {state && (
              <span className="px-2 py-0.5 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] text-[#101D2B] font-semibold">
                {state}
              </span>
            )}
          </div>
        </div>

        {/* Sessions & Vault Upload Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {sessions.length > 0 && (
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="rounded-full border border-[#DDD7CA] bg-white px-2.5 py-1 text-xs text-[#17232E] focus:outline-none focus:border-[#101D2B]"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title.slice(0, 24)}…
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={startNewSession}
            className="inline-flex items-center gap-1 py-1 px-3 rounded-full border border-[#DDD7CA] bg-white hover:bg-[#F5F3ED] text-xs font-semibold text-[#101D2B] transition cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingDoc}
            className="inline-flex items-center gap-1 py-1 px-3 rounded-full border border-[#DDD7CA] bg-white hover:bg-[#F5F3ED] text-xs font-semibold text-[#101D2B] transition cursor-pointer shadow-xs disabled:opacity-60"
            title="Upload Will, passbook, or death certificate to SQLite Vault"
          >
            {uploadingDoc ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#55C6B0]" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-[#55C6B0]" />
            )}
            <span>{uploadingDoc ? 'Uploading…' : 'Upload to Vault'}</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Empty State: Institutional & Focused without distracting orbs */}
        {msgs.length === 0 && (
          <div className="h-full flex flex-col justify-center items-center py-6 px-4 max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DDD7CA] text-xs font-mono font-bold text-[#101D2B] uppercase tracking-wider shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#55C6B0]" />
                STATUTORY AI NAVIGATOR
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101D2B]">
                {userName ? `Welcome, ${userName}` : 'Succession & Claims Intelligence'}
              </h2>
              <p className="text-xs sm:text-sm text-[#71808C] max-w-lg mx-auto leading-relaxed">
                Ask questions grounded in statutory acts, regulator circulars (RBI, EPFO, IRDAI, SEBI),
                and your indexed estate vault documents.
              </p>
            </div>

            {/* 4 Suggested Action Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {ACTION_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => ask(item.query)}
                    className="p-3.5 rounded-xl bg-white hover:bg-[#FDFCF9] text-left border border-[#DDD7CA] hover:border-[#101D2B] shadow-xs hover:shadow-sm transition cursor-pointer group flex items-start gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] flex items-center justify-center shrink-0 group-hover:bg-[#101D2B] group-hover:text-white transition">
                      <Icon className="h-4 w-4 text-[#101D2B] group-hover:text-white transition" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#101D2B] leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-[#71808C] mt-0.5 line-clamp-2 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div
              key={i}
              className="ml-auto max-w-[80%] rounded-2xl rounded-br-xs bg-[#101D2B] text-white px-4 py-2.5 text-xs leading-relaxed shadow-xs font-medium"
            >
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className={cx(
                'max-w-[88%] rounded-2xl rounded-bl-xs p-4 sm:p-5 text-xs shadow-xs space-y-3 transition-all',
                m.error
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-white text-[#17232E] border border-[#DDD7CA]'
              )}
            >
              {m.error && (
                <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs mb-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Request Notice</span>
                </div>
              )}

              {/* Answer Markdown Body */}
              <div
                className="leading-relaxed space-y-2 text-[#17232E]"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />

              {/* Action Navigation Buttons */}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2.5 border-t border-[#DDD7CA]">
                  {m.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      type="button"
                      onClick={() => navigate(act.url)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3ED] hover:bg-[#101D2B] hover:text-white px-3 py-1 text-xs font-semibold text-[#101D2B] border border-[#DDD7CA] transition cursor-pointer"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Citations & Evidence Grounding */}
              {m.sources && m.sources.length > 0 && (
                <div className="pt-2.5 border-t border-[#DDD7CA] space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleSources(i)}
                    className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-[#71808C] hover:text-[#101D2B] transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-[#55C6B0]" />
                      Statutory & Document References ({m.sources.length})
                    </span>
                    {expandedSources[i] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {expandedSources[i] && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 animate-in fade-in duration-200">
                      {m.sources.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className={cx(
                            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] border',
                            s.type === 'user_doc'
                              ? 'bg-[#EAE6DC]/60 text-[#101D2B] border-[#DDD7CA] font-medium'
                              : 'bg-[#F5F3ED] text-[#17232E] border-[#DDD7CA]'
                          )}
                        >
                          {s.type === 'user_doc' ? (
                            <FileText className="h-3.5 w-3.5 text-[#34765B] shrink-0" />
                          ) : (
                            <Scale className="h-3.5 w-3.5 text-[#101D2B] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-[10px] text-[#71808C] uppercase tracking-wider">
                              {s.type === 'user_doc' ? '[User Doc]' : '[Statute]'}
                            </span>{' '}
                            <span className="truncate block font-semibold text-[#101D2B]">
                              {s.title}
                            </span>
                            <span className="text-[10px] text-[#71808C] truncate block">
                              {s.section}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.engine && (
                    <div className="text-[10px] text-[#71808C] font-mono pt-1">
                      Grounding Engine: <span className="font-semibold text-[#101D2B]">{m.engine}</span> · Verified Statutory Index
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* Loading / Thinking State */}
        {busy && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-[#DDD7CA] px-4 py-2 text-xs text-[#101D2B] shadow-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#55C6B0]" />
            <span className="font-medium text-[#71808C]">Consulting statutory acts & document vault…</span>
          </div>
        )}

        <div ref={end} />
      </div>

      {/* Sleek Bottom Input Composer */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#DDD7CA]">
        <form
          onSubmit={submit}
          className="relative max-w-3xl mx-auto rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED] p-1.5 pl-2 sm:pl-3 flex items-end gap-2 shadow-xs focus-within:border-[#101D2B] focus-within:ring-2 focus-within:ring-[#101D2B]/10 transition-all"
        >
          {/* Document Vault Attachment Button (+) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Will, death certificate, or passbook to Estate Vault"
            className="h-8 w-8 shrink-0 rounded-xl hover:bg-white text-[#71808C] hover:text-[#101D2B] flex items-center justify-center transition cursor-pointer mb-0.5"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Multiline Prompt Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={q}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about RBI 15-day rule, EPFO Form 20, succession shares, or uploaded documents..."
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#17232E] placeholder:text-[#71808C] focus:outline-none focus:ring-0 py-2 resize-none max-h-32 leading-relaxed"
          />

          {/* Model Tag Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#DDD7CA] text-[10px] font-mono font-semibold text-[#71808C] select-none whitespace-nowrap mb-1">
            <span>Act & Circular RAG</span>
          </div>

          {/* Rounded Send Button */}
          <button
            type="submit"
            disabled={!q.trim() || busy}
            className="h-8 w-8 shrink-0 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs mb-0.5"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>

        <div className="text-[10px] text-center text-[#71808C] mt-2">
          Statutory guidance is educational and does not substitute for qualified legal counsel. Confirm specific filings with institutions.
        </div>
      </div>
    </div>
  );
}
