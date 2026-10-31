import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { stepped, uiAsset } from './Card.jsx';
import { fmtLog, useT } from '../i18n/index.js';

/**
 * Game Master: wajah pixel dari wasit server. Dia yang "memegang" kartu & dek — pemain hanya melihat apa
 * yang diumumkannya. Punya animasi idle/kedip, dan bicara (mulut bergerak) saat gelembung chat mengetik.
 */
export default function GameMaster({ text, kind = 'info', mood = 'idle', size = 3 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return undefined;
    let i = 0;
    const id = setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(id); }, 22);
    return () => clearInterval(id);
  }, [text]);
  const talking = !!text && n < text.length;
  const cls = mood === 'cheer' ? 'cheer' : talking ? 'talk' : 'idle';
  return (
    <div className="gm">
      <motion.div
        className={`gm-sprite ${cls}`}
        style={{ '--s': size, backgroundImage: `url(${uiAsset('gm')})` }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: stepped(6) }}
      />
      {text && (
        <motion.div
          key={text}
          className={`gm-bubble px k-${kind}`}
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: stepped(3) }}
        >
          <span className="gm-name">GM</span>
          <span>{text.slice(0, n)}</span>
          <span className="caret" />
        </motion.div>
      )}
    </div>
  );
}

// Menyalurkan entri log baru dari server menjadi "ucapan" Game Master, satu per satu.
export function useNarration(view) {
  const t = useT();
  const last = view.log[view.log.length - 1];
  const [cur, setCur] = useState(() => (last ? { text: fmtLog(last, t), kind: last.k } : null));
  const queue = useRef([]);
  const timer = useRef(null);
  const prev = useRef({ seq: view.seq, len: view.log.length });
  const tRef = useRef(t);
  tRef.current = t;

  const play = () => {
    if (timer.current) return;
    const next = queue.current.shift();
    if (!next) return;
    setCur(next);
    timer.current = setTimeout(() => { timer.current = null; play(); }, 1900);
  };

  useEffect(() => {
    const p = prev.current;
    if (view.seq === p.seq) return;
    const added = view.log.length - p.len;
    const entries = added > 0 ? view.log.slice(-added) : view.log.slice(-2);
    prev.current = { seq: view.seq, len: view.log.length };
    if (view.seq < p.seq) queue.current = []; // game baru
    queue.current.push(...entries.map((e) => ({ text: fmtLog(e, tRef.current), kind: e.k })));
    if (queue.current.length > 4) queue.current = queue.current.slice(-4);
    play();
  }, [view.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  return cur;
}
