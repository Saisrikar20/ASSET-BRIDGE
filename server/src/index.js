import http from 'node:http';
import express from 'express';
import cors from 'cors';
import api from './routes/api.js';
import { attachLive } from './lib/live.js';

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'asset-bridge-server' }));
app.use('/api', api);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const server = http.createServer(app);
attachLive(server);
server.listen(PORT, () => console.log(`Asset Bridge API on http://localhost:${PORT}`));
