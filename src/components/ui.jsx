import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { asset, stepped } from './Card.jsx';
import { sfx } from '../sound.js';

export function Btn({ children, onClick, disabled, kind = '', className = '', ...rest }) {
  return (
    <button
      className={`btn ${kind} ${className}`}
      disabled={disabled}
      onMouseEnter={() => !disabled && sfx.hover()}
      onClick={(e) => { sfx.click(); onClick?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
}

export const CoinIcon = ({ size = 20 }) => <img className="pix" src={asset('coin')} width={size} height={size} alt="koin" draggable={false} />;

export function Coins({ n }) {
  const prev = useRef(n);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    if (n === prev.current) return undefined;
    setDelta({ d: n - prev.current, k: Date.now() });
    prev.current = n;
    const t = setTimeout(() => setDelta(null), 1100);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="coins">
      <CoinIcon />
      <motion.span key={n} initial={{ scale: 1.8, y: -6 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.3, ease: stepped(4) }}>{n}</motion.span>
      <AnimatePresence>
        {delta && (
          <motion.i
            key={delta.k}
            className={delta.d > 0 ? 'up' : 'down'}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -26 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: stepped(8) }}
          >
            {delta.d > 0 ? '+' : ''}{delta.d}
          </motion.i>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Modal({ children, onClose, title }) {
  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal px" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ ease: stepped(6), duration: 0.3 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><Btn kind="small red" onClick={onClose}>X</Btn></div>
        {children}
      </motion.div>
    </motion.div>
  );
}
