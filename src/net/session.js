// Sesi multiplayer P2P (host-authoritative). Host memegang state asli; klien hanya menerima "view"
// miliknya (kartu lawan disembunyikan) dan mengirim gerakan. Tidak butuh server game sendiri.
import { createGame, applyMove, viewFor, whoMustAct } from '../game/engine.js';
import { botMove } from '../game/bot.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/rules.js';

export const PREFIX = 'coup-royale-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const BOT_NAMES = ['Bot Arya', 'Bot Bima', 'Bot Citra', 'Bot Dewi', 'Bot Eka', 'Bot Fajar'];

const initial = {
  role: null, // 'host' | 'client'
  status: 'idle', // idle | connecting | connected | reconnecting | error
  error: null,
  code: null,
  mode: 'menu', // menu | lobby | game
  players: [], // [{name, bot, connected}]
  you: null,
  view: null,
  notice: null,
  offline: false,
};

export class Session {
  constructor({ Peer, peerOptions = {}, token, rnd = Math.random, graceMs = 12000, botDelay = [900, 900], flashDelay = 1800, tickMs = 2000 }) {
    this.Peer = Peer;
    this.peerOptions = peerOptions;
    this.token = token || Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.rnd = rnd;
    this.graceMs = graceMs;
    this.botDelay = botDelay;
    this.flashDelay = flashDelay;
    this.tickMs = tickMs;
    this.listeners = new Set();
    this.snap = { ...initial };
    this.peer = null;
    this.conn = null;
    this.players = [];
    this.state = null;
    this.timer = null;
    this.tick = null;
    this.closed = false;
    this.lastFlashAt = 0;
  }

  /* ---------- store ---------- */
  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getSnapshot = () => this.snap;
  set(patch) { this.snap = { ...this.snap, ...patch }; this.listeners.forEach((f) => f()); }

