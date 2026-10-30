// Engine Coup — fungsi murni. State disimpan oleh host, semua gerakan divalidasi di sini.
import { CHARS, CHAR_INFO, ACTIONS } from './rules.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

export function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createGame(names, rnd = Math.random) {
  const deck = [];
  for (const c of CHARS) for (let i = 0; i < 3; i++) deck.push(c);
  shuffle(deck, rnd);
  const players = names.map((name) => ({
    name,
    coins: 2,
    alive: true,
    cards: [
      { char: deck.pop(), revealed: false },
      { char: deck.pop(), revealed: false },
    ],
  }));
  const first = Math.floor(rnd() * players.length);
  if (players.length === 2) players[first].coins = 1; // aturan resmi 2 pemain
  return {
    seq: 0,
    players,
    deck,
    turn: first,
    phase: 'action', // action | challenge | block | blockChallenge | lose | exchange | over
    act: null,
    block: null,
    passed: [],
    lose: null,
    exch: null,
    winner: null,
    flashes: [],
    log: [{ t: `Permainan dimulai! Giliran pertama: ${players[first].name}.`, k: 'sys' }],
  };
}

/* ---------- helper ---------- */
const aliveIdx = (s) => s.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
const nm = (s, i) => s.players[i].name;
const cn = (c) => CHAR_INFO[c].name;
const hidden = (s, p) => s.players[p].cards.filter((c) => !c.revealed);

function say(s, t, k = 'info') {
  s.log.push({ t, k });
  if (s.log.length > 100) s.log.shift();
}

export function pendingResponders(s) {
  let el;
  if (s.phase === 'challenge') el = aliveIdx(s).filter((i) => i !== s.act.actor);
  else if (s.phase === 'block') {
    el = ACTIONS[s.act.type].blockAny
      ? aliveIdx(s).filter((i) => i !== s.act.actor)
      : s.players[s.act.target]?.alive ? [s.act.target] : [];
  } else if (s.phase === 'blockChallenge') el = aliveIdx(s).filter((i) => i !== s.block.blocker);
  else return [];
  return el.filter((i) => !s.passed.includes(i));
}

function checkEnd(s) {
  if (s.phase === 'over') return true;
  const alive = aliveIdx(s);
  if (alive.length <= 1) {
    s.phase = 'over';
    s.winner = alive[0] ?? null;
    s.act = s.block = s.lose = s.exch = null;
    s.passed = [];
    if (s.winner !== null) say(s, `🏆 ${nm(s, s.winner)} memenangkan permainan!`, 'sys');
    return true;
  }
  return false;
}

function endTurn(s) {
  s.act = s.block = s.lose = s.exch = null;
  s.passed = [];
  if (checkEnd(s)) return;
  const n = s.players.length;
  do { s.turn = (s.turn + 1) % n; } while (!s.players[s.turn].alive);
  s.phase = 'action';
  const p = s.players[s.turn];
  say(s, p.coins >= 10 ? `Giliran ${p.name} — wajib Kudeta!` : `Giliran ${p.name}.`, 'turn');
}

function revealCard(s, p, idx) {
  const pl = s.players[p];
  const card = pl.cards[idx];
  card.revealed = true;
  s.flashes.push({ kind: 'lose', player: p, char: card.char });
  say(s, `${pl.name} kehilangan pengaruh: ${cn(card.char)}.`, 'loss');
  if (!pl.cards.some((c) => !c.revealed)) {
    pl.alive = false;
    pl.coins = 0;
    say(s, `${pl.name} tersingkir!`, 'loss');
  }
}

function startLose(s, p, next) {
  const open = s.players[p].cards.map((c, i) => (c.revealed ? -1 : i)).filter((i) => i >= 0);
  if (open.length === 0) return proceed(s, next);
  if (open.length === 1) {
    revealCard(s, p, open[0]);
    return proceed(s, next);
  }
  s.phase = 'lose';
  s.lose = { player: p, next };
}

function proceed(s, next) {
  if (checkEnd(s)) return;
  switch (next) {
    case 'afterActionTruth': return afterActionAccepted(s);
    case 'cancelRefund':
      s.players[s.act.actor].coins += s.act.cost;
      return endTurn(s);
    case 'cancelNoRefund': return endTurn(s);
    case 'resolveAction': return resolveAction(s);
    case 'endTurn': return endTurn(s);
    default: throw new Error('next tidak dikenal: ' + next);
  }
}

