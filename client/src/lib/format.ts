export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function inrShort(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
}

export const date = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const time = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const REG_STYLE: Record<string, { dot: string; bg: string; text: string; bar: string }> = {
  RBI: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  EPFO: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  IRDAI: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  SEBI: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
  LIC: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  PFRDA: { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
  DOP: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
};

// Chart series colours by asset class — fixed order, validated for CVD separation.
export const CLASS_COLOR: Record<string, string> = {
  equity: 'var(--series-1)',
  debt: 'var(--series-2)',
  pension: 'var(--series-3)',
  gold: 'var(--series-4)',
  cash: 'var(--series-5)',
};
export const CLASS_ORDER = ['equity', 'debt', 'pension', 'gold', 'cash'] as const;
