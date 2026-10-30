// Logika ruangan (lobby + game) yang dijalankan "Game Master": di Vercel Function (online) atau di memori (latihan offline).
// Pemain TIDAK PERNAH memegang state asli — mereka hanya menerima snapshot() miliknya sendiri.
import { createGame, applyMove, viewFor, whoMustAct } from './engine.js';
import { botMove } from './bot.js';
import { MAX_PLAYERS, MIN_PLAYERS, normalizeSettings } from './rules.js';

export const GRACE_MS = 12000; // pemain tak aktif selama ini → bot mengambil alih
const TOUCH_MS = 5000; // seberapa sering "terakhir terlihat" disimpan
const BOT_NAMES = ['Bot Arya', 'Bot Bima', 'Bot Citra', 'Bot Dewi', 'Bot Eka', 'Bot Fajar'];
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function randomCode(rnd = Math.random) {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rnd() * CODE_CHARS.length)]).join('');
}

const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Player';
function uniqueName(players, name) {
  let n = name, i = 2;
  while (players.some((p) => p.name === n)) n = `${name} ${i++}`;
  return n;
}

export function newRoom(code, name, token, now) {
  return {
    code, rev: 1, createdAt: now, closed: false,
    players: [{ name: cleanName(name), token, bot: false, lastSeen: now }],
    settings: normalizeSettings(),
    state: null, botAt: null, flashAt: 0,
  };
}

const seatOf = (room, token) => (token ? room.players.findIndex((p) => !p.bot && p.token === token) : -1);
const hostSeat = (room) => room.players.findIndex((p) => !p.bot);
const isAuto = (room, i, now) => { const p = room.players[i]; return !!p && (p.bot || now - p.lastSeen > GRACE_MS); };
const connected = (p, now) => p.bot || now - p.lastSeen < GRACE_MS;

/* ---------- snapshot untuk satu pemain ---------- */
export function snapshot(room, token, now) {
  const seat = seatOf(room, token);
  if (seat < 0) return null;
  return {
    rev: room.rev,
    code: room.code,
    mode: room.state ? 'game' : 'lobby',
    you: seat,
    isHost: seat === hostSeat(room),
    settings: room.state ? room.state.settings : room.settings,
    players: room.players.map((p) => ({ name: p.name, bot: p.bot, connected: connected(p, now) })),
    view: room.state ? viewFor(room.state, seat) : null,
  };
}

