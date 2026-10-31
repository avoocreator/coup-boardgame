import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { asset, stepped, uiAsset } from './Card.jsx';
import Flashes from './Flashes.jsx';
import Rules from './Rules.jsx';
import GameMaster, { useNarration } from './GameMaster.jsx';
import { Btn, Coins, CoinIcon } from './ui.jsx';
import { ACTIONS, ACTION_ORDER, CHAR_INFO } from '../game/rules.js';
import { pendingResponders } from '../game/engine.js';
import { fmtLog, useT } from '../i18n/index.js';
import { sfx, isMuted, setMuted } from '../sound.js';

/* ---------- panel pemain ---------- */
function PlayerPanel({ p, i, v, meta, isMe, pickable, onPick, order, losing = false, onLose }) {
  const t = useT();
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
          <b>{p.name}{isMe ? ` ${t('pp.you')}` : ''}</b>
          <small>{!p.alive ? t('pp.out') : turn ? t('pp.turn') : pend ? t('pp.waiting') : m.bot ? t('pp.bot') : !m.connected ? t('pp.offline') : ' '}</small>
        </div>
        <Coins n={p.coins} />
      </div>
      <div className="pp-cards">
        {p.cards.map((c, k) => (
          <Card key={k} char={c.char} faceUp={isMe || c.revealed} dead={c.revealed} size={size} delay={order * 0.1 + k * 0.12}
            selectable={isMe && losing && !c.revealed} onClick={() => onLose?.(k)} />
        ))}
        {p.cards.length === 0 && <div className="nocards">☠</div>}
      </div>
      {pickable && <div className="target-tag blink">{t('pp.pick')}</div>}
    </motion.div>
  );
}

/* ---------- panggung: Game Master + dek ---------- */
function Stage({ v }) {
  const t = useT();
  const nar = useNarration(v);
  const nm = (i) => v.players[i].name;
  let status = '';
  if (v.phase === 'over') status = t('stage.wins', { name: nm(v.winner) });
  else if (v.act) {
    const a = ACTIONS[v.act.type];
    status = `${nm(v.act.actor)} → ${t(`act.${a.id}.name`)}${v.act.target !== null ? ` → ${nm(v.act.target)}` : ''}`;
  } else status = t('stage.turn', { name: nm(v.turn) });
  let sub = null;
  if (v.act?.claim && !v.block) sub = <span className="claim"><img className="pix mini" src={asset(v.act.claim)} alt="" /> {t('stage.claims', { char: CHAR_INFO[v.act.claim].name })}</span>;
  if (v.block) sub = <span className="claim"><img className="pix mini" src={asset(v.block.char)} alt="" /> {t('stage.blocks', { name: nm(v.block.blocker), char: CHAR_INFO[v.block.char].name })}</span>;
  return (
    <div className="stage">
      <GameMaster text={nar?.text} kind={nar?.kind} mood={v.phase === 'over' ? 'cheer' : 'idle'} size={2} />
      <div className="stage-mid">
        <div className="stage-text px">
          <div className="stage-main">{status}</div>
          {sub && <div className="stage-sub">{sub}</div>}
        </div>
      </div>
      <div className="deck" title={t('game.deck')}>
        {[0, 1, 2].map((k) => <div key={k} className="deck-card" style={{ '--k': k }}><Card char={null} faceUp={false} size="sm" deal={false} /></div>)}
        <motion.span key={v.deckCount} className="deck-count" initial={{ scale: 1.8 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: stepped(4) }}>{v.deckCount}</motion.span>
      </div>
    </div>
  );
}

