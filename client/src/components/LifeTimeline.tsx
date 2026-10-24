// "Life at a glance": your lifespan as a dial with one ring per family member,
// coloured by life phase, and a window you turn round it to inspect a year.
// Geometry, ring lighting, rolling digits and the ring-glyph list follow the
// Kokonut UI Time Zone Planner (MIT, https://kokonutui.com) — here the dial is
// a lifetime instead of a day.
import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { FamilyMember, LifeRow, Milestone } from '../lib/api';
import { inrShort } from '../lib/format';
import { cx } from './ui';

const SIZE = 340;
const C = SIZE / 2;
const R_OUT = 134;
const R_IN = 60;
const RING_GAP = 4;
const WEDGE_IN = R_IN - 7;
const WEDGE_OUT = R_OUT + 6;
const LABEL_R = 154;
const TAU = Math.PI * 2;
const EDGE_GRAB = 0.9; // years either side of a window edge that grab the edge
const MAX_SPAN = 10;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Kind = 'early' | 'school' | 'college' | 'work' | 'retired' | 'none';
const KIND_BASE: Record<Kind, string> = {
  early: 'fill-slate-100',
  school: 'fill-sky-500/20',
  college: 'fill-indigo-500/20',
  work: 'fill-emerald-500/20',
  retired: 'fill-amber-500/20',
  none: 'fill-transparent',
};
const KIND_LIT: Record<Kind, string> = {
  early: 'fill-slate-300',
  school: 'fill-sky-500',
  college: 'fill-indigo-500',
  work: 'fill-emerald-500',
  retired: 'fill-amber-500',
  none: 'fill-transparent',
};
const KIND_DOT: Record<Kind, string> = { early: 'bg-slate-300', school: 'bg-sky-500', college: 'bg-indigo-500', work: 'bg-emerald-500', retired: 'bg-amber-500', none: 'bg-slate-200' };
const KIND_TEXT: Record<Kind, string> = { early: 'text-slate-500', school: 'text-sky-600', college: 'text-indigo-600', work: 'text-emerald-600', retired: 'text-amber-600', none: 'text-slate-400' };
const KIND_LABEL: Record<Kind, string> = { early: 'Early years', school: 'School', college: 'College', work: 'Working', retired: 'Retired', none: '—' };

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface Person extends Pick<FamilyMember, 'name' | 'relation' | 'age'> { you?: boolean; retireAge: number }

function phase(age: number, retireAge: number, you: boolean): Kind {
  if (age > 100) return 'none';
  if (!you) {
    if (age < 5) return 'early';
    if (age < 18) return 'school';
    if (age < 23) return 'college';
  }
  return age < retireAge ? 'work' : 'retired';
}

export interface LifeTimelineProps {
  age0: number;
  lifeExpectancy: number;
  people: Person[];
  milestones: Milestone[];
  rows: LifeRow[];
  real: boolean;
  /** Your age at the start of the window, and its length in years. */
  start: number;
  span: number;
  onChange: (start: number, span: number) => void;
  onFindBest: () => void;
  /** undefined: not searched yet · null: no age reaches 85% */
  best: { age: number; rate: number } | null | 'searching' | undefined;
  onApplyBest: () => void;
  onOpenYear: (age: number) => void;
}

