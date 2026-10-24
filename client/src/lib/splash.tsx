import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoSplash from '../components/LogoSplash';

/** Open the app behind a logo splash: runs `task` (which returns where to go), then fades in the destination. */
type Go = (task: () => Promise<string>) => Promise<void>;
const Ctx = createContext<Go>(async () => {});

const MIN_MS = 1100; // long enough to register the brand, short enough not to annoy
const FADE_MS = 550;

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
        // Fade the splash out over whatever is now on screen (or the page it started on, on error).
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
      {phase !== 'idle' && <LogoSplash leaving={phase === 'leaving'} />}
    </Ctx.Provider>
  );
}

export const useSplash = () => useContext(Ctx);
