import { Router } from 'express';
import { store, uid } from '../lib/store.js';
import { hashPassword, checkPassword, signToken, requireAuth, publicUser, verifyToken } from '../lib/auth.js';
import { verifyIdentity, aggregate, refreshAlerts, summarize } from '../lib/engine.js';
import { push } from '../lib/live.js';
import { REGULATORS, DEMO_IDENTITY } from '../data/regulators.js';
import { STATES, STATE_HEIR_DOC, buildTasks } from '../data/succession.js';

const AI_URL = process.env.AI_URL || 'http://127.0.0.1:8001';
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const api = Router();
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

// ---------- meta ----------
api.get('/meta', (_req, res) => {
  res.json({
    regulators: REGULATORS,
    states: STATES,
    heirDocs: STATE_HEIR_DOC,
    demoIdentity: DEMO_IDENTITY,
    // ₹ crore, as presented in the problem statement
    nationalStats: [
      { label: 'Unclaimed bank deposits', value: 67004, regulator: 'RBI' },
      { label: 'Inoperative EPF accounts', value: 9330, regulator: 'EPFO' },
      { label: 'Unclaimed LIC funds', value: 5564, regulator: 'LIC' },
      { label: 'Unclaimed mutual funds', value: 3749, regulator: 'SEBI' },
    ],
  });
});

