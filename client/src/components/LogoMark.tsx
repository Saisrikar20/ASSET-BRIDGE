/**
 * Asset Bridge Minimal Geometric Identity Mark
 * 
 * Distinctive geometric architectural symbol representing financial consolidation 
 * and connection across a unified ledger bridge.
 */

export const BRIDGE_PATH =
  'M16 5L19.5 9.5L16 14L12.5 9.5ZM4 25L11 9H14.5L7.5 25H4ZM28 25L21 9H17.5L24.5 25H28Z';

export const LOTUS_PATH = BRIDGE_PATH;

interface LogoMarkProps {
  className?: string;
  onDark?: boolean;
}

export default function LogoMark({ className = 'h-8 w-8', onDark = false }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Asset Bridge"
    >
      {/* Central Keystone Nexus — The unified financial core */}
      <path
        d="M16 5L19.5 9.5L16 14L12.5 9.5Z"
        className={onDark ? 'fill-sky-400' : 'fill-blue-600 dark:fill-sky-400'}
      />

      {/* Left Structural Pier Span */}
      <path
        d="M4 25L11 9H14.5L7.5 25H4Z"
        className={onDark ? 'fill-white' : 'fill-slate-900 dark:fill-slate-100'}
      />

      {/* Right Structural Pier Span */}
      <path
        d="M28 25L21 9H17.5L24.5 25H28Z"
        className={onDark ? 'fill-white' : 'fill-slate-900 dark:fill-slate-100'}
      />

      {/* Connecting Bridge Deck — Uniting multiple financial institutions */}
      <rect
        x="3"
        y="16.5"
        width="26"
        height="2.5"
        rx="1.25"
        className={onDark ? 'fill-slate-200' : 'fill-slate-800 dark:fill-slate-200'}
      />

      {/* Tension Arch — Structural foundation */}
      <path
        d="M9 25C11 20.5 21 20.5 23 25H25C22.5 19 9.5 19 7 25H9Z"
        className={onDark ? 'fill-white/40' : 'fill-slate-400 dark:fill-slate-500'}
      />
    </svg>
  );
}
