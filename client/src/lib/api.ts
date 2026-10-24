export type Regulator = 'RBI' | 'EPFO' | 'IRDAI' | 'SEBI' | 'LIC' | 'PFRDA' | 'DOP';

export interface Identity { name: string; pan: string; dob: string; aadhaarLast4: string; mobile: string; state: string }
export interface Check { ref: string; institution: string; name: 'exact' | 'partial' | 'mismatch'; registeredName: string; dob: 'exact' | 'mismatch' }
export interface VerifyResult { regulator: Regulator; name: string; recordsFound: number; status: 'verified' | 'partial' | 'mismatch' | 'none'; checks: Check[] }
export interface User {
  id: string; email: string; name: string; identity: Identity | null;
  verification: { at: string; results: VerifyResult[] } | null;
  deceased: { dateOfDeath: string; registrationNo: string } | null;
  avatar?: { displayName: string; variant: number; seed: string } | null;
}
export interface Nominee { name: string; relation: string; status: 'valid' | 'deceased' | 'minor'; guardian?: string | null }
export interface Holding {
  id: string; regulator: Regulator; type: string; institution: string; ref: string; value: number;
  status: 'active' | 'inoperative' | 'unclaimed'; sip?: number; lastActivity: string; nominee: Nominee | null; kycUpdated: string; registeredName: string;
}
export interface Summary { total: number; atRisk: number; count: number; byRegulator: { regulator: Regulator; count: number; value: number }[] }
export interface Alert {
  id: string; severity: 'high' | 'medium' | 'low'; kind: string; title: string; detail: string;
  holdingId: string; regulator: Regulator; resolved: boolean; createdAt: string;
}
export interface Consent { id: string; handle: string; purpose: string; fiTypes: string[]; regulators: Regulator[]; status: string; createdAt: string; expiresAt: string; fetchType: string; dataLife: string }
export interface Heir { id: string; name: string; relation: string; pan: string; mobile: string; email: string; share: number }
export interface Task { id: string; title: string; detail: string; docs: string[]; authority: string; holdingId: string | null; done: boolean }
export interface Case {
  id: string; deceasedName: string; deceasedPan: string; state: string;
  deceased: { dateOfDeath: string; registrationNo: string; place: string };
  holdings: Holding[]; heirs: Heir[]; tasks: Task[]; timeline: { at: string; text: string }[]; createdAt: string;
}
export interface Meta {
  regulators: Record<Regulator, { name: string; covers: string; fiType: string }>;
  states: string[];
  heirDocs: Record<string, { doc: string; authority: string; days: string }>;
  demoIdentity: Identity;
  nationalStats: { label: string; value: number; regulator: Regulator }[];
}
export type AssetClass = 'equity' | 'debt' | 'pension' | 'gold' | 'cash';
export interface InvestOption {
  id: string; name: string; regulator: Regulator; class: AssetClass; rate: number | null; rateKind: string; risk: string;
  lockIn: string; tax: string; min: string; maxMonthly?: number; mode: 'monthly' | 'lumpsum'; govt: boolean; bestFor: string;
}
export interface Scenario { label: string; equity: number; pension: number; gold: number; debtDelta: number; cash: number }
export interface Catalog { options: InvestOption[]; classes: Record<AssetClass, { label: string }>; scenarios: Record<string, Scenario> }
export interface PlanSettings { years: number; inflation: number; scenario: string; stepUp: number; reclaimIdle: boolean }
export interface Plan { contributions: { optionId: string; monthly: number; lumpSum: number }[]; settings: PlanSettings }
export interface ForecastPoint { year: number; byClass: Record<AssetClass, number>; total: number; real: number; contributed: number }
export interface Forecast {
  settings: PlanSettings; points: ForecastPoint[]; age: number | null;
  summary: { start: number; end: number; endReal: number; contributed: number; growth: number; monthly: number };
}
export interface Analysis {
  total: number; allocation: { class: AssetClass; label: string; value: number; share: number }[];
  liquidity: { liquid: number; locked: number; idle: number }; idleCostPerYear: number; equityShare: number; age: number | null;
  blended: number; protection: number; familyToday: number; insights: { tone: string; title: string; body: string }[];
}
export interface GuideAnswer { answer: string; engine: string; sources: { n: number; title: string; section: string; file: string }[] }

const TOKEN_KEY = 'ab_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; heirPan?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.heirPan) headers['x-heir-pan'] = opts.heirPan;
  const res = await fetch(`/api${path}`, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

// ---------- life plan ----------
export interface LifeProfile { retireAge: number; lifeExpectancy: number; regime: 'new' | 'old'; swr: number; surplusEquity: number; coverUntil: number; otherDeductions: number }
export interface IncomeItem { id: string; name: string; kind: 'salary' | 'pension' | 'rental' | 'other'; amount: number; growth: number; startAge: number; endAge: number }
export interface ExpenseItem { id: string; name: string; kind: 'essential' | 'lifestyle'; amount: number; startAge: number; endAge: number; growthExtra?: number }
export interface Milestone { id: string; name: string; kind: string; age: number; cost: number; every?: number; until?: number }
export interface FamilyMember { id: string; name: string; relation: string; age: number }
export interface LifePlan { profile: LifeProfile; income: IncomeItem[]; expenses: ExpenseItem[]; milestones: Milestone[]; family: FamilyMember[] }
export interface Flow { name: string; value: number; kind?: string }
export interface LifeRow {
  age: number; year: number; price: number;
  income: Flow[]; grossIncome: number; tax: number; taxAlt: number; taxable: number; deductions: number; effectiveRate: number;
  expenses: Flow[]; expenseTotal: number; milestones: Flow[]; milestoneTotal: number; contributions: Flow[]; contribTotal: number;
  surplus: number; withdrawals: number; drawn: Record<string, number>; shortfall: number;
  buckets: Record<string, number>; netWorth: number; real: number; legacy: number; cover: number;
}
export interface LifeResult {
  age: number; runs: number; successRate: number; medianFailAge: number | null; deterministicFailAge: number | null;
  bands: { age: number; p10: number; p25: number; p50: number; p75: number; p90: number }[];
  rows: LifeRow[]; fi: { age: number; number: number } | null;
  legacy: { nominatedShare: number; heirs: { name: string; relation: string; share: number }[] };
  buckets: Record<string, string>;
}
export interface Snapshot { id: string; date: string; netWorth: number; demo?: boolean }
export interface Progress { snapshots: Snapshot[]; baseline: { createdAt: string; points: { date: string; value: number }[]; demo?: boolean } | null; current: number }
