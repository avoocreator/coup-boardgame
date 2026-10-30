// Tes klien Session ↔ Game Master: fetch dialihkan ke handler API (memori). Mencakup online 2 klien, resume, solo.
import handler from '../api/game.js';
import { Session } from '../src/net/session.js';
import { whoMustAct } from '../src/game/engine.js';
import { botMove } from '../src/game/bot.js';

globalThis.__coupBotSpeed = 0.02; // bot server tidak perlu "berpikir" lama di tes
const assert = (c, m) => { if (!c) throw new Error('GAGAL: ' + m); };
globalThis.fetch = async (url, init) => {
  let out;
  const res = { statusCode: 200, setHeader() {}, end(s) { out = JSON.parse(s); } };
  await handler({ method: 'POST', body: JSON.parse(init.body) }, res);
  return { ok: true, json: async () => out };
};
const store = new Map();
globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 5000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error('timeout ' + f); await sleep(10); } };
const mk = (tok) => new Session({ token: tok, pollMs: 20, localPollMs: 10 });
const T = (n) => (n + '-'.repeat(24)).slice(0, 24);

// ---- online ----
const host = mk(T('host')), guest = mk(T('guest'));
await host.createRoom('Hosty');
assert(host.snap.mode === 'lobby' && host.snap.isHost && /^[A-Z]{4}$/.test(host.snap.code), 'host create');
const code = host.snap.code;
await guest.joinGame(code, 'Gina');
assert(guest.snap.mode === 'lobby' && !guest.snap.isHost && guest.snap.you === 1, 'guest join');
await until(() => host.snap.players.length === 2);
await guest.setSettings({ discard: 'classic' }); // ditolak: bukan host
assert(guest.snap.notice === 'err.hostOnly', 'guest tak bisa ubah aturan');
await host.setSettings({ discard: 'bottom' });
await until(() => guest.snap.settings.discard === 'bottom');
await host.addBot();
await host.startGame();
await until(() => guest.snap.mode === 'game' && host.snap.mode === 'game');
assert(guest.snap.view.settings.discard === 'bottom', 'aturan sampai ke view');

// guest refresh tab → resume merebut kursi yang sama
const guest2 = mk(T('guest'));
await guest2.resume();
assert(guest2.snap.mode === 'game' && guest2.snap.you === 1, 'resume kursi');
guest2.loopId++; // hentikan loop duplikat

const sess = [host, guest];
const t0 = Date.now();
while (host.snap.view.phase !== 'over') {
  if (Date.now() - t0 > 40000) throw new Error('game online tak selesai');
  for (let i = 0; i < 2; i++) {
    const v = sess[i].snap.view;
    if (v && v.phase !== 'over' && whoMustAct(v).includes(i)) { const mv = botMove(v, i); if (mv) { const { by, ...m } = mv; await sess[i].move(m); } }
  }
  await sleep(15);
}
await until(() => guest.snap.view.phase === 'over');
assert(host.snap.view.winner === guest.snap.view.winner, 'pemenang sama');
assert(guest.snap.view.players.every((p, i) => i === 1 || p.cards.every((c) => c.revealed || c.char === null)), 'tak ada kartu lawan di sisi klien');
await host.rematch();
await until(() => guest.snap.mode === 'lobby');
await guest.leave();
assert(guest.snap.mode === 'menu', 'leave -> menu');
host.loopId++;

// ---- solo (offline, logika sama di memori) ----
const solo = mk(T('solo'));
await solo.soloGame('Tes');
await until(() => solo.snap.players.length === 3);
assert(solo.snap.offline && solo.snap.code === 'SOLO', 'solo lobby');
await solo.setSettings({ discard: 'bottomSecret' });
await solo.startGame();
await until(() => solo.snap.mode === 'game');
const t1 = Date.now();
while (solo.snap.view.phase !== 'over') {
  if (Date.now() - t1 > 60000) throw new Error('solo tak selesai');
  const v = solo.snap.view;
  if (whoMustAct(v).includes(0)) { const mv = botMove(v, 0); if (mv) { const { by, ...m } = mv; await solo.move(m); } }
  await sleep(10);
}
solo.loopId++;
console.log('OK: tes Session lulus (online 2 klien, aturan host-only, resume, game penuh, rematch, leave, solo offline)');
process.exit(0);
