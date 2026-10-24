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
};
