import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { stepped } from './Card.jsx';
import { Btn } from './ui.jsx';

export default function Menu({ session, snap, initialCode, onRules }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('coup.name') || ''; } catch { return ''; } });
  const [code, setCode] = useState(initialCode || '');
  const busy = snap.status === 'connecting';
  const nm = () => {
    const n = (name.trim() || 'Pemain').slice(0, 14);
    try { localStorage.setItem('coup.name', n); } catch { /* */ }
    return n;
  };
  const host = () => session.hostGame(nm());
  const join = () => {
    const n = nm();
    try { sessionStorage.setItem('coup.resume', JSON.stringify({ code: code.trim().toUpperCase(), name: n })); } catch { /* */ }
    session.joinGame(code, n);
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
      <p className="tag">Bohongi, tantang, dan rebut tahta.</p>

      <div className="panel px menu-box">
        <label>NAMAMU</label>
        <input className="field" value={name} maxLength={14} placeholder="Pemain" onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <Btn kind="gold" disabled={busy} onClick={host}>BUAT RUANGAN</Btn>
        </div>
        <div className="or">— atau gabung —</div>
        <div className="row">
          <input className="field code" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Btn kind="green" disabled={busy || code.trim().length < 4} onClick={join}>GABUNG</Btn>
        </div>
        <div className="or">— atau —</div>
        <Btn onClick={() => session.soloGame(nm())}>LATIHAN VS BOT (OFFLINE)</Btn>
        {busy && <div className="status blink">Menghubungkan…</div>}
        {snap.status === 'error' && <div className="status err">{snap.error}</div>}
        {snap.notice && <div className="status err">{snap.notice}</div>}
      </div>
      <Btn kind="small" onClick={onRules}>? ATURAN</Btn>
    </div>
  );
}
