import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence } from 'framer-motion';
import { session } from './net/index.js';
import Menu from './components/Menu.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import Rules from './components/Rules.jsx';
import { Btn } from './components/ui.jsx';
import { isMuted, setMuted, unlockAudio } from './sound.js';

export default function App() {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [rules, setRules] = useState(false);
  const [muted, setM] = useState(isMuted());
  const room = new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0, 4) || '';

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    // sambung ulang otomatis bila tab klien di-refresh
    try {
      const r = JSON.parse(sessionStorage.getItem('coup.resume') || 'null');
      if (r?.code && snap.mode === 'menu' && snap.status === 'idle') session.joinGame(r.code, r.name);
    } catch { /* */ }
    return () => window.removeEventListener('pointerdown', unlock);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // bersihkan data sambung-ulang bila kembali ke menu
    if (snap.mode === 'menu' && snap.status !== 'connecting' && snap.status !== 'reconnecting') {
      try { if (snap.status === 'error' || snap.status === 'idle') sessionStorage.removeItem('coup.resume'); } catch { /* */ }
    }
  }, [snap.mode, snap.status]);

  return (
    <div className="app">
      {snap.mode === 'menu' && (
        <>
          <div className="corner">
            <Btn kind="small" onClick={() => { const m = !muted; setMuted(m); setM(m); }}>{muted ? '🔇' : '🔊'}</Btn>
          </div>
          <Menu session={session} snap={snap} initialCode={room} onRules={() => setRules(true)} />
        </>
      )}
      {snap.mode === 'lobby' && <Lobby session={session} snap={snap} />}
      {snap.mode === 'game' && snap.view && <Game session={session} snap={snap} />}
      <AnimatePresence>{rules && snap.mode === 'menu' && <Rules onClose={() => setRules(false)} />}</AnimatePresence>
    </div>
  );
}
