import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Btn } from './ui.jsx';
import { stepped } from './Card.jsx';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/rules.js';

export default function Lobby({ session, snap }) {
  const isHost = snap.role === 'host';
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${snap.code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { window.prompt('Salin link:', link); }
  };
  const n = snap.players.length;
  return (
    <div className="lobby">
      <div className="panel px lobby-box">
        <h2>RUANG TUNGGU</h2>
        {!snap.offline && (
          <>
            <div className="codebox">
              <small>KODE RUANGAN</small>
              <motion.div className="bigcode" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.4 }}>{snap.code}</motion.div>
            </div>
            <Btn kind="small" onClick={copy}>{copied ? 'TERSALIN!' : 'SALIN LINK UNDANGAN'}</Btn>
            <p className="hint">Kirim kode/link ke temanmu. Mereka cukup buka link lalu klik GABUNG.</p>
          </>
        )}
        <ul className="plist">
          {snap.players.map((p, i) => (
            <motion.li key={p.name + i} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05, ease: stepped(4) }}>
              <span className="avatar" style={{ '--h': i * 62 }}>{p.bot ? '🤖' : p.name[0]?.toUpperCase()}</span>
              <span className="pname">{p.name}{i === snap.you ? ' (kamu)' : ''}{i === 0 ? ' 👑' : ''}</span>
              {p.bot && <em>BOT</em>}
              {isHost && i !== 0 && <Btn kind="small red" onClick={() => session.removeSeat(i)}>X</Btn>}
            </motion.li>
          ))}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - n) }).map((_, i) => (
            <li key={'e' + i} className="empty"><span className="avatar">?</span><span className="pname blink">menunggu pemain…</span></li>
          ))}
        </ul>
        {isHost ? (
          <div className="row">
            <Btn disabled={n >= MAX_PLAYERS} onClick={() => session.addBot()}>+ BOT</Btn>
            <Btn kind="gold" disabled={n < MIN_PLAYERS} onClick={() => session.startGame()}>MULAI ({n}/{MAX_PLAYERS})</Btn>
          </div>
        ) : (
          <div className="status blink">Menunggu host memulai permainan…</div>
        )}
        <Btn kind="small red" onClick={() => session.leave()}>KELUAR</Btn>
      </div>
    </div>
  );
}
