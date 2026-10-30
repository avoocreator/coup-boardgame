// Uji acak: mainkan ribuan game penuh dengan bot, cek invariants & tidak ada deadlock.
import { createGame, applyMove, viewFor, whoMustAct } from '../src/game/engine.js';
import { botMove } from '../src/game/bot.js';
import { DISCARD_MODES } from '../src/game/rules.js';

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let games = 0, totalSteps = 0, maxSteps = 0, challenges = 0, assassinDouble = 0;
const winsBySeat = {};
for (let g = 0; g < 3000; g++) {
  const rnd = mulberry(g + 1);
  const n = 2 + (g % 5);
  const mode = DISCARD_MODES[g % 3];
  let s = createGame(Array.from({ length: n }, (_, i) => 'P' + i), rnd, { discard: mode });
  let steps = 0;
  while (s.phase !== 'over') {
    // invariant: 15 kartu total
    const inHands = s.players.reduce((a, p) => a + p.cards.length, 0);
    const extra = s.exch ? 2 : 0;
    if (inHands + s.deck.length + extra !== 15) throw new Error(`kartu total salah game ${g}: ${inHands}+${s.deck.length}+${extra}`);
    const seats = whoMustAct(s);
    if (!seats.length) throw new Error(`deadlock game ${g} fase ${s.phase}`);
    const seat = seats[Math.floor(rnd() * seats.length)];
    const mv = botMove(s, seat, rnd);
    if (!mv) throw new Error(`bot tak bisa gerak: game ${g} seat ${seat} fase ${s.phase}`);
    const r = applyMove(s, mv);
    if (!r.ok) throw new Error(`gerakan ditolak game ${g}: ${r.error} ${JSON.stringify(mv)} fase ${s.phase}`);
    s = r.state;
    challenges += s.flashes.filter((f) => f.kind === 'challenge').length;
    // view tidak membocorkan kartu lawan
    for (let seatV = 0; seatV < n; seatV++) {
      const v = viewFor(s, seatV);
      v.players.forEach((p, i) => p.cards.forEach((c) => { if (!c.revealed && i !== seatV && c.char !== null) throw new Error('bocor!'); }));
      if (v.deck) throw new Error('dek bocor');
      if (mode === 'bottomSecret') {
        v.flashes.forEach((f) => { if (f.kind === 'lose' && f.player !== seatV && f.char !== null) throw new Error('kartu rahasia bocor di flash'); });
        s.log.forEach((l) => { if (l.m === 'loseSecret' && l.a.char) throw new Error('kartu rahasia bocor di log'); });
      }
      if (mode === 'bottomSecret') {
        v.flashes.forEach((f) => { if (f.kind === 'lose' && f.player !== seatV && f.char !== null) throw new Error('flash rahasia bocor'); });
        v.log.forEach((l) => { if (l.m === 'loseSecret' && l.a.char) throw new Error('log rahasia bocor'); });
      }
      if (mode !== 'classic' && v.players.some((p) => p.cards.some((c) => c.revealed))) throw new Error('mode bottom tak boleh ada kartu terbuka');
    }
    if (++steps > 3000) throw new Error('terlalu panjang game ' + g);
  }
  if (s.winner === null) throw new Error('tanpa pemenang');
  if (s.players.filter((p) => p.alive).length !== 1) throw new Error('pemenang tidak unik');
  winsBySeat[s.winner] = (winsBySeat[s.winner] || 0) + 1;
  games++; totalSteps += steps; maxSteps = Math.max(maxSteps, steps);
}
console.log(`OK: ${games} game, rata-rata ${(totalSteps / games).toFixed(1)} langkah (maks ${maxSteps}), ${challenges} tantangan`);

// --- tes aturan spesifik ---
function fixed(cards, coins, settings = { discard: 'classic' }) {
  const s = createGame(['A', 'B', 'C'], () => 0.0, settings);
  s.turn = 0;
  cards.forEach((pair, i) => { s.players[i].cards = pair.map((ch) => ({ char: ch, revealed: false })); });
  coins.forEach((c, i) => { s.players[i].coins = c; });
  return s;
}
const mv = (s, m) => { const r = applyMove(s, m); if (!r.ok) throw new Error(r.error); return r.state; };
const assert = (c, msg) => { if (!c) throw new Error('GAGAL: ' + msg); };

