import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cx } from '../components/ui';

type Theme = 'light' | 'dark';
const KEY = 'ab_theme';

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked — fall back to the OS */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// One theme for the whole page, shared by every toggle.
let current: Theme = initial();
const listeners = new Set<() => void>();
function setTheme(t: Theme) {
  current = t;
  document.documentElement.classList.toggle('dark', t === 'dark');
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
  );
  return [theme, () => setTheme(current === 'dark' ? 'light' : 'dark')] as const;
}

/** Sun/moon switch. `onDark` styles it for the dark sidebar. */
export function ThemeToggle({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-xs font-medium transition',
        onDark
          ? 'text-white/90 hover:bg-white/10 hover:text-white'
          : 'text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
        className,
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
