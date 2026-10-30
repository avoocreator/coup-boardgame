// Game Master (server): satu endpoint untuk semua operasi ruangan. Hanya sini yang memegang state asli.
import { newRoom, dispatch, snapshot, randomCode } from '../src/game/room.js';
import { getStore } from './_store.js';

const send = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'err.method' });
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch { body = null; }
  if (!body || typeof body !== 'object') return send(res, 400, { ok: false, error: 'err.badRequest' });
  const { op, token } = body;
  if (typeof op !== 'string' || typeof token !== 'string' || token.length < 16 || token.length > 80) return send(res, 400, { ok: false, error: 'err.badRequest' });

  const store = getStore();
  if (!store) return send(res, 500, { ok: false, error: 'err.noStorage' });

  try {
    const now = Date.now();
    if (op === 'create') {
      for (let i = 0; i < 10; i++) {
        const code = randomCode();
        const room = newRoom(code, body.name, token, now);
        if (await store.cas(code, 0, room)) return send(res, 200, { ok: true, snap: snapshot(room, token, now) });
      }
      return send(res, 503, { ok: false, error: 'err.busy' });
    }

    const code = String(body.code || '').toUpperCase().slice(0, 4);
    for (let attempt = 0; attempt < 6; attempt++) {
      const cur = await store.get(code);
      if (!cur) return send(res, 200, { ok: false, error: 'err.noRoom' });
      const room = cur.room;
      if (room.closed) return send(res, 200, { ok: false, error: 'err.noRoom' });
      const r = dispatch(room, body, now);
      if (!r.ok) return send(res, 200, { ok: false, error: r.error });
      if (r.persist) {
        const ok = await store.cas(code, cur.ver, room);
        if (!ok) continue; // bentrok dengan request lain: muat ulang & coba lagi
      }
      return send(res, 200, r.out);
    }
    return send(res, 409, { ok: false, error: 'err.busy' });
  } catch (e) {
    console.error('game api error', e);
    return send(res, 500, { ok: false, error: 'err.server' });
  }
}
