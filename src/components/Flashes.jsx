import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { stepped } from './Card.jsx';
import { CHAR_INFO } from '../game/rules.js';
import { sfx } from '../sound.js';

// Antrian animasi besar di tengah layar: tantangan (kartu dibuka) & kehilangan pengaruh.
function Reveal({ char, delay = 0.5 }) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setUp(true); sfx.flip(); }, delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);
  return <Card char={char} faceUp={up} size="xl" deal={false} />;
}

export default function Flashes({ view }) {
  const names = view.players.map((p) => p.name);
  const [queue, setQueue] = useState([]);
  const lastSeq = useRef(view.seq);

  useEffect(() => {
    if (view.seq === lastSeq.current) return;
    lastSeq.current = view.seq;
    if (view.flashes?.length) setQueue((q) => [...q, ...view.flashes.map((f, i) => ({ ...f, key: `${view.seq}-${i}` }))]);
  }, [view.seq, view.flashes]);

  const cur = queue[0];
  useEffect(() => {
    if (!cur) return undefined;
    if (cur.kind === 'challenge') sfx.challenge();
    else sfx.lose();
    const verdict = setTimeout(() => {
      if (cur.kind === 'challenge') (cur.truthful ? sfx.truth() : sfx.lie());
    }, 1300);
    const done = setTimeout(() => setQueue((q) => q.slice(1)), cur.kind === 'challenge' ? 3000 : 2100);
    return () => { clearTimeout(verdict); clearTimeout(done); };
  }, [cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => setQueue((q) => q.slice(1));
  return (
    <AnimatePresence>
      {cur && (
        <motion.div key={cur.key} className="flash-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={skip}>
          {cur.kind === 'challenge' ? (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title shake">⚔ {names[cur.challenger]} MENANTANG {names[cur.challenged]}!</div>
              <div className="flash-sub">{names[cur.challenged]} mengaku punya {CHAR_INFO[cur.char].name}…</div>
              <Reveal char={cur.char} />
              <motion.div
                className={`verdict ${cur.truthful ? 'good' : 'bad'}`}
                initial={{ opacity: 0, scale: 2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3, duration: 0.3, ease: stepped(4) }}
              >
                {cur.truthful ? `JUJUR! ${names[cur.challenger]} kehilangan kartu` : `BOHONG! ${names[cur.challenged]} kehilangan kartu`}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title">{names[cur.player]} KEHILANGAN PENGARUH</div>
              <motion.div initial={{ y: 0 }} animate={{ y: [0, -6, 0, 6, 0], filter: ['grayscale(0)', 'grayscale(0)', 'grayscale(1)'] }} transition={{ duration: 1.2, delay: 0.5 }}>
                <Reveal char={cur.char} delay={0.1} />
              </motion.div>
              <div className="flash-sub">{CHAR_INFO[cur.char].name} terbuka dan keluar dari permainan</div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
