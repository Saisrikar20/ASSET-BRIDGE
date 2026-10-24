// A list of live metrics beside a fanned deck of panels; picking one (or
// waiting) brings its panel to the front.
import { useEffect, useState, type ReactNode } from 'react';
import { cx } from '../ui';

export interface Panel { label: string; value: string; icon: ReactNode; body: ReactNode }

export default function StackedPanels({ panels }: { panels: Panel[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = panels.length;

  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 3800);
    return () => clearInterval(t);
  }, [paused, n]);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ul className="space-y-2">
        {panels.map((p, i) => (
          <li key={p.label}>
            <button
              onClick={() => setActive(i)}
              className={cx(
                'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition',
                active === i ? 'bg-brand-50 ring-brand-500' : 'bg-surface ring-slate-200 hover:ring-slate-300',
              )}
            >
              <span className={cx('grid size-7 place-items-center rounded-lg', active === i ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{p.icon}</span>
              <span className="flex-1 font-medium text-ink">{p.label}</span>
              <span className="font-semibold tabular-nums text-ink">{p.value}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="relative mx-auto h-[22rem] w-full max-w-md">
        {panels.map((p, i) => {
          // Depth behind the active card, wrapping round.
          const depth = (i - active + n) % n;
          return (
            <div
              key={p.label}
              onClick={() => setActive(i)}
              className={cx(
                'absolute inset-x-0 bottom-0 h-[18rem] rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-slate-200 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]',
                depth !== 0 && 'cursor-pointer',
              )}
              style={{
                transform: `translate(${depth * 22}px, ${-depth * 30}px) scale(${1 - depth * 0.06}) rotate(${depth * 1.5}deg)`,
                zIndex: n - depth,
                opacity: depth > 3 ? 0 : 1 - depth * 0.12,
              }}
              aria-hidden={depth !== 0}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="grid size-6 place-items-center rounded-md bg-brand-50 text-brand-700">{p.icon}</span>
                {p.label}
              </div>
              <div className={cx('mt-4 transition-opacity duration-500', depth === 0 ? 'opacity-100' : 'opacity-0')}>{p.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
