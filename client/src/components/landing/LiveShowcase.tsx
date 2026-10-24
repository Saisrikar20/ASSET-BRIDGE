// Tabbed showcase of the demo twin: each tab is a row of data cards joined by
// connectors that glides sideways on a loop (pauses on hover), and switching
// tabs swaps the whole row.
import { useEffect, useState, type ReactNode } from 'react';
import { cx } from '../ui';

export interface ShowcaseCard { key: string; node: ReactNode }
export interface ShowcaseTab { id: string; label: string; cards: ShowcaseCard[] }

export default function LiveShowcase({ tabs }: { tabs: ShowcaseTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [shown, setShown] = useState(active);
  const [swapping, setSwapping] = useState(false);
  const tab = tabs.find((t) => t.id === shown) ?? tabs[0];

  // Fade the old row out, swap, fade the new one in.
  useEffect(() => {
    if (active === shown) return;
    setSwapping(true);
    const t = setTimeout(() => {
      setShown(active);
      setSwapping(false);
    }, 220);
    return () => clearTimeout(t);
  }, [active, shown]);

  if (!tab) return null;
  // Two copies make the loop seamless; speed scales with the number of cards.
  const loop = [...tab.cards, ...tab.cards];
  const seconds = tab.cards.length * 7;

  return (
    <div>
      <div role="tablist" aria-label="Demo twin views" className="mx-auto flex w-fit gap-1 rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cx(
              'cursor-pointer rounded-xl px-5 py-2 text-sm font-semibold transition',
              active === t.id ? 'bg-surface text-ink shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="group/rail relative mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        <div
          key={tab.id}
          className={cx(
            'flex w-max items-center py-2 transition-opacity duration-200 motion-safe:animate-[marquee_var(--dur)_linear_infinite] group-hover/rail:[animation-play-state:paused] motion-reduce:w-full motion-reduce:overflow-x-auto',
            swapping ? 'opacity-0' : 'opacity-100',
          )}
          style={{ ['--dur' as string]: `${seconds}s` }}
        >
          {loop.map((c, i) => (
            <div key={`${c.key}-${i}`} className="flex items-center" aria-hidden={i >= tab.cards.length}>
              <div className="w-[17.5rem] shrink-0 rounded-[1.75rem] bg-slate-100 p-2 ring-1 ring-slate-200 sm:w-72">{c.node}</div>
              <Connector />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex w-14 shrink-0 items-center" aria-hidden="true">
      <span className="size-2 rounded-full bg-[#2dd4bf] shadow-[0_0_0_3px_rgba(45,212,191,.2)]" />
      <span className="h-px flex-1 border-t border-dashed border-slate-300" />
      <span className="size-2 rounded-full bg-[#2dd4bf] shadow-[0_0_0_3px_rgba(45,212,191,.2)]" />
    </div>
  );
}
