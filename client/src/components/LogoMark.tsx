import { useId } from 'react';

/**
 * The Asset Bridge mark: a dove whose wing and legs form a bridge, carrying a
 * heart-shaped key to a keyhole. `onDark` lightens the navy parts so they
 * read on dark backgrounds. Drawn on a 64×48 grid.
 */
export default function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const id = useId().replace(/:/g, '');
  const navy = onDark ? '#93c5fd' : '#1e3a8a';
  const g = `${id}g`;
  const w = `${id}w`;
  const k = `${id}k`;
  return (
    <svg viewBox="2 1 57 42" className={className} role="img" aria-label="Asset Bridge">
      <defs>
        <linearGradient id={g} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={onDark ? '#3b82f6' : '#1e3a8a'} />
          <stop offset=".45" stopColor="#2563eb" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id={w} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={onDark ? '#3b82f6' : '#1d4ed8'} />
          <stop offset=".6" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <linearGradient id={k} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2b25a" />
          <stop offset="1" stopColor="#b8862e" />
        </linearGradient>
      </defs>
      {/* bridge: left arch, right leg, footings */}
      <path d="M5 40C7 31 14 25.5 24.5 24L27 28C18.5 29.5 13.8 33.5 12.4 40Z" fill={`url(#${g})`} />
      <path d="M41 27L49 40H42.5L36.5 29.5Z" fill="#2fb5c9" />
      <path d="M3 41.2H13.5M41.5 41.2H52" stroke={navy} strokeWidth="1.4" strokeLinecap="round" />
      {/* dove: body and head, then the raised wing */}
      <path d="M22 23C28 19 35 17 42 17C44.5 13.8 48.5 12.6 52 14L57 14.4L53.3 16.4C52 23 45.5 28.6 36 28.6C29.5 28.6 25 26.5 22 23Z" fill={`url(#${g})`} />
      <path d="M35 19.5C31 11.5 23 5.5 11 3.5C14.5 8.5 16.5 13.5 17.5 20.5C23 19 29 18.6 35 19.5Z" fill={`url(#${w})`} />
      <path d="M15 7.5C20 10 24 14 26.5 19M19.5 6.2C25 8.6 29.5 12.6 31.8 18.6" stroke="#dff4ff" strokeWidth=".7" fill="none" opacity=".75" strokeLinecap="round" />
      <path d="M17.5 37C22 31.5 28 30.2 33.5 31" stroke={navy} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* keyhole and heart key */}
      <circle cx="30.2" cy="22.2" r="1.3" fill={`url(#${k})`} />
      <path d="M29.6 22.8L29.2 25.6H31.2L30.8 22.8Z" fill={`url(#${k})`} />
      <path d="M40 22.9C38.2 21.4 36.4 19.9 36.4 18.2C36.4 16.9 37.4 16 38.5 16C39.2 16 39.7 16.4 40 16.9C40.3 16.4 40.8 16 41.5 16C42.6 16 43.6 16.9 43.6 18.2C43.6 19.9 41.8 21.4 40 22.9Z" fill="none" stroke={`url(#${k})`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M39.4 23.4L31.6 41.2" stroke={`url(#${k})`} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M33.4 37.1L36.2 38.3M32.5 39.2L34.6 40.1M34.3 35L36.4 35.9" stroke={`url(#${k})`} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
