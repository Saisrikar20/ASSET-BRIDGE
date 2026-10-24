// "Built with" as an integration map: the Asset Bridge mark at the hub, the
// front end on an inner ring and the engine on an outer one, both slowly
// orbiting, with signals running down the spokes into the hub.
import { useState, type ComponentType } from 'react';
import { Atom, BookOpen, Component, Dices, FileCode2, Lamp, Radio, Server, Sparkles, Wind, Zap } from 'lucide-react';
import LogoMark from '../LogoMark';
import { cx } from '../ui';

interface Node { name: string; role: string; icon: ComponentType<{ className?: string }> }

const INNER: Node[] = [
  { name: 'React 19', role: 'Every screen, the router and app state.', icon: Atom },
  { name: 'TypeScript', role: 'Typed end to end — the API contract lives in lib/api.ts.', icon: FileCode2 },
  { name: 'Tailwind v4', role: 'All styling, and the token-remapped dark mode.', icon: Wind },
  { name: 'Motion', role: 'The dials, avatar morphs, lamp and scroll reveals.', icon: Sparkles },
];
const OUTER: Node[] = [
  { name: 'Node + Express', role: 'The REST API: verify, consent, alerts, cases, life plan.', icon: Server },
  { name: 'WebSockets', role: 'Nominee-gap alerts pushed to every open tab, live.', icon: Radio },
  { name: 'FastAPI', role: 'The AI succession guide service.', icon: Zap },
  { name: 'RAG guide', role: 'BM25 over state succession rules — every answer cited.', icon: BookOpen },
  { name: 'Monte Carlo', role: '1,000 market paths, Indian income tax and legacy.', icon: Dices },
  { name: 'Kokonut UI', role: 'The detent dials and the avatar picker.', icon: Component },
  { name: 'Aceternity UI', role: 'The lamp hero and the glowing cards.', icon: Lamp },
];

const R_IN = 27; // ring radii, % of the square
const R_OUT = 44;
const DOTS = [
  [12, 18], [86, 24], [8, 72], [90, 80], [52, 6], [30, 94], [72, 58], [20, 46],
];

const at = (r: number, i: number, n: number, offset: number) => {
  const a = ((i / n) * 360 + offset) * (Math.PI / 180);
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
};

export default function BuiltWith() {
  const [hover, setHover] = useState<Node | null>(null);
  const total = INNER.length + OUTER.length;

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div>
        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">Built with</span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Every layer, wired into one twin.</h2>
        <p className="mt-3 max-w-xl text-slate-600">
          A React front end and a Node engine meet in one place: the family's financial twin. Verification, consent, live alerts, a cited AI guide and a 1,000-path life simulator all feed the same record — and the whole API can even run inside your browser.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.18)]" />
          {total} building blocks, one twin
        </div>
        <div className="mt-6 min-h-[4.5rem] rounded-2xl bg-slate-100/70 p-4 text-sm" aria-live="polite">
          {hover ? (
            <>
              <div className="font-semibold text-ink">{hover.name}</div>
              <div className="mt-0.5 text-slate-600">{hover.role}</div>
            </>
          ) : (
            <div className="text-slate-500">Hover a node to see what it does in Asset Bridge.</div>
          )}
        </div>
      </div>

      <div className="group/orbit relative mx-auto aspect-square w-full max-w-[600px] select-none">
        {/* rings */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="50" cy="50" r={R_OUT} fill="none" className="stroke-slate-200" strokeWidth="0.25" />
          <circle cx="50" cy="50" r={R_IN} fill="none" className="stroke-slate-200" strokeWidth="0.25" strokeDasharray="0.8 1.2" />
          <circle cx="50" cy="50" r="15" fill="none" className="stroke-brand-500/30" strokeWidth="0.25" />
        </svg>

        {/* drifting specks */}
        {DOTS.map(([x, y], i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute size-1 rounded-full bg-slate-300 motion-safe:animate-[drift_9s_ease-in-out_infinite]"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 1.3}s` }}
          />
        ))}

        <Ring nodes={OUTER} r={R_OUT} offset={-90} spin="motion-safe:animate-[orbit_120s_linear_infinite]" counter="motion-safe:animate-[orbit-rev_120s_linear_infinite]" hover={hover} setHover={setHover} />
        <Ring nodes={INNER} r={R_IN} offset={-45} spin="motion-safe:animate-[orbit-rev_90s_linear_infinite]" counter="motion-safe:animate-[orbit_90s_linear_infinite]" hover={hover} setHover={setHover} small />

        {/* hub */}
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface shadow-xl ring-1 ring-slate-200 sm:size-28 sm:rounded-3xl">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-brand-500/20 blur-2xl" />
            <LogoMark className="h-8 w-[43px] sm:h-14 sm:w-[76px]" />
          </div>
          <span className="mt-3 hidden rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-[0.25em] text-slate-500 sm:inline">ASSET BRIDGE</span>
        </div>
      </div>
    </div>
  );
}

function Ring({ nodes, r, offset, spin, counter, hover, setHover, small }: { nodes: Node[]; r: number; offset: number; spin: string; counter: string; hover: Node | null; setHover: (n: Node | null) => void; small?: boolean }) {
  return (
    <div className={cx('pointer-events-none absolute inset-0', spin, 'group-hover/orbit:[animation-play-state:paused]')}>
      {/* Ring layers are click-through so one ring never covers the other's nodes. */}
      {/* spokes and the signals running along them */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {nodes.map((n, i) => {
          const p = at(r, i, nodes.length, offset);
          const lit = hover?.name === n.name;
          const d = `M${p.x} ${p.y} L50 50`;
          return (
            <g key={n.name}>
              <path d={d} className={lit ? 'stroke-brand-500' : 'stroke-slate-200'} strokeWidth={lit ? 0.45 : 0.22} strokeDasharray={lit ? undefined : '0.6 1.4'} />
              <circle r={lit ? 0.9 : 0.55} className="fill-brand-500">
                <animateMotion dur={`${2.6 + (i % 3) * 0.7}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur={`${2.6 + (i % 3) * 0.7}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const p = at(r, i, nodes.length, offset);
        const Icon = n.icon;
        const lit = hover?.name === n.name;
        return (
          <div key={n.name} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {/* counter-rotate so tiles and labels stay upright while the ring turns */}
            <div className={cx('flex flex-col items-center', counter, 'group-hover/orbit:[animation-play-state:paused]')}>
              <button
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                aria-label={`${n.name}: ${n.role}`}
                className={cx(
                  'grid cursor-default place-items-center rounded-2xl bg-surface shadow-md ring-1 transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  small ? 'size-11 sm:size-12' : 'size-12 sm:size-14',
                  lit ? 'scale-110 text-brand-700 ring-brand-500' : 'text-slate-700 ring-slate-200',
                )}
              >
                <Icon className={small ? 'h-5 w-5' : 'h-5 w-5 sm:h-6 sm:w-6'} />
              </button>
              <span className={cx('mt-1.5 text-[10px] font-medium whitespace-nowrap sm:text-[11px]', lit ? 'text-brand-700' : 'text-slate-500')}>{n.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
