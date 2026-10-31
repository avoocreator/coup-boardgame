import { newRoom, dispatch } from '../game/room.js';

const initial = {
  status: 'idle',
  error: null,
  notice: null,
  code: null,
  mode: 'menu',
  players: [],
  you: null,
  isHost: false,
  settings: { discard: 'bottom' },
  view: null,
  offline: false,
};

class RemoteTransport {
  constructor(url) { this.url = url; }
  async request(body) {
    const r = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }
}

class LocalTransport {
  constructor() { this.room = null; }
  async request(body) {
    const now = Date.now();
    if (body.op === 'create') {
      this.room = newRoom('SOLO', body.name, body.token, now);
      return dispatch(this.room, { op: 'state', token: body.token }, now).out;
    }
    if (!this.room) return { ok: false, error: 'err.noRoom' };
    const r = dispatch(this.room, body, now);
    return r.ok ? r.out : { ok: false, error: r.error };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeToken() {
  try {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join(''); }
}

export class Session {
  constructor({ token, apiUrl = '/api/game', pollMs = 800, localPollMs = 250 }) {
    this.token = token || makeToken();
    this.remote = new RemoteTransport(apiUrl);
    this.tr = this.remote;
    this.pollMs = pollMs;
    this.localPollMs = localPollMs;
    this.listeners = new Set();
    this.snap = { ...initial };
    this.rev = 0;
    this.loopId = 0;
    this.fails = 0;
  }

  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getSnapshot = () => this.snap;
  set(patch) { this.snap = { ...this.snap, ...patch }; this.listeners.forEach((f) => f()); }
  clearNotice() { if (this.snap.notice) this.set({ notice: null }); }

  // room flow
  async createRoom(name) {
    this.reset();
    this.set({ status: 'connecting', error: null });
    const res = await this.safe({ op: 'create', name });
    if (!res) return this.set({ status: 'error', error: 'err.network' });
    if (!res.ok) return this.set({ status: 'error', error: res.error });
    this.enter(res.snap, name);
  }

  async joinGame(code, name, { silent = false } = {}) {
    this.reset();
    this.set({ status: 'connecting', error: null, code: String(code).toUpperCase() });
    const res = await this.safe({ op: 'join', code: String(code).toUpperCase(), name });
    if (!res) return this.fail('err.network', silent);
    if (!res.ok) return this.fail(res.error, silent);
    this.enter(res.snap, name);
  }

  async soloGame(name) {
    this.reset();
    this.tr = new LocalTransport();
    this.set({ status: 'connecting', offline: true });
    const res = await this.tr.request({ op: 'create', name, token: this.token });
    this.enter(res.snap, name, true);
    await this.call({ op: 'addBot' });
    await this.call({ op: 'addBot' });
  }

  enter(snap, name, offline = false) {
    this.rev = 0;
    this.apply(snap);
    this.set({ status: 'connected', error: null, offline });
    if (!offline) { try { sessionStorage.setItem('coup.resume', JSON.stringify({ code: snap.code, name })); } catch { /* */ } }
    this.startLoop(offline ? this.localPollMs : this.pollMs);
  }

  // reconnect kursi lama
  async resume() {
    let r = null;
    try { r = JSON.parse(sessionStorage.getItem('coup.resume') || 'null'); } catch { /* */ }
    if (r?.code) await this.joinGame(r.code, r.name || 'Player', { silent: true });
  }

  fail(error, silent) {
    if (silent) { try { sessionStorage.removeItem('coup.resume'); } catch { /* */ } return this.set({ ...initial }); }
    return this.set({ status: 'error', error });
  }

  async leave() {
    if (this.snap.mode !== 'menu') { try { await this.tr.request({ op: 'leave', code: this.snap.code, token: this.token }); } catch { /* */ } }
    this.reset();
    this.set({ ...initial });
  }

  reset() {
    this.loopId++;
    this.tr = this.remote;
    this.rev = 0;
    this.fails = 0;
    try { sessionStorage.removeItem('coup.resume'); } catch { /* */ }
  }

  // request helper
  async safe(body) {
    try {
      const res = await this.tr.request({ ...body, token: this.token });
      this.fails = 0;
      return res;
    } catch { return null; }
  }

  apply(snap) {
    if (!snap || snap.rev < this.rev) return;
    this.rev = snap.rev;
    this.set({ code: snap.code, mode: snap.mode, you: snap.you, isHost: snap.isHost, players: snap.players, settings: snap.settings, view: snap.view });
  }

  async call(body) {
    const id = this.loopId;
    const res = await this.safe({ ...body, code: this.snap.code, rev: body.op === 'state' ? this.rev : undefined });
    if (id !== this.loopId) return null;
    if (!res) {
      this.fails++;
      if (this.snap.mode !== 'menu') this.set({ status: this.fails >= 20 ? 'error' : 'reconnecting', error: this.fails >= 20 ? 'err.lost' : null });
      return null;
    }
    if (this.snap.status === 'reconnecting') this.set({ status: 'connected' });
    if (!res.ok) {
      if (res.error === 'err.noRoom' || res.error === 'err.notInRoom') { this.reset(); this.set({ ...initial, error: res.error, status: 'error' }); }
      else if (res.error !== 'err.busy' || body.op !== 'state') this.set({ notice: res.error });
      return res;
    }
    if (res.left) { this.reset(); this.set({ ...initial }); return res; }
    if (res.snap) this.apply(res.snap);
    return res;
  }

  startLoop(ms) {
    const id = ++this.loopId;
    (async () => {
      while (id === this.loopId) {
        await sleep(ms);
        if (id !== this.loopId) break;
        await this.call({ op: 'state' });
      }
    })();
  }

  // aksi room & game
  addBot() { return this.call({ op: 'addBot' }); }
  removeSeat(seat) { return this.call({ op: 'kick', seat }); }
  setSettings(patch) { return this.call({ op: 'settings', patch }); }
  startGame() { return this.call({ op: 'start' }); }
  rematch() { return this.call({ op: 'rematch' }); }
  move(move) { return this.call({ op: 'move', move }); }
}

function getToken() {
  try {
    let t = localStorage.getItem('coup.token2');
    if (!t) { t = makeToken(); localStorage.setItem('coup.token2', t); }
    return t;
  } catch { return makeToken(); }
}

export const session = new Session({ token: getToken() });
