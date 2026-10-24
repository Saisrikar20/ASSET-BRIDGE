// "See your family's twin in two minutes": three steps, each with a small
// product mock, joined by a connector that draws itself when the section
// scrolls into view; the steps light up one after another.
import { useEffect, useRef, useState } from 'react';
import { Check, Radio } from 'lucide-react';
import { RegChip, cx } from '../ui';

const STEP_MS = 650; // delay between steps lighting up

export default function TwoMinutes() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0); // how many steps are lit (0–3)

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setLit(3);
    let timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        timers = [1, 2, 3].map((n) => setTimeout(() => setLit(n), 150 + (n - 1) * STEP_MS));
      },
      { rootMargin: '0px 0px -30% 0px' }, // fire once the section is well into view, however tall it is
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const steps = [
    {
      title: 'Verify who you are',
      time: '≈ 30 s',
      body: 'Fill the demo identity. Asset Bridge cross-checks your name and date of birth with RBI, EPFO, IRDAI, SEBI, LIC, NPS and India Post.',
      visual: (on: boolean) => (
        <div className="space-y-2">
          {[
            ['RBI', 'Bank deposits'],
            ['EPFO', 'Provident fund'],
            ['LIC', 'Policies'],
          ].map(([code, what], i) => (
            <div key={code} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-slate-200">
              <RegChip code={code} />
              <span className="flex-1 truncate text-sm text-slate-600">{what}</span>
              <span
                className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all duration-500', on ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400')}
                style={{ transitionDelay: on ? `${i * 160}ms` : '0ms' }}
              >
                <Check className="h-3 w-3" /> {on ? 'Matched' : 'Checking'}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Approve one consent',
      time: '≈ 20 s',
      body: 'One Account-Aggregator-style consent: you see the purpose, what is fetched and for how long — and you can revoke it any time.',
      visual: (on: boolean) => (
        <div className="space-y-2 font-mono text-[12px]">
          {[
            ['purpose', 'succession plan'],
            ['regulators', '7 of 7'],
            ['data_life', '1 year'],
          ].map(([k, v], i) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <span className="truncate rounded-lg bg-surface px-2.5 py-2 text-slate-600 ring-1 ring-slate-200">{k}</span>
              <span className={cx('text-slate-400 transition-colors duration-500', on && 'text-brand-600')} style={{ transitionDelay: `${i * 160}ms` }}>→</span>
              <span
                className={cx('truncate rounded-lg px-2.5 py-2 ring-1 transition-all duration-500', on ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-surface text-slate-400 ring-slate-200')}
                style={{ transitionDelay: on ? `${i * 160}ms` : '0ms' }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Watch it come alive',
      time: '≈ 60 s',
      body: 'Holdings land, nominee gaps stream in as live alerts, and your life plan, legacy and the heirs’ checklist are ready to explore.',
      visual: (on: boolean) => (
        <div className="rounded-xl bg-surface p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink">
            <span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-brand-600" /> Live alerts</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <span className="relative flex size-1.5">
                {on && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />}
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {[
              ['No nominee on fixed deposit', 'bg-rose-500'],
              ['Unclaimed: Canara Bank', 'bg-rose-500'],
              ['Minor nominee, no guardian', 'bg-amber-500'],
            ].map(([t, dot], i) => (
              <li
                key={t}
                className={cx('flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 transition-all duration-500', on ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0')}
                style={{ transitionDelay: on ? `${200 + i * 220}ms` : '0ms' }}
              >
                <span className={cx('size-1.5 rounded-full', dot)} />
                <span className="truncate text-slate-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div ref={ref}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">See your family's twin in two minutes.</h2>
        <p className="mt-4 text-slate-600">No real accounts needed. Three steps take you from a name to a living map of everything your family would inherit — and what's at risk.</p>
      </div>

      <div className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
        {/* The connector: draws left to right through the numbered steps (desktop). */}
        <svg className="pointer-events-none absolute top-[14.625rem] right-[16%] left-[16%] hidden h-2 md:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden="true">
          <line x1="0" y1="1" x2="100" y2="1" className="stroke-slate-200" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="4 6" />
          <line
            x1="0" y1="1" x2="100" y2="1"
            className="stroke-brand-500"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="100"
            style={{ strokeDashoffset: lit >= 3 ? 0 : lit === 2 ? 50 : 100, transition: `stroke-dashoffset ${STEP_MS}ms ease-in-out` }}
          />
        </svg>

        {steps.map((s, i) => {
          const on = lit > i;
          return (
            <div key={s.title} className="relative flex flex-col">
              <div className={cx('h-48 rounded-2xl bg-slate-100/80 p-4 ring-1 transition-colors duration-500', on ? 'ring-brand-500/40' : 'ring-slate-200')}>{s.visual(on)}</div>
              <div className="mt-6 flex items-center gap-3 md:justify-center">
                <span
                  className={cx(
                    'relative z-10 grid size-11 place-items-center rounded-full text-sm font-bold ring-4 ring-surface transition-all duration-500',
                    on ? 'scale-100 bg-brand-600 text-white shadow-[0_0_0_6px_rgba(20,184,166,.18)]' : 'scale-95 bg-surface text-slate-400',
                  )}
                >
                  {i + 1}
                </span>
                <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-500 md:hidden', on ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>{s.time}</span>
              </div>
              <div className="mt-4 md:text-center">
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  {s.title}
                  <span className={cx('ml-2 hidden rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold transition-colors duration-500 md:inline', on ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>{s.time}</span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
