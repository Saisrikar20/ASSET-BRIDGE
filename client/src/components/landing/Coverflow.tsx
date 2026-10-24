// 3D coverflow of capability cards: arrows, keys, drag/swipe, and autoplay that
// pauses while the pointer is over it.
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../ui';

export interface FlowCard { title: string; tagline: string; points: string[]; example: string; icon: ReactNode; gradient: string }

export default function Coverflow({ cards }: { cards: FlowCard[] }) {
  const [index, setIndex] = useState(Math.floor(cards.length / 2));
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const n = cards.length;
  const go = (i: number) => setIndex(((i % n) + n) % n);

  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 4200);
    return () => clearInterval(t);
  }, [paused, n]);

  const onDown = (e: PointerEvent) => (drag.current = { x: e.clientX, moved: false });
  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className="select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Capabilities"
    >
      <div className="relative h-[25rem] touch-pan-y [perspective:1400px]" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
        {cards.map((c, i) => {
          // Shortest signed distance round the ring, so it loops.
          let d = i - index;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const ad = Math.abs(d);
          return (
            <article
              key={c.title}
              onClick={() => d !== 0 && go(i)}
              aria-hidden={d !== 0}
              className={cx(
                'absolute top-0 left-1/2 flex h-[23rem] w-[min(21rem,80vw)] flex-col rounded-3xl p-6 text-white shadow-2xl ring-1 ring-white/15 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]',
                c.gradient,
                d !== 0 && 'cursor-pointer',
              )}
              style={{
                transform: `translateX(calc(-50% + ${d * 62}%)) rotateY(${-d * 32}deg) scale(${1 - ad * 0.12})`,
                zIndex: 10 - ad,
                opacity: ad > 2 ? 0 : 1 - ad * 0.22,
                filter: ad ? `brightness(${1 - ad * 0.18})` : undefined,
                pointerEvents: ad > 2 ? 'none' : undefined,
              }}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-white/70">
                <span>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
                <span>ASSET BRIDGE</span>
              </div>
              <div className="mt-5 grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">{c.icon}</div>
              <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{c.tagline}</p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-white/90">
                {c.points.map((p) => <li key={p} className="flex gap-2"><span className="text-white/60">→</span>{p}</li>)}
              </ul>
              <div className="mt-auto rounded-xl bg-black/25 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10">{c.example}</div>
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={() => go(index - 1)} aria-label="Previous" className="grid size-9 cursor-pointer place-items-center rounded-full ring-1 ring-slate-300 transition hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-48 text-center">
          <div className="font-semibold text-ink">{cards[index].title}</div>
          <div className="text-xs text-slate-500">{index + 1} of {n}</div>
        </div>
        <button onClick={() => go(index + 1)} aria-label="Next" className="grid size-9 cursor-pointer place-items-center rounded-full ring-1 ring-slate-300 transition hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
