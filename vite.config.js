import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// handler /api/game buat dev lokal
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
