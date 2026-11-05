import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import {

  ArrowRight,

  ArrowUp,

  BookOpen,

  Database,

  FileSpreadsheet,

  FileText,

  Landmark,

  Mic,

  Plus,

  Scale,

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

import { useAuth } from '../lib/auth';

import { cx } from './ui';
import CrystalizedBall from './reactbits/CrystalizedBall';

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

    query: 'What is the RBI 15-day claim settlement rule for bank deposits without nominee?',

  },

  {

    icon: FileSpreadsheet,

    label: 'EPFO Form 20 & pension checklist',

    query: 'What documents are required for EPFO Form 20 and widow pension claim?',

  },

  {

    icon: Scale,

    label: 'Missing nominee succession rules',

    query: 'How are assets divided under Hindu Succession Act when no nominee is registered?',

  },

  {

    icon: FileText,

    label: 'Draft claim intimation letter',

    query: 'Please draft a statutory claim intimation letter for bank and mutual fund transmission.',

  },

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

        '<span classNone="inline-block px-1.5 py-0.2 mx-0.5 text-[11px] font-semibold bg-[#EAE6DC] text-[#101D2B] border border-[#DDD7CA] rounded">[$1]</span>'

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

      out.push(`<${kind} classNone="space-y-1.5 my-2 pl-4 list-decimal text-xs leading-relaxed text-[#17232E]">`);

      list = kind;

    }

    if (kind) out.push(`<li>${inline((ol || ul)![1])}</li>`);

    else if (line.trim()) out.push(`<p classNone="my-2 leading-relaxed text-[#17232E]">${inline(line)}</p>`);

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

  // Greeting computation

  const hour = new Date().getHours();

  const greetingTime = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const displayName =

    user?.identity?.name?.split(' ')[0] ||

    user?.name?.split(' ')[0] ||

    'there';

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

        'rounded-3xl border border-[#DDD7CA] bg-[#F5F3ED] flex flex-col overflow-hidden shadow-sm transition-all',

        compact ? 'h-[520px]' : 'h-[calc(100vh-210px)] min-h-[560px]'

      )}

    >

      {/* Top Header Bar: Grounding & Regulatory Context */}

      <div className="px-4 py-3 border-b border-[#DDD7CA] bg-white/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2.5 text-xs">

        <div className="flex items-center gap-2 flex-wrap">

          <span className="font-semibold text-[#17232E] flex items-center gap-1.5">

            <Sparkles className="h-3.5 w-3.5 text-[#101D2B]" />

            AI Succession Navigator

          </span>

          <span className="text-[#71808C]">·</span>

          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-[#71808C]">

            <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] font-semibold">

              RBI

            </span>

            <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] font-semibold">

              EPFO

            </span>

            <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] font-semibold">

              IRDAI

            </span>

            <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] font-semibold">

              SEBI

            </span>

            {docCount > 0 && (

              <span className="px-2 py-0.5 rounded-full bg-[#EAE6DC] text-[#101D2B] border border-[#DDD7CA] flex items-center gap-1 font-semibold">

                <Database className="h-2.5 w-2.5" />

                {docCount} user doc{docCount === 1 ? '' : 's'} in vault

              </span>

            )}

            {state && (

              <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDD7CA] text-[#101D2B] font-semibold">

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

            className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full border border-[#DDD7CA] bg-white hover:bg-[#F5F3ED] text-xs font-medium text-[#17232E] transition cursor-pointer shadow-xs"

          >

            <Plus className="h-3.5 w-3.5 text-[#101D2B]" />

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

            className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full border border-[#55C6B0]/30 bg-[#101D2B]/10 hover:bg-[#101D2B]/15 text-xs font-medium text-[#101D2B] transition cursor-pointer shadow-xs disabled:opacity-60"

            title="Upload Will, passbook, or death certificate to SQLite Vault"

          >

            <Upload className="h-3.5 w-3.5" />

            <span>{uploadingDoc ? 'Uploading…' : 'Upload to Vault'}</span>

          </button>

        </div>

      </div>

      {/* Main Conversation Stream */}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* Empty State with Radiant Orb & Revolving Prompt Pills */}

        {msgs.length === 0 && (

          <div className="h-full min-h-[380px] flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto select-none">

            {/* Radiant Ambient Orb Container with Floating Pills */}

            <div className="relative w-full max-w-md h-64 flex items-center justify-center my-2">

              {/* Outer Glowing Blur Corona */}

              <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-400/35 via-fuchsia-400/35 to-rose-400/30 blur-3xl animate-pulse pointer-events-none" />

              {/* Interactive CrystalizedBall from React Bits */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden flex items-center justify-center transition-all duration-700 hover:scale-105 shadow-2xl">
                <CrystalizedBall
                  preset="aurora"
                  color="#55C6B0"
                  theme="light"
                  size={0.82}
                  crackle={0.7}
                  fill={0.5}
                  glow={0.9}
                  interactive
                  hoverStrength={0.8}
                />
              </div>

              {/* Pill 1: Top-Left (Claim bank deposits) */}

              <button

                type="button"

                onClick={() => ask(ACTION_SUGGESTIONS[0].query)}

                className="absolute top-4 left-0 sm:-left-6 max-w-[190px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-[#17232E] border border-slate-200/80 shadow-xs hover:shadow-md text-[11px] font-medium flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 backdrop-blur-md"

              >

                <Landmark className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                <span className="truncate">Claim bank deposits</span>

              </button>

              {/* Pill 2: Top-Right (Draft claim intimation) */}

              <button

                type="button"

                onClick={() => ask(ACTION_SUGGESTIONS[3].query)}

                className="absolute top-4 right-0 sm:-right-6 max-w-[190px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-[#17232E] border border-slate-200/80 shadow-xs hover:shadow-md text-[11px] font-medium flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 backdrop-blur-md"

              >

                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                <span className="truncate">Draft claim letter</span>

              </button>

              {/* Pill 3: Bottom-Left (Missing nominee succession) */}

              <button

                type="button"

                onClick={() => ask(ACTION_SUGGESTIONS[2].query)}

                className="absolute bottom-4 left-0 sm:-left-6 max-w-[190px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-[#17232E] border border-slate-200/80 shadow-xs hover:shadow-md text-[11px] font-medium flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 backdrop-blur-md"

              >

                <Scale className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                <span className="truncate">Missing nominee rules</span>

              </button>

              {/* Pill 4: Bottom-Right (EPFO pension checklist) */}

              <button

                type="button"

                onClick={() => ask(ACTION_SUGGESTIONS[1].query)}

                className="absolute bottom-4 right-0 sm:-right-6 max-w-[190px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-[#17232E] border border-slate-200/80 shadow-xs hover:shadow-md text-[11px] font-medium flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 backdrop-blur-md"

              >

                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                <span className="truncate">EPFO Form 20 checklist</span>

              </button>

            </div>

            {/* Greeting Headline */}

            <div className="text-center space-y-1 mt-3">

              <div className="text-sm sm:text-base font-medium tracking-normal text-[#55C6B0]">

                {greetingTime}, {displayName}!

              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17232E]">

                What can I help you with?

              </h2>

              <p className="text-xs text-[#71808C] max-w-md pt-0.5">

                Statutory legal RAG grounded in RBI Master Directions, EPFO gazettes, SEBI rules, and your uploaded estate documents.

              </p>

            </div>

          </div>

        )}

        {/* Message Thread */}

        {msgs.map((m, i) =>

          m.role === 'user' ? (

            <div

              key={i}

              className="ml-auto max-w-[80%] rounded-2xl rounded-br-xs bg-[#EAE6DC] text-[#17232E] border border-[#DDD7CA] px-4 py-2.5 text-xs leading-relaxed shadow-xs font-medium"

            >

              {m.content}

            </div>

          ) : (

            <div

              key={i}

              className={cx(

                'max-w-[88%] rounded-2xl rounded-bl-xs p-4 sm:p-5 text-xs shadow-xs space-y-3.5 transition-all',

                m.error

                  ? 'bg-rose-50 text-rose-800 border border-rose-200'

                  : 'bg-white/90 text-[#17232E] border border-[#DDD7CA]'

              )}

            >

              {/* Answer Markdown Body */}

              <div

                className="leading-relaxed space-y-2 text-[#17232E]"

                dangerouslySetInnerHTML={{ __html: render(m.content) }}

              />

              {/* Action Navigation Buttons */}

              {m.actions && m.actions.length > 0 && (

                <div className="flex flex-wrap gap-2 pt-2.5 border-t border-[#DDD7CA]">

                  {m.actions.map((act, actIdx) => (

                    <button

                      key={actIdx}

                      type="button"

                      onClick={() => navigate(act.url)}

                      className="inline-flex items-center gap-1.5 rounded-full bg-[#101D2B]/10 px-3 py-1 text-xs font-semibold text-[#101D2B] border border-[#55C6B0]/30 transition hover:bg-[#101D2B]/20 cursor-pointer"

                    >

                      <span>{act.label}</span>

                      <ArrowRight className="h-3 w-3" />

                    </button>

                  ))}

                </div>

              )}

              {/* Citations & Evidence Grounding */}

              {m.sources && m.sources.length > 0 && (

                <div className="pt-2.5 border-t border-[#DDD7CA] space-y-1.5">

                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#71808C]">

                    Statutory & Document References

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">

                    {m.sources.map((s, sIdx) => (

                      <div

                        key={sIdx}

                        className={cx(

                          'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border',

                          s.type === 'user_doc'

                            ? 'bg-[#EAE6DC]/50 text-[#101D2B] border-[#DDD7CA] font-medium'

                            : 'bg-[#F5F3ED] text-[#17232E] border-[#DDD7CA]'

                        )}

                      >

                        {s.type === 'user_doc' ? (

                          <FileText className="h-3 w-3 text-[#101D2B] shrink-0" />

                        ) : (

                          <BookOpen className="h-3 w-3 text-[#101D2B] shrink-0" />

                        )}

                        <span className="truncate">

                          <strong>{s.type === 'user_doc' ? '[User Doc]' : '[Law]'}</strong>{' '}

                          {s.title} — {s.section}

                        </span>

                      </div>

                    ))}

                  </div>

                  {m.engine && (

                    <div className="text-[10px] text-[#71808C] font-mono pt-0.5">

                      Grounding Engine: {m.engine} · Verified Act & Gazette Index

                    </div>

                  )}

                </div>

              )}

            </div>

          )

        )}

        {busy && (

          <div className="w-16 animate-pulse rounded-2xl bg-white border border-[#DDD7CA] px-3.5 py-2 text-xs text-[#101D2B] font-mono shadow-xs">

            ···

          </div>

        )}

        <div ref={end} />

      </div>

      {/* Sleek Bottom Floating Input Bar */}

      <div className="p-3 sm:p-4 bg-white/80 border-t border-[#DDD7CA] backdrop-blur-sm">

        <form

          onSubmit={submit}

          className="relative max-w-3xl mx-auto rounded-2xl border border-[#DDD7CA] bg-white p-1.5 pl-2 sm:pl-3 flex items-center gap-2 shadow-xs focus-within:border-[#101D2B] focus-within:ring-2 focus-within:ring-[#55C6B0]/20 transition-all"

        >

          {/* Document Vault Attachment Button (+) */}

          <button

            type="button"

            onClick={() => fileInputRef.current?.click()}

            title="Upload Will, death certificate, or passbook to SQLite Vault"

            className="h-8 w-8 shrink-0 rounded-xl hover:bg-[#F5F3ED] text-[#71808C] hover:text-[#101D2B] flex items-center justify-center transition cursor-pointer"

          >

            <Plus className="h-4 w-4" />

          </button>

          {/* Prompt Input */}

          <input

            type="text"

            value={q}

            onChange={(e) => setQ(e.target.value)}

            placeholder="Ask me anything..."

            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#17232E] placeholder:text-[#71808C] focus:outline-none focus:ring-0 py-1"

          />

          {/* Model Tag Pill */}

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F3ED] border border-[#DDD7CA] text-[11px] font-medium text-[#71808C] select-none whitespace-nowrap">

            <span>Legal RAG · Act & Gazette</span>

            <span className="text-[10px] text-[#71808C]">▾</span>

          </div>

          {/* Voice Indicator (Visual) */}

          <button

            type="button"

            title="Voice intimation navigator"

            className="hidden sm:flex h-8 w-8 shrink-0 rounded-xl hover:bg-[#F5F3ED] text-[#71808C] hover:text-[#101D2B] items-center justify-center transition cursor-pointer"

          >

            <Mic className="h-3.5 w-3.5" />

          </button>

          {/* Rounded Send Button */}

          <button

            type="submit"

            disabled={!q.trim() || busy}

            className="h-8 w-8 shrink-0 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"

            aria-label="Send message"

          >

            <ArrowUp className="h-4 w-4" />

          </button>

        </form>

        <div className="text-[10px] text-center text-[#71808C] mt-2">

          Statutory assistance grounded in regulator circulars & Acts. Verify filings with qualified counsel.

        </div>

      </div>

    </div>

  );

}

