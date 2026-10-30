import React from 'react';
import Card from './Card.jsx';
import { Modal } from './ui.jsx';
import { CHARS, CHAR_INFO, ACTIONS, ACTION_ORDER } from '../game/rules.js';

export default function Rules({ onClose }) {
  return (
    <Modal title="ATURAN MAIN" onClose={onClose}>
      <div className="rules">
        <p><b>Tujuan:</b> jadi pemain terakhir yang masih punya kartu (pengaruh). Tiap pemain mulai dengan 2 kartu tertutup dan 2 koin.</p>
        <p>Di gilirannya kamu memilih <b>satu aksi</b>. Aksi karakter boleh <b>bohong</b> — tapi siapa pun bisa <b>menantang</b>. Yang kalah tantangan kehilangan 1 kartu. Kalau yang ditantang ternyata jujur, penantang yang rugi dan kartu itu dikocok ulang.</p>
        <div className="rule-cards">
          {CHARS.map((c) => (
            <div key={c} className="rule-card">
              <Card char={c} size="sm" deal={false} />
              <div><b style={{ color: CHAR_INFO[c].color }}>{CHAR_INFO[c].name}</b><br />{CHAR_INFO[c].power}</div>
            </div>
          ))}
        </div>
        <h3>Aksi</h3>
        <table>
          <tbody>
            {ACTION_ORDER.map((id) => {
              const a = ACTIONS[id];
              return (
                <tr key={id}>
                  <td><b>{a.name}</b></td>
                  <td>{a.desc}</td>
                  <td>{a.claim ? `Klaim ${CHAR_INFO[a.claim].name}` : 'Tanpa klaim'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p><b>Blokir:</b> Bantuan Asing bisa diblokir siapa saja yang mengaku Duke. Bunuh bisa diblokir targetnya (Contessa). Curi bisa diblokir targetnya (Captain/Ambassador). Blokir pun bisa ditantang.</p>
        <p><b>Wajib Kudeta</b> jika kamu punya 10 koin atau lebih.</p>
      </div>
    </Modal>
  );
}
