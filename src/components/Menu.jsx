import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { stepped } from './Card.jsx';
import GameMaster from './GameMaster.jsx';
import { Btn } from './ui.jsx';
import { useT } from '../i18n/index.js';

export default function Menu({ session, snap, initialCode, onRules, onSettings }) {
  const t = useT();
  const [name, setName] = useState(() => { try { return localStorage.getItem('coup.name') || ''; } catch { return ''; } });
  const [code, setCode] = useState(initialCode || '');
  const busy = snap.status === 'connecting';
  const nm = () => {
    const n = (name.trim() || t('menu.namePh')).slice(0, 14);
    try { localStorage.setItem('coup.name', n); } catch { /* */ }
    return n;
  };

  return (
    <div className="menu">
      <div className="fan">
        {['duke', 'assassin', 'captain', 'ambassador', 'contessa'].map((c, i) => (
          <div key={c} className="fan-card" style={{ '--i': i - 2 }}>
            <Card char={c} size="lg" delay={i * 0.12} tilt={(i - 2) * 9} />
          </div>
        ))}
      </div>
      <motion.h1 className="logo" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: stepped(8) }}>
        COUP
      </motion.h1>
      <p className="tag">{t('menu.tag')}</p>

      <div className="panel px menu-box">
        <label>{t('menu.name')}</label>
        <input className="field" value={name} maxLength={14} placeholder={t('menu.namePh')} onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <Btn kind="gold" disabled={busy} onClick={() => session.createRoom(nm())}>{t('menu.create')}</Btn>
        </div>
        <div className="or">{t('menu.orJoin')}</div>
        <div className="row">
          <input className="field code" value={code} maxLength={4} placeholder={t('menu.code')} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Btn kind="green" disabled={busy || code.trim().length < 4} onClick={() => session.joinGame(code, nm())}>{t('menu.join')}</Btn>
        </div>
        <div className="or">{t('menu.or')}</div>
        <Btn disabled={busy} onClick={() => session.soloGame(nm())}>{t('menu.solo')}</Btn>
        {busy && <div className="status blink">{t('menu.connecting')}</div>}
        {snap.status === 'error' && snap.error && <div className="status err">{t(snap.error)}</div>}
        {snap.notice && <div className="status err">{t(snap.notice)}</div>}
      </div>
      <GameMaster text={t('gm.menu')} size={3} />
      <div className="row">
        <Btn kind="small" onClick={onRules}>{t('menu.rules')}</Btn>
        <Btn kind="small" onClick={onSettings}>⚙ {t('menu.settings')}</Btn>
      </div>
    </div>
  );
}
