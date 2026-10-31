// Efek suara chiptune disintesis dengan WebAudio — tanpa file audio, jadi ringan.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('coup.muted') === '1'; } catch { /* */ }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 440, t = 0.1, type = 'square', v = 0.07, at = 0, to = null }) {
  const c = muted ? null : ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const s = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f, s);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), s + t);
  g.gain.setValueAtTime(v, s);
  g.gain.exponentialRampToValueAtTime(0.0001, s + t);
  o.connect(g).connect(c.destination);
  o.start(s);
  o.stop(s + t + 0.03);
}

function noise({ t = 0.12, v = 0.08, at = 0, rate = 1 }) {
  const c = muted ? null : ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * t);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    if (i % Math.max(1, Math.round(rate)) === 0) last = Math.random() * 2 - 1; // sample-hold = noise "8-bit"
    d[i] = last;
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  const s = c.currentTime + at;
  src.buffer = buf;
  g.gain.setValueAtTime(v, s);
  g.gain.exponentialRampToValueAtTime(0.0001, s + t);
  src.connect(g).connect(c.destination);
  src.start(s);
}

const arp = (notes, step, opt = {}) => notes.forEach((f, i) => tone({ f, t: step * 1.4, at: i * step, ...opt }));

export const sfx = {
  click: () => tone({ f: 740, t: 0.04, v: 0.05 }),
  hover: () => tone({ f: 520, t: 0.02, v: 0.02 }),
  deal: () => { for (let i = 0; i < 4; i++) noise({ t: 0.05, v: 0.06, at: i * 0.11, rate: 6 }); },
  flip: () => { noise({ t: 0.06, v: 0.05, rate: 4 }); tone({ f: 300, t: 0.08, to: 620, type: 'triangle' }); },
  coin: () => { tone({ f: 988, t: 0.06 }); tone({ f: 1319, t: 0.2, at: 0.06 }); },
  action: () => tone({ f: 330, t: 0.09, type: 'triangle', to: 440 }),
  challenge: () => arp([220, 330, 440], 0.09, { type: 'sawtooth', v: 0.06 }),
  truth: () => arp([523, 659, 784, 1047], 0.07),
  lie: () => { tone({ f: 300, t: 0.4, to: 70, type: 'sawtooth', v: 0.08 }); noise({ t: 0.3, v: 0.06, rate: 8 }); },
  block: () => { tone({ f: 160, t: 0.12, type: 'square', v: 0.08 }); tone({ f: 120, t: 0.2, at: 0.1, type: 'square', v: 0.08 }); noise({ t: 0.1, at: 0.02, rate: 3 }); },
  lose: () => { tone({ f: 440, t: 0.5, to: 90, type: 'triangle', v: 0.1 }); noise({ t: 0.25, v: 0.07, rate: 10 }); },
  out: () => arp([330, 262, 196, 131], 0.16, { type: 'triangle', v: 0.1 }),
  turn: () => { tone({ f: 880, t: 0.08 }); tone({ f: 1175, t: 0.16, at: 0.1 }); },
  error: () => tone({ f: 120, t: 0.18, type: 'sawtooth', v: 0.07 }),
  win: () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, { v: 0.08 }),
};

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('coup.muted', m ? '1' : '0'); } catch { /* */ }
  if (!m) sfx.click();
}
// Browser memblokir audio sebelum ada interaksi; buka di gestur pertama.
export function unlockAudio() { try { ac(); } catch { /* */ } }
