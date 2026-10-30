import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Btn } from './ui.jsx';
import { stepped } from './Card.jsx';
import GameMaster from './GameMaster.jsx';
import { RulePicker } from './Settings.jsx';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/rules.js';
import { useT } from '../i18n/index.js';

export default function Lobby({ session, snap, onSettings }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const isHost = snap.isHost;
  const link = `${location.origin}${location.pathname}?room=${snap.code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { window.prompt('Link:', link); }
  };
  const n = snap.players.length;
  const hostIdx = snap.players.findIndex((p) => !p.bot);
  return (
    <div className="lobby">
      <div className="panel px lobby-box">
        <h2>{t('lobby.title')}</h2>
        <GameMaster text={isHost ? t('gm.lobby') : t('gm.lobbyGuest')} size={3} />
        {!snap.offline && (
          <>
            <div className="codebox">
              <small>{t('lobby.code')}</small>
              <motion.div className="bigcode" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.4 }}>{snap.code}</motion.div>
            </div>
            <Btn kind="small" onClick={copy}>{copied ? t('lobby.copied') : t('lobby.copy')}</Btn>
            <p className="hint">{t('lobby.hint')}</p>
          </>
        )}
        <ul className="plist">
          {snap.players.map((p, i) => (
            <motion.li key={p.name + i} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05, ease: stepped(4) }}>
              <span className="avatar" style={{ '--h': i * 62 }}>{p.bot ? '🤖' : p.name[0]?.toUpperCase()}</span>
              <span className="pname">{p.name}{i === snap.you ? ` ${t('lobby.you')}` : ''}{i === hostIdx ? ' 👑' : ''}</span>
              {p.bot && <em>{t('lobby.bot')}</em>}
              {isHost && i !== snap.you && <Btn kind="small red" onClick={() => session.removeSeat(i)}>X</Btn>}
            </motion.li>
          ))}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - n) }).map((_, i) => (
            <li key={'e' + i} className="empty"><span className="avatar">?</span><span className="pname blink">{t('lobby.waiting')}</span></li>
          ))}
        </ul>
        <h3 className="sub">{t('lobby.rules')} — {t('set.discard')}</h3>
        <RulePicker value={snap.settings.discard} editable={isHost} onChange={(m) => session.setSettings({ discard: m })} />
        {isHost ? (
          <div className="row">
            <Btn disabled={n >= MAX_PLAYERS} onClick={() => session.addBot()}>{t('lobby.addBot')}</Btn>
            <Btn kind="gold" disabled={n < MIN_PLAYERS} onClick={() => session.startGame()}>{t('lobby.start')} ({n}/{MAX_PLAYERS})</Btn>
          </div>
        ) : (
          <div className="status blink">{t('lobby.waitHost')}</div>
        )}
        <div className="row">
          <Btn kind="small" onClick={onSettings}>⚙</Btn>
          <Btn kind="small red" onClick={() => session.leave()}>{t('lobby.leave')}</Btn>
        </div>
      </div>
    </div>
  );
}
