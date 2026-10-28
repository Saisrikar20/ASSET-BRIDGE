import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import CircuitTransition, { CIRCUIT_MS } from '../components/CircuitTransition';

/** Open the app through the circuit-board transition: runs `task` (which returns where to go) while the circuit plays, shows the destination underneath, then lifts the overlay. */
type Go = (task: () => Promise<string>) => Promise<void>;
const Ctx = createContext<Go>(async () => {});

const MIN_MS = CIRCUIT_MS; // the circuit finishes, then the destination renders underneath
const FADE_MS = 600; // scale-and-blur out, plus a beat

export function SplashProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'flying' | 'leaving'>('idle');
  const running = useRef(false);

  const go = useCallback<Go>(
    async (task) => {
      if (running.current) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nav(await task());
        return;
      }
      running.current = true;
      setPhase('flying');
      const started = performance.now();
      try {
        const to = await task();
        await new Promise((r) => setTimeout(r, Math.max(0, MIN_MS - (performance.now() - started))));
        nav(to);
      } finally {
        // Lift the overlay off whatever is now on screen (or the page it started on, on error).
        setPhase('leaving');
        setTimeout(() => {
          setPhase('idle');
          running.current = false;
        }, FADE_MS);
      }
    },
    [nav],
  );

  return (
    <Ctx.Provider value={go}>
      {children}
      {phase !== 'idle' && <CircuitTransition leaving={phase === 'leaving'} />}
    </Ctx.Provider>
  );
}

export const useSplash = () => useContext(Ctx);
