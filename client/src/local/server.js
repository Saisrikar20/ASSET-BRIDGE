// The Asset Bridge API running inside the browser: the real routes from
// server/src/routes/api.js (Express, store, auth and live pushes are swapped
// for local stand-ins at build time — see vite.config.ts), plus the AI guide.
import api from '../../../server/src/routes/api.js';
import { store } from './store.js';
import { guide } from './guide.js';

export async function localFetch(method, path, headers, body) {
  // Small delay so loading states read naturally.
  await new Promise((r) => setTimeout(r, 60));
  if (method === 'POST' && path === '/assistant') {
    if (!body?.question?.trim()) return { status: 400, body: { error: 'Ask a question' } };
    let state = body.state || null;
    if (!state && body.caseId) state = store.find('cases', (c) => c.id === String(body.caseId).toUpperCase())?.state || null;
    return { status: 200, body: guide({ question: body.question, state }) };
  }
  return api.handle(method, path, headers, body);
}
