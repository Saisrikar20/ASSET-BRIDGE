// Catalog of Indian investment options for the planner. Returns are
// indicative long-run assumptions (small-savings rates are reset quarterly
// by the government; market-linked returns are not guaranteed) and every
// figure is editable in the forecast.

export const ASSET_CLASSES = {
  equity: { label: 'Equity' },
  debt: { label: 'Debt & fixed income' },
  pension: { label: 'Pension (NPS)' },
  gold: { label: 'Gold' },
  cash: { label: 'Cash' },
};

// Long-run return assumptions by class and scenario (% p.a.).
export const SCENARIOS = {
  conservative: { label: 'Conservative', equity: 9, pension: 8, gold: 6, debtDelta: -0.5, cash: 2.5 },
  base: { label: 'Base', equity: 11, pension: 9.5, gold: 8, debtDelta: 0, cash: 3 },
  optimistic: { label: 'Optimistic', equity: 13, pension: 11, gold: 10, debtDelta: 0.25, cash: 3.5 },
};

export const OPTIONS = [
  // ---- Government-backed small savings & retirement ----
  { id: 'ppf', name: 'Public Provident Fund (PPF)', regulator: 'DOP', class: 'debt', rate: 7.1, rateKind: 'fixed', risk: 'Low', lockIn: '15 years (partial withdrawal from year 7)', tax: 'EEE — 80C deduction (old regime), tax-free interest & maturity', min: '₹500 / year', maxMonthly: 12500, mode: 'monthly', govt: true, bestFor: 'Long-term tax-free savings' },
  { id: 'vpf', name: 'Voluntary Provident Fund (VPF)', regulator: 'EPFO', class: 'debt', rate: 8.25, rateKind: 'declared yearly', risk: 'Low', lockIn: 'Until retirement / job exit', tax: 'EEE up to ₹2.5 L employee contribution a year', min: 'Any % of basic pay', mode: 'monthly', govt: true, bestFor: 'Salaried, highest safe rate' },
  { id: 'nps', name: 'National Pension System (NPS Tier I)', regulator: 'PFRDA', class: 'pension', rate: null, rateKind: 'market-linked', risk: 'Moderate', lockIn: 'Until age 60', tax: 'Extra ₹50k deduction u/s 80CCD(1B); 60% lump sum tax-free at 60', min: '₹1,000 / year', mode: 'monthly', govt: true, bestFor: 'Low-cost retirement corpus' },
  { id: 'scss', name: "Senior Citizens' Savings Scheme (SCSS)", regulator: 'DOP', class: 'debt', rate: 8.2, rateKind: 'fixed', risk: 'Low', lockIn: '5 years (extendable by 3)', tax: '80C on deposit; interest taxable', min: '₹1,000 · max ₹30 L', mode: 'lumpsum', govt: true, bestFor: 'Age 60+, quarterly income' },
  { id: 'ssy', name: 'Sukanya Samriddhi Yojana', regulator: 'DOP', class: 'debt', rate: 8.2, rateKind: 'fixed', risk: 'Low', lockIn: '21 years from opening', tax: 'EEE', min: '₹250 / year · max ₹1.5 L', maxMonthly: 12500, mode: 'monthly', govt: true, bestFor: 'Daughter under 10' },
  { id: 'nsc', name: 'National Savings Certificate (NSC)', regulator: 'DOP', class: 'debt', rate: 7.7, rateKind: 'fixed', risk: 'Low', lockIn: '5 years', tax: '80C on deposit; interest taxable', min: '₹1,000', mode: 'lumpsum', govt: true, bestFor: 'Fixed 5-year saving with 80C' },
  { id: 'kvp', name: 'Kisan Vikas Patra (KVP)', regulator: 'DOP', class: 'debt', rate: 7.5, rateKind: 'fixed', risk: 'Low', lockIn: '2.5 years min; doubles in ~115 months', tax: 'Interest taxable', min: '₹1,000', mode: 'lumpsum', govt: true, bestFor: 'Doubling money, sovereign safety' },
  { id: 'pomis', name: 'Post Office Monthly Income Scheme', regulator: 'DOP', class: 'debt', rate: 7.4, rateKind: 'fixed', risk: 'Low', lockIn: '5 years', tax: 'Interest taxable', min: '₹1,000 · max ₹9 L single', mode: 'lumpsum', govt: true, bestFor: 'Monthly payout' },
  { id: 'frsb', name: 'RBI Floating Rate Savings Bonds', regulator: 'RBI', class: 'debt', rate: 8.05, rateKind: 'resets every 6 months', risk: 'Low', lockIn: '7 years (earlier for seniors)', tax: 'Interest taxable', min: '₹1,000', mode: 'lumpsum', govt: true, bestFor: 'Sovereign bond with rate protection' },
  { id: 'gsec', name: 'G-Secs & T-Bills (RBI Retail Direct)', regulator: 'RBI', class: 'debt', rate: 6.8, rateKind: 'market yield', risk: 'Low', lockIn: 'None (tradeable) — hold to maturity for fixed yield', tax: 'Interest taxable', min: '₹10,000', mode: 'lumpsum', govt: true, bestFor: 'Direct sovereign debt, no fees' },
  { id: 'fd', name: 'Bank fixed deposit', regulator: 'RBI', class: 'debt', rate: 6.6, rateKind: 'fixed', risk: 'Low', lockIn: '7 days – 10 years (penalty on early exit)', tax: 'Interest taxable; TDS above threshold', min: '₹1,000', mode: 'lumpsum', govt: false, bestFor: 'Emergency fund, short goals — DICGC insured to ₹5 L per bank' },
  // ---- Market-linked (SEBI) ----
  { id: 'index', name: 'Nifty 50 index fund (SIP)', regulator: 'SEBI', class: 'equity', rate: null, rateKind: 'market-linked', risk: 'High', lockIn: 'None', tax: 'LTCG 12.5% above ₹1.25 L/yr after 1 year', min: '₹100 – ₹500 SIP', mode: 'monthly', govt: false, bestFor: 'Low-cost core equity, 7+ year goals' },
  { id: 'flexi', name: 'Flexi-cap mutual fund (SIP)', regulator: 'SEBI', class: 'equity', rate: null, rateKind: 'market-linked', risk: 'High', lockIn: 'None', tax: 'LTCG 12.5% above ₹1.25 L/yr after 1 year', min: '₹500 SIP', mode: 'monthly', govt: false, bestFor: 'Diversified active equity' },
  { id: 'elss', name: 'ELSS tax-saver fund', regulator: 'SEBI', class: 'equity', rate: null, rateKind: 'market-linked', risk: 'High', lockIn: '3 years', tax: '80C (old regime); LTCG 12.5% above ₹1.25 L', min: '₹500 SIP', mode: 'monthly', govt: false, bestFor: 'Shortest 80C lock-in' },
  { id: 'baf', name: 'Balanced advantage / hybrid fund', regulator: 'SEBI', class: 'equity', rate: 9.5, rateKind: 'market-linked', risk: 'Moderate', lockIn: 'None', tax: 'Equity taxation if ≥65% equity', min: '₹500 SIP', mode: 'monthly', govt: false, bestFor: 'Smoother ride than pure equity' },
  { id: 'debtmf', name: 'Short-duration debt fund', regulator: 'SEBI', class: 'debt', rate: 7, rateKind: 'market-linked', risk: 'Low–Moderate', lockIn: 'None (exit load possible)', tax: 'Taxed at slab rate', min: '₹500', mode: 'monthly', govt: false, bestFor: '1–3 year parking' },
  { id: 'goldetf', name: 'Gold ETF / gold fund', regulator: 'SEBI', class: 'gold', rate: null, rateKind: 'tracks gold price', risk: 'Moderate', lockIn: 'None', tax: 'LTCG 12.5% after 1 year (ETF)', min: '1 unit / ₹500 SIP', mode: 'monthly', govt: false, bestFor: 'Diversifier & inflation hedge' },
  { id: 'sgb', name: 'Sovereign Gold Bond (secondary market)', regulator: 'RBI', class: 'gold', rate: null, rateKind: 'gold price + 2.5% interest', risk: 'Moderate', lockIn: '8-year maturity; tradeable on exchanges', tax: 'Interest taxable; maturity gains tax-free', min: '1 gram', mode: 'lumpsum', govt: true, bestFor: 'Gold with interest (new issues paused; buy on NSE/BSE)' },
  { id: 'reit', name: 'REITs / InvITs', regulator: 'SEBI', class: 'equity', rate: 9, rateKind: 'distribution yield + growth', risk: 'Moderate', lockIn: 'None (listed)', tax: 'Mixed — dividends, interest, capital gains', min: '1 unit (~₹100–400)', mode: 'lumpsum', govt: false, bestFor: 'Real-estate income without buying property' },
];

export function optionRate(opt, scenario) {
  const sc = SCENARIOS[scenario] || SCENARIOS.base;
  if (opt.rate != null) return opt.class === 'debt' ? opt.rate + sc.debtDelta : opt.rate;
  return sc[opt.class];
}
