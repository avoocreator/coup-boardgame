import React from 'react';
import { motion } from 'framer-motion';
import { CHAR_INFO } from '../game/rules.js';
import { useT } from '../i18n/index.js';

export const asset = (name) => `${import.meta.env.BASE_URL}cards/${name}.png`;
export const uiAsset = (name) => `${import.meta.env.BASE_URL}ui/${name}.png`;
// easing ala animasi retro
export const stepped = (n) => (t) => Math.floor(t * n) / n;

// kartu pixel
// flat: tanpa rotasi 3D — hanya "pop" saat sisi kartu berganti (dipakai di overlay/popup)
export default function Card({ char, faceUp = true, dead = false, size = 'md', selectable = false, selected = false, onClick, delay = 0, deal = true, tilt = 0, flat = false }) {
  const t = useT();
  const info = char ? CHAR_INFO[char] : null;
  const showFront = faceUp && !!char;
  const cls = ['card', size, flat && 'flat', selectable && 'selectable', selected && 'selected', dead && 'dead'].filter(Boolean).join(' ');
  const front = (
    <div className="face front" style={{ '--c': info?.color || '#444' }}>
      {info && (
        <>
          <div className="cname">{info.name}</div>
          <div className="cart"><img src={asset(char)} alt={info.name} draggable={false} /></div>
          <div className="ctext">{t(`char.${char}.short`)}</div>
        </>
      )}
      {dead && <div className="deadmark"><img src={asset('skull')} alt="" /></div>}
    </div>
  );
  const back = <div className="face back"><img src={asset('back')} alt="" draggable={false} /></div>;
  if (flat) {
    return (
      <div className={cls}>
        <motion.div
          key={showFront ? 'front' : 'back'}
          className="card-inner"
          initial={{ scale: 0.86, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: stepped(4) }}
        >
          {showFront ? front : back}
        </motion.div>
      </div>
    );
  }
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
        {front}
        {back}
      </motion.div>
    </motion.div>
  );
}