/* ---------- ikon pesan (log yang bisa dibuka/tutup) ---------- */
function MessageButton({ v }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const seen = useRef(v.log.length);
  const ref = useRef(null);
  useEffect(() => { if (open) { seen.current = v.log.length; if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; } }, [open, v.log.length]);
  const unread = open ? 0 : Math.min(99, Math.max(0, v.log.length - seen.current));
  return (
    <>
      <button className="msg-btn" title={t('game.messages')} onClick={() => { sfx.click(); setOpen((o) => !o); }}>
        <img className="pix" src={uiAsset('msg')} alt={t('game.messages')} draggable={false} />
        {unread > 0 && <i className="badge">{unread}</i>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside className="msgpanel px" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: stepped(3) }}>
            <div className="msg-head"><b>{t('game.messages')}</b><Btn kind="small red" onClick={() => setOpen(false)}>X</Btn></div>
            <div className="log" ref={ref}>
              {v.log.slice(-60).map((l, i) => <div key={i} className={`l-${l.k}`}>{fmtLog(l, t)}</div>)}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- panel kontrol ---------- */
function Controls({ v, me, send, picking, setPicking }) {
  const t = useT();
  const pend = pendingResponders(v);
  const meP = v.players[me];
  const nm = (i) => v.players[i].name;
  const [sel, setSel] = useState([]);
  useEffect(() => { setSel([]); }, [v.seq]);
  const waiting = (key, vars) => <div className="controls px"><div className="wait blink">{t(key, vars)}</div></div>;
  const waitPend = () => (pend.length ? waiting('ctl.waitMany', { names: pend.map(nm).join(', ') }) : waiting('ctl.waitMany', { names: '…' }));

  if (!meP.alive && v.phase !== 'over') return <div className="controls px"><div className="wait">{t('ctl.out')}</div></div>;
  if (v.phase === 'over') return null;

  if (v.phase === 'action') {
    if (v.turn !== me) return waiting('ctl.waitFor', { name: nm(v.turn) });
    if (picking) {
      const targets = v.players.map((p, i) => ({ p, i })).filter((x) => x.i !== me && x.p.alive);
      return (
        <div className="controls px">
          <div className="ctitle">{t('ctl.pickTarget', { action: t(`act.${picking}.name`) })}</div>
          <div className="targets">
            {targets.map((x) => (
              <Btn key={x.i} kind="red" onClick={() => { send({ type: 'action', action: picking, target: x.i }); setPicking(null); }}>
                {x.p.name} <CoinIcon size={14} /> {x.p.coins}
              </Btn>
            ))}
            <Btn kind="small" onClick={() => setPicking(null)}>{t('ctl.cancel')}</Btn>
          </div>
        </div>
      );
    }
    return (
      <div className="controls px">
        {meP.coins >= 10 && <div className="ctitle red">{t('ctl.mustCoup')}</div>}
        <div className="actions">
          {ACTION_ORDER.map((id, k) => {
            const a = ACTIONS[id];
            const off = (meP.coins >= 10 && id !== 'coup') || meP.coins < a.cost;
            return (
              <motion.button
                key={id}
                className="act"
                disabled={off}
                title={t(`act.${id}.desc`)}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: k * 0.04, ease: stepped(4), duration: 0.25 }}
                onMouseEnter={() => !off && sfx.hover()}
                onClick={() => { sfx.click(); if (a.target) setPicking(id); else send({ type: 'action', action: id }); }}
              >
                <span className="aicon">
                  {a.claim ? <img className="pix" src={asset(a.claim)} alt="" /> : id === 'coup' ? <img className="pix" src={asset('skull')} alt="" /> : <CoinIcon size={26} />}
                </span>
                <b>{t(`act.${id}.name`)}</b>
                <small>{a.claim ? t('ctl.imChar', { char: CHAR_INFO[a.claim].name }) : a.cost ? t('ctl.coinsN', { n: a.cost }) : id === 'foreignAid' ? '+2' : '+1'}</small>
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
    if (!pend.includes(me)) return waitPend();
    return (
      <div className="controls px">
        <div className="ctitle">{t('ctl.claimQ', { name: nm(claimant), char: CHAR_INFO[char].name })}</div>
        <div className="row">
          <Btn kind="red" onClick={() => send({ type: 'challenge' })}>{t('ctl.challenge')}</Btn>
          <Btn kind="green" onClick={() => send({ type: 'pass' })}>{t('ctl.believe')}</Btn>
        </div>
      </div>
    );
  }

  if (v.phase === 'block') {
    const def = ACTIONS[v.act.type];
    if (!pend.includes(me)) return waitPend();
    const q = v.act.target === me ? 'ctl.blockQYou' : 'ctl.blockQ';
    return (
      <div className="controls px">
        <div className="ctitle">{t(q, { name: nm(v.act.actor), action: t(`act.${def.id}.name`) })}</div>
        <div className="row">
          {def.blockedBy.map((c) => (
            <Btn key={c} kind="gold" onClick={() => send({ type: 'block', char: c })}>
              <img className="pix mini" src={asset(c)} alt="" /> {t('ctl.blockAs', { char: CHAR_INFO[c].name })}
            </Btn>
          ))}
          <Btn kind="green" onClick={() => send({ type: 'pass' })}>{t('ctl.pass')}</Btn>
        </div>
      </div>
    );
  }

  if (v.phase === 'lose') {
    if (v.lose.player !== me) return waiting('ctl.loseWho', { name: nm(v.lose.player) });
    return <div className="controls px"><div className="ctitle red">{t('ctl.loseMe')}</div></div>;
  }

  if (v.phase === 'exchange') {
    if (v.act.actor !== me) return waiting('ctl.exchWho', { name: nm(v.act.actor) });
    const need = v.exch.keep;
    const toggle = (i) => { sfx.click(); setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < need ? [...s, i] : s)); };
    return (
      <div className="controls px">
        <div className="ctitle">{t('ctl.exchPick', { n: need, sel: sel.length })}</div>
        <div className="exch">
          {v.exch.options.map((c, i) => (
            <Card key={i} char={c} size="md" selectable selected={sel.includes(i)} onClick={() => toggle(i)} delay={i * 0.1} />
          ))}
        </div>
        <Btn kind="gold" disabled={sel.length !== need} onClick={() => send({ type: 'exchange', keep: sel })}>{t('ctl.keep')}</Btn>
      </div>
    );
  }
  return null;
}

/* ---------- layar menang ---------- */
function GameOver({ v, snap, session }) {
  const t = useT();
  const won = v.winner === v.you;
  useEffect(() => { if (won) sfx.win(); else sfx.out(); }, [won]);
  const coins = useMemo(() => Array.from({ length: 22 }, () => ({ x: Math.random() * 100, d: Math.random() * 2, s: 1.4 + Math.random() * 1.6 })), []);
  return (
    <motion.div className="over-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {won && coins.map((c, i) => (
        <motion.img key={i} className="pix confetti" src={asset('coin')} alt="" style={{ left: `${c.x}%` }} initial={{ y: -60 }} animate={{ y: '110vh' }} transition={{ delay: c.d, duration: c.s, repeat: Infinity, ease: 'linear' }} />
      ))}
      <motion.div className="over px" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ ease: stepped(6), duration: 0.5 }}>
        <img className="pix" src={asset('crown')} width={80} alt="" />
        <h2>{won ? t('over.you') : t('over.other', { name: v.players[v.winner]?.name })}</h2>
        <p>{won ? t('over.subWin') : t('over.subLose')}</p>
        <div className="row">
          {snap.isHost ? <Btn kind="gold" onClick={() => session.rematch()}>{t('over.again')}</Btn> : <div className="status blink">{t('over.waiting')}</div>}
          <Btn kind="red" onClick={() => session.leave()}>{t('game.leave')}</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- komponen utama ---------- */