// 1) Tax tanpa tantangan
let s = fixed([['duke', 'duke'], ['captain', 'captain'], ['contessa', 'contessa']], [2, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'tax' });
assert(s.phase === 'challenge', 'tax -> challenge');
s = mv(s, { type: 'pass', by: 1 }); s = mv(s, { type: 'pass', by: 2 });
assert(s.players[0].coins === 5 && s.turn === 1, 'tax +3 dan giliran pindah');

// 2) Tantangan gagal: penantang kehilangan kartu, aksi tetap jalan
s = fixed([['duke', 'duke'], ['captain', 'captain'], ['contessa', 'contessa']], [2, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'tax' });
s = mv(s, { type: 'challenge', by: 1 });
assert(s.phase === 'lose' && s.lose.player === 1, 'penantang harus buang kartu');
s = mv(s, { type: 'lose', by: 1, index: 0 });
assert(s.phase === 'action' && s.turn === 1, 'klaim terverifikasi, aksi langsung jalan');
assert(s.players[0].coins === 5, 'tax tetap jalan');
assert(s.players[0].cards.length === 2, 'kartu duke diganti');

// 3) Bohong ketahuan saat Assassinate: koin kembali
s = fixed([['captain', 'captain'], ['captain', 'captain'], ['contessa', 'contessa']], [3, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'assassinate', target: 1 });
assert(s.players[0].coins === 0, 'koin dibayar');
s = mv(s, { type: 'challenge', by: 2 });
s = mv(s, { type: 'lose', by: 0, index: 0 });
assert(s.players[0].coins === 3 && s.turn === 1, 'koin dikembalikan, giliran pindah');

// 4) Assassinate asli ditantang target: kehilangan 2 kartu → tersingkir
s = fixed([['assassin', 'duke'], ['captain', 'duke'], ['contessa', 'contessa']], [3, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'assassinate', target: 1 });
s = mv(s, { type: 'challenge', by: 1 });
s = mv(s, { type: 'lose', by: 1, index: 0 });
assert(s.phase === 'block', 'jendela blokir langsung terbuka');
s = mv(s, { type: 'pass', by: 1 });
assert(s.phase === 'lose' || !s.players[1].alive, 'target kehilangan kartu kedua');
if (s.phase === 'lose') s = mv(s, { type: 'lose', by: 1, index: 1 });
assert(!s.players[1].alive, 'B tersingkir');

// 5) Contessa memblokir, ditantang, benar-benar punya
s = fixed([['assassin', 'duke'], ['contessa', 'duke'], ['captain', 'captain']], [3, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'assassinate', target: 1 });
s = mv(s, { type: 'pass', by: 1 }); s = mv(s, { type: 'pass', by: 2 });
s = mv(s, { type: 'block', by: 1, char: 'contessa' });
assert(s.phase === 'blockChallenge', 'tantang blokir');
s = mv(s, { type: 'challenge', by: 0 });
s = mv(s, { type: 'lose', by: 0, index: 0 });
assert(s.players[0].coins === 0 && s.turn === 1, 'koin hangus karena diblokir');

