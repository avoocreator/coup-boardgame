import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence } from 'framer-motion';
import { session } from './net/session.js';
import Menu from './components/Menu.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import Rules from './components/Rules.jsx';
import Settings from './components/Settings.jsx';
import { unlockAudio } from './sound.js';

export default function App() {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  const room = new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0, 4) || '';

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    session.resume(); // refresh tab → kursi yang sama direbut kembali otomatis
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div className="app">
      {snap.mode === 'menu' && <Menu session={session} snap={snap} initialCode={room} onRules={() => setRules(true)} onSettings={() => setSettings(true)} />}
      {snap.mode === 'lobby' && <Lobby session={session} snap={snap} onSettings={() => setSettings(true)} />}
      {snap.mode === 'game' && snap.view && <Game session={session} snap={snap} onSettings={() => setSettings(true)} />}
      <AnimatePresence>
        {rules && snap.mode === 'menu' && <Rules onClose={() => setRules(false)} />}
        {settings && <Settings snap={snap} onClose={() => setSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}