function afterActionAccepted(s) {
  const def = ACTIONS[s.act.type];
  const canBlock = def.blockedBy.length > 0 && (def.blockAny || s.players[s.act.target]?.alive);
  if (canBlock) {
    s.phase = 'block';
    s.passed = [];
    return checkWindow(s);
  }
  return resolveAction(s);
}

function checkWindow(s) {
  if (pendingResponders(s).length > 0) return;
  if (s.phase === 'challenge') return afterActionAccepted(s);
  if (s.phase === 'block') return resolveAction(s);
  if (s.phase === 'blockChallenge') {
    say(s, `Blokir ${nm(s, s.block.blocker)} berhasil.`, 'info');
    return proceed(s, 'cancelNoRefund');
  }
}

function resolveChallenge(s, challenger, challenged, char, onChallengerLoses, onChallengedLoses) {
  const p = s.players[challenged];
  const idx = p.cards.findIndex((c) => !c.revealed && c.char === char);
  const truthful = idx >= 0;
  s.flashes.push({ kind: 'challenge', challenger, challenged, char, truthful });
  say(s, `${nm(s, challenger)} menantang ${nm(s, challenged)}!`, 'challenge');
  if (truthful) {
    say(s, `${nm(s, challenged)} memang punya ${cn(char)}! Kartu dikocok ulang dan diganti.`, 'challenge');
    s.deck.push(char);
    shuffle(s.deck);
    p.cards[idx].char = s.deck.pop();
    startLose(s, challenger, onChallengerLoses);
  } else {
    say(s, `${nm(s, challenged)} berbohong, tidak punya ${cn(char)}!`, 'challenge');
    startLose(s, challenged, onChallengedLoses);
  }
}

function resolveAction(s) {
  const a = s.act;
  const actor = s.players[a.actor];
  const t = a.target !== null ? s.players[a.target] : null;
  switch (a.type) {
    case 'income':
      actor.coins += 1;
      say(s, `${actor.name} mendapat 1 koin.`);
      return endTurn(s);
    case 'foreignAid':
      actor.coins += 2;
      say(s, `${actor.name} mendapat 2 koin dari Bantuan Asing.`);
      return endTurn(s);
    case 'tax':
      actor.coins += 3;
      say(s, `${actor.name} memungut 3 koin pajak.`);
      return endTurn(s);
    case 'coup':
      if (!t.alive) return endTurn(s);
      say(s, `${actor.name} mengudeta ${t.name}!`, 'loss');
      return startLose(s, a.target, 'endTurn');
    case 'assassinate':
      if (!t.alive) return endTurn(s);
      say(s, `${actor.name} membunuh pengaruh ${t.name}!`, 'loss');
      return startLose(s, a.target, 'endTurn');
    case 'steal': {
      if (!t.alive) return endTurn(s);
      const n = Math.min(2, t.coins);
      t.coins -= n;
      actor.coins += n;
      say(s, `${actor.name} mencuri ${n} koin dari ${t.name}.`);
      return endTurn(s);
    }
    case 'exchange': {
      const own = hidden(s, a.actor).map((c) => c.char);
      const drawn = [s.deck.pop(), s.deck.pop()];
      s.phase = 'exchange';
      s.exch = { options: [...own, ...drawn], keep: own.length };
      say(s, `${actor.name} menukar kartu dengan dek.`);
      return;
    }
    default: throw new Error('aksi tidak dikenal');
  }
}

