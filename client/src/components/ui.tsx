import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { GlowingEffect } from './aceternity/glowing-effect';
import { REG_STYLE } from '../lib/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Logo({ light = false, size = 'md' }: { light?: boolean; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className={box} aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#0f766e'} />
        <path d="M5 21h22M8 21v-4M24 21v-4M5 17c4-7 18-7 22 0M12 21v-6.5M16 21v-7.5M20 21v-6.5" stroke={light ? '#0f766e' : '#fff'} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <span className={cx('font-extrabold tracking-tight', size === 'lg' ? 'text-2xl' : 'text-lg', light ? 'text-white' : 'text-ink')}>
        Asset<span className={light ? 'text-[#ccfbf1]' : 'text-brand-700'}>Bridge</span>
      </span>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; size?: 'sm' | 'md' };
export function Button({ variant = 'primary', loading, size = 'md', className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
    secondary: 'bg-surface text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  }[variant];
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer', size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm', styles, className)}
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
  return <div className={cx('rounded-2xl border border-slate-200 bg-surface shadow-sm', className)}>{children}</div>;
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

const inputCls = 'w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'amber' | 'red' | 'teal' | 'blue'; children: ReactNode }) {
  const t = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    teal: 'bg-brand-50 text-brand-700 ring-brand-100',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
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
