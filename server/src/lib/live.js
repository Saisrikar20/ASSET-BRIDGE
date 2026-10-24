// WebSocket hub: pushes nominee-gap alerts and case updates to a user's open tabs.
import { WebSocketServer } from 'ws';
import { verifyToken } from './auth.js';

const sockets = new Map(); // userId -> Set<WebSocket>

export function attachLive(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const token = new URL(req.url, 'http://x').searchParams.get('token');
    const userId = verifyToken(token);
    if (!userId) return ws.close(4401, 'unauthorized');
    if (!sockets.has(userId)) sockets.set(userId, new Set());
    sockets.get(userId).add(ws);
    ws.send(JSON.stringify({ type: 'hello' }));
    ws.on('close', () => sockets.get(userId)?.delete(ws));
  });
}

export function push(userId, type, data) {
  const msg = JSON.stringify({ type, data, at: new Date().toISOString() });
  for (const ws of sockets.get(userId) || []) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}
