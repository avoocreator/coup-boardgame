import React, { useState } from 'react';
import { Btn, Modal } from './ui.jsx';
import { LANGS } from '../i18n/strings.js';
import { setLang, useT } from '../i18n/index.js';
import { DISCARD_MODES } from '../game/rules.js';
import { isMuted, setMuted } from '../sound.js';

export function RulePicker({ value, editable, onChange }) {
  const t = useT();
  return (
    <div className="rulepick">
      {DISCARD_MODES.map((m) => (
        <button key={m} type="button" className={`rp ${value === m ? 'on' : ''}`} disabled={!editable} onClick={() => editable && onChange(m)}>
          <span className="rp-dot">{value === m ? '■' : '□'}</span>
          <span className="rp-txt"><b>{t(`discard.${m}.name`)}</b><small>{t(`discard.${m}.desc`)}</small></span>
        </button>
      ))}
    </div>
  );
}

export default function Settings({ onClose, snap }) {
  const t = useT();
  const [muted, setM] = useState(isMuted());
  const inRoom = snap && snap.mode !== 'menu';
  return (
    <Modal title={t('set.title')} onClose={onClose}>
      <div className="settings">
        <h3>{t('set.language')}</h3>
        <div className="row">
          {Object.entries(LANGS).map(([k, label]) => (
            <Btn key={k} kind={t.lang === k ? 'gold' : ''} onClick={() => setLang(k)}>{label}</Btn>
          ))}
        </div>
        <h3>{t('set.sound')}</h3>
        <div className="row">
          <Btn kind={muted ? '' : 'green'} onClick={() => { setMuted(false); setM(false); }}>🔊 {t('set.on')}</Btn>
          <Btn kind={muted ? 'red' : ''} onClick={() => { setMuted(true); setM(true); }}>🔇 {t('set.off')}</Btn>
        </div>
        {inRoom && (
          <>
            <h3>{t('set.discard')}</h3>
            <RulePicker value={snap.settings.discard} editable={false} />
            <p className="hint">{t('set.hostOnly')}</p>
          </>
        )}
        <div className="row"><Btn onClick={onClose}>{t('set.close')}</Btn></div>
      </div>
    </Modal>
  );
}
