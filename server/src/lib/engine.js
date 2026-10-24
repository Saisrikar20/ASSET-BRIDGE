// Verify → Aggregate → Alert logic.
import { REGULATORS, queryRegulator } from '../data/regulators.js';
import { store, uid } from './store.js';
import { push } from './live.js';

const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function nameMatch(given, registered) {
  const a = norm(given);
  const b = norm(registered);
  if (a === b) return 'exact';
  // "R. Raghavan" vs "Raghavan": same name, initial consistent
  const [ap, bp] = [a.split(' '), b.split(' ')];
  if (ap.at(-1) === bp.at(-1) && ap[0][0] === bp[0][0]) return 'partial';
  return 'mismatch';
}

/** Cross-check identity against every regulator. Read-only — no consent needed to *match*. */
export function verifyIdentity(identity) {
  return Object.entries(REGULATORS).map(([code, reg]) => {
    const records = queryRegulator(code, identity);
    const checks = records.map((rec) => ({
      ref: rec.ref,
      institution: rec.institution,
      name: nameMatch(identity.name, rec.registeredName),
      registeredName: rec.registeredName,
      dob: rec.registeredDob === identity.dob ? 'exact' : 'mismatch',
    }));
    const worst = checks.some((c) => c.name === 'mismatch' || c.dob === 'mismatch')
      ? 'mismatch'
      : checks.some((c) => c.name === 'partial')
        ? 'partial'
        : 'verified';
    return { regulator: code, name: reg.name, recordsFound: records.length, status: records.length ? worst : 'none', checks };
  });
}

const yearsSince = (d) => (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);

export function alertsFor(h, identity) {
  const out = [];
  const a = (severity, kind, title, detail) => out.push({ severity, kind, title, detail });
  if (!h.nominee) {
    a('high', 'nominee_missing', `No nominee on ${h.type}`, `${h.institution} (${h.ref}) has no nominee. Your family would need a legal heir or succession certificate to claim ₹${h.value.toLocaleString('en-IN')}.`);
  } else if (h.nominee.status === 'deceased') {
    a('high', 'nominee_deceased', `Nominee ${h.nominee.name} is deceased`, `The nomination on ${h.institution} (${h.ref}) is no longer usable. Register a new nominee.`);
  } else if (h.nominee.status === 'minor') {
    a('medium', 'nominee_minor', `Minor nominee without guardian`, `${h.nominee.name} is a minor on ${h.institution} (${h.ref}). Appoint a guardian / appointee so the claim isn't delayed.`);
  }
  if (h.status === 'unclaimed') {
    a('high', 'unclaimed', `Unclaimed: ${h.institution}`, `Inactive since ${h.lastActivity}. Funds idle this long are moved to regulator funds (e.g. RBI DEA Fund) — still claimable, but slower. Reclaim now.`);
  } else if (h.status === 'inoperative') {
    a('medium', 'inoperative', `Inoperative: ${h.institution}`, `No activity since ${h.lastActivity}. Re-activate with a KYC update before it becomes unclaimed.`);
  }
  if (h.registeredName && nameMatch(identity.name, h.registeredName) !== 'exact') {
    a('medium', 'name_mismatch', `Name mismatch at ${h.institution}`, `Registered as "${h.registeredName}". Mismatched names are a top reason claims get rejected — update records to match PAN.`);
  }
  if (yearsSince(h.kycUpdated) > 10) {
    a('low', 'kyc_stale', `KYC over 10 years old`, `${h.institution} KYC last updated ${h.kycUpdated}. Re-KYC keeps the account operative.`);
  }
  return out;
}

/** Fetch holdings under an approved consent, persist, and raise nominee-gap alerts. */
export function aggregate(user, consent) {
  const identity = user.identity;
  store.remove('holdings', (h) => h.userId === user.id);
  const holdings = [];
  for (const code of consent.regulators) {
    for (const rec of queryRegulator(code, identity)) {
      holdings.push(store.insert('holdings', { id: uid('h_'), userId: user.id, consentId: consent.id, ...rec }));
    }
  }
  refreshAlerts(user);
  return holdings;
}

export function refreshAlerts(user) {
  const holdings = store.all('holdings', (h) => h.userId === user.id);
  const prior = store.all('alerts', (a) => a.userId === user.id);
  const key = (a) => `${a.holdingId}:${a.kind}`;
  const resolved = new Set(prior.filter((a) => a.resolved).map(key));
  const known = new Set(prior.map(key));

  const fresh = [];
  for (const h of holdings) {
    for (const al of alertsFor(h, user.identity)) {
      const row = { ...al, holdingId: h.id, regulator: h.regulator };
      if (!known.has(key(row))) fresh.push(row);
    }
  }
  // Remove alerts whose holding vanished (re-aggregation); keep resolution history.
  const live = new Set(holdings.map((h) => h.id));
  store.remove('alerts', (a) => a.userId === user.id && !live.has(a.holdingId));

  const severityRank = { high: 0, medium: 1, low: 2 };
  fresh.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  // Stream new alerts one by one so the dashboard lights up in real time.
  fresh.forEach((al, i) => {
    const row = store.insert('alerts', { id: uid('a_'), userId: user.id, createdAt: new Date().toISOString(), resolved: resolved.has(key(al)), ...al });
    setTimeout(() => push(user.id, 'alert', row), 250 * (i + 1));
  });
}

export function summarize(holdings) {
  const byRegulator = Object.keys(REGULATORS).map((code) => {
    const hs = holdings.filter((h) => h.regulator === code);
    return { regulator: code, count: hs.length, value: hs.reduce((s, h) => s + h.value, 0) };
  });
  const total = holdings.reduce((s, h) => s + h.value, 0);
  const atRisk = holdings
    .filter((h) => !h.nominee || h.nominee.status !== 'valid' || h.status !== 'active')
    .reduce((s, h) => s + h.value, 0);
  return { total, atRisk, count: holdings.length, byRegulator };
}
