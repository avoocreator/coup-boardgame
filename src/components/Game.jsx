import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { asset, stepped } from './Card.jsx';
import Flashes from './Flashes.jsx';
import Rules from './Rules.jsx';
import { Btn, Coins, CoinIcon } from './ui.jsx';
import { ACTIONS, ACTION_ORDER, CHAR_INFO } from '../game/rules.js';
import { pendingResponders } from '../game/engine.js';
import { sfx, isMuted, setMuted } from '../sound.js';

/* ---------- panel pemain ---------- */
function PlayerPanel({ p, i, v, meta, isMe, pickable, onPick, order, losing = false, onLose }) {
  const turn = v.phase !== 'over' && v.turn === i && p.alive;
  const pend = pendingResponders(v).includes(i);
  const m = meta[i] || {};
  const size = isMe ? 'lg' : 'sm';
  return (
    <motion.div
      className={`pp px ${turn ? 'turn' : ''} ${!p.alive ? 'out' : ''} ${pickable ? 'pickable' : ''} ${isMe ? 'me' : ''}`}
      layout
      onClick={pickable ? () => onPick(i) : undefined}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: order * 0.08, ease: stepped(5), duration: 0.3 }}
    >
      <div className="pp-head">
        <span className="avatar" style={{ '--h': i * 62 }}>{m.bot ? '🤖' : p.name[0]?.toUpperCase()}</span>
        <div className="pp-name">
          <b>{p.name}{isMe ? ' (kamu)' : ''}</b>
          <small>
            {!p.alive ? 'TERSINGKIR' : turn ? '▶ GILIRAN' : pend ? '… MENUNGGU' : m.bot ? 'BOT' : !m.connected ? 'OFFLINE' : ' '}
          </small>
        </div>
        <Coins n={p.coins} />
      </div>
      <div className="pp-cards">
        {p.cards.map((c, k) => (
          <Card key={k} char={c.char} faceUp={isMe || c.revealed} dead={c.revealed} size={size} delay={order * 0.1 + k * 0.12}
            selectable={isMe && losing && !c.revealed} onClick={() => onLose?.(k)} />
        ))}
      </div>
      {pickable && <div className="target-tag blink">PILIH!</div>}
    </motion.div>
  );
}

/* ---------- panggung tengah ---------- */
function Stage({ v }) {
  const nm = (i) => v.players[i].name;
  let main; let sub = null;
  if (v.phase === 'over') main = `${nm(v.winner)} MENANG!`;
  else if (v.act) {
    const a = ACTIONS[v.act.type];
    main = `${nm(v.act.actor)} → ${a.name}${v.act.target !== null ? ` → ${nm(v.act.target)}` : ''}`;
    if (a.claim) sub = <span className="claim"><img className="pix mini" src={asset(a.claim)} alt="" /> mengaku {CHAR_INFO[a.claim].name}</span>;
    if (v.block) sub = <span className="claim"><img className="pix mini" src={asset(v.block.char)} alt="" /> {nm(v.block.blocker)} memblokir sebagai {CHAR_INFO[v.block.char].name}</span>;
  } else main = `Giliran ${nm(v.turn)}`;
  return (
    <div className="stage">
      <div className="deck" title="Dek">
        {[0, 1, 2].map((k) => <div key={k} className="deck-card" style={{ '--k': k }}><Card char={null} faceUp={false} size="sm" deal={false} /></div>)}
        <span className="deck-count">{v.deckCount}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={main + (sub ? 'b' : '') + v.seq} className="stage-text px" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: stepped(4) }}>
          <div className="stage-main">{main}</div>
          {sub && <div className="stage-sub">{sub}</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- log ---------- */
function Log({ log }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log.length, log[log.length - 1]?.t]);
  return (
    <div className="log px" ref={ref}>
      {log.slice(-40).map((l, i) => <div key={i} className={`l-${l.k}`}>{l.t}</div>)}
    </div>
  );
}