export default function LifeTimeline({ age0, lifeExpectancy, people, milestones, rows, real, start, span, onChange, onFindBest, best, onApplyBest, onOpenYear }: LifeTimelineProps) {
  const L = Math.max(1, lifeExpectancy - age0 + 1); // years shown round the dial
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const grab = useRef<{ mode: 'move' | 'start' | 'end'; offset: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);

  const u0 = start - age0; // window start in dial units (years from today)
  const s = useSpring(u0, { stiffness: 380, damping: 36 });
  const w = useSpring(span, { stiffness: 380, damping: 36 });
  useEffect(() => s.set(u0), [u0, s]);
  useEffect(() => w.set(span), [span, w]);

  const polar = (r: number, u: number) => {
    const a = (u / L) * TAU;
    return [round(C + r * Math.sin(a)), round(C - r * Math.cos(a))] as const;
  };
  const slice = (r0: number, r1: number, from: number, to: number) => {
    const large = to - from > L / 2 ? 1 : 0;
    const [ax, ay] = polar(r1, from);
    const [bx, by] = polar(r1, to);
    const [cx2, cy2] = polar(r0, to);
    const [dx, dy] = polar(r0, from);
    return `M ${ax} ${ay} A ${r1} ${r1} 0 ${large} 1 ${bx} ${by} L ${cx2} ${cy2} A ${r0} ${r0} 0 ${large} 0 ${dx} ${dy} Z`;
  };
  const wedge = useTransform([s, w], ([a, b]: number[]) => slice(WEDGE_IN, WEDGE_OUT, a, a + b));
  const sx = useTransform(s, (a) => polar(WEDGE_OUT, a)[0]);
  const sy = useTransform(s, (a) => polar(WEDGE_OUT, a)[1]);
  const ex = useTransform([s, w], ([a, b]: number[]) => polar(WEDGE_OUT, a + b)[0]);
  const ey = useTransform([s, w], ([a, b]: number[]) => polar(WEDGE_OUT, a + b)[1]);

  const ring = (i: number) => {
    const width = (R_OUT - R_IN - RING_GAP * (people.length - 1)) / people.length;
    const outer = R_OUT - i * (width + RING_GAP);
    return { outer, inner: outer - width };
  };

  // Each person's life phases as segments in dial units, merged across years.
  const segments = useMemo(
    () =>
      people.map((p) => {
        const out: { from: number; to: number; kind: Kind }[] = [];
        for (let u = 0; u < L; u++) {
          const kind = phase(p.age + u, p.retireAge, !!p.you);
          const last = out.at(-1);
          if (last && last.kind === kind) last.to = u + 1;
          else out.push({ from: u, to: u + 1, kind });
        }
        return out;
      }),
    [people, L],
  );

  const msAt = (age: number) => milestones.filter((m) => (m.every ? age >= m.age && age <= (m.until ?? 200) && (age - m.age) % m.every === 0 : m.age === age));
  const msMarks = useMemo(() => {
    const out: { u: number; names: string[] }[] = [];
    for (let u = 0; u < L; u++) {
      const hits = msAt(age0 + u);
      if (hits.length) out.push({ u: u + 0.5, names: hits.map((m) => m.name) });
    }
    return out;
  }, [milestones, L, age0]);

  // ---------- interaction ----------
  const unitsAt = (e: PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const a = (Math.atan2(dx, -dy) + TAU) % TAU;
    return (a / TAU) * L;
  };
  const commit = (st: number, sp: number) => {
    const sp2 = clamp(Math.round(sp), 1, MAX_SPAN);
    const st2 = clamp(Math.round(st), 0, L - sp2);
    if (st2 !== u0 || sp2 !== span) onChange(age0 + st2, sp2);
  };
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const u = unitsAt(e);
    const end = u0 + span;
    const mode = Math.abs(u - u0) < EDGE_GRAB ? 'start' : Math.abs(u - end) < EDGE_GRAB ? 'end' : 'move';
    // Clicking outside the window jumps it there, centred on the click.
    const inside = u >= u0 && u <= end;
    if (mode === 'move' && !inside) commit(u - span / 2, span);
    grab.current = { mode, offset: inside ? u - u0 : span / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const g = grab.current;
    if (!g) return;
    const u = unitsAt(e);
    if (g.mode === 'move') commit(u - g.offset, span);
    else if (g.mode === 'end') commit(u0, u - u0);
    else commit(u, u0 + span - u);
  };
  const onUp = () => {
    grab.current = null;
    setDragging(false);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key === 'Home') commit(0, span);
    else if (e.key === 'End') commit(L - span, span);
    else if (e.key in step) commit(u0 + step[e.key], span);
    else return;
    e.preventDefault();
  };

  // ---------- readouts ----------
  const endAge = start + span - 1;
  const year0 = new Date().getFullYear() + (start - age0);
  const kinds = people.map((p) => phase(p.age + u0, p.retireAge, !!p.you));
  const windowRows = rows.filter((r) => r.age >= start && r.age <= endAge);
  const last = windowRows.at(-1);
  const defl = (r: LifeRow | undefined, v: number) => (r && real ? v / r.price : v);
  const sum = (f: (r: LifeRow) => number) => windowRows.reduce((t, r) => t + defl(r, f(r)), 0);
  const events = [...new Set(windowRows.flatMap((r) => r.milestones.map((m) => `${m.name} · ${r.age}`)))];
  const earning = kinds.filter((k) => k === 'work').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">Life at a glance</h2>
          <p className="text-xs text-slate-500">Ages {age0}–{lifeExpectancy} · {people.length} {people.length === 1 ? 'person' : 'people'} · drag the window round the dial</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {best && best !== 'searching' && (
            <button onClick={onApplyBest} className="h-8 cursor-pointer rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
              Retire at {best.age} → {Math.round(best.rate * 100)}%
            </button>
          )}
          <button onClick={onFindBest} disabled={best === 'searching'} className="h-8 cursor-pointer rounded-lg px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-900/10 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-default disabled:text-slate-400">
            {best === 'searching' ? 'Searching…' : best === null ? 'No age reaches 85%' : 'Find best retirement age'}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-6">
        <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={cx('size-full touch-none select-none overflow-visible', dragging ? 'cursor-grabbing' : 'cursor-grab')}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}><motion.path d={wedge} /></clipPath>
            </defs>

            {/* Age marks round the rim: a label every 5 years of your age, ticks between */}
            {Array.from({ length: L + 1 }, (_, u) => {
              const age = age0 + u;
              if (u < 1.5 || u > L - 1.5) return null; // keep clear of "Now" at the top
              if (age % 5 === 0) {
                const [x, y] = polar(LABEL_R, u);
                return <text key={u} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-[9.5px] font-medium tabular-nums">{age}</text>;
              }
              const [x0, y0] = polar(R_OUT + 11, u);
              const [x1, y1] = polar(R_OUT + 15, u);
              return <line key={u} x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-slate-300" strokeWidth={1} />;
            })}
            {(() => { const [x, y] = polar(LABEL_R, 0); return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[9.5px] font-semibold">Now</text>; })()}

            {/* Rings: dim everywhere, lit inside the window */}
            {people.map((_, i) => {
              const { outer, inner } = ring(i);
              return (
                <g key={i} className={cx('transition-opacity duration-150', focus !== null && focus !== i && 'opacity-40')}>
                  {segments[i].map((sg) => <path key={sg.from} d={slice(inner, outer, sg.from, sg.to)} className={KIND_BASE[sg.kind]} />)}
                  <g clipPath={`url(#${clipId})`}>
                    {segments[i].map((sg) => <path key={sg.from} d={slice(inner, outer, sg.from, sg.to)} className={KIND_LIT[sg.kind]} />)}
                  </g>
                </g>
              );
            })}

            {/* Milestones on the rim */}
            {msMarks.map((m) => {
              const [x, y] = polar(R_OUT + 6, m.u);
              return <circle key={m.u} cx={x} cy={y} r={2.5} className="fill-orange-500"><title>{m.names.join(', ')}</title></circle>;
            })}

            <motion.path d={wedge} className="fill-slate-900/[0.03] stroke-slate-900" strokeWidth={1.5} strokeLinejoin="round" />
            <motion.circle cx={sx} cy={sy} r={4.5} className="fill-surface stroke-slate-900" strokeWidth={1.5} />
            <motion.circle cx={ex} cy={ey} r={4.5} className="fill-surface stroke-slate-900" strokeWidth={1.5} />
          </svg>

          <div
            role="slider"
            tabIndex={0}
            aria-label="Year of your life plan"
            aria-valuemin={age0}
            aria-valuemax={lifeExpectancy}
            aria-valuenow={start}
            aria-valuetext={`Age ${start}${span > 1 ? ` to ${endAge}` : ''}, ${earning} of ${people.length} of working age`}
            onKeyDown={onKey}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center outline-none"
          >
            <span className="text-[11px] leading-none text-slate-500">{span > 1 ? 'Ages' : 'Age'}</span>
            <span className="mt-1 text-[22px] font-semibold leading-none tracking-tight text-slate-900"><Rolling value={span > 1 ? `${start}–${endAge}` : String(start)} /></span>
            <span className="mt-1 text-[11px] leading-none text-slate-500"><Rolling value={span > 1 ? `${year0}–${year0 + span - 1}` : String(year0)} /></span>
            <span className="mt-2 flex gap-1">
              {kinds.map((k, i) => <span key={i} className={cx('size-1.5 rounded-full transition-colors duration-200', KIND_DOT[k])} />)}
            </span>
          </div>
        </div>

        <div>
          <ul className="flex flex-col">
            {people.map((p, i) => {
              const k = kinds[i];
              return (
                <li
                  key={p.name + i}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus(i)}
                  onPointerLeave={() => setFocus(null)}
                  className={cx('flex items-center gap-3 border-b border-slate-900/5 py-2 transition-opacity duration-150 last:border-b-0', focus !== null && focus !== i && 'opacity-45')}
                >
                  <RingGlyph index={i} count={people.length} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="truncate text-[13px] font-medium leading-5 text-slate-900">{p.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{p.you ? 'You' : p.relation}</span>
                    </span>
                    <span className="truncate text-[11px] leading-4 text-slate-500">{p.you ? `retires at ${p.retireAge}` : `${p.age} today`}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[12px] leading-5 text-slate-700"><Rolling value={`Age ${p.age + u0}`} /></span>
                    <span className={cx('text-[11px] leading-4 transition-colors duration-150', KIND_TEXT[k])}>{k === 'work' && !p.you ? 'Working age' : KIND_LABEL[k]}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
            <div><div className="text-[11px] text-slate-500">Net worth {span > 1 ? 'at end' : ''}</div><div className="text-sm font-semibold text-ink">{last ? inrShort(defl(last, last.netWorth)) : '—'}</div></div>
            <div><div className="text-[11px] text-slate-500">Income</div><div className="text-sm font-semibold text-ink">{inrShort(sum((r) => r.grossIncome))}</div></div>
            <div><div className="text-[11px] text-slate-500">Spending</div><div className="text-sm font-semibold text-ink">{inrShort(sum((r) => r.expenseTotal + r.milestoneTotal))}</div></div>
          </div>
          {events.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-orange-700">
              {events.map((e) => <li key={e}>● {e}</li>)}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-900/5 pt-3 text-xs">
        <span className="text-slate-500">Window</span>
        <div className="flex items-center rounded-lg ring-1 ring-slate-900/10">
          <StepButton label="Shorter" disabled={span <= 1} onClick={() => commit(u0, span - 1)}>−</StepButton>
          <span className="min-w-16 text-center tabular-nums text-slate-700">{span} {span === 1 ? 'year' : 'years'}</span>
          <StepButton label="Longer" disabled={span >= MAX_SPAN || u0 + span >= L} onClick={() => commit(u0, span + 1)}>+</StepButton>
        </div>
        <button onClick={() => onOpenYear(start)} className="cursor-pointer font-medium text-brand-700 hover:underline">Cash flow for age {start} →</button>
        <span className="ml-auto text-slate-500">
          <span className="font-medium tabular-nums text-slate-900">{earning}</span> of {people.length} of working age
          {real && <span className="text-slate-400"> · today's ₹</span>}
        </span>
      </footer>
    </div>
  );
}

/** Each digit rolls on its own wheel; separators sit still. */
function Rolling({ value }: { value: string }) {
  const chars = value.split('');
  return (
    <span aria-hidden="true" className="inline-flex h-[1.25em] align-top tabular-nums leading-[1.25em]">
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!/\d/.test(ch)) return <span key={`s${key}`} className="whitespace-pre">{ch}</span>;
        return (
          <span key={`d${key}`} className="relative inline-block h-[1.25em] overflow-hidden leading-[1.25em]">
            <span className="invisible">0</span>
            <span className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none" style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>
              {DIGITS.map((d) => <span key={d} className="block h-[1.25em] leading-[1.25em]">{d}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function RingGlyph({ index, count }: { index: number; count: number }) {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16">
      {Array.from({ length: count }, (_, i) => {
        const r = 7 - (i * 4.5) / Math.max(1, count - 1);
        return <circle key={r} cx={8} cy={8} r={r} fill="none" className={i === index ? 'stroke-slate-900' : 'stroke-slate-200'} strokeWidth={i === index ? 1.5 : 1} />;
      })}
    </svg>
  );
}

function StepButton({ children, label, disabled, onClick }: { children: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick} className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-sm text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-default disabled:text-slate-300">
      {children}
    </button>
  );
}
