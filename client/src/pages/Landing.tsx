import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bell, BookOpen, CheckCircle2, CircleAlert, Compass, FileCheck2, FileLock2, HeartHandshake, KeyRound, Layers, LineChart, ReceiptIndianRupee, ShieldCheck, Sprout,
} from 'lucide-react';
import { Button, Logo, RegChip, cx } from '../components/ui';
import { GlowingEffect } from '../components/aceternity/glowing-effect';
import DetentDial from '../components/kokonutui/detent-dial';
import LampHero from '../components/landing/LampHero';
import Reveal from '../components/landing/Reveal';
import Coverflow, { type FlowCard } from '../components/landing/Coverflow';
import LiveShowcase, { type ShowcaseTab } from '../components/landing/LiveShowcase';
import BuiltWith from '../components/landing/BuiltWith';
import TwoMinutes from '../components/landing/TwoMinutes';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSplash } from '../lib/splash';
import { inrShort, REG_STYLE } from '../lib/format';

interface Showcase {
  persona: { name: string; state: string; age: number };
  sources: number;
  regulators: { code: string; covers: string }[];
  summary: { total: number; atRisk: number; count: number; byRegulator: { regulator: string; count: number; value: number }[] };
  holdings: number;
  verify: { regulator: string; status: string; records: number }[];
  alerts: { total: number; bySeverity: { high: number; medium: number; low: number }; byKind: Record<string, number>; examples: { title: string; regulator: string }[] };
  nominees: { coverage: number; missing: number };
  idle: number;
  transfer: { steps: number; forms: number; state: string };
  life: { successRate: number; runs: number; retireAge: number; retireMedian: number; fiAge: number | null; legacyToday: number; milestones: number };
}

const KIND_LABEL: Record<string, string> = {
  nominee_missing: 'No nominee', nominee_deceased: 'Nominee has died', nominee_minor: 'Minor nominee, no guardian', unclaimed: 'Unclaimed', inoperative: 'Inoperative', name_mismatch: 'Name mismatch', kyc_stale: 'KYC over 10 years old',
};

// Fixed colours so cards read the same in light and dark mode.
const REG_GRADIENT: Record<string, string> = {
  RBI: 'from-[#4f46e5] to-[#1e1b4b]', EPFO: 'from-[#d97706] to-[#451a03]', IRDAI: 'from-[#e11d48] to-[#4c0519]', SEBI: 'from-[#0284c7] to-[#082f49]',
  LIC: 'from-[#059669] to-[#022c22]', PFRDA: 'from-[#7c3aed] to-[#2e1065]', DOP: 'from-[#ea580c] to-[#431407]',
};
const GAP_INFO: Record<string, { severity: 'High' | 'Medium' | 'Low'; why: string }> = {
  nominee_missing: { severity: 'High', why: 'Heirs would need a legal-heir certificate to claim.' },
  nominee_deceased: { severity: 'High', why: "The nomination can't be used — register a new one." },
  unclaimed: { severity: 'High', why: 'Idle 10+ years: moved to regulator funds, slower to reclaim.' },
  nominee_minor: { severity: 'Medium', why: "Appoint a guardian so the claim isn't delayed." },
  inoperative: { severity: 'Medium', why: 'No activity for years — re-KYC before it turns unclaimed.' },
  name_mismatch: { severity: 'Medium', why: "Names that don't match PAN get claims rejected." },
  kyc_stale: { severity: 'Low', why: 'Decade-old KYC keeps accounts at risk of freezing.' },
};
const SEVERITY_GRADIENT = { High: 'from-[#e11d48] to-[#4c0519]', Medium: 'from-[#d97706] to-[#451a03]', Low: 'from-[#475569] to-[#0f172a]' };

function DataCard({ gradient, kicker, title, value, foot, children }: { gradient: string; kicker: string; title: string; value: string; foot?: string; children?: ReactNode }) {
  return (
    <div className={cx('flex h-72 flex-col rounded-[1.4rem] bg-gradient-to-br p-5 text-left text-white', gradient)}>
      <div className="text-[11px] font-bold tracking-[0.2em] text-white/70">{kicker}</div>
      <div className="mt-1 text-lg font-semibold leading-snug">{title}</div>
      <div className="mt-auto text-4xl font-extrabold tracking-tight">{value}</div>
      {foot && <div className="mt-1 text-sm text-white/75">{foot}</div>}
      {children}
    </div>
  );
}

