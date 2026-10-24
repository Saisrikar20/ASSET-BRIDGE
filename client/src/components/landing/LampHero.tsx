// Hero: the Aceternity lamp with the headline centred directly under its bar,
// then the three steps with live numbers; the lit step cycles on its own.
import { useEffect, useState, type ReactNode } from 'react';
import { Lamp, LAMP_BG } from '../aceternity/lamp';
import { cx } from '../ui';

export interface HeroStep { kicker: string; title: string; body: string }

const BAR_TOP = 72;

export default function LampHero({ steps, children }: { steps: HeroStep[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (hover !== null || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 3400);
    return () => clearInterval(t);
  }, [hover, steps.length]);
  const lit = hover ?? active;

  return (
    <div className="relative overflow-hidden border-b border-white/10 text-white" style={{ background: LAMP_BG }}>
      <Lamp barTop={BAR_TOP} />
      <div className="relative z-10 flex flex-col items-center px-6 text-center" style={{ paddingTop: BAR_TOP + 36 }}>
        {children}
      </div>
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 pt-16 pb-16 sm:grid-cols-3 sm:px-10">
        {steps.map((s, i) => (
          <button
            key={s.title}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => setActive(i)}
            className={cx('relative flex cursor-pointer flex-col items-center self-start rounded-2xl px-4 py-4 text-center transition duration-500', lit === i ? 'bg-white/[0.04] opacity-100 ring-1 ring-white/10' : 'opacity-50 hover:opacity-80')}
          >
            <span className={cx('absolute -top-px left-1/2 h-px -translate-x-1/2 bg-[#2dd4bf] shadow-[0_0_12px_2px_rgba(45,212,191,.6)] transition-all duration-500', lit === i ? 'w-2/3 opacity-100' : 'w-0 opacity-0')} />
            <div className={cx('text-xs font-semibold tabular-nums transition-colors duration-500', lit === i ? 'text-[#5eead4]' : 'text-white/60')}>{s.kicker}</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{s.title}</div>
            <p className="mx-auto mt-2 max-w-80 text-sm leading-relaxed text-white/70">{s.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
