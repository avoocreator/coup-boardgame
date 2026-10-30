// Konstanta aturan Coup — dipakai oleh engine, bot, dan UI.

export const CHARS = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

export const CHAR_INFO = {
  duke: {
    name: 'Duke',
    title: 'Sang Adipati',
    power: 'Ambil 3 koin (Pajak). Memblokir Bantuan Asing.',
    short: 'Pajak +3 · blok Bantuan Asing',
    color: '#8b45c9',
  },
  assassin: {
    name: 'Assassin',
    title: 'Pembunuh Bayangan',
    power: 'Bayar 3 koin untuk membunuh satu pengaruh lawan.',
    short: 'Bunuh (3 koin)',
    color: '#c0273f',
  },
  captain: {
    name: 'Captain',
    title: 'Kapten Samudra',
    power: 'Curi 2 koin dari pemain lain. Memblokir pencurian.',
    short: 'Curi 2 · blok Curi',
    color: '#2f6fd1',
  },
  ambassador: {
    name: 'Ambassador',
    title: 'Duta Besar',
    power: 'Tukar kartu dengan dek. Memblokir pencurian.',
    short: 'Tukar kartu · blok Curi',
    color: '#1f9a6a',
  },
  contessa: {
    name: 'Contessa',
    title: 'Sang Countess',
    power: 'Memblokir pembunuhan oleh Assassin.',
    short: 'Blok Bunuh',
    color: '#d1456b',
  },
};

// claim: karakter yang diklaim (bisa ditantang). blockedBy: karakter yang bisa memblokir.
// blockAny: semua pemain boleh memblokir (bukan hanya target).
export const ACTIONS = {
  income: { id: 'income', name: 'Pendapatan', desc: 'Ambil 1 koin.', cost: 0, claim: null, target: false, blockedBy: [], icon: '🪙' },
  foreignAid: { id: 'foreignAid', name: 'Bantuan Asing', desc: 'Ambil 2 koin. Bisa diblokir Duke.', cost: 0, claim: null, target: false, blockedBy: ['duke'], blockAny: true, icon: '💰' },
  coup: { id: 'coup', name: 'Kudeta', desc: 'Bayar 7 koin, lawan kehilangan 1 pengaruh. Tak bisa diblokir.', cost: 7, claim: null, target: true, blockedBy: [], icon: '💥' },
  tax: { id: 'tax', name: 'Pajak', desc: 'Ambil 3 koin.', cost: 0, claim: 'duke', target: false, blockedBy: [], icon: null },
  assassinate: { id: 'assassinate', name: 'Bunuh', desc: 'Bayar 3 koin, target kehilangan 1 pengaruh. Bisa diblokir Contessa.', cost: 3, claim: 'assassin', target: true, blockedBy: ['contessa'], icon: null },
  steal: { id: 'steal', name: 'Curi', desc: 'Ambil 2 koin dari target. Bisa diblokir Captain/Ambassador.', cost: 0, claim: 'captain', target: true, blockedBy: ['captain', 'ambassador'], icon: null },
  exchange: { id: 'exchange', name: 'Tukar', desc: 'Ambil 2 kartu dari dek, pilih yang disimpan.', cost: 0, claim: 'ambassador', target: false, blockedBy: [], icon: null },
};

export const ACTION_ORDER = ['income', 'foreignAid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const COUP_MANDATORY = 10;
