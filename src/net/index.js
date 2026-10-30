import Peer from 'peerjs';
import { Session } from './session.js';

// ICE servers: STUN publik + TURN publik gratis (OpenRelay) sebagai cadangan bila koneksi langsung gagal.
// Untuk produksi serius, ganti dengan TURN milikmu sendiri lewat VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_PASS.
const env = import.meta.env;
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  ...(env.VITE_TURN_URL
    ? [{ urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS }]
    : [
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      ]),
];

const peerOptions = { debug: 0, config: { iceServers } };
// Opsional: broker PeerJS sendiri (VITE_PEER_HOST, VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE)
if (env.VITE_PEER_HOST) {
  peerOptions.host = env.VITE_PEER_HOST;
  peerOptions.port = Number(env.VITE_PEER_PORT || 443);
  peerOptions.path = env.VITE_PEER_PATH || '/';
  peerOptions.secure = env.VITE_PEER_SECURE !== 'false';
}

function getToken() {
  try {
    let t = localStorage.getItem('coup.token');
    if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('coup.token', t); }
    return t;
  } catch { return undefined; }
}

export const session = new Session({ Peer, peerOptions, token: getToken() });
