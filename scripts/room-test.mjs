// Tes Game Master: handler API (penyimpanan memori), banyak klien, anti-bocor, bot malas, CAS, adaptor Redis.
import handler from '../api/game.js';
import { dispatch, newRoom, tick } from '../src/game/room.js';
import { whoMustAct } from '../src/game/engine.js';
import { botMove } from '../src/game/bot.js';

const assert = (c, m) => { if (!c) throw new Error('GAGAL: ' + m); };
const tok = (n) => (n + '-'.repeat(20)).slice(0, 24);
async function call(body) {
  let out;
  const res = { statusCode: 200, setHeader() {}, end(s) { out = JSON.parse(s); } };
  await handler({ method: 'POST', body }, res);
  return out;
}
const A = tok('alice'), B = tok('bobby'), C = tok('carol');

// --- lobby ---
let r = await call({ op: 'create', name: 'Alice', token: A });
assert(r.ok && /^[A-Z]{4}$/.test(r.snap.code) && r.snap.isHost && r.snap.mode === 'lobby', 'create');
const code = r.snap.code;
assert((await call({ op: 'join', code: 'ZZZZ', name: 'X', token: tok('x') })).error === 'err.noRoom', 'kode salah');
r = await call({ op: 'join', code: code.toLowerCase(), name: 'Bob', token: B }); assert(r.ok && r.snap.you === 1 && !r.snap.isHost, 'join bob');
r = await call({ op: 'join', code, name: 'Carol', token: C }); assert(r.ok && r.snap.players.length === 3, 'join carol');
assert((await call({ op: 'start', code, token: B })).error === 'err.hostOnly', 'hanya host');
assert((await call({ op: 'settings', code, token: B, patch: { discard: 'classic' } })).error === 'err.hostOnly', 'setting hanya host');
r = await call({ op: 'settings', code, token: A, patch: { discard: 'bottomSecret' } }); assert(r.snap.settings.discard === 'bottomSecret', 'setting');
r = await call({ op: 'addBot', code, token: A }); assert(r.snap.players.length === 4 && r.snap.players[3].bot, 'bot');
assert(JSON.stringify(r).indexOf(B) < 0 && JSON.stringify(r).indexOf(C) < 0, 'token pemain lain tidak bocor');
r = await call({ op: 'start', code, token: A }); assert(r.snap.mode === 'game' && r.snap.view.settings.discard === 'bottomSecret', 'start');
assert((await call({ op: 'join', code, name: 'Late', token: tok('late') })).error === 'err.started', 'telat ditolak');
assert((await call({ op: 'state', code, token: tok('stranger') })).error === 'err.notInRoom', 'orang asing tak bisa baca state');

// --- anti-bocor: tiap snapshot hanya berisi kartu sendiri ---
const toks = [A, B, C];
async function snaps() { return Promise.all(toks.map((t) => call({ op: 'state', code, token: t, rev: -1 }))); }
let ss = await snaps();
ss.forEach((s, seat) => {
  const v = s.snap.view;
  assert(v.you === seat && !('deck' in v), 'view milik sendiri');
  v.players.forEach((p, i) => p.cards.forEach((c) => { if (i !== seat && !c.revealed) assert(c.char === null, 'kartu lawan bocor'); }));
  assert(!JSON.stringify(s).includes('token'), 'tidak ada token di respons');
});

// --- balapan: gerakan serentak tidak saling menimpa (CAS) ---
const v0 = ss[0].snap.view;
const turnSeat = v0.turn;
const t = toks[turnSeat] ?? A;
if (turnSeat < 3) {
  const [m1, m2] = await Promise.all([
    call({ op: 'move', code, token: t, move: { type: 'action', action: 'income' } }),
    call({ op: 'move', code, token: t, move: { type: 'action', action: 'income' } }),
  ]);
  assert([m1, m2].filter((x) => x.ok).length === 1, 'hanya satu income lolos');
}

// --- mainkan sampai selesai lewat API; manusia digerakkan botMove(view), bot digerakkan server secara malas ---
const t0 = Date.now();
let over = false;
while (!over) {
  if (Date.now() - t0 > 60000) throw new Error('game tidak selesai');
  ss = await snaps();
  const v = ss[0].snap.view;
  if (v.phase === 'over') { over = true; break; }
  for (let seat = 0; seat < 3; seat++) {
    const vs = ss[seat].snap.view;
    if (vs.phase !== 'over' && whoMustAct(vs).includes(seat)) {
      const mv = botMove(vs, seat);
      if (mv) { const { by, ...m } = mv; await call({ op: 'move', code, token: toks[seat], move: m }); }
    }
  }
  await new Promise((r2) => setTimeout(r2, 40));
}
ss = await snaps();
assert(ss.every((s) => s.snap.view.winner === ss[0].snap.view.winner), 'pemenang sama');

// --- rematch & leave ---
r = await call({ op: 'rematch', code, token: A }); assert(r.snap.mode === 'lobby', 'rematch');
r = await call({ op: 'leave', code, token: B }); assert(r.left, 'leave');
assert((await call({ op: 'state', code, token: B })).error === 'err.notInRoom', 'sudah keluar');

// --- pemain tidak aktif diambil alih bot (waktu dimajukan) ---
const room = newRoom('TEST', 'Solo', tok('solo'), 1000);
dispatch(room, { op: 'addBot', token: tok('solo') }, 1000);
dispatch(room, { op: 'start', token: tok('solo') }, 1000);
let now = 1000;
for (let i = 0; i < 600 && room.state.phase !== 'over'; i++) { now += 1000; tick(room, now); } // pemain 'solo' tidak pernah polling lagi
assert(room.state.phase === 'over', 'bot mengambil alih pemain tak aktif sampai game selesai');

// --- adaptor Redis REST (fetch palsu yang meniru HMGET & EVAL CAS) ---
const kv = new Map();
globalThis.fetch = async (url, init) => {
  const a = JSON.parse(init.body);
  let result;
  if (a[0] === 'HMGET') { const h = kv.get(a[1]); result = h ? [h.ver, h.data] : [null, null]; }
  else if (a[0] === 'EVAL') {
    const [, , , key, expect, nver, data] = a; const h = kv.get(key);
    if ((!h && expect === '0') || (h && h.ver === expect)) { kv.set(key, { ver: nver, data }); result = 1; } else result = 0;
  }
  return { ok: true, json: async () => ({ result }) };
};
process.env.KV_REST_API_URL = 'https://fake'; process.env.KV_REST_API_TOKEN = 'x';
r = await call({ op: 'create', name: 'R', token: tok('redis1') }); assert(r.ok && kv.size === 1, 'redis create');
const rc = r.snap.code;
r = await call({ op: 'join', code: rc, name: 'S', token: tok('redis2') }); assert(r.ok && r.snap.players.length === 2, 'redis join');
delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
process.env.VERCEL = '1';
assert((await call({ op: 'create', name: 'N', token: tok('nostore') })).error === 'err.noStorage', 'produksi tanpa Redis ditolak jelas');

console.log('OK: tes Game Master lulus (lobby, anti-bocor, CAS, game penuh via API, takeover, Redis adapter)');
