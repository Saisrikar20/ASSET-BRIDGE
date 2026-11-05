/**
 * Asset Bridge Ultra-Minimal Line Logo
 * 
 * Twin flowing financial / horizon wave paths crossed by an unbroken diagonal bridge span,
 * signifying asset recovery, succession, and estate unification.
 * Matched to official palette (Midnight Navy #101D2B / Warm White #F5F3ED / Muted Teal #55C6B0).
 */

export const BRIDGE_SVG_PATH =
  'M10.5 23.7L20.9 8.3M3.8 14.6C6.6 12.9 10.6 12.7 15.7 13.4M19.0 13.6C21.5 13.8 25.0 13.1 28.2 11.8M3.8 18.8C6.6 17.1 10.6 16.9 13.6 17.3M16.8 17.7C19.3 18.0 25.0 17.3 28.2 16.1';
export const BRIDGE_PATH = BRIDGE_SVG_PATH;
export const LOTUS_PATH = BRIDGE_SVG_PATH;

interface LogoMarkProps {
  className?: string;
  onDark?: boolean;
}

export default function LogoMark({ className = 'h-7 w-7', onDark = false }: LogoMarkProps) {
  const strokeColor = onDark ? '#F5F3ED' : '#101D2B';
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Asset Bridge"
    >
      <path
        d={BRIDGE_SVG_PATH}
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
