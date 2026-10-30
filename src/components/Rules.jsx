import React from 'react';
import Card from './Card.jsx';
import { Modal } from './ui.jsx';
import { CHARS, CHAR_INFO, ACTIONS, ACTION_ORDER } from '../game/rules.js';
import { useT } from '../i18n/index.js';

export default function Rules({ onClose }) {
  const t = useT();
  return (
    <Modal title={t('rules.title')} onClose={onClose}>
      <div className="rules">
        <p>{t('rules.goal')}</p>
        <p>{t('rules.how')}</p>
        <div className="rule-cards">
          {CHARS.map((c) => (
            <div key={c} className="rule-card">
              <Card char={c} size="sm" deal={false} />
              <div><b style={{ color: CHAR_INFO[c].color }}>{CHAR_INFO[c].name}</b><br />{t(`char.${c}.power`)}</div>
            </div>
          ))}
        </div>
        <h3>{t('rules.actions')}</h3>
        <table>
          <tbody>
            {ACTION_ORDER.map((id) => {
              const a = ACTIONS[id];
              return (
                <tr key={id}>
                  <td><b>{t(`act.${id}.name`)}</b></td>
                  <td>{t(`act.${id}.desc`)}</td>
                  <td>{a.claim ? t('rules.claim', { char: CHAR_INFO[a.claim].name }) : t('rules.noClaim')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p>{t('rules.block')}</p>
        <p>{t('rules.coup')}</p>
      </div>
    </Modal>
  );
}
