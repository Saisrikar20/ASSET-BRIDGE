import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, FileCheck2, HeartHandshake, Layers, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button, Logo, RegChip } from '../components/ui';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';

const PILLARS = [
  { n: '01', icon: ShieldCheck, title: 'Verify', body: "Cross-check identity and holdings against every regulator's records." },
  { n: '02', icon: Layers, title: 'Aggregate', body: 'Consent-based mapping of accounts across banks, EPF, insurance and mutual funds.' },
  { n: '03', icon: Bell, title: 'Alert', body: 'Flag missing or outdated nominees before they become irreversible.' },
  { n: '04', icon: HeartHandshake, title: 'Reunite', body: 'Connect verified heirs to everything on record after death.' },
  { n: '05', icon: FileCheck2, title: 'Transfer', body: 'Guide families through state-specific succession paperwork, end to end.' },
];

const STATS = [
  { v: '67,004', l: 'Unclaimed bank deposits', r: 'RBI' },
  { v: '9,330', l: 'Inoperative EPF accounts', r: 'EPFO' },
  { v: '5,564', l: 'Unclaimed LIC funds', r: 'LIC' },
  { v: '3,749', l: 'Unclaimed mutual funds', r: 'SEBI' },
];

export default function Landing() {
  const { user, setSession } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/heir" className="hidden px-3 text-sm font-semibold text-slate-600 hover:text-ink sm:block">I'm an heir</Link>
          {user ? (
            <Button onClick={() => nav('/app')}>Open my twin</Button>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
              <Link to="/signup"><Button>Get started</Button></Link>
            </>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-100),transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              ₹94,000+ crore of Indian families' money sits unclaimed
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              A financial twin that makes sure <span className="text-brand-700">nothing gets left behind.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Asset Bridge maps your holdings across RBI, EPFO, IRDAI, SEBI and LIC while you're alive — and reunites your family with all of it after,
              replacing a multi-month chase across five bureaucracies with one guided process.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={demo} loading={busy} className="px-5 py-3 text-base">
                Try the live demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/signup"><Button variant="secondary" className="px-5 py-3 text-base">Create my twin</Button></Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['RBI', 'EPFO', 'IRDAI', 'SEBI', 'LIC', 'PFRDA', 'DOP'].map((r) => <RegChip key={r} code={r} />)}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-brand-800 to-ink p-6 text-white shadow-2xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-100/70">Unclaimed today · ₹ crore</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {STATS.map((s) => (
                  <div key={s.l} className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-extrabold">{s.v}</div>
                    <div className="mt-1 text-xs text-brand-100/80">{s.l}</div>
                    <div className="mt-2 text-[10px] font-bold tracking-wider text-brand-100/60">{s.r}</div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-brand-100/80">
                Five regulators that were never required to share data. When someone dies, nothing connects their death to their money.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">One process instead of five bureaucracies</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Even the best-performing major bank reclaims only 3.76% of its own unclaimed deposits. Search alone doesn't work — the link between a person, their money and their heirs has to exist <em>before</em> it's needed.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map(({ n, icon: Icon, title, body }) => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-700"><Icon className="h-5 w-5" /></div>
                  <span className="text-xs font-bold text-slate-300">{n}</span>
                </div>
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 text-center">
          <h2 className="text-2xl font-bold text-ink">Lost someone? Start here.</h2>
          <p className="text-slate-600">If a family member set up Asset Bridge, you'll have received a case ID. Open it with your PAN to see everything they left and the exact paperwork for your state.</p>
          <Link to="/heir"><Button variant="secondary">Open an estate case <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-500">
        Asset Bridge · Prototype — regulator data is simulated. Consent model follows India's RBI-regulated Account Aggregator framework.
      </footer>
    </div>
  );
}
