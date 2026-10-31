// Bot sederhana — juga dipakai untuk menggantikan pemain yang terputus.
import { ACTIONS } from './rules.js';
import { pendingResponders, knownCopies } from './engine.js';

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export function botMove(s, seat, rnd = Math.random) {
  const me = s.players[seat];
  if (!me || !me.alive || s.phase === 'over') return null;
  const others = s.players.map((p, i) => (p.alive && i !== seat ? i : -1)).filter((i) => i >= 0);
  const holds = (ch) => me.cards.some((c) => !c.revealed && c.char === ch);

  switch (s.phase) {
    case 'action': {
      if (s.turn !== seat) return null;
      const mv = (action, target = null) => ({ type: 'action', by: seat, action, target });
      const richest = [...others].sort((a, b) => s.players[b].coins - s.players[a].coins)[0];
      if (me.coins >= 10) return mv('coup', richest);
      if (me.coins >= 7 && rnd() < 0.85) return mv('coup', rnd() < 0.5 ? richest : pick(others, rnd));
      const opts = [['income', 1], ['foreignAid', 2], ['tax', 3], ['exchange', 1]];
      if (me.coins >= 3) opts.push(['assassinate', 3]);
      const robbable = others.filter((o) => s.players[o].coins > 0);
      if (robbable.length) opts.push(['steal', 2]);
      const total = opts.reduce((a, o) => a + o[1], 0);
      let r = rnd() * total;
      let chosen = opts[0][0];
      for (const [id, w] of opts) { if ((r -= w) <= 0) { chosen = id; break; } }
      if (chosen === 'steal') return mv('steal', pick(robbable, rnd));
      if (chosen === 'assassinate') return mv('assassinate', rnd() < 0.5 ? richest : pick(others, rnd));
      return mv(chosen);
    }
    case 'challenge': {
      if (!pendingResponders(s).includes(seat)) return null;
      const claim = s.act.claim;
      if (knownCopies(s, seat, claim) >= 3) return { type: 'challenge', by: seat };
      let chance = 0.08;
      if (s.act.type === 'assassinate' && s.act.target === seat) chance = 0.4;
      return rnd() < chance ? { type: 'challenge', by: seat } : { type: 'pass', by: seat };
    }
    case 'block': {
      if (!pendingResponders(s).includes(seat)) return null;
      const def = ACTIONS[s.act.type];
      const targeted = s.act.target === seat;
      const real = def.blockedBy.find(holds);
      if (real && rnd() < 0.9) return { type: 'block', by: seat, char: real };
      let bluff = 0;
      if (s.act.type === 'foreignAid') bluff = 0.08;
      else if (targeted && s.act.type === 'assassinate') bluff = 0.5;
      else if (targeted && s.act.type === 'steal') bluff = 0.25;
      if (rnd() < bluff) return { type: 'block', by: seat, char: pick(def.blockedBy, rnd) };
      return { type: 'pass', by: seat };
    }
    case 'blockChallenge': {
      if (!pendingResponders(s).includes(seat)) return null;
      if (knownCopies(s, seat, s.block.char) >= 3) return { type: 'challenge', by: seat };
      const chance = s.act.actor === seat ? 0.3 : 0.07;
      return rnd() < chance ? { type: 'challenge', by: seat } : { type: 'pass', by: seat };
    }
    case 'lose': {
      if (s.lose.player !== seat) return null;
      const open = me.cards.map((c, i) => (c.revealed ? -1 : i)).filter((i) => i >= 0);
      return { type: 'lose', by: seat, index: pick(open, rnd) };
    }
    case 'exchange': {
      if (s.act.actor !== seat) return null;
      const { options, keep } = s.exch;
      const idx = options.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      return { type: 'exchange', by: seat, keep: idx.slice(0, keep) };
    }
    default: return null;
  }
}
