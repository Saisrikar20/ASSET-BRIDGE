// Indian personal income tax, FY 2025-26 rules (Budget 2025).
// Slabs are indexed to inflation for future years — real slabs only move
// when the Budget revises them, so this approximates periodic revisions.
// Not modelled: capital-gains tax on investments, marginal relief on surcharge,
// HRA and other exemptions.

const NEW_SLABS = [
  [400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3],
];
const oldSlabs = (age) => {
  const basic = age >= 80 ? 500000 : age >= 60 ? 300000 : 250000;
  return [[basic, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]];
};

function slabTax(income, slabs, k) {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    const u = upper * k;
    if (income > lower) tax += (Math.min(income, u) - lower) * rate;
    lower = u;
  }
  return tax;
}

function surcharge(tax, income, regime, k) {
  const steps = [[5e7, 0.37], [2e7, 0.25], [1e7, 0.15], [5e6, 0.1]];
  for (const [limit, rate] of steps) {
    if (income > limit * k) return tax * (regime === 'new' ? Math.min(rate, 0.25) : rate);
  }
  return 0;
}

/**
 * @param {{salary?:number, pension?:number, rental?:number, other?:number}} inc annual, nominal ₹
 * @param {{regime:'new'|'old', age:number, k:number, d80c?:number, d80ccd1b?:number, otherDeductions?:number}} o
 *   k = inflation index applied to slabs and limits (1 today)
 */
export function incomeTax(inc, o) {
  const { regime = 'new', age = 40, k = 1 } = o;
  const salaried = (inc.salary || 0) + (inc.pension || 0);
  const std = salaried > 0 ? Math.min(salaried, (regime === 'new' ? 75000 : 50000) * k) : 0;
  const rental = (inc.rental || 0) * 0.7; // 30% standard deduction on house property
  const gross = salaried + (inc.rental || 0) + (inc.other || 0);
  let deductions = std + (inc.rental || 0) * 0.3;
  if (regime === 'old') {
    deductions += Math.min(o.d80c || 0, 150000 * k) + Math.min(o.d80ccd1b || 0, 50000 * k) + (o.otherDeductions || 0);
  }
  const taxable = Math.max(0, salaried - std + rental + (inc.other || 0) - (regime === 'old' ? deductions - std - (inc.rental || 0) * 0.3 : 0));

  let tax = slabTax(taxable, regime === 'new' ? NEW_SLABS : oldSlabs(age), k);
  // Section 87A rebate
  if (regime === 'new') {
    if (taxable <= 1200000 * k) tax = 0;
    else tax = Math.min(tax, taxable - 1200000 * k); // marginal relief just above ₹12 L
  } else if (taxable <= 500000 * k) tax = 0;

  tax += surcharge(tax, taxable, regime, k);
  const cess = tax * 0.04;
  const total = Math.round(tax + cess);
  return { gross: Math.round(gross), deductions: Math.round(deductions), taxable: Math.round(taxable), tax: total, effectiveRate: gross ? total / gross : 0 };
}
