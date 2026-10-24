import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, BookOpen, CheckCircle2, CircleAlert, Compass, FileCheck2, FileLock2, HeartHandshake, Hourglass, KeyRound, Layers, LineChart, Radio, ReceiptIndianRupee, ShieldCheck, Sprout, Wallet,
} from 'lucide-react';
import { Button, Logo, RegChip, cx } from '../components/ui';
import { GlowingEffect } from '../components/aceternity/glowing-effect';
import DetentDial from '../components/kokonutui/detent-dial';
import LampHero from '../components/landing/LampHero';
import Reveal from '../components/landing/Reveal';
import Coverflow, { type FlowCard } from '../components/landing/Coverflow';
import StackedPanels from '../components/landing/StackedPanels';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../lib/theme';
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
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sc, setSc] = useState<Showcase | null>(null);
  useEffect(() => void api<Showcase>('/showcase').then(setSc).catch(() => {}), []);

  const demo = async () => {
    setBusy(true);
    try {
      const r = await api<{ token: string; user: User }>('/auth/demo', { body: {} });
      setSession(r.token, r.user);
      nav('/app');
    } finally {
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
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/heir" className="hidden px-2 text-sm font-semibold text-slate-600 hover:text-ink sm:block">I'm an heir</Link>
            {user ? <Button onClick={() => nav('/app')}>Open my twin</Button> : <Button onClick={demo} loading={busy}>Open the demo <ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section>
        <LampHero steps={steps}>
          <motion.div initial={{ opacity: 0.5, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }} className="flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#99f6e4] ring-1 ring-white/15">
              <span className="size-2 rounded-full bg-teal-300 shadow-[0_0_10px_2px_rgba(94,234,212,.7)]" />
              ₹94,000+ crore of Indian families' money sits unclaimed
            </span>
            <h1 className="mt-6 max-w-5xl bg-gradient-to-br from-white to-slate-400 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-6xl lg:text-7xl dark:from-[#ffffff] dark:to-[#94a3b8]">
              Every rupee mapped, <span className="bg-gradient-to-r from-[#99f6e4] to-cyan-300 bg-clip-text text-transparent">and found</span> by your family.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg">
              Asset Bridge is a financial twin across RBI, EPFO, IRDAI, SEBI, LIC, NPS and India Post. It fixes nominee gaps while you're alive, and hands your heirs everything — with the exact paperwork for your state — when it matters.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={demo} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-[#04201d] shadow-[0_8px_30px_-6px_rgba(45,212,191,.6)] transition hover:bg-teal-300 disabled:opacity-60">
                Try the live demo <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#how" className="inline-flex items-center rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10">See how it works</a>
            </div>
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

      {/* ---------- Live panels ---------- */}
      <section id="live" className="scroll-mt-20 border-y border-slate-200/70 bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <Eyebrow>Live demo data</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{sc ? `${sc.persona.name.split(' ')[0]}'s twin, at a glance.` : 'A twin, at a glance.'}</h2>
            <p className="mt-3 max-w-2xl text-slate-600">These panels are read straight from the demo, not mocked. Open it and every number is one click deeper.</p>
          </Reveal>
          {sc && (
            <Reveal delay={120} className="mt-12">
              <StackedPanels
                panels={[
                  {
                    label: 'Holdings mapped', value: String(sc.holdings), icon: <Wallet className="h-3.5 w-3.5" />,
                    body: (
                      <>
                        <div className="text-4xl font-extrabold tracking-tight text-ink">{inrShort(sc.summary.total)}</div>
                        <div className="text-sm text-slate-500">across {sc.sources} sources</div>
                        <div className="mt-4 flex flex-wrap gap-1.5">{sc.regulators.map((r) => <RegChip key={r.code} code={r.code} />)}</div>
                      </>
                    ),
                  },
                  {
                    label: 'Nominee gaps', value: String(sc.alerts.total), icon: <Radio className="h-3.5 w-3.5" />,
                    body: (
                      <ul className="space-y-2 text-sm">
                        {Object.entries(sc.alerts.byKind).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => (
                          <li key={k} className="flex items-center gap-3">
                            <span className="flex-1 text-slate-600">{KIND_LABEL[k] ?? k}</span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, (v / Math.max(...Object.values(sc.alerts.byKind))) * 100)}%` }} /></div>
                            <span className="w-4 text-right font-semibold tabular-nums text-ink">{v}</span>
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                  {
                    label: 'Idle money', value: inrShort(sc.idle), icon: <Hourglass className="h-3.5 w-3.5" />,
                    body: (
                      <>
                        <div className="text-4xl font-extrabold tracking-tight text-ink">{inrShort(sc.idle)}</div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">Inoperative and unclaimed accounts earn little or nothing. After 10 years, bank deposits move to the RBI's DEA Fund — still claimable, but slower.</p>
                      </>
                    ),
                  },
                  {
                    label: 'Chance of success', value: `${Math.round(sc.life.successRate * 100)}%`, icon: <Compass className="h-3.5 w-3.5" />,
                    body: (
                      <div className="flex items-center gap-4">
                        <DetentDial readOnly label="Success" min={0} max={100} step={2} size={130} value={Math.round(sc.life.successRate * 100)} formatValue={(v) => `${v}%`} />
                        <p className="text-sm leading-relaxed text-slate-600">{sc.life.runs} simulated markets. Median {inrShort(sc.life.retireMedian)} at retirement ({sc.life.retireAge}).</p>
                      </div>
                    ),
                  },
                  {
                    label: 'Family receives today', value: inrShort(sc.life.legacyToday), icon: <HeartHandshake className="h-3.5 w-3.5" />,
                    body: (
                      <>
                        <div className="text-4xl font-extrabold tracking-tight text-ink">{inrShort(sc.life.legacyToday)}</div>
                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${sc.nominees.coverage * 100}%` }} /></div>
                        <p className="mt-2 text-sm text-slate-600">{Math.round(sc.nominees.coverage * 100)}% reaches them through a nominee; {sc.nominees.missing} holdings have none.</p>
                      </>
                    ),
                  },
                ]}
              />
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 to-night p-8 text-white sm:p-12">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-teal-400/20 blur-3xl" />
            <h2 className="relative max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">See your family's twin in two minutes.</h2>
            <p className="relative mt-3 max-w-xl text-white/75">No real accounts needed — the demo walks through verify, alerts, a death event and the full transfer checklist.</p>
            <div className="relative mt-8 flex flex-wrap gap-3">
              <button onClick={demo} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-[#04201d] transition hover:bg-teal-300">Try the live demo <ArrowRight className="h-4 w-4" /></button>
              <Link to="/signup" className="inline-flex items-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/15">Create my twin</Link>
              <Link to="/heir" className="inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold text-white/80 transition hover:text-white">I'm an heir →</Link>
            </div>
            <div className="relative mt-10 border-t border-white/10 pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-white/50">Built with</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['React 19', 'TypeScript', 'Tailwind v4', 'Motion', 'Node + Express', 'WebSockets', 'FastAPI', 'RAG', 'Monte Carlo', 'Kokonut UI', 'Aceternity UI'].map((t) => (
                  <span key={t} className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs text-white/85 ring-1 ring-white/10">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
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
