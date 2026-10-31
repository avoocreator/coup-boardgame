import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { stepped } from './Card.jsx';
import { Btn } from './ui.jsx';
import { charName, useT } from '../i18n/index.js';
import { sfx } from '../sound.js';

// overlay kartu (tantangan & eliminasi)
export default function Flashes({ view, onBusy }) {
  const t = useT();
  const names = view.players.map((p) => p.name);
  const [queue, setQueue] = useState([]);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const lastSeq = useRef(view.seq);

  useEffect(() => {
    if (view.seq === lastSeq.current) return;
    lastSeq.current = view.seq;
    if (view.flashes?.length) setQueue((q) => [...q, ...view.flashes.map((f, i) => ({ ...f, key: `${view.seq}-${i}` }))]);
  }, [view.seq, view.flashes]);

  const cur = queue[0];
  useEffect(() => { onBusy?.(!!cur); }, [cur, onBusy]);

  useEffect(() => {
    if (!cur) return undefined;
    setStep(0);
    setLeaving(false);
    if (cur.kind === 'challenge') { sfx.challenge(); return undefined; }
    sfx.lose();
    const tm = setTimeout(() => { setStep(1); sfx.flip(); }, 250);
    return () => clearTimeout(tm);
  }, [cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = () => {
    setStep(1);
    sfx.flip();
    setTimeout(() => (cur.truthful ? sfx.truth() : sfx.lie()), 500);
  };
  const next = () => {
    if (cur.kind === 'lose' && cur.toDeck && !leaving) {
      setLeaving(true);
      setTimeout(() => setQueue((q) => q.slice(1)), 450);
      return;
    }
    setQueue((q) => q.slice(1));
  };

  const loseSub = (f) => {
    if (f.secret) return t('flash.secret');
    if (f.toDeck) return t('flash.toDeck', { char: charName(f.char) });
    return t('flash.out', { char: charName(f.char) });
  };
  const more = queue.length > 1;

  return (
    <AnimatePresence>
      {cur && (
        <motion.div key={cur.key} className="flash-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {cur.kind === 'challenge' ? (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title">{t('flash.challenges', { a: names[cur.challenger], b: names[cur.challenged] })}</div>
              <div className="flash-sub">{t('flash.claimed', { name: names[cur.challenged], char: charName(cur.char) })}</div>
              <Card char={cur.char} faceUp={step === 1} size="xl" deal={false} flat />
              {step === 0 ? (
                <>
                  <Btn kind="gold" autoFocus onClick={reveal}>{t('flash.reveal')}</Btn>
                  <div className="flash-hint">{t('flash.hint')}</div>
                </>
              ) : (
                <>
                  <motion.div
                    className={`verdict ${cur.truthful ? 'good' : 'bad'}`}
                    initial={{ opacity: 0, scale: 2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45, duration: 0.3, ease: stepped(4) }}
                  >
                    {cur.truthful ? t('flash.truth', { name: names[cur.challenger] }) : t('flash.lie', { name: names[cur.challenged] })}
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                    <Btn kind="green" autoFocus onClick={next}>{t('flash.next')}{more ? ` (${queue.length - 1})` : ''}</Btn>
                  </motion.div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div className="flash" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ease: stepped(5), duration: 0.3 }}>
              <div className="flash-title">{t('flash.loses', { name: names[cur.player] })}</div>
              <motion.div
                animate={leaving ? { y: 230, scale: 0.22, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: stepped(6) }}
              >
                <Card char={cur.char} faceUp={step === 1} size="xl" deal={false} flat />
              </motion.div>
              <div className="flash-sub">{loseSub(cur)}</div>
              <Btn kind="green" autoFocus disabled={leaving} onClick={next}>{t('flash.ok')}{more ? ` (${queue.length - 1})` : ''}</Btn>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