/* ---------- panel kontrol ---------- */
function Controls({ v, me, send, picking, setPicking }) {
  const pend = pendingResponders(v);
  const meP = v.players[me];
  const nm = (i) => v.players[i].name;
  const [sel, setSel] = useState([]);
  useEffect(() => { setSel([]); }, [v.seq]);

  if (!meP.alive && v.phase !== 'over') return <div className="controls px"><div className="wait">Kamu tersingkir. Tonton sampai selesai…</div></div>;
  if (v.phase === 'over') return null;

  if (v.phase === 'action') {
    if (v.turn !== me) return <div className="controls px"><div className="wait blink">Menunggu {nm(v.turn)}…</div></div>;
    if (picking) {
      const a = ACTIONS[picking];
      const targets = v.players.map((p, i) => ({ p, i })).filter((t) => t.i !== me && t.p.alive);
      return (
        <div className="controls px">
          <div className="ctitle">{a.name}: pilih target</div>
          <div className="targets">
            {targets.map((t) => (
              <Btn key={t.i} kind="red" onClick={() => { send({ type: 'action', action: picking, target: t.i }); setPicking(null); }}>
                {t.p.name} <CoinIcon size={14} /> {t.p.coins}
              </Btn>
            ))}
            <Btn kind="small" onClick={() => setPicking(null)}>BATAL</Btn>
          </div>
        </div>
      );
    }
    return (
      <div className="controls px">
        {meP.coins >= 10 && <div className="ctitle red">Kamu punya 10+ koin — wajib Kudeta!</div>}
        <div className="actions">
          {ACTION_ORDER.map((id, k) => {
            const a = ACTIONS[id];
            const must = meP.coins >= 10 && id !== 'coup';
            const poor = meP.coins < a.cost;
            const off = must || poor;
            return (
              <motion.button
                key={id}
                className="act"
                disabled={off}
                title={a.desc}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: k * 0.04, ease: stepped(4), duration: 0.25 }}
                onMouseEnter={() => !off && sfx.hover()}
                onClick={() => { sfx.click(); if (a.target) setPicking(id); else send({ type: 'action', action: id }); }}
              >
                <span className="aicon">
                  {a.claim ? <img className="pix" src={asset(a.claim)} alt="" /> : id === 'coup' ? <img className="pix" src={asset('skull')} alt="" /> : <CoinIcon size={26} />}
                </span>
                <b>{a.name}</b>
                <small>{a.claim ? `aku ${CHAR_INFO[a.claim].name}` : a.cost ? `${a.cost} koin` : id === 'foreignAid' ? '+2' : '+1'}</small>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  if (v.phase === 'challenge' || v.phase === 'blockChallenge') {
    const claimant = v.phase === 'challenge' ? v.act.actor : v.block.blocker;
    const char = v.phase === 'challenge' ? v.act.claim : v.block.char;
    if (!pend.includes(me)) return <div className="controls px"><div className="wait blink">{pend.length ? `Menunggu ${pend.map(nm).join(', ')}…` : '…'}</div></div>;
    return (
      <div className="controls px">
        <div className="ctitle">{nm(claimant)} mengaku punya <span style={{ color: CHAR_INFO[char].color }}>{CHAR_INFO[char].name}</span>. Percaya?</div>
        <div className="row">
          <Btn kind="red" onClick={() => send({ type: 'challenge' })}>⚔ TANTANG!</Btn>
          <Btn kind="green" onClick={() => send({ type: 'pass' })}>PERCAYA</Btn>
        </div>
      </div>
    );
  }

  if (v.phase === 'block') {
    const def = ACTIONS[v.act.type];
    if (!pend.includes(me)) return <div className="controls px"><div className="wait blink">{pend.length ? `Menunggu ${pend.map(nm).join(', ')}…` : '…'}</div></div>;
    return (
      <div className="controls px">
        <div className="ctitle">{nm(v.act.actor)} memakai {def.name}{v.act.target === me ? ' padamu!' : '.'} Blokir?</div>
        <div className="row">
          {def.blockedBy.map((c) => (
            <Btn key={c} kind="gold" onClick={() => send({ type: 'block', char: c })}>
              <img className="pix mini" src={asset(c)} alt="" /> BLOK: {CHAR_INFO[c].name}
            </Btn>
          ))}
          <Btn kind="green" onClick={() => send({ type: 'pass' })}>LEWATI</Btn>
        </div>
      </div>
    );
  }

  if (v.phase === 'lose') {
    if (v.lose.player !== me) return <div className="controls px"><div className="wait blink">{nm(v.lose.player)} memilih kartu yang dibuang…</div></div>;
    return <div className="controls px"><div className="ctitle red">Pilih kartu yang harus kamu buang ↓ (klik kartumu)</div></div>;
  }

  if (v.phase === 'exchange') {
    if (v.act.actor !== me) return <div className="controls px"><div className="wait blink">{nm(v.act.actor)} menukar kartu…</div></div>;
    const need = v.exch.keep;
    const toggle = (i) => { sfx.click(); setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < need ? [...s, i] : s)); };
    return (
      <div className="controls px">
        <div className="ctitle">Pilih {need} kartu untuk disimpan ({sel.length}/{need})</div>
        <div className="exch">
          {v.exch.options.map((c, i) => (
            <Card key={i} char={c} size="md" selectable selected={sel.includes(i)} onClick={() => toggle(i)} delay={i * 0.1} />
          ))}
        </div>
        <Btn kind="gold" disabled={sel.length !== need} onClick={() => send({ type: 'exchange', keep: sel })}>SIMPAN</Btn>
      </div>
    );
  }
  return null;
}

/* ---------- layar menang ---------- */
function GameOver({ v, snap, session }) {
  const won = v.winner === v.you;
  useEffect(() => { if (won) sfx.win(); else sfx.out(); }, [won]);
  const coins = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 2, s: 1.4 + Math.random() * 1.6 })), []);
  return (
    <motion.div className="over-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {won && coins.map((c, i) => (
        <motion.img key={i} className="pix confetti" src={asset('coin')} alt="" style={{ left: `${c.x}%` }} initial={{ y: -60 }} animate={{ y: '110vh' }} transition={{ delay: c.d, duration: c.s, repeat: Infinity, ease: 'linear' }} />
      ))}
      <motion.div className="over px" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ ease: stepped(6), duration: 0.5 }}>
        <img className="pix" src={asset('crown')} width={80} alt="" />
        <h2>{won ? 'KAMU MENANG!' : `${v.players[v.winner]?.name} MENANG!`}</h2>
        <p>{won ? 'Tahta jadi milikmu.' : 'Lebih beruntung lain kali.'}</p>
        <div className="row">
          {snap.role === 'host' ? <Btn kind="gold" onClick={() => session.rematch()}>MAIN LAGI</Btn> : <div className="status blink">Menunggu host…</div>}
          <Btn kind="red" onClick={() => session.leave()}>KELUAR</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- komponen utama ---------- */
