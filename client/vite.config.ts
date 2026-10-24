import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverSrc = path.resolve(here, '../server/src');
const local = path.resolve(here, 'src/local');

/**
 * Lets the real API routes (server/src/routes/api.js) run in the browser demo:
 * when a module under server/src imports express, the JSON store, auth or the
 * WebSocket hub, hand it the browser stand-in from src/local instead.
 */
function localApi(): Plugin {
  const swap: Record<string, string> = { 'lib/store.js': 'store.js', 'lib/auth.js': 'auth.js', 'lib/live.js': 'live.js' };
  return {
    name: 'asset-bridge-local-api',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !importer.startsWith(serverSrc)) return null;
      if (source === 'express') return path.join(local, 'express.js');
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const rel = resolved && path.relative(serverSrc, resolved.id);
      return rel && swap[rel] ? path.join(local, swap[rel]) : null;
    },
  };
}

export default defineConfig({
  plugins: [localApi(), react(), tailwindcss()],
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
});