/* ---------- operasi ---------- */
// Mengembalikan { ok, error?, persist } — persist: perlu disimpan ke penyimpanan.
function handle(room, body, now) {
  const op = body.op;
  const seat = seatOf(room, body.token);

  if (op === 'join') {
    if (seat >= 0) { room.players[seat].lastSeen = now; return { ok: true, persist: true }; }
    if (room.state) return { ok: false, error: 'err.started' };
    if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'err.full' };
    room.players.push({ name: uniqueName(room.players, cleanName(body.name)), token: body.token, bot: false, lastSeen: now });
    room.rev++;
    return { ok: true, persist: true };
  }
  if (seat < 0) return { ok: false, error: 'err.notInRoom' };
  const me = room.players[seat];
  const stale = now - me.lastSeen > TOUCH_MS;
  me.lastSeen = now;

  const isHost = seat === hostSeat(room);
  const hostOnly = () => (isHost ? null : { ok: false, error: 'err.hostOnly' });

  switch (op) {
    case 'state': return { ok: true, persist: stale };
    case 'move': {
      if (!room.state) return { ok: false, error: 'err.noGame' };
      if (!body.move || typeof body.move !== 'object') return { ok: false, error: 'err.unknownMove' };
      const r = applyMove(room.state, { ...body.move, by: seat }); // `by` selalu dari token: tak bisa memalsukan pemain lain
      if (!r.ok) return { ok: false, error: r.error };
      room.state = r.state;
      if (r.state.flashes.length) room.flashAt = now;
      room.botAt = null;
      room.rev++;
      return { ok: true, persist: true };
    }
    case 'addBot': {
      const e = hostOnly(); if (e) return e;
      if (room.state || room.players.length >= MAX_PLAYERS) return { ok: false, error: 'err.full' };
      const used = new Set(room.players.map((p) => p.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) || 'Bot ' + room.players.length;
      room.players.push({ name, token: null, bot: true, lastSeen: now });
      room.rev++;
      return { ok: true, persist: true };
    }
    case 'kick': {
      const e = hostOnly(); if (e) return e;
      const k = body.seat;
      if (room.state || !Number.isInteger(k) || k === seat || !room.players[k]) return { ok: false, error: 'err.badTarget' };
      room.players.splice(k, 1);
      room.rev++;
      return { ok: true, persist: true, kicked: true };
    }
    case 'settings': {
      const e = hostOnly(); if (e) return e;
      if (room.state) return { ok: false, error: 'err.started' };
      room.settings = normalizeSettings({ ...room.settings, ...(body.patch || {}) });
      room.rev++;
      return { ok: true, persist: true };
    }
    case 'start': {
      const e = hostOnly(); if (e) return e;
      if (room.state || room.players.length < MIN_PLAYERS) return { ok: false, error: 'err.needPlayers' };
      room.state = createGame(room.players.map((p) => p.name), Math.random, room.settings);
      room.players.forEach((p) => { p.lastSeen = now; });
      room.botAt = null; room.flashAt = now;
      room.rev++;
      return { ok: true, persist: true };
    }
    case 'rematch': {
      const e = hostOnly(); if (e) return e;
      if (!room.state) return { ok: false, error: 'err.noGame' };
      room.state = null; room.botAt = null;
      room.players = room.players.filter((p) => p.bot || connected(p, now));
      room.rev++;
      return { ok: true, persist: true };
    }
    case 'leave': {
      if (room.state) { me.bot = true; me.token = null; } // saat game: digantikan bot
      else room.players.splice(seat, 1);
      if (!room.players.some((p) => !p.bot)) room.closed = true;
      room.rev++;
      return { ok: true, persist: true, left: true };
    }
    default: return { ok: false, error: 'err.unknownOp' };
  }
}

/* ---------- bot / pemain terputus digerakkan secara "malas" (tiap ada request) ---------- */
export function tick(room, now, rnd = Math.random) {
  const s = room.state;
  if (!s || s.phase === 'over') { if (room.botAt !== null) { room.botAt = null; return true; } return false; }
  const seats = whoMustAct(s).filter((i) => isAuto(room, i, now));
  if (!seats.length) { if (room.botAt !== null) { room.botAt = null; return true; } return false; }
  const speed = globalThis.__coupBotSpeed || 1; // hanya dipakai tes untuk mempercepat
  const delay = () => (900 + rnd() * 800 + (now - room.flashAt < 2500 ? 1800 : 0)) * speed; // beri waktu animasi tantangan
  if (room.botAt === null) { room.botAt = now + delay(); return true; }
  if (now < room.botAt) return false;
  const seat = seats[Math.floor(rnd() * seats.length)];
  const mv = botMove(s, seat, rnd);
  room.botAt = null;
  if (mv) {
    const r = applyMove(s, mv);
    if (r.ok) {
      room.state = r.state;
      if (r.state.flashes.length) room.flashAt = now;
      room.rev++;
    }
  }
  const next = whoMustAct(room.state).filter((i) => isAuto(room, i, now));
  if (next.length && room.state.phase !== 'over') room.botAt = now + delay();
  return true;
}

// Satu pintu masuk untuk server maupun mode lokal.
export function dispatch(room, body, now = Date.now(), rnd = Math.random) {
  const r = handle(room, body, now);
  if (!r.ok) return r;
  let persist = r.persist;
  if (tick(room, now, rnd)) persist = true;
  if (r.left || r.kicked) {
    // yang keluar/dikeluarkan tidak lagi punya kursi; kirim konfirmasi tanpa snapshot
    return { ok: true, persist, out: { ok: true, left: true } };
  }
  const snap = snapshot(room, body.token, now);
  if (!snap) return { ok: false, error: 'err.notInRoom' };
  if (body.rev === snap.rev && body.op === 'state') return { ok: true, persist, out: { ok: true, same: true } };
  return { ok: true, persist, out: { ok: true, snap } };
}