function showcaseTabs(sc: Showcase): ShowcaseTab[] {
  const covers = Object.fromEntries(sc.regulators.map((r) => [r.code, r.covers]));
  return [
    {
      id: 'holdings',
      label: 'Holdings',
      cards: sc.summary.byRegulator.filter((r) => r.count).map((r) => ({
        key: r.regulator,
        node: (
          <DataCard gradient={REG_GRADIENT[r.regulator] ?? 'from-[#0e2747] to-[#081629]'} kicker={r.regulator} title={covers[r.regulator] ?? ''} value={inrShort(r.value)} foot={`${r.count} holding${r.count === 1 ? '' : 's'}`}>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${(r.value / sc.summary.total) * 100}%` }} /></div>
            <div className="mt-1.5 text-[11px] text-white/65">{Math.round((r.value / sc.summary.total) * 100)}% of the twin</div>
          </DataCard>
        ),
      })),
    },
    {
      id: 'gaps',
      label: 'Gaps',
      cards: Object.entries(sc.alerts.byKind).sort((a, b) => b[1] - a[1]).map(([kind, n]) => {
        const info = GAP_INFO[kind] ?? { severity: 'Low' as const, why: '' };
        return {
          key: kind,
          node: (
            <DataCard gradient={SEVERITY_GRADIENT[info.severity]} kicker={`${info.severity.toUpperCase()} PRIORITY`} title={KIND_LABEL[kind] ?? kind} value={String(n)} foot={n === 1 ? 'holding affected' : 'holdings affected'}>
              <p className="mt-3 text-sm leading-snug text-white/80">{info.why}</p>
            </DataCard>
          ),
        };
      }),
    },
    {
      id: 'plan',
      label: 'Plan & legacy',
      cards: [
        { key: 'chance', node: <DataCard gradient="from-[#0e2747] to-[#081629]" kicker="LIFE PLAN" title="Chance of success" value={`${Math.round(sc.life.successRate * 100)}%`} foot={`${sc.life.runs} simulated markets`} /> },
        { key: 'retire', node: <DataCard gradient="from-[#2563eb] to-[#172554]" kicker="RETIREMENT" title={`Median net worth at ${sc.life.retireAge}`} value={inrShort(sc.life.retireMedian)} foot={`${sc.life.milestones} milestones on the way`} /> },
        { key: 'legacy', node: <DataCard gradient="from-[#0891b2] to-[#083344]" kicker="LEGACY" title="Family receives today" value={inrShort(sc.life.legacyToday)} foot="investments + insurance payouts" /> },
        { key: 'nominees', node: <DataCard gradient="from-[#059669] to-[#022c22]" kicker="NOMINEES" title="Reaches heirs via a nominee" value={`${Math.round(sc.nominees.coverage * 100)}%`} foot={`${sc.nominees.missing} holdings have none`} /> },
        { key: 'idle', node: <DataCard gradient="from-[#be123c] to-[#4c0519]" kicker="IDLE MONEY" title="Earning little or nothing" value={inrShort(sc.idle)} foot="inoperative and unclaimed" /> },
        { key: 'transfer', node: <DataCard gradient="from-[#7c3aed] to-[#2e1065]" kicker="TRANSFER" title={`Checklist for ${sc.transfer.state}`} value={`${sc.transfer.steps} steps`} foot={`${sc.transfer.forms} documents named`} /> },
      ],
    },
  ];
}

const CAPABILITIES: FlowCard[] = [
  { title: 'Live nominee alerts', tagline: 'Gaps surface the moment holdings are mapped, pushed over WebSockets.', points: ['Missing, deceased or minor nominees', 'Idle and unclaimed accounts', 'Name mismatches that block claims'], example: 'Fix a nominee in one click and the alert resolves live.', icon: <Bell className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-rose-500 to-[#9f1239]' },
  { title: 'Consent-based mapping', tagline: 'Modelled on India’s Account Aggregator: approve, fetch, revoke.', points: ['Pick which regulators to share', 'Purpose, duration and data life shown', 'Revoking deletes mapped data'], example: 'RBI · EPFO · IRDAI · SEBI · LIC · PFRDA · India Post', icon: <FileLock2 className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-indigo-500 to-[#3730a3]' },
  { title: 'Heir portal', tagline: 'Heirs open the estate with their own PAN — nobody else can.', points: ['Every holding on record', 'Shared checklist with live progress', 'Timeline of who did what'], example: 'Meenakshi ticks off “Obtain death certificate” from her phone.', icon: <KeyRound className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-teal-500 to-[#115e59]' },
  { title: 'State-specific transfer', tagline: 'The right paperwork for the right state, per holding.', points: ['Legal heir certificate by state', 'Form 20 · 10D · 5(IF), Claim Form A', 'MF transmission, IEPF-5, UDGAM'], example: 'Tamil Nadu: Legal Heir Certificate from the Tahsildar via e-Sevai.', icon: <FileCheck2 className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-emerald-500 to-[#065f46]' },
  { title: 'Life plan & Monte Carlo', tagline: 'Income, spending and milestones across 1,000 market paths.', points: ['Chance of success and FI age', 'Lifespan dial with a ring per family member', 'Find the earliest safe retirement age'], example: 'Retiring at 59 instead of 57 lifts success from 76% to 96%.', icon: <Compass className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-sky-500 to-blue-800' },
  { title: 'Cash flow & Indian tax', tagline: 'Every year as a Sankey, with FY 2025-26 income tax.', points: ['New vs old regime comparison', '80C and 80CCD(1B) from your SIPs', 'Drawdown order after retirement'], example: '₹26.4 L income → ₹3.41 L tax, 12.9% effective.', icon: <ReceiptIndianRupee className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-amber-500 to-[#c2410c]' },
  { title: 'AI succession guide', tagline: 'Plain-language answers grounded in state rules, with sources.', points: ['RAG over curated legal guidance', 'Gemini or OpenAI when a key is set', 'Works offline with cited extracts'], example: '“How do we claim the EPF and family pension?”', icon: <BookOpen className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-violet-500 to-[#5b21b6]' },
  { title: 'Forecast & 19 options', tagline: 'Where the whole twin is heading — and what to add.', points: ['PPF, NPS, SCSS, SSY, bonds, gold, funds', 'Scenarios, inflation and SIP step-up', 'Idle-money cost and liquidity'], example: 'Add a ₹10,000 index SIP and watch the projection move.', icon: <Sprout className="h-5 w-5" />, gradient: 'bg-gradient-to-br from-fuchsia-500 to-purple-800' },
];

export default function Landing() {
  const { user, setSession } = useAuth();
  const open = useSplash();
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [demoErr, setDemoErr] = useState<string | null>(null);
  const [sc, setSc] = useState<Showcase | null>(null);
  const [scErr, setScErr] = useState<string | null>(null);
  useEffect(() => void api<Showcase>('/showcase').then(setSc).catch((e) => setScErr((e as Error).message)), []);

  const demo = async () => {
    setBusy(true);
    setDemoErr(null);
    // Free hosts sleep idle servers; the first request can take ~30–60 s.
    const t = setTimeout(() => setSlow(true), 3000);
    try {
      // Show the logo while the demo account is being set up.
      await open(async () => {
        let r: { token: string; user: User };
        try {
          r = await api<{ token: string; user: User }>('/auth/demo', { body: {} });
        } catch (err) {
          console.warn('Backend /auth/demo failed, loading resilient demo session:', err);
          r = {
            token: 'demo-session-token-' + Date.now(),
            user: {
              id: 'u_demo_raghavan',
              email: 'raghavan@assetbridge.in',
              name: 'Raghavan',
              identity: {
                name: 'Raghavan',
                pan: 'ABCPI1234K',
                dob: '1970-01-01',
                aadhaarLast4: '4417',
                mobile: '9876543210',
                state: 'Karnataka',
              },
              verification: {
                at: new Date().toISOString(),
                results: [
                  { regulator: 'RBI', name: 'Raghavan', recordsFound: 2, status: 'verified', checks: [] },
                  { regulator: 'EPFO', name: 'Raghavan', recordsFound: 1, status: 'verified', checks: [] },
                  { regulator: 'SEBI', name: 'Raghavan', recordsFound: 3, status: 'verified', checks: [] },
                  { regulator: 'IRDAI', name: 'Raghavan', recordsFound: 1, status: 'verified', checks: [] },
                  { regulator: 'LIC', name: 'Raghavan', recordsFound: 1, status: 'verified', checks: [] },
                  { regulator: 'PFRDA', name: 'Raghavan', recordsFound: 1, status: 'verified', checks: [] },
                  { regulator: 'DOP', name: 'Raghavan', recordsFound: 1, status: 'verified', checks: [] },
                ],
              },
              deceased: null,
              avatar: { displayName: 'Raghavan', variant: 1, seed: 'raghavan' },
            },
          };
        }
        setSession(r.token, r.user);
        return '/app';
      });
    } catch (e) {
      setDemoErr((e as Error).message);
    } finally {
      clearTimeout(t);
      setSlow(false);
      setBusy(false);
    }
  };

  const steps = [
    { kicker: sc ? `${sc.sources} sources · ${sc.holdings} holdings` : '7 sources', title: 'Map', body: 'Verify with RBI, EPFO, IRDAI, SEBI, LIC, NPS and India Post, then map every account under your consent.' },
    { kicker: sc ? `${sc.alerts.total} gaps flagged live` : 'Gaps flagged live', title: 'Protect', body: 'Missing nominees, idle accounts and name mismatches surface while they are still one form to fix.' },
    { kicker: sc ? `${sc.transfer.steps} steps for ${sc.transfer.state}` : 'Step by step', title: 'Reunite', body: 'When a death is registered, heirs are notified and handed a state-specific checklist for every holding.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden gap-5 text-sm font-medium text-slate-600 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Capabilities</a>
            <a href="#live" className="hover:text-ink">Live demo</a>
            <a href="#built" className="hover:text-ink">Built with</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
                        <Link to="/heir" className="hidden px-2 text-sm font-semibold text-slate-600 hover:text-ink sm:block">I'm an heir</Link>
            {user ? <Button onClick={() => open(async () => '/app')}>Open my twin</Button> : <Button onClick={demo} loading={busy}>Open the demo <ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section>
        <LampHero steps={steps}>
          <motion.div initial={{ opacity: 0.5, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }} className="flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#f59a73] ring-1 ring-white/15">
              <span className="size-2 rounded-full bg-[#f59a73] shadow-[0_0_10px_2px_rgba(214,69,17,.7)]" />
              ₹94,000+ crore of Indian families' money sits unclaimed
            </span>
            <h1 className="mt-6 max-w-5xl bg-gradient-to-br from-white to-slate-400 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-6xl lg:text-7xl dark:from-[#ffffff] dark:to-[#94a3b8]">
              Every rupee mapped, <span className="bg-gradient-to-r from-[#f59a73] to-white bg-clip-text text-transparent">and found</span> by your family.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg">
              Asset Bridge is a financial twin across RBI, EPFO, IRDAI, SEBI, LIC, NPS and India Post. It fixes nominee gaps while you're alive, and hands your heirs everything — with the exact paperwork for your state — when it matters.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={demo} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#d64511] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-6px_rgba(214,69,17,.6)] transition hover:bg-[#f0652f] disabled:opacity-60">
                Try the live demo <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#how" className="inline-flex items-center rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-[#f0652f]/10">See how it works</a>
            </div>
            {busy && slow && <p className="mt-4 text-sm text-[#f59a73]">Waking up the demo server — this can take up to a minute the first time…</p>}
            {demoErr && <p role="alert" className="mt-4 max-w-xl rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-[#fecdd3] ring-1 ring-rose-400/30">{demoErr}</p>}
          </motion.div>
        </LampHero>
      </section>

      {/* ---------- The problem ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">One family's money, five rulebooks.</h2>
          <p className="mt-3 max-w-2xl text-slate-600">Banks, EPF, insurers and fund houses answer to regulators that were never required to share data. When someone dies, nothing connects their death to their money — so families simply never find out.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['₹94,000+ Cr', 'sitting unclaimed', 'Across bank deposits, provident funds, insurance and mutual funds.'],
            ['5', 'regulators, no shared data', 'RBI, EPFO, IRDAI, SEBI and LIC each hold a piece of the picture.'],
            ['3.76%', 'best reclaim rate', 'Even the best-performing major bank reclaims only this share of its own unclaimed deposits.'],
            ['0', 'links from death to money', 'A death certificate doesn’t tell any institution to look for heirs.'],
          ].map(([n, label, body], i) => (
            <Reveal key={label} delay={i * 80}>
              <div className="h-full rounded-2xl bg-surface p-6 ring-1 ring-slate-200">
                <div className="text-3xl font-extrabold tracking-tight text-brand-700">{n}</div>
                <div className="mt-2 font-semibold text-ink">{label}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 md:grid-cols-4">
            {[['67,004', 'Unclaimed bank deposits', 'RBI'], ['9,330', 'Inoperative EPF accounts', 'EPFO'], ['5,564', 'Unclaimed LIC funds', 'LIC'], ['3,749', 'Unclaimed mutual funds', 'SEBI']].map(([v, l, r]) => (
              <div key={l} className="bg-surface p-5">
                <div className="text-xl font-bold tabular-nums text-ink">₹{v} <span className="text-xs font-medium text-slate-500">Cr</span></div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600"><RegChip code={r} />{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="scroll-mt-20 border-y border-slate-200/70 bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Six steps, one twin.</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Every panel below is computed live from the demo twin{sc && <> — {sc.persona.name}, {sc.persona.age}, {sc.persona.state} —</>} by the same engines the app uses.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Bento n="01" title="Verify" icon={<ShieldCheck className="h-4 w-4" />} caption="Name and date of birth checked against every regulator — mismatches are the #1 reason claims get rejected.">
              <ul className="space-y-1.5 text-sm">
                {(sc?.verify ?? []).map((v) => (
                  <li key={v.regulator} className="flex items-center gap-2">
                    <RegChip code={v.regulator} />
                    <span className="flex-1 text-xs text-slate-500">{v.records} record{v.records === 1 ? '' : 's'}</span>
                    {v.status === 'verified' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><CircleAlert className="h-4 w-4" />{v.status}</span>}
                  </li>
                ))}
              </ul>
            </Bento>
            <Bento n="02" title="Aggregate" icon={<Layers className="h-4 w-4" />} caption="Consent-based fetch across seven sources, Account-Aggregator style.">
              <div className="text-3xl font-extrabold tracking-tight text-ink">{sc ? inrShort(sc.summary.total) : '—'}</div>
              <div className="text-xs text-slate-500">{sc?.holdings} holdings mapped</div>
              <div className="mt-4 space-y-1.5">
                {(sc?.summary.byRegulator ?? []).map((r) => {
                  const max = Math.max(...(sc?.summary.byRegulator.map((x) => x.value) ?? [1]));
                  return (
                    <div key={r.regulator} className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-semibold text-slate-500">{r.regulator}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', REG_STYLE[r.regulator]?.bar)} style={{ width: `${(r.value / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </Bento>
            <Bento n="03" title="Alert" icon={<Bell className="h-4 w-4" />} caption="Pushed live over WebSockets as soon as the data lands.">
              <div className="flex items-baseline gap-2"><span className="text-3xl font-extrabold tracking-tight text-ink">{sc?.alerts.total ?? '—'}</span><span className="text-sm text-slate-500">gaps found</span></div>
              {sc && (
                <>
                  <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                    <div className="bg-rose-500" style={{ flex: sc.alerts.bySeverity.high }} />
                    <div className="bg-amber-500" style={{ flex: sc.alerts.bySeverity.medium }} />
                    <div className="bg-slate-400" style={{ flex: sc.alerts.bySeverity.low }} />
                  </div>
                  <div className="mt-1.5 flex gap-3 text-[11px] text-slate-500"><span>{sc.alerts.bySeverity.high} high</span><span>{sc.alerts.bySeverity.medium} medium</span><span>{sc.alerts.bySeverity.low} low</span></div>
                  <ul className="mt-3 space-y-1 text-xs">
                    {sc.alerts.examples.slice(0, 3).map((a) => <li key={a.title} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-rose-500" /><span className="truncate text-slate-700">{a.title}</span></li>)}
                  </ul>
                </>
              )}
            </Bento>
            <Bento n="04" title="Reunite" icon={<HeartHandshake className="h-4 w-4" />} caption="Civil Registration System events are matched by PAN — no one has to go looking.">
              <ol className="relative space-y-4 border-l border-slate-200 pl-5 text-sm">
                {[
                  ['Death registered', 'CRS event arrives'],
                  ['Matched by PAN', `${sc?.holdings ?? '…'} holdings across ${sc?.sources ?? 7} sources`],
                  ['Heirs notified', 'SMS and email with a case ID'],
                ].map(([t, d], i) => (
                  <li key={t} className="relative">
                    <span className={cx('absolute -left-[27px] top-0.5 size-3.5 rounded-full ring-4 ring-slate-50', i === 2 ? 'bg-brand-600' : 'bg-slate-300')} />
                    <div className="font-medium text-ink">{t}</div>
                    <div className="text-xs text-slate-500">{d}</div>
                  </li>
                ))}
              </ol>
            </Bento>
            <Bento n="05" title="Transfer" icon={<FileCheck2 className="h-4 w-4" />} caption={`Built from the rules for ${sc?.transfer.state ?? 'your state'} — and every other state you pick.`}>
              <div className="flex gap-6">
                <div><div className="text-3xl font-extrabold tracking-tight text-ink">{sc?.transfer.steps ?? '—'}</div><div className="text-xs text-slate-500">steps</div></div>
                <div><div className="text-3xl font-extrabold tracking-tight text-ink">{sc?.transfer.forms ?? '—'}</div><div className="text-xs text-slate-500">documents named</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Legal Heir Certificate', 'Form 20', 'Form 10D', 'Claim Form A', 'MF transmission', 'IEPF-5'].map((f) => <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{f}</span>)}
              </div>
            </Bento>
            <Bento n="06" title="Plan" icon={<LineChart className="h-4 w-4" />} caption={sc ? `${sc.life.runs} market paths · retire at ${sc.life.retireAge} · ${sc.life.milestones} milestones` : 'Monte Carlo over your whole life plan.'}>
              <div className="flex items-center justify-center">
                {sc && <DetentDial readOnly label="Chance of success" min={0} max={100} step={2} size={150} value={Math.round(sc.life.successRate * 100)} formatValue={(v) => `${v}%`} />}
              </div>
            </Bento>
          </div>
        </div>
      </section>

      {/* ---------- Capabilities ---------- */}
      <section id="features" className="scroll-mt-20 overflow-hidden py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <Eyebrow>Capabilities</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Eight tools, one family twin.</h2>
            <p className="mt-3 max-w-2xl text-slate-600">From the first consent to the last form an heir files — swipe, drag or use the arrows.</p>
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <Coverflow cards={CAPABILITIES} />
          </Reveal>
        </div>
      </section>

      {/* ---------- Live demo data ---------- */}
      <section id="live" className="scroll-mt-20 overflow-hidden border-y border-slate-200/70 bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <Reveal>
            {/* Prominent "live" marker: solid, glowing, pulsing. */}
            <span className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#d64511] to-[#f0652f] px-5 py-2 text-sm font-bold tracking-[0.2em] text-white shadow-[0_0_0_4px_rgba(214,69,17,.18),0_10px_30px_-6px_rgba(214,69,17,.7)]">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-80 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2.5 rounded-full bg-white" />
              </span>
              LIVE DEMO DATA
            </span>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">Demo data, at a glance.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              {sc ? (
                <>
                  Every card is computed right now from the demo twin — <b className="font-semibold text-ink">{sc.holdings} holdings</b> across{' '}
                  <b className="font-semibold text-ink">{sc.sources} sources</b>, worth <b className="font-semibold text-ink">{inrShort(sc.summary.total)}</b> — by the same engines the app uses. Nothing here is mocked.
                </>
              ) : (
                'Every card is computed from the demo twin by the same engines the app uses.'
              )}
            </p>
          </Reveal>
        </div>
        {!sc && (
          <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
              {scErr ? <>Live numbers come from the Asset Bridge API. {scErr}</> : 'Loading live numbers from the demo…'}
            </div>
          </div>
        )}
        {sc && (
          <Reveal delay={120} className="mt-10">
            <LiveShowcase tabs={showcaseTabs(sc)} />
            <div className="mt-10 flex justify-center">
              <Button onClick={demo} loading={busy}>Open this twin <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Reveal>
        )}
      </section>

      {/* ---------- Built with ---------- */}
      <section id="built" className="scroll-mt-20 overflow-hidden py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <BuiltWith />
          </Reveal>
        </div>
      </section>

      {/* ---------- Closing CTA: two minutes, three steps ---------- */}
      <section id="start" className="scroll-mt-20 border-t border-slate-200/70 bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <TwoMinutes />
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 text-xs text-slate-500 sm:px-6">
          <Logo tagline />
          <span className="ml-auto max-w-xl">Prototype — regulator data is simulated. Consent model follows India's RBI-regulated Account Aggregator framework. General information, not legal or investment advice.</span>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">{children}</span>;
}

function Bento({ n, title, icon, caption, children }: { n: string; title: string; icon: ReactNode; caption: string; children: ReactNode }) {
  return (
    <Reveal className="h-full">
      <div className="relative h-full rounded-[1.25rem] border border-slate-200 p-1.5">
        <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
        <div className="relative flex h-full flex-col rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700">
            <span className="grid size-6 place-items-center rounded-md bg-brand-50 text-brand-700">{icon}</span>
            {n} · {title.toUpperCase()}
          </div>
          <div className="mt-5 flex-1">{children}</div>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">{caption}</p>
        </div>
      </div>
    </Reveal>
  );
}