export default function Game({ session, snap }) {
  const v = snap.view;
  const me = v.you;
  const [picking, setPicking] = useState(null);
  const [rules, setRules] = useState(false);
  const [muted, setM] = useState(isMuted());
  const [logOpen, setLogOpen] = useState(false);
  const prev = useRef({ seq: -1, coins: -1, logLen: 0, turnMine: false });

  useEffect(() => { setPicking(null); }, [v.seq]);

  // efek suara berdasarkan perubahan state
  useEffect(() => {
    const p = prev.current;
    if (p.seq === -1 || v.seq < p.seq) { sfx.deal(); }
    else if (v.seq !== p.seq) {
      const added = Math.min(v.log.length - p.logLen > 0 ? v.log.length - p.logLen : 3, 5);
      const kinds = v.log.slice(-added).map((l) => l.k);
      if (kinds.includes('action')) sfx.action();
      if (kinds.includes('block')) sfx.block();
      const total = v.players.reduce((a, x) => a + x.coins, 0);
      if (total > p.coins && p.coins >= 0) setTimeout(() => sfx.coin(), 150);
      p.coins = total;
    }
    p.coins = v.players.reduce((a, x) => a + x.coins, 0);
    const mine = v.phase === 'action' && v.turn === me;
    if (mine && !p.turnMine) setTimeout(() => sfx.turn(), 300);
    p.turnMine = mine;
    p.seq = v.seq;
    p.logLen = v.log.length;
  }, [v.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (snap.notice) { sfx.error(); const t = setTimeout(() => session.clearNotice(), 3000); return () => clearTimeout(t); } return undefined; }, [snap.notice, session]);

  const send = (m) => session.move(m);
  const iPick = v.phase === 'action' && v.turn === me && !!picking;
  const losing = v.phase === 'lose' && v.lose.player === me;
  const order = v.players.map((_, i) => (i - me + v.players.length) % v.players.length);
  const opponents = v.players.map((p, i) => i).filter((i) => i !== me).sort((a, b) => order[a] - order[b]);

  return (
    <div className="game">
      <header className="topbar px">
        <span className="room">{snap.offline ? 'LATIHAN' : `RUANG ${snap.code}`}</span>
        {snap.status === 'reconnecting' && <span className="blink err">MENYAMBUNG ULANG…</span>}
        <span className="spacer" />
        <Btn kind="small" onClick={() => setLogOpen((o) => !o)}>LOG</Btn>
        <Btn kind="small" onClick={() => setRules(true)}>?</Btn>
        <Btn kind="small" onClick={() => { const m = !muted; setMuted(m); setM(m); }}>{muted ? '🔇' : '🔊'}</Btn>
        <Btn kind="small red" onClick={() => { if (confirm('Keluar dari permainan?')) session.leave(); }}>KELUAR</Btn>
      </header>

      <div className="table">
        <div className="opps">
          {opponents.map((i) => (
            <PlayerPanel key={i} p={v.players[i]} i={i} v={v} meta={snap.players} isMe={false} order={order[i]}
              pickable={iPick && v.players[i].alive && ACTIONS[picking].target}
              onPick={(t) => { send({ type: 'action', action: picking, target: t }); setPicking(null); }} />
          ))}
        </div>

        <Stage v={v} />

        <div className="mine">
          <PlayerPanel p={v.players[me]} i={me} v={v} meta={snap.players} isMe order={0} pickable={false} losing={losing} onLose={(k) => send({ type: 'lose', index: k })} />
        </div>
        <Controls v={v} me={me} send={send} picking={picking} setPicking={setPicking} />
      </div>

      <aside className={`logwrap ${logOpen ? 'open' : ''}`}><Log log={v.log} /></aside>

      <AnimatePresence>{snap.notice && <motion.div className="toast px" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{snap.notice}</motion.div>}</AnimatePresence>
      <Flashes view={v} />
      {v.phase === 'over' && <GameOver v={v} snap={snap} session={session} />}
      <AnimatePresence>{rules && <Rules onClose={() => setRules(false)} />}</AnimatePresence>
    </div>
  );
}
