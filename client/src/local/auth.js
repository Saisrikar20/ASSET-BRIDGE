// Browser stand-in for server/src/lib/auth.js. Everything stays in this
// browser's storage, so tokens are just user ids and passwords are hashed with
// a light salted hash — enough for a demo, not for real accounts.
import { store } from './store.js';

function hash(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export function hashPassword(password) {
  const salt = Math.random().toString(36).slice(2, 10);
  return `${salt}:${hash(salt + password)}`;
}

export function checkPassword(password, stored) {
  const [salt, h] = stored.split(':');
  return hash(salt + password) === h;
}

export const signToken = (userId) => `local.${userId}`;
export const verifyToken = (token) => (token && token.startsWith('local.') ? token.slice(6) : null);

export function requireAuth(req, res, next) {
  const userId = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
  const user = userId && store.find('users', (u) => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}

export const publicUser = ({ passwordHash, ...u }) => u;