// 6) Foreign aid diblokir Duke tanpa tantangan
s = fixed([['captain', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [2, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'foreignAid' });
s = mv(s, { type: 'block', by: 2, char: 'duke' });
s = mv(s, { type: 'pass', by: 0 }); s = mv(s, { type: 'pass', by: 1 });
assert(s.players[0].coins === 2 && s.turn === 1, 'bantuan asing gagal');

// 7) 10 koin wajib kudeta; kudeta 7 koin
s = fixed([['captain', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [10, 2, 2]);
assert(!applyMove(s, { type: 'action', by: 0, action: 'income' }).ok, 'wajib coup');
s = mv(s, { type: 'action', by: 0, action: 'coup', target: 1 });
s = mv(s, { type: 'lose', by: 1, index: 1 });
assert(s.players[0].coins === 3 && s.players[1].cards[1].revealed, 'coup bekerja');

// 8) Exchange
s = fixed([['duke', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [2, 2, 2]);
s = mv(s, { type: 'action', by: 0, action: 'exchange' });
s = mv(s, { type: 'pass', by: 1 }); s = mv(s, { type: 'pass', by: 2 });
assert(s.phase === 'exchange' && s.exch.options.length === 4, 'exchange 4 opsi');
const opts = s.exch.options;
s = mv(s, { type: 'exchange', by: 0, keep: [2, 3] });
assert(s.players[0].cards[0].char === opts[2] && s.players[0].cards[1].char === opts[3], 'kartu diganti');
assert(s.deck.length === 15 - 6, 'dek tetap');

// 9) Steal dengan koin target < 2
s = fixed([['captain', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [2, 1, 2]);
s = mv(s, { type: 'action', by: 0, action: 'steal', target: 1 });
s = mv(s, { type: 'pass', by: 1 }); s = mv(s, { type: 'pass', by: 2 });
s = mv(s, { type: 'pass', by: 1 });
assert(s.players[0].coins === 3 && s.players[1].coins === 0, 'steal hanya 1');

// 10) tolak gerakan ilegal
s = fixed([['captain', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [2, 2, 2]);
assert(!applyMove(s, { type: 'action', by: 1, action: 'income' }).ok, 'bukan giliran');
assert(!applyMove(s, { type: 'action', by: 0, action: 'coup', target: 1 }).ok, 'koin kurang');
assert(!applyMove(s, { type: 'action', by: 0, action: 'steal', target: 0 }).ok, 'target diri sendiri');

// 11) mode bottom: kartu hilang masuk dasar dek & diambil paling akhir
s = fixed([['captain', 'captain'], ['duke', 'assassin'], ['contessa', 'contessa']], [10, 2, 2], { discard: 'bottom' });
const deckBefore = s.deck.length, top = s.deck[s.deck.length - 1];
s = mv(s, { type: 'action', by: 0, action: 'coup', target: 1 });
s = mv(s, { type: 'lose', by: 1, index: 1 }); // buang assassin
assert(s.players[1].cards.length === 1 && s.deck.length === deckBefore + 1, 'kartu pindah ke dek');
assert(s.deck[0] === 'assassin' && s.deck[s.deck.length - 1] === top, 'masuk dasar dek, bukan atas');
assert(s.flashes[0].toDeck && !s.flashes[0].secret, 'flash toDeck publik');
// 12) mode bottomSecret: tidak ada yang tahu kartunya
s = fixed([['captain', 'captain'], ['duke', 'assassin'], ['contessa', 'contessa']], [10, 2, 2], { discard: 'bottomSecret' });
s = mv(s, { type: 'action', by: 0, action: 'coup', target: 1 });
s = mv(s, { type: 'lose', by: 1, index: 0 });
const v2 = viewFor(s, 2);
assert(v2.flashes[0].char === null && !JSON.stringify(v2.log).includes('duke'), 'rahasia tidak bocor ke pemain lain');
assert(viewFor(s, 1).flashes[0].char === 'duke', 'pemilik tahu');
// 13) mode bottom: exchange mengembalikan ke dasar dek
s = fixed([['duke', 'captain'], ['duke', 'duke'], ['contessa', 'contessa']], [2, 2, 2], { discard: 'bottom' });
s = mv(s, { type: 'action', by: 0, action: 'exchange' });
s = mv(s, { type: 'pass', by: 1 }); s = mv(s, { type: 'pass', by: 2 });
const o2 = s.exch.options;
s = mv(s, { type: 'exchange', by: 0, keep: [0, 1] });
assert(s.deck[0] === o2[2] || s.deck[0] === o2[3], 'dikembalikan ke dasar dek');
assert(s.deck.length === 9, 'jumlah dek');

console.log('OK: semua tes aturan lulus');
