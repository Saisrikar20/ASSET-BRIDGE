/**
 * Asset Bridge Ultra-Minimal Line Symbol
 * 
 * An intentional, line-based vector symbol representing multiple financial paths
 * converging and connecting across a unified structural bridge.
 */

export const BRIDGE_SVG_PATH = 'M5 23L11 13H21L27 23M4 17H28M16 13V17';
export const BRIDGE_PATH = BRIDGE_SVG_PATH;
export const LOTUS_PATH = BRIDGE_SVG_PATH;

interface LogoMarkProps {
  className?: string;
  onDark?: boolean;
}

export default function LogoMark({ className = 'h-7 w-7', onDark = false }: LogoMarkProps) {
  const strokeColor = onDark ? '#E9E0CC' : '#244B3C';
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Asset Bridge"
    >
      {/* Intentional Line Bridge: Twin converging paths united across horizontal span */}
      <path
        d="M5 23L11 13H21L27 23"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17H28"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 13V17"
        stroke={onDark ? '#A8B7A1' : '#244B3C'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