// ---------- auth ----------
api.post('/auth/signup', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return bad(res, 'Name, email and password are required');
  if (password.length < 6) return bad(res, 'Password must be at least 6 characters');
  const e = email.trim().toLowerCase();
  if (store.find('users', (u) => u.email === e)) return bad(res, 'An account with this email already exists', 409);
  const user = store.insert('users', { id: uid('u_'), email: e, name: name.trim(), passwordHash: hashPassword(password), identity: null, verification: null, deceased: null, createdAt: new Date().toISOString() });
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = store.find('users', (u) => u.email === (email || '').trim().toLowerCase());
  if (!user || !checkPassword(password || '', user.passwordHash)) return bad(res, 'Wrong email or password', 401);
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

api.post('/auth/demo', (_req, res) => {
  const email = 'demo@assetbridge.in';
  let user = store.find('users', (u) => u.email === email);
  if (!user) {
    user = store.insert('users', { id: uid('u_'), email, name: DEMO_IDENTITY.name, passwordHash: hashPassword(uid()), identity: null, verification: null, deceased: null, createdAt: new Date().toISOString() });
    seedDemoHeirs(user.id);
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

function seedDemoHeirs(userId) {
  store.insert('heirs', { id: uid('k_'), userId, name: 'Meenakshi Iyer', relation: 'Spouse', pan: 'ABCPI5678M', mobile: '9840055501', email: 'meenakshi@example.com', share: 50 });
  store.insert('heirs', { id: uid('k_'), userId, name: 'Divya Iyer', relation: 'Daughter', pan: 'BCDPI4321Q', mobile: '9840055502', email: 'divya@example.com', share: 50 });
}

api.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

api.post('/demo/reset', requireAuth, (req, res) => {
  const id = req.user.id;
  for (const t of ['holdings', 'alerts', 'consents', 'heirs']) store.remove(t, (r) => r.userId === id);
  store.remove('cases', (c) => c.ownerId === id);
  store.update('users', (u) => u.id === id, { identity: null, verification: null, deceased: null });
  if (req.user.email === 'demo@assetbridge.in') seedDemoHeirs(id);
  res.json({ ok: true });
});

// ---------- 01 Verify ----------
api.post('/identity', requireAuth, (req, res) => {
  const { name, pan, dob, aadhaarLast4, mobile, state } = req.body || {};
  const P = (pan || '').trim().toUpperCase();
  if (!name || !dob || !state) return bad(res, 'Name, date of birth and state are required');
  if (!PAN_RE.test(P)) return bad(res, 'PAN must look like ABCDE1234F');
  if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) return bad(res, 'Enter only the last 4 digits of Aadhaar');
  const identity = { name: name.trim(), pan: P, dob, aadhaarLast4: aadhaarLast4 || '', mobile: mobile || '', state };
  const verification = { at: new Date().toISOString(), results: verifyIdentity(identity) };
  const user = store.update('users', (u) => u.id === req.user.id, { identity, verification });
  res.json({ user: publicUser(user) });
});

// ---------- 02 Aggregate (Account Aggregator–style consent) ----------
api.get('/consents', requireAuth, (req, res) => res.json({ consents: store.all('consents', (c) => c.userId === req.user.id).reverse() }));

api.post('/consents', requireAuth, (req, res) => {
  if (!req.user.identity) return bad(res, 'Verify your identity first');
  const { regulators, purpose, months } = req.body || {};
  const regs = (regulators || []).filter((r) => REGULATORS[r]);
  if (!regs.length) return bad(res, 'Pick at least one regulator');
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + (Number(months) || 12));
  // Mirrors the fields of an AA consent artefact (ReBIT spec), simplified.
  const consent = store.insert('consents', {
    id: uid('c_'),
    userId: req.user.id,
    handle: `${req.user.identity.mobile || 'user'}@assetbridge-aa`,
    purpose: purpose || 'Wealth mapping & succession planning',
    fiTypes: regs.map((r) => REGULATORS[r].fiType),
    regulators: regs,
    fetchType: 'PERIODIC',
    dataLife: '1 YEAR',
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  // Revoke older active consents — one active mapping at a time.
  store.all('consents', (c) => c.userId === req.user.id && c.id !== consent.id && c.status === 'ACTIVE').forEach((c) => (c.status = 'REVOKED'));
  const holdings = aggregate(req.user, consent);
  res.json({ consent, holdings });
});

api.post('/consents/:id/revoke', requireAuth, (req, res) => {
  const c = store.update('consents', (c) => c.id === req.params.id && c.userId === req.user.id, { status: 'REVOKED' });
  if (!c) return bad(res, 'Consent not found', 404);
  store.remove('holdings', (h) => h.consentId === c.id);
  store.remove('alerts', (a) => a.userId === req.user.id);
  res.json({ consent: c });
});

api.get('/holdings', requireAuth, (req, res) => {
  const holdings = store.all('holdings', (h) => h.userId === req.user.id);
  res.json({ holdings, summary: summarize(holdings) });
});

// ---------- 03 Alert ----------
api.get('/alerts', requireAuth, (req, res) => {
  const rank = { high: 0, medium: 1, low: 2 };
  const alerts = store.all('alerts', (a) => a.userId === req.user.id).sort((a, b) => a.resolved - b.resolved || rank[a.severity] - rank[b.severity]);
  res.json({ alerts });
});

function resolveAlerts(userId, holdingId, kinds) {
  store.all('alerts', (a) => a.userId === userId && a.holdingId === holdingId && kinds.includes(a.kind) && !a.resolved).forEach((a) => {
    a.resolved = true;
    a.resolvedAt = new Date().toISOString();
    push(userId, 'alert_resolved', a);
  });
  store.update('users', (u) => u.id === userId, {}); // flush
}

api.post('/alerts/:id/resolve', requireAuth, (req, res) => {
  const a = store.update('alerts', (a) => a.id === req.params.id && a.userId === req.user.id, { resolved: true, resolvedAt: new Date().toISOString() });
  if (!a) return bad(res, 'Alert not found', 404);
  push(req.user.id, 'alert_resolved', a);
  res.json({ alert: a });
});

api.patch('/holdings/:id/nominee', requireAuth, (req, res) => {
  const { name, relation, guardian } = req.body || {};
  if (!name || !relation) return bad(res, 'Nominee name and relation are required');
  const h = store.update('holdings', (h) => h.id === req.params.id && h.userId === req.user.id, {
    nominee: { name: name.trim(), relation, status: 'valid', guardian: guardian || null, updatedAt: new Date().toISOString() },
  });
  if (!h) return bad(res, 'Holding not found', 404);
  resolveAlerts(req.user.id, h.id, ['nominee_missing', 'nominee_deceased', 'nominee_minor']);
  res.json({ holding: h });
});

api.post('/holdings/:id/reactivate', requireAuth, (req, res) => {
  const h = store.update('holdings', (h) => h.id === req.params.id && h.userId === req.user.id, {
    status: 'active', lastActivity: new Date().toISOString().slice(0, 10), kycUpdated: new Date().toISOString().slice(0, 10),
    registeredName: req.user.identity?.name,
  });
  if (!h) return bad(res, 'Holding not found', 404);
  resolveAlerts(req.user.id, h.id, ['inoperative', 'unclaimed', 'kyc_stale', 'name_mismatch']);
  res.json({ holding: h });
});

// ---------- heirs ----------
api.get('/heirs', requireAuth, (req, res) => res.json({ heirs: store.all('heirs', (h) => h.userId === req.user.id) }));

api.post('/heirs', requireAuth, (req, res) => {
  const { name, relation, pan, mobile, email, share } = req.body || {};
  const P = (pan || '').trim().toUpperCase();
  if (!name || !relation) return bad(res, 'Name and relation are required');
  if (!PAN_RE.test(P)) return bad(res, 'Heir PAN must look like ABCDE1234F');
  if (store.find('heirs', (h) => h.userId === req.user.id && h.pan === P)) return bad(res, 'This heir is already added', 409);
  const heir = store.insert('heirs', { id: uid('k_'), userId: req.user.id, name: name.trim(), relation, pan: P, mobile: mobile || '', email: email || '', share: Number(share) || 0 });
  res.json({ heir });
});

api.delete('/heirs/:id', requireAuth, (req, res) => {
  store.remove('heirs', (h) => h.id === req.params.id && h.userId === req.user.id);
  res.json({ ok: true });
});

// ---------- 04 Reunite (Civil Registration System death feed) ----------
api.post('/crs/death', (req, res) => {
  const { pan, dateOfDeath, registrationNo, place } = req.body || {};
  const P = (pan || '').trim().toUpperCase();
  if (!PAN_RE.test(P) || !dateOfDeath) return bad(res, 'PAN and date of death are required');
  const user = store.find('users', (u) => u.identity?.pan === P);
  if (!user) return bad(res, 'No Asset Bridge twin is linked to this PAN — nothing to reunite yet', 404);
  if (store.find('cases', (c) => c.ownerId === user.id)) return bad(res, 'An estate case already exists for this person', 409);

  const holdings = store.all('holdings', (h) => h.userId === user.id).map(({ userId, consentId, ...h }) => h);
  const heirs = store.all('heirs', (h) => h.userId === user.id).map(({ userId, ...h }) => h);
  const deceased = { dateOfDeath, registrationNo: registrationNo || `CRS/${new Date().getFullYear()}/${Math.floor(Math.random() * 900000 + 100000)}`, place: place || user.identity.state };
  store.update('users', (u) => u.id === user.id, { deceased });

  const caseRow = store.insert('cases', {
    id: `AB-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
    ownerId: user.id,
    deceasedName: user.identity.name,
    deceasedPan: user.identity.pan,
    state: user.identity.state,
    deceased,
    holdings,
    heirs,
    tasks: buildTasks(holdings, user.identity.state),
    timeline: [
      { at: new Date().toISOString(), text: `Death registration ${deceased.registrationNo} received from CRS` },
      { at: new Date().toISOString(), text: `Matched to PAN ${P} — ${holdings.length} holdings across ${new Set(holdings.map((h) => h.regulator)).size} regulators` },
      { at: new Date().toISOString(), text: `${heirs.length} heir(s) notified` },
    ],
    createdAt: new Date().toISOString(),
  });

  push(user.id, 'case', { id: caseRow.id });
  // Heirs who have their own Asset Bridge accounts get a live notification too.
  for (const heir of heirs) {
    const heirUser = store.find('users', (u) => u.identity?.pan === heir.pan);
    if (heirUser) push(heirUser.id, 'case', { id: caseRow.id });
  }
  res.json({ case: caseRow, notified: heirs.map((h) => ({ name: h.name, via: [h.mobile && 'SMS', h.email && 'Email'].filter(Boolean) })) });
});

// ---------- 05 Transfer ----------
function caseAccess(req) {
  const c = store.find('cases', (c) => c.id === req.params.id.toUpperCase());
  if (!c) return { error: 'Case not found', code: 404 };
  const userId = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (userId && c.ownerId === userId) return { c, actor: 'owner' };
  const pan = (req.headers['x-heir-pan'] || '').toUpperCase();
  const heir = c.heirs.find((h) => h.pan === pan);
  if (heir) return { c, actor: heir.name };
  // Logged-in heir with a verified identity
  const u = userId && store.find('users', (u) => u.id === userId);
  const viaAccount = u?.identity && c.heirs.find((h) => h.pan === u.identity.pan);
  if (viaAccount) return { c, actor: viaAccount.name };
  return { error: 'Only registered heirs can open this case', code: 403 };
}

api.get('/cases', requireAuth, (req, res) => {
  const pan = req.user.identity?.pan;
  const cases = store.all('cases', (c) => c.ownerId === req.user.id || (pan && c.heirs.some((h) => h.pan === pan)));
  res.json({ cases: cases.map(({ id, deceasedName, createdAt, tasks }) => ({ id, deceasedName, createdAt, progress: tasks.filter((t) => t.done).length / tasks.length })) });
});

api.get('/cases/:id', (req, res) => {
  const { c, actor, error, code } = caseAccess(req);
  if (error) return bad(res, error, code);
  res.json({ case: c, actor });
});

api.patch('/cases/:id/tasks/:taskId', (req, res) => {
  const { c, actor, error, code } = caseAccess(req);
  if (error) return bad(res, error, code);
  const t = c.tasks.find((t) => t.id === req.params.taskId);
  if (!t) return bad(res, 'Task not found', 404);
  t.done = !!req.body?.done;
  c.timeline.push({ at: new Date().toISOString(), text: `${actor === 'owner' ? 'Family' : actor} ${t.done ? 'completed' : 'reopened'}: ${t.title}` });
  store.update('cases', (x) => x.id === c.id, {});
  push(c.ownerId, 'case_update', { id: c.id });
  res.json({ case: c });
});

// ---------- AI succession guide (proxied to the FastAPI service) ----------
api.post('/assistant', async (req, res) => {
  const { question, state, caseId, history } = req.body || {};
  if (!question?.trim()) return bad(res, 'Ask a question');
  let context = null;
  if (caseId) {
    const c = store.find('cases', (c) => c.id === caseId.toUpperCase());
    if (c) context = { state: c.state, holdings: c.holdings.map((h) => ({ regulator: h.regulator, type: h.type, institution: h.institution, nominee: h.nominee?.status === 'valid' ? 'valid' : 'missing', status: h.status })) };
  }
  try {
    const r = await fetch(`${AI_URL}/guide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, state: state || context?.state || null, context, history: history || [] }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) throw new Error(`AI service ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    res.status(503).json({ error: `The AI guide is offline (${e.message}). Start it with: cd ai-service && uvicorn main:app --port 8001` });
  }
});

export default api;
