import { useEffect, useRef } from 'react';
import LogoMark from './LogoMark';

export const BRIDGE_TRANSITION_MS = 850;

interface BridgeTransitionProps {
  leaving: boolean;
}

export default function BridgeTransition({ leaving }: BridgeTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Safety fallback: ensure overflow is hidden during overlay and restored cleanly
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#081629] transition-all duration-400 ease-out select-none ${
        leaving ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="status"
      aria-label="Connecting your financial twin"
    >
      {/* Background architectural grid lines */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Centerpiece Convergence Graphic */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Converging Vector Network */}
        <div className="relative w-80 h-32 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 320 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="streamLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="streamRight" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Left Institutional Data Streams (Banking, EPFO, IRDAI) */}
            <path
              d="M 20 34 H 90 C 110 34 125 54 140 64"
              stroke="url(#streamLeft)"
              strokeWidth="1.2"
              className="animate-[dash_0.8s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />
            <path
              d="M 10 64 H 140"
              stroke="url(#streamLeft)"
              strokeWidth="1.5"
              className="animate-[dash_0.75s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />
            <path
              d="M 20 94 H 90 C 110 94 125 74 140 64"
              stroke="url(#streamLeft)"
              strokeWidth="1.2"
              className="animate-[dash_0.8s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />

            {/* Right Institutional Data Streams (SEBI, PFRDA, DOP) */}
            <path
              d="M 300 34 H 230 C 210 34 195 54 180 64"
              stroke="url(#streamRight)"
              strokeWidth="1.2"
              className="animate-[dash_0.8s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />
            <path
              d="M 310 64 H 180"
              stroke="url(#streamRight)"
              strokeWidth="1.5"
              className="animate-[dash_0.75s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />
            <path
              d="M 300 94 H 230 C 210 94 195 74 180 64"
              stroke="url(#streamRight)"
              strokeWidth="1.2"
              className="animate-[dash_0.8s_ease-out_forwards]"
              strokeDasharray="160"
              strokeDashoffset="160"
            />

            {/* Subtle Pulse Particles Gliding Along The Spans */}
            <circle cx="115" cy="52" r="2" fill="#38bdf8" className="animate-ping" style={{ animationDuration: '1.2s' }} />
            <circle cx="205" cy="52" r="2" fill="#38bdf8" className="animate-ping" style={{ animationDuration: '1.2s' }} />
          </svg>

          {/* Central Logo Mark in Calm Glow */}
          <div className="relative z-10 flex items-center justify-center p-3 rounded-2xl bg-[#0e2747]/90 border border-sky-500/20 shadow-lg shadow-sky-950/40">
            <LogoMark onDark className="h-10 w-[54px]" />
          </div>
        </div>

        {/* Narrative Hierarchy */}
        <div className="mt-4 text-center space-y-1.5">
          <p className="text-sm font-medium tracking-tight text-slate-100">
            Bringing your financial world together
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-sky-400/90 tracking-wide">
            <span>7 Regulators</span>
            <span>·</span>
            <span>Zero Duplicates</span>
            <span>·</span>
            <span>DPDP Consent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

