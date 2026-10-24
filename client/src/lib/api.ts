export type Regulator = 'RBI' | 'EPFO' | 'IRDAI' | 'SEBI' | 'LIC';

export interface Identity { name: string; pan: string; dob: string; aadhaarLast4: string; mobile: string; state: string }
export interface Check { ref: string; institution: string; name: 'exact' | 'partial' | 'mismatch'; registeredName: string; dob: 'exact' | 'mismatch' }
export interface VerifyResult { regulator: Regulator; name: string; recordsFound: number; status: 'verified' | 'partial' | 'mismatch' | 'none'; checks: Check[] }
export interface User {
  id: string; email: string; name: string; identity: Identity | null;
  verification: { at: string; results: VerifyResult[] } | null;
  deceased: { dateOfDeath: string; registrationNo: string } | null;
}
export interface Nominee { name: string; relation: string; status: 'valid' | 'deceased' | 'minor'; guardian?: string | null }
export interface Holding {
  id: string; regulator: Regulator; type: string; institution: string; ref: string; value: number;
  status: 'active' | 'inoperative' | 'unclaimed'; lastActivity: string; nominee: Nominee | null; kycUpdated: string; registeredName: string;
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