  /* ================= HOST ================= */
  hostGame(name, attempt = 0) {
    this.reset();
    this.set({ role: 'host', status: 'connecting', mode: 'menu', error: null });
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(this.rnd() * CODE_CHARS.length)]).join('');
    const peer = new this.Peer(PREFIX + code, this.peerOptions);
    this.peer = peer;
    this.players = [{ name: name || 'Host', token: this.token, conn: null, bot: false, connected: true, since: 0 }];
    peer.on('open', () => {
      this.set({ code, status: 'connected', mode: 'lobby', you: 0 });
      this.broadcast();
      this.tick = setInterval(() => this.scheduleBots(), this.tickMs);
    });
    peer.on('connection', (conn) => this.onConnection(conn));
    peer.on('error', (err) => {
      if (err?.type === 'unavailable-id' && attempt < 6) {
        try { peer.destroy(); } catch { /* */ }
        return this.hostGame(name, attempt + 1);
      }
      this.set({ status: 'error', error: friendlyError(err) });
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* */ } });
  }

  // Mode latihan: tanpa jaringan sama sekali (host lokal + bot).
  soloGame(name) {
    this.reset();
    this.players = [{ name: name || 'Kamu', token: this.token, conn: null, bot: false, connected: true, since: 0 }];
    this.set({ role: 'host', status: 'connected', mode: 'lobby', you: 0, code: 'SOLO', offline: true, error: null });
    this.tick = setInterval(() => this.scheduleBots(), this.tickMs);
    this.addBot(); this.addBot();
  }

  onConnection(conn) {
    conn.on('data', (msg) => this.onData(conn, msg));
    conn.on('close', () => this.onClose(conn));
    conn.on('error', () => this.onClose(conn));
  }

  onData(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      const name = String(msg.name || 'Pemain').slice(0, 14);
      let seat = this.players.findIndex((p) => p.token === msg.token);
      if (seat >= 0) {
        const p = this.players[seat];
        if (p.conn && p.conn !== conn) { try { p.conn.close(); } catch { /* */ } }
        p.conn = conn; p.connected = true; p.since = 0; p.bot = false;
      } else if (this.state) {
        return send(conn, { t: 'reject', reason: 'Permainan sudah berjalan.' });
      } else if (this.players.length >= MAX_PLAYERS) {
        return send(conn, { t: 'reject', reason: 'Ruangan penuh (maks 6 pemain).' });
      } else {
        this.players.push({ name: uniqueName(this.players, name), token: msg.token, conn, bot: false, connected: true, since: 0 });
      }
      this.broadcast();
      this.scheduleBots();
    } else if (msg.t === 'move') {
      const seat = this.players.findIndex((p) => p.conn === conn);
      if (seat < 0 || !this.state) return;
      const r = this.applyFrom(seat, msg.move);
      if (!r.ok) send(conn, { t: 'error', msg: r.error });
    } else if (msg.t === 'leave') {
      this.onClose(conn, true);
    }
  }

  onClose(conn, left = false) {
    const seat = this.players.findIndex((p) => p.conn === conn);
    if (seat < 0) return;
    const p = this.players[seat];
    p.conn = null;
    p.connected = false;
    p.since = Date.now();
    if (!this.state || left) {
      if (!this.state) this.players.splice(seat, 1);
      else p.bot = true; // keluar dengan sengaja saat game: digantikan bot
    }
    this.broadcast();
    this.scheduleBots();
  }

  applyFrom(seat, move) {
    if (!move || typeof move !== 'object') return { ok: false, error: 'Gerakan rusak.' };
    return this.apply({ ...move, by: seat }); // `by` selalu ditimpa dari koneksi: tak bisa memalsukan pemain lain
  }

  apply(move) {
    const r = applyMove(this.state, move);
    if (r.ok) {
      this.state = r.state;
      if (r.state.flashes.length) this.lastFlashAt = Date.now();
      this.broadcast();
      this.scheduleBots();
    }
    return r;
  }

  publicPlayers() {
    return this.players.map((p) => ({ name: p.name, bot: p.bot, connected: p.connected || p.bot }));
  }

  broadcast() {
    const players = this.publicPlayers();
    this.players.forEach((p, i) => {
      const msg = this.state
        ? { t: 'game', view: viewFor(this.state, i), players, you: i }
        : { t: 'lobby', players, you: i };
      if (i === 0) this.set({ mode: this.state ? 'game' : 'lobby', players, you: 0, view: this.state ? msg.view : null });
      else if (p.conn) send(p.conn, msg);
    });
  }

  // ---- aksi host ----
  addBot() {
    if (this.state || this.players.length >= MAX_PLAYERS) return;
    const used = new Set(this.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) || 'Bot ' + this.players.length;
    this.players.push({ name, token: 'bot-' + name, conn: null, bot: true, connected: true, since: 0 });
    this.broadcast();
  }

  removeSeat(seat) {
    if (this.state || seat === 0 || !this.players[seat]) return;
    const p = this.players[seat];
    if (p.conn) { send(p.conn, { t: 'kicked' }); try { p.conn.close(); } catch { /* */ } }
    this.players.splice(seat, 1);
    this.broadcast();
  }

  startGame() {
    if (this.state || this.players.length < MIN_PLAYERS) return;
    this.state = createGame(this.players.map((p) => p.name), this.rnd);
    this.players.forEach((p) => { if (!p.bot && !p.connected) { p.bot = true; } });
    this.lastFlashAt = Date.now();
    this.broadcast();
    this.scheduleBots();
  }

  rematch() {
    if (this.snap.role !== 'host' || !this.state) return;
    clearTimeout(this.timer); this.timer = null;
    this.state = null;
    this.players = this.players.filter((p) => p.bot || p.connected);
    this.broadcast();
  }

  isAuto(i) {
    const p = this.players[i];
    return !!p && (p.bot || (!p.connected && Date.now() - p.since > this.graceMs));
  }

  scheduleBots() {
    if (this.snap.role !== 'host' || this.timer || !this.state || this.state.phase === 'over') return;
    if (!whoMustAct(this.state).some((i) => this.isAuto(i))) return;
    const [lo, hi] = this.botDelay;
    const extra = Date.now() - this.lastFlashAt < this.flashDelay + 700 ? this.flashDelay : 0; // beri waktu animasi tantangan
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.state || this.closed) return;
      const seats = whoMustAct(this.state).filter((i) => this.isAuto(i));
      if (seats.length) {
        const seat = seats[Math.floor(this.rnd() * seats.length)];
        const mv = botMove(this.state, seat, this.rnd);
        if (mv) this.apply(mv);
      }
      this.scheduleBots();
    }, lo + this.rnd() * (hi - lo) + extra);
  }

  /* ================= CLIENT ================= */
  joinGame(code, name) {
    this.reset();
    code = String(code || '').trim().toUpperCase();
    this.myName = name || 'Pemain';
    this.set({ role: 'client', status: 'connecting', code, error: null, mode: 'menu' });
    this.attempts = 0;
    this.connectToHost();
  }

  connectToHost() {
    if (this.closed) return;
    try { this.peer?.destroy(); } catch { /* */ }
    const peer = new this.Peer(undefined, this.peerOptions);
    this.peer = peer;
    let opened = false;
    const fail = (msg) => {
      if (this.closed || this.peer !== peer) return;
      if (this.snap.mode !== 'menu' && this.attempts < 40) return this.retry();
      this.set({ status: 'error', error: msg });
    };
    const timeout = setTimeout(() => { if (!opened) fail('Tidak bisa terhubung ke ruangan. Cek kode atau koneksi internetmu.'); }, 15000);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + this.snap.code, { reliable: true, serialization: 'json' });
      this.conn = conn;
      conn.on('open', () => {
        opened = true; clearTimeout(timeout);
        this.attempts = 0;
        this.set({ status: 'connected', error: null });
        send(conn, { t: 'join', name: this.myName, token: this.token });
      });
      conn.on('data', (msg) => this.onHostMessage(msg));
      conn.on('close', () => { clearTimeout(timeout); if (this.conn === conn) fail('Koneksi ke host terputus.'); });
      conn.on('error', () => { clearTimeout(timeout); if (this.conn === conn) fail('Koneksi ke host bermasalah.'); });
    });
    peer.on('error', (err) => {
      clearTimeout(timeout);
      if (err?.type === 'peer-unavailable') return this.set({ status: 'error', error: 'Ruangan tidak ditemukan. Cek kodenya.' });
      fail(friendlyError(err));
    });
  }

  retry() {
    this.attempts++;
    this.set({ status: 'reconnecting' });
    setTimeout(() => this.connectToHost(), 2000);
  }

  onHostMessage(msg) {
    if (!msg) return;
    if (msg.t === 'lobby') this.set({ mode: 'lobby', players: msg.players, you: msg.you, view: null, status: 'connected' });
    else if (msg.t === 'game') this.set({ mode: 'game', players: msg.players, you: msg.you, view: msg.view, status: 'connected' });
    else if (msg.t === 'reject') { this.closed = true; this.set({ status: 'error', error: msg.reason, mode: 'menu' }); }
    else if (msg.t === 'kicked') { this.closed = true; this.set({ ...initial, notice: 'Kamu dikeluarkan dari ruangan.' }); }
    else if (msg.t === 'error') this.set({ notice: msg.msg });
  }

  /* ================= umum ================= */
  move(move) {
    if (this.snap.role === 'host') {
      if (!this.state) return;
      const r = this.applyFrom(0, move);
      if (!r.ok) this.set({ notice: r.error });
    } else if (this.conn?.open) send(this.conn, { t: 'move', move });
  }

  reset() {
    this.closed = false;
    clearTimeout(this.timer); this.timer = null;
    clearInterval(this.tick); this.tick = null;
    try { this.conn?.close(); } catch { /* */ }
    try { this.peer?.destroy(); } catch { /* */ }
    this.peer = this.conn = null;
    this.players = []; this.state = null;
  }

  leave() {
    if (this.snap.role === 'client' && this.conn?.open) send(this.conn, { t: 'leave' });
    if (this.snap.role === 'host') this.players.forEach((p, i) => { if (i && p.conn) send(p.conn, { t: 'kicked' }); });
    this.reset();
    this.closed = true;
    this.set({ ...initial });
  }

  clearNotice() { if (this.snap.notice) this.set({ notice: null }); }
}

function send(conn, msg) {
  try { if (conn && conn.open !== false) conn.send(msg); } catch { /* koneksi mati */ }
}

function uniqueName(players, name) {
  let n = name, i = 2;
  while (players.some((p) => p.name === n)) n = `${name} ${i++}`;
  return n;
}

function friendlyError(err) {
  const t = err?.type || '';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed')
    return 'Tidak bisa menghubungi server perantara PeerJS. Cek koneksi internet lalu coba lagi.';
  if (t === 'browser-incompatible') return 'Browser ini tidak mendukung WebRTC.';
  return 'Terjadi kesalahan jaringan' + (t ? ` (${t})` : '') + '.';
}
