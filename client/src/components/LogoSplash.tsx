// Brief brand moment between clicking into the demo and the dashboard:
// the mark and wordmark settle in, then fade away over the app.
import LogoMark from './LogoMark';
import { cx } from './ui';

export default function LogoSplash({ leaving }: { leaving: boolean }) {
  return (
    <div
      role="status"
      aria-label="Opening Asset Bridge"
      className={cx('fixed inset-0 z-[100] grid place-items-center bg-slate-50 transition-opacity duration-500 ease-out', leaving ? 'pointer-events-none opacity-0' : 'opacity-100')}
    >
      <div className="flex flex-col items-center motion-safe:animate-[splash-in_700ms_cubic-bezier(0.23,1,0.32,1)_both]">
        <LogoMark className="h-24 w-[130px] sm:h-28 sm:w-[152px]" />
        <div className="mt-5 font-display text-4xl font-bold tracking-[0.06em] text-[#1f2d4d] sm:text-5xl dark:text-ink">ASSET BRIDGE</div>
        <div className="mt-2 text-[11px] font-medium tracking-[0.32em] text-[#1f2d4d]/70 dark:text-slate-500">RECOVERING FAMILY LEGACY</div>
        <div className="mt-8 h-0.5 w-24 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 rounded-full bg-brand-600 motion-safe:animate-[splash-bar_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
