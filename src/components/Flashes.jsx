import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { stepped } from './Card.jsx';
import { charName, useT } from '../i18n/index.js';
import { sfx } from '../sound.js';

// animasi kartu di tengah layar
function Reveal({ char, delay = 0.5 }) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!char) return undefined;
    const tm = setTimeout(() => { setUp(true); sfx.flip(); }, delay * 1000);
    return () => clearTimeout(tm);
  }, [delay, char]);
  return <Card char={char} faceUp={up} size="xl" deal={false} />;
}

export default function Flashes({ view }) {
  const t = useT();
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
    const done = setTimeout(() => setQueue((q) => q.slice(1)), cur.kind === 'challenge' ? 3000 : 2400);
    return () => { clearTimeout(verdict); clearTimeout(done); };
  }, [cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => setQueue((q) => q.slice(1));
  const loseSub = (f) => {
    if (f.secret) return t('flash.secret');
    if (f.toDeck) return t('flash.toDeck', { char: charName(f.char) });
    return t('flash.out', { char: charName(f.char) });
  };
  return (
    <AnimatePresence>
      {cur && (
        <motion.div key={cur.key} className="flash-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={skip}>
          {cur.kind === 'challenge' ? (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title shake">{t('flash.challenges', { a: names[cur.challenger], b: names[cur.challenged] })}</div>
              <div className="flash-sub">{t('flash.claimed', { name: names[cur.challenged], char: charName(cur.char) })}</div>
              <Reveal char={cur.char} />
              <motion.div
                className={`verdict ${cur.truthful ? 'good' : 'bad'}`}
                initial={{ opacity: 0, scale: 2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3, duration: 0.3, ease: stepped(4) }}
              >
                {cur.truthful ? t('flash.truth', { name: names[cur.challenger] }) : t('flash.lie', { name: names[cur.challenged] })}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title">{t('flash.loses', { name: names[cur.player] })}</div>
              {/* kartu terbuka lalu — pada mode dek — melayang turun ke tumpukan dek */}
              <motion.div
                animate={cur.toDeck
                  ? { y: [0, 0, 0, 230], scale: [1, 1, 1, 0.22], opacity: [1, 1, 1, 0] }
                  : { y: [0, -6, 0, 6, 0], filter: ['grayscale(0)', 'grayscale(0)', 'grayscale(1)'] }}
                transition={cur.toDeck ? { duration: 2.1, times: [0, 0.35, 0.65, 1], ease: stepped(10) } : { duration: 1.2, delay: 0.5 }}
              >
                <Reveal char={cur.char} delay={0.1} />
              </motion.div>
              <div className="flash-sub">{loseSub(cur)}</div>
              {cur.toDeck && <div className="deck-slot"><span>▼</span></div>}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
