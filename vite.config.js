import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Saat `npm run dev`, endpoint /api/game dilayani langsung oleh Vite (penyimpanan memori),
// jadi multiplayer bisa dicoba lokal tanpa Vercel CLI / Redis.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/game', async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = null; }
        const mod = await server.ssrLoadModule('/api/game.js');
        await mod.default(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  build: { chunkSizeWarningLimit: 900 },
});
