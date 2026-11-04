import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import BridgeTransition, { BRIDGE_TRANSITION_MS } from '../components/BridgeTransition';

/** Open the app through the Asset Bridge transition: runs `task` (which returns destination route) while the bridge animation plays, navigates, then lifts the overlay. */
type Go = (task: () => Promise<string>) => Promise<void>;
const Ctx = createContext<Go>(async () => {});

const MIN_MS = BRIDGE_TRANSITION_MS;
const FADE_MS = 400;

export function SplashProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'flying' | 'leaving'>('idle');
  const running = useRef(false);

  const go = useCallback<Go>(
    async (task) => {
      if (running.current) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const to = await task();
        nav(to);
        return;
      }
      running.current = true;
      setPhase('flying');
      const started = performance.now();
      try {
        const to = await task();
        const elapsed = performance.now() - started;
        if (elapsed < MIN_MS) {
          await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
        }
        nav(to);
      } finally {
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
      {phase !== 'idle' && <BridgeTransition leaving={phase === 'leaving'} />}
    </Ctx.Provider>
  );
}

export const useSplash = () => useContext(Ctx);
