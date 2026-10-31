export const CHARS = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

export const CHAR_INFO = {
  duke: { name: 'Duke', color: '#8b45c9' },
  assassin: { name: 'Assassin', color: '#c0273f' },
  captain: { name: 'Captain', color: '#2f6fd1' },
  ambassador: { name: 'Ambassador', color: '#1f9a6a' },
  contessa: { name: 'Contessa', color: '#d1456b' },
};

export const ACTIONS = {
  income: { id: 'income', cost: 0, claim: null, target: false, blockedBy: [] },
  foreignAid: { id: 'foreignAid', cost: 0, claim: null, target: false, blockedBy: ['duke'], blockAny: true },
  coup: { id: 'coup', cost: 7, claim: null, target: true, blockedBy: [] },
  tax: { id: 'tax', cost: 0, claim: 'duke', target: false, blockedBy: [] },
  assassinate: { id: 'assassinate', cost: 3, claim: 'assassin', target: true, blockedBy: ['contessa'] },
  steal: { id: 'steal', cost: 0, claim: 'captain', target: true, blockedBy: ['captain', 'ambassador'] },
  exchange: { id: 'exchange', cost: 0, claim: 'ambassador', target: false, blockedBy: [] },
};

export const ACTION_ORDER = ['income', 'foreignAid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const COUP_MANDATORY = 10;

// variasi aturan kartu buangan
export const DISCARD_MODES = ['classic', 'bottom', 'bottomSecret'];
export const DEFAULT_SETTINGS = { discard: 'bottom' };
export function normalizeSettings(s) {
  return { discard: DISCARD_MODES.includes(s?.discard) ? s.discard : DEFAULT_SETTINGS.discard };
}