export default function Game({ session, snap, onSettings }) {
  const t = useT();
  const v = snap.view;
  const me = v.you;
  const [picking, setPicking] = useState(null);
  const [rules, setRules] = useState(false);
  const [muted, setM] = useState(isMuted());
  const [flashBusy, setFlashBusy] = useState(false);
  const prev = useRef({ seq: -1, coins: -1, logLen: 0, turnMine: false });

  useEffect(() => { setPicking(null); }, [v.seq]);

  // trigger sfx tiap update state
  useEffect(() => {
    const p = prev.current;
    const total = v.players.reduce((a, x) => a + x.coins, 0);
    if (p.seq === -1 || v.seq < p.seq) sfx.deal();
    else if (v.seq !== p.seq) {
      const added = Math.min(v.log.length - p.logLen > 0 ? v.log.length - p.logLen : 3, 5);
      const kinds = v.log.slice(-added).map((l) => l.k);
      if (kinds.includes('action')) sfx.action();
      if (kinds.includes('block')) sfx.block();
      if (total > p.coins && p.coins >= 0) setTimeout(() => sfx.coin(), 150);
    }
    p.coins = total;
    const mine = v.phase === 'action' && v.turn === me;
    if (mine && !p.turnMine) setTimeout(() => sfx.turn(), 300);
    p.turnMine = mine;
    p.seq = v.seq;
    p.logLen = v.log.length;
  }, [v.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!snap.notice) return undefined;
    sfx.error();
    const tm = setTimeout(() => session.clearNotice(), 3000);
    return () => clearTimeout(tm);
  }, [snap.notice, session]);

  const send = (m) => session.move(m);
  const iPick = v.phase === 'action' && v.turn === me && !!picking;
  const losing = v.phase === 'lose' && v.lose.player === me;
  const n = v.players.length;
  const order = v.players.map((_, i) => (i - me + n) % n);
  const opponents = v.players.map((_, i) => i).filter((i) => i !== me).sort((a, b) => order[a] - order[b]);

  return (
    <div className="game">
      <header className="topbar px">
        <span className="room">{snap.offline ? t('game.practice') : t('game.room', { code: snap.code })}</span>
        {snap.status === 'reconnecting' && <span className="blink err">{t('game.reconnecting')}</span>}
        <span className="spacer" />
        <MessageButton v={v} />
        <Btn kind="small" onClick={() => setRules(true)}>?</Btn>
        <Btn kind="small" onClick={onSettings}>⚙</Btn>
        <Btn kind="small" onClick={() => { const m = !muted; setMuted(m); setM(m); }}>{muted ? '🔇' : '🔊'}</Btn>
        <Btn kind="small red" onClick={() => { if (confirm(t('game.leaveConfirm'))) session.leave(); }}>{t('game.leave')}</Btn>
      </header>

      <div className="table">
        <div className="opps">
          {opponents.map((i) => (
            <PlayerPanel key={i} p={v.players[i]} i={i} v={v} meta={snap.players} isMe={false} order={order[i]}
              pickable={iPick && v.players[i].alive && ACTIONS[picking].target}
              onPick={(tg) => { send({ type: 'action', action: picking, target: tg }); setPicking(null); }} />
          ))}
        </div>

        <Stage v={v} />

        <div className="mine">
          <PlayerPanel p={v.players[me]} i={me} v={v} meta={snap.players} isMe order={0} pickable={false} losing={losing} onLose={(k) => send({ type: 'lose', index: k })} />
        </div>
        <Controls v={v} me={me} send={send} picking={picking} setPicking={setPicking} />
      </div>

      <AnimatePresence>{snap.notice && <motion.div className="toast px" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{t(snap.notice)}</motion.div>}</AnimatePresence>
      <Flashes view={v} onBusy={setFlashBusy} />
      {v.phase === 'over' && !flashBusy && <GameOver v={v} snap={snap} session={session} />}
      <AnimatePresence>{rules && <Rules onClose={() => setRules(false)} />}</AnimatePresence>
    </div>
  );
}