/* ---------- API utama ---------- */
export function applyMove(state, m) {
  const s = clone(state);
  s.flashes = [];
  const bad = (error) => ({ ok: false, error, state });
  if (s.phase === 'over') return bad('Permainan sudah selesai.');
  const by = m.by;
  if (!Number.isInteger(by) || !s.players[by] || !s.players[by].alive) return bad('Pemain tidak valid.');

  switch (m.type) {
    case 'action': {
      if (s.phase !== 'action' || by !== s.turn) return bad('Bukan giliranmu.');
      const def = ACTIONS[m.action];
      if (!def) return bad('Aksi tidak dikenal.');
      const me = s.players[by];
      if (me.coins >= 10 && def.id !== 'coup') return bad('Kamu punya 10+ koin: wajib Kudeta!');
      if (me.coins < def.cost) return bad('Koin tidak cukup.');
      let target = null;
      if (def.target) {
        target = m.target;
        if (!Number.isInteger(target) || target === by || !s.players[target]?.alive) return bad('Target tidak valid.');
      }
      me.coins -= def.cost;
      s.act = { actor: by, type: def.id, target, claim: def.claim, cost: def.cost };
      s.block = null;
      s.passed = [];
      const tgt = target !== null ? ` → ${nm(s, target)}` : '';
      const claim = def.claim ? ` (mengaku ${cn(def.claim)})` : '';
      say(s, `${me.name}: ${def.name}${tgt}${claim}`, 'action');
      if (def.claim) {
        s.phase = 'challenge';
        checkWindow(s);
      } else afterActionAccepted(s);
      break;
    }
    case 'pass': {
      if (!['challenge', 'block', 'blockChallenge'].includes(s.phase)) return bad('Tidak ada yang perlu dijawab.');
      if (!pendingResponders(s).includes(by)) return bad('Kamu tidak perlu menjawab.');
      s.passed.push(by);
      checkWindow(s);
      break;
    }
    case 'challenge': {
      if (s.phase === 'challenge') {
        if (!pendingResponders(s).includes(by)) return bad('Kamu tidak bisa menantang.');
        resolveChallenge(s, by, s.act.actor, s.act.claim, 'afterActionTruth', 'cancelRefund');
      } else if (s.phase === 'blockChallenge') {
        if (!pendingResponders(s).includes(by)) return bad('Kamu tidak bisa menantang.');
        resolveChallenge(s, by, s.block.blocker, s.block.char, 'cancelNoRefund', 'resolveAction');
      } else return bad('Tidak ada yang bisa ditantang.');
      break;
    }
    case 'block': {
      if (s.phase !== 'block') return bad('Tidak bisa memblokir sekarang.');
      if (!pendingResponders(s).includes(by)) return bad('Kamu tidak bisa memblokir.');
      if (!ACTIONS[s.act.type].blockedBy.includes(m.char)) return bad('Karakter itu tidak bisa memblokir.');
      s.block = { blocker: by, char: m.char };
      s.phase = 'blockChallenge';
      s.passed = [];
      say(s, `${nm(s, by)} memblokir dengan ${cn(m.char)}!`, 'block');
      checkWindow(s);
      break;
    }
    case 'lose': {
      if (s.phase !== 'lose' || s.lose.player !== by) return bad('Kamu tidak perlu membuang kartu.');
      const card = s.players[by].cards[m.index];
      if (!card || card.revealed) return bad('Kartu tidak valid.');
      const next = s.lose.next;
      s.lose = null;
      revealCard(s, by, m.index);
      proceed(s, next);
      break;
    }
    case 'exchange': {
      if (s.phase !== 'exchange' || by !== s.act.actor) return bad('Bukan giliranmu menukar.');
      const keep = m.keep;
      const { options, keep: k } = s.exch;
      if (!Array.isArray(keep) || keep.length !== k || new Set(keep).size !== k ||
        keep.some((i) => !Number.isInteger(i) || i < 0 || i >= options.length)) return bad('Pilihan kartu tidak valid.');
      const kept = keep.map((i) => options[i]);
      const back = options.filter((_, i) => !keep.includes(i));
      const slots = s.players[by].cards.filter((c) => !c.revealed);
      slots.forEach((c, i) => { c.char = kept[i]; });
      s.deck.push(...back);
      shuffle(s.deck);
      s.exch = null;
      say(s, `${nm(s, by)} selesai menukar kartu.`);
      endTurn(s);
      break;
    }
    default:
      return bad('Gerakan tidak dikenal.');
  }
  s.seq += 1;
  return { ok: true, state: s };
}

// Tampilan untuk satu pemain: kartu lawan yang belum terbuka disembunyikan.
export function viewFor(s, seat) {
  const v = clone(s);
  v.deckCount = v.deck.length;
  delete v.deck;
  v.players.forEach((p, i) => {
    p.cards = p.cards.map((c) => (c.revealed || i === seat ? c : { char: null, revealed: false }));
  });
  if (v.exch && !(v.act && v.act.actor === seat)) v.exch = { options: v.exch.options.map(() => null), keep: v.exch.keep };
  v.you = seat;
  return v;
}

export function whoMustAct(s) {
  // seat yang sedang ditunggu (untuk UI & bot)
  switch (s.phase) {
    case 'action': return [s.turn];
    case 'lose': return [s.lose.player];
    case 'exchange': return [s.act.actor];
    case 'challenge': case 'block': case 'blockChallenge': return pendingResponders(s);
    default: return [];
  }
}

export function knownCopies(s, seat, char) {
  // jumlah kopi karakter yang pasti diketahui `seat`: kartu terbuka + kartu di tangannya
  let n = 0;
  s.players.forEach((p, i) => p.cards.forEach((c) => {
    if (c.char === char && (c.revealed || i === seat)) n++;
  }));
  return n;
}
