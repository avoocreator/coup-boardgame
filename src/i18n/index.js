import { useMemo, useSyncExternalStore } from 'react';
import { STR } from './strings.js';
import { CHAR_INFO } from '../game/rules.js';

let lang = 'en';
try {
  const saved = localStorage.getItem('coup.lang');
  if (saved && STR[saved]) lang = saved;
} catch { /* */ }
if (typeof document !== 'undefined') document.documentElement.lang = lang;

const subs = new Set();
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getLang = () => lang;
export function setLang(l) {
  if (!STR[l]) return;
  lang = l;
  try { localStorage.setItem('coup.lang', l); } catch { /* */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  subs.forEach((f) => f());
}

export function translate(l, key, vars) {
  let s = STR[l]?.[key] ?? STR.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

export function useT() {
  const l = useSyncExternalStore(subscribe, getLang);
  return useMemo(() => {
    const f = (key, vars) => translate(l, key, vars);
    f.lang = l;
    return f;
  }, [l]);
}

export const charName = (c) => CHAR_INFO[c]?.name ?? '';

export function fmtLog(entry, t) {
  const a = { ...entry.a };
  if (a.char) a.char = charName(a.char);
  if (entry.m === 'action') {
    const act = t(`act.${a.action}.name`);
    return `${a.name}: ${act}${a.target ? ` → ${a.target}` : ''}${a.claim ? t('log.claimsSuffix', { char: charName(a.claim) }) : ''}`;
  }
  return t(`log.${entry.m}`, a);
}
