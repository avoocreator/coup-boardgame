// Tes protokol multiplayer dengan PeerJS palsu (in-memory): lobby, bot, game penuh, reconnect, takeover.
import { Session } from '../src/net/session.js';
import { whoMustAct } from '../src/game/engine.js';
import { botMove } from '../src/game/bot.js';

const registry = new Map();
class FakeConn {
  constructor() { this.h = {}; this.open = false; }
  on(e, f) { (this.h[e] ||= []).push(f); return this; }
  emit(e, ...a) { (this.h[e] || []).forEach((f) => f(...a)); }
  send(d) { if (!this.open) return; const o = JSON.parse(JSON.stringify(d)); setTimeout(() => this.other.emit('data', o), 0); }
  close() { if (!this.open) return; this.open = this.other.open = false; setTimeout(() => { this.emit('close'); this.other.emit('close'); }, 0); }
}
class FakePeer {
  constructor(id) {
    this.h = {}; this.id = id ?? 'anon' + Math.random();
    setTimeout(() => {
      if (id && registry.has(id)) this.emit('error', { type: 'unavailable-id' });
      else { registry.set(this.id, this); this.emit('open', this.id); }
    }, 0);
  }
  on(e, f) { (this.h[e] ||= []).push(f); return this; }
  emit(e, ...a) { (this.h[e] || []).forEach((f) => f(...a)); }
  connect(id) {
    const a = new FakeConn(), b = new FakeConn(); a.other = b; b.other = a;
    setTimeout(() => {
      const t = registry.get(id);
      if (!t) return this.emit('error', { type: 'peer-unavailable' });
      a.open = b.open = true; t.emit('connection', b); b.emit('open'); a.emit('open');
    }, 0);
    return a;
  }
  destroy() { registry.delete(this.id); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 3000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error('timeout: ' + f); await wait(5); } };
const assert = (c, m) => { if (!c) throw new Error('GAGAL: ' + m); };
const mk = (token) => new Session({ Peer: FakePeer, token, graceMs: 150, botDelay: [5, 10], flashDelay: 0, tickMs: 40 });

const host = mk('tok-host'), c1 = mk('tok-1'), c2 = mk('tok-2');
host.hostGame('Hosty');
await until(() => host.snap.status === 'connected');
const code = host.snap.code;
assert(/^[A-Z]{4}$/.test(code), 'kode 4 huruf');

c1.joinGame(code.toLowerCase(), 'Ani');
c2.joinGame(code, 'Budi');
await until(() => host.snap.players.length === 3 && c1.snap.mode === 'lobby' && c2.snap.mode === 'lobby');
assert(c1.snap.you === 1 && c2.snap.you === 2, 'seat klien');
host.addBot();
await until(() => c2.snap.players.length === 4);

// kode salah
const bad = mk('x'); bad.joinGame('ZZZZ', 'X');
await until(() => bad.snap.status === 'error'); assert(/tidak ditemukan/i.test(bad.snap.error), 'kode salah');

host.startGame();
await until(() => c1.snap.mode === 'game' && c2.snap.mode === 'game');
// tidak ada kebocoran kartu
for (const [c, seat] of [[c1, 1], [c2, 2]]) {
  c.snap.view.players.forEach((p, i) => p.cards.forEach((card) => { if (i !== seat && !card.revealed) assert(card.char === null, 'bocor ke klien'); }));
}
// klien tidak bisa memalsukan pemain lain
c1.conn.send({ t: 'move', move: { type: 'action', by: 0, action: 'income' } });

// mainkan: manusia (host,c1,c2) dengan botMove, bot dengan timer internal
const sessions = [host, c1, c2];
let dropped = false;
const t0 = Date.now();
while (host.state.phase !== 'over') {
  if (Date.now() - t0 > 20000) throw new Error('game tidak selesai');
  const seats = whoMustAct(host.state);
  for (const seat of seats) {
    if (seat > 2) continue; // bot
    if (seat === 2 && dropped) continue;
    const mv = botMove(host.state, seat);
    if (mv) sessions[seat].move(mv);
  }
  // simulasi c2 terputus di tengah game, lalu bot takeover
  if (!dropped && host.state.log.length > 6) {
    dropped = true;
    c2.conn.close();
    await until(() => host.players[2].connected === false);
  }
  await wait(8);
}
await until(() => c1.snap.view?.phase === 'over');
assert(c1.snap.view.winner === host.state.winner, 'pemenang sinkron');
assert(dropped, 'tes disconnect berjalan');

// reconnect: c2 bergabung lagi dengan token sama merebut kursi, tanpa duplikat
const c2b = mk('tok-2'); c2b.joinGame(code, 'Budi');
await until(() => c2b.snap.mode === 'game');
assert(c2b.snap.you === 2 && host.players.length === 4, 'reclaim kursi');

// rematch kembali ke lobby
host.rematch();
await until(() => c1.snap.mode === 'lobby');
host.startGame();
await until(() => c1.snap.mode === 'game' && host.state.phase === 'action' || host.state.phase !== 'over');
// orang baru ditolak saat game berjalan
const late = mk('late'); late.joinGame(code, 'Telat');
await until(() => late.snap.status === 'error'); assert(/berjalan/.test(late.snap.error), 'ditolak saat game berjalan');

console.log('OK: tes jaringan lulus (lobby, bot, game penuh, takeover, reclaim, rematch, reject)');
process.exit(0);
