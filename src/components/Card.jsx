import React from 'react';
import { motion } from 'framer-motion';
import { CHAR_INFO } from '../game/rules.js';
import { useT } from '../i18n/index.js';

export const asset = (name) => `${import.meta.env.BASE_URL}cards/${name}.png`;
// easing "bertahap" supaya gerakan terasa seperti animasi pixel/sprite
export const uiAsset = (name) => `${import.meta.env.BASE_URL}ui/${name}.png`;
export const stepped = (n) => (t) => Math.floor(t * n) / n;

/**
 * Kartu pixel. `char` null = tidak diketahui (selalu tertutup).
 * faceUp: tampil depan. dead: pengaruh sudah terbuka/hilang (abu-abu + tengkorak).
 */
export default function Card({ char, faceUp = true, dead = false, size = 'md', selectable = false, selected = false, onClick, delay = 0, deal = true, tilt = 0 }) {
  const t = useT();
  const info = char ? CHAR_INFO[char] : null;
  const showFront = faceUp && !!char;
  const cls = ['card', size, selectable && 'selectable', selected && 'selected', dead && 'dead'].filter(Boolean).join(' ');
  return (
    <motion.div
      className={cls}
      initial={deal ? { y: -90, x: 40, opacity: 0, rotate: -25 } : false}
      animate={{ y: selected ? -12 : 0, x: 0, opacity: 1, rotate: tilt }}
      transition={{ duration: 0.4, delay, ease: stepped(6) }}
      whileHover={selectable ? { y: -8 } : undefined}
      onClick={selectable ? onClick : undefined}
      role={selectable ? 'button' : undefined}
    >
      <motion.div
        className="card-inner"
        initial={deal ? { rotateY: 180 } : false}
        animate={{ rotateY: showFront ? 0 : 180 }}
        transition={{ duration: 0.5, delay: deal ? delay + 0.25 : 0, ease: stepped(8) }}
      >
        <div className="face front" style={{ '--c': info?.color || '#444' }}>
          {info && (
            <>
              <div className="cname">{info.name}</div>
              <div className="cart"><img src={asset(char)} alt={info.name} draggable={false} /></div>
              <div className="ctext">{t(`char.${char}.short`)}</div>
            </>
          )}
          {dead && (
            <div className="deadmark"><img src={asset('skull')} alt="" /></div>
          )}
        </div>
        <div className="face back"><img src={asset('back')} alt="" draggable={false} /></div>
      </motion.div>
    </motion.div>
  );
}
