'use client';
import { useState } from 'react';
import { tx } from '../tx';

// Se désister d'un projet auquel on avait été accepté.
//
// À ce stade la conversation est déjà ouverte avec la personne : disparaître
// sans un mot, en la laissant découvrir par un mail automatique qu'une place
// s'est libérée, serait le genre de petit manque de respect qui use une
// communauté. Le message est donc écrit d'avance, et modifiable : celui qui
// n'a rien à ajouter envoie tel quel, celui qui a une raison l'explique.

const MESSAGE_MAX = 300;

export default function WithdrawSheet({ offerTitle, theme, onConfirm, onClose }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? '#888' : '#777';
  const border = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const [message, setMessage] = useState(tx(
    "Sorry, I won't be able to make it for this project after all. I hope you find someone!",
    'Désolé, je ne vais finalement pas pouvoir être là pour ce projet. J’espère que tu trouveras quelqu’un !',
  ));
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    await onConfirm(message.trim());
    setBusy(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '390px', background: bg,
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          padding: `20px 16px calc(24px + env(safe-area-inset-bottom))`,
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        <p style={{ color, fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>
          {tx('You are stepping back', 'Tu te désistes')}
        </p>
        {offerTitle && (
          <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5, marginBottom: '12px' }}>
            {offerTitle}
          </p>
        )}

        <p style={{ color: subText, fontSize: '12px', lineHeight: 1.6, marginBottom: '8px' }}>
          {tx(
            'Your spot opens up again and this message goes to the person. You can change it.',
            'Ta place se libère et ce message part à la personne. Tu peux le modifier.',
          )}
        </p>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          rows={4}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: `1px solid ${border}`,
            background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color, fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box',
            outline: 'none', resize: 'none', fontFamily: 'inherit',
          }}
        />
        <p style={{ color: subText, fontSize: '11px', textAlign: 'right', marginTop: '4px', marginBottom: '14px' }}>
          {message.length}/{MESSAGE_MAX}
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '22px', border: `1px solid ${border}`, background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            {tx('Cancel', 'Annuler')}
          </button>
          <button
            onClick={go}
            disabled={busy}
            style={{
              flex: 2, padding: '12px', borderRadius: '22px', border: 'none',
              background: '#FF4D4D', color: 'white', fontSize: '13px', fontWeight: '800',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy
              ? tx('Sending...', 'Envoi...')
              : tx('Send and step back', 'Envoyer et me désister')}
          </button>
        </div>
      </div>
    </div>
  );
}
