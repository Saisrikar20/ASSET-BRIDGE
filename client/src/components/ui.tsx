import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { GlowingEffect } from './aceternity/glowing-effect';
import { Link, useLocation } from 'react-router-dom';
import LogoMark from './LogoMark';
import { REG_STYLE } from '../lib/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Mark + serif wordmark; `tagline` adds "Recovering family legacy" (shown on the large size). */
export function Logo({ light = false, size = 'md', tagline = size === 'lg', onClick }: { light?: boolean; size?: 'md' | 'lg'; tagline?: boolean; onClick?: () => void }) {
  const lg = size === 'lg';
  const { pathname } = useLocation();
  return (
    // Always leads home; on the home page it scrolls back to the top instead.
    <Link
      to="/"
      aria-label="Asset Bridge home"
      onClick={() => {
        if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
        onClick?.();
      }}
      className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <LogoMark onDark={light} className={cx('shrink-0', lg ? 'h-12 w-[65px]' : 'h-8 w-[43px]')} />
      <div className="leading-none">
        <div className={cx('font-display font-bold whitespace-nowrap', lg ? 'text-[1.9rem] tracking-[0.06em]' : 'text-[1.12rem] tracking-[0.04em]', light ? 'text-white' : 'text-[#17181a] dark:text-ink')}>ASSET BRIDGE</div>
        {tagline && <div className={cx('mt-1 font-medium whitespace-nowrap', lg ? 'text-[10.5px] tracking-[0.28em]' : 'text-[8px] tracking-[0.2em]', light ? 'text-[#b9d3f5]' : 'text-[#17181a]/80 dark:text-slate-500')}>RECOVERING FAMILY LEGACY</div>}
      </div>
    </Link>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; size?: 'sm' | 'md' };
export function Button({ variant = 'primary', loading, size = 'md', className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
    secondary: 'bg-surface text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  }[variant];
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer', size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm', styles, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A card wrapped in a border that glows toward the pointer (Aceternity Glowing Effect). */
export function GlowCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="relative h-full rounded-[1.25rem] border border-slate-200 p-1.5">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className={cx('relative h-full rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-slate-200/70', className)}>{children}</div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface shadow-sm', className)}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/30';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'amber' | 'red' | 'teal' | 'blue'; children: ReactNode }) {
  const t = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    green: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40',
    red: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-800/40',
    teal: 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-brand-100 dark:ring-brand-800/40',
    blue: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800/40',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-transparent', t)}>{children}</span>;
}

export function RegChip({ code }: { code: string }) {
  const s = REG_STYLE[code];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold', s.bg, s.text)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {code}
    </span>
  );
}

export function PageHeader({ step, title, subtitle, action }: { step?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {step && <div className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-700">{step}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNote({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-700">{icon}</div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/* ==========================================================================
   Centralized Non-Blocking Toast Notification System (future.md Â§1.3)
   ========================================================================== */

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  detail?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'> & { id?: string }) => string;
  success: (title: string, detail?: string, action?: ToastAction) => string;
  warning: (title: string, detail?: string, action?: ToastAction) => string;
  error: (title: string, detail?: string, action?: ToastAction) => string;
  info: (title: string, detail?: string, action?: ToastAction) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      toast: (t) => { console.log('[Toast]', t); return 'mock'; },
      success: (t, d) => { console.log('[Toast Success]', t, d); return 'mock'; },
      warning: (t, d) => { console.warn('[Toast Warn]', t, d); return 'mock'; },
      error: (t, d) => { console.error('[Toast Error]', t, d); return 'mock'; },
      info: (t, d) => { console.info('[Toast Info]', t, d); return 'mock'; },
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ id, title, detail, variant = 'info', action, duration = 4000 }: Omit<ToastItem, 'id'> & { id?: string }) => {
      const toastId = id || Math.random().toString(36).slice(2, 9);
      const item: ToastItem = { id: toastId, title, detail, variant, action, duration };

      setToasts((prev) => [...prev.slice(-3), item]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(toastId);
        }, duration);
      }
      return toastId;
    },
    [dismiss]
  );

  const success = useCallback((title: string, detail?: string, action?: ToastAction) => toast({ title, detail, variant: 'success', action }), [toast]);
  const warning = useCallback((title: string, detail?: string, action?: ToastAction) => toast({ title, detail, variant: 'warning', action }), [toast]);
  const error = useCallback((title: string, detail?: string, action?: ToastAction) => toast({ title, detail, variant: 'error', action, duration: 6000 }), [toast]);
  const info = useCallback((title: string, detail?: string, action?: ToastAction) => toast({ title, detail, variant: 'info', action }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, warning, error, info, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-88 max-w-[calc(100vw-2.5rem)] flex-col gap-2.5 pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const variantStyles = {
            success: 'border-emerald-200/80 bg-surface dark:border-emerald-800/60 shadow-emerald-950/5',
            warning: 'border-amber-200/80 bg-surface dark:border-amber-800/60 shadow-amber-950/5',
            error: 'border-rose-200/80 bg-surface dark:border-rose-800/60 shadow-rose-950/5',
            info: 'border-brand-200/80 bg-surface dark:border-brand-800/60 shadow-brand-950/5',
          }[t.variant || 'info'];

          const icon = {
            success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
            warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
            error: <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />,
            info: <Info className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />,
          }[t.variant || 'info'];

          return (
            <div
              key={t.id}
              className={cx(
                'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3',
                variantStyles
              )}
              role="alert"
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{t.title}</div>
                {t.detail && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">{t.detail}</div>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 inline-flex items-center text-xs font-bold text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    {t.action.label} â†’
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
