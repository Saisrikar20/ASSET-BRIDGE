// Single Unified Asset Bridge Identity (Midnight Navy & Warm White)
// There is ONE visual mode only.
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
  try {
    localStorage.removeItem('ab_theme');
  } catch {}
}

export function useTheme() {
  return ['light', () => {}] as const;
}

export function ThemeToggle(_props: { onDark?: boolean; className?: string }) {
  return null;
}
