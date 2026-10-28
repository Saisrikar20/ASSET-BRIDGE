// Lamp Effect — adapted from Aceternity UI (https://ui.aceternity.com/components/lamp-effect).
// Local changes: teal light; the cover/mask layers use a fixed background colour
// (the app's dark mode remaps slate-950); conic gradients are written inline so
// no Tailwind config extension is needed; the light is drawn as a backdrop and
// the caller places content right under the bar.
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const BG = '#081629';
const LIGHT = '#f0652f';
const BEAM = '#d64511';
const grow = { delay: 0.3, duration: 0.8, ease: 'easeInOut' } as const;

/** The lamp itself. Its bar sits `barTop` from the top of the parent. */
export function Lamp({ className, barTop = 128 }: { className?: string; barTop?: number }) {
  // Laid out round the lamp's centre line (`mid`) as in the original; its
  // scale-y-125 puts the bar 7rem × 1.25 = 140px above that line.
  const mid = barTop + 140;
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 top-0 isolate z-0 overflow-hidden', className)} style={{ height: mid + 260 }}>
      <div className="absolute inset-x-0 flex scale-y-125 items-center justify-center" style={{ top: mid - 112, height: 224 }}>
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '42rem' }}
          transition={grow}
          style={{ backgroundImage: `conic-gradient(from 70deg at center top, ${BEAM}, transparent, transparent)` }}
          className="absolute inset-auto right-1/2 h-56 w-[42rem] overflow-visible"
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full [mask-image:linear-gradient(to_top,white,transparent)]" style={{ background: BG }} />
          <div className="absolute bottom-0 left-0 z-20 h-full w-40 [mask-image:linear-gradient(to_right,white,transparent)]" style={{ background: BG }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '42rem' }}
          transition={grow}
          style={{ backgroundImage: `conic-gradient(from 290deg at center top, transparent, transparent, ${BEAM})` }}
          className="absolute inset-auto left-1/2 h-56 w-[42rem]"
        >
          <div className="absolute right-0 bottom-0 z-20 h-full w-40 [mask-image:linear-gradient(to_left,white,transparent)]" style={{ background: BG }} />
          <div className="absolute right-0 bottom-0 z-20 h-40 w-full [mask-image:linear-gradient(to_top,white,transparent)]" style={{ background: BG }} />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 blur-2xl" style={{ background: BG }} />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-[40rem] -translate-y-1/2 rounded-full opacity-50 blur-3xl" style={{ background: BEAM }} />
        <motion.div
          initial={{ width: '8rem' }}
          whileInView={{ width: '24rem' }}
          transition={grow}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full blur-2xl"
          style={{ background: LIGHT }}
        />
        <motion.div
          initial={{ width: '15rem' }}
          whileInView={{ width: '42rem' }}
          transition={grow}
          className="absolute inset-auto z-50 h-0.5 w-[42rem] -translate-y-[7rem]"
          style={{ background: LIGHT }}
        />
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem]" style={{ background: BG }} />
      </div>
    </div>
  );
}

export const LAMP_BG = BG;
