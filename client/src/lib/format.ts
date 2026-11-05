export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function inrShort(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
}

export const date = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const time = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const REG_STYLE: Record<string, { dot: string; bg: string; text: string; bar: string }> = {
  RBI: { dot: 'bg-[#1C3041]', bg: 'bg-[#1C3041]/10', text: 'text-[#1C3041]', bar: 'bg-[#1C3041]' },
  EPFO: { dot: 'bg-[#C58B3C]', bg: 'bg-[#C58B3C]/10', text: 'text-[#C58B3C]', bar: 'bg-[#C58B3C]' },
  IRDAI: { dot: 'bg-[#C45D5D]', bg: 'bg-[#C45D5D]/10', text: 'text-[#C45D5D]', bar: 'bg-[#C45D5D]' },
  SEBI: { dot: 'bg-[#55C6B0]', bg: 'bg-[#55C6B0]/15', text: 'text-[#101D2B]', bar: 'bg-[#55C6B0]' },
  LIC: { dot: 'bg-[#34765B]', bg: 'bg-[#34765B]/10', text: 'text-[#34765B]', bar: 'bg-[#34765B]' },
  PFRDA: { dot: 'bg-[#101D2B]', bg: 'bg-[#101D2B]/10', text: 'text-[#101D2B]', bar: 'bg-[#101D2B]' },
  DOP: { dot: 'bg-[#D5C5A1]', bg: 'bg-[#D5C5A1]/20', text: 'text-[#17232E]', bar: 'bg-[#D5C5A1]' },
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
