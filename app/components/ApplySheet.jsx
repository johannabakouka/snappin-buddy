'use client';
import { useState } from 'react';
import { tx } from '../tx';
import { APPLY_NOTE_MAX } from '../constants';

// Le panneau qui s'ouvre quand on se propose pour un projet.
//
// Avant, le bouton envoyait directement une phrase toute faite, la même pour
// tout le monde : « Je me propose pour : <titre> ». La personne qui recevait
// cinq candidatures voyait cinq lignes identiques et devait ouvrir cinq profils
// pour les départager. Un mot de chacun change tout.
//
// Le message reste facultatif. Obligatoire, il ferait renoncer ceux qui écrivent
// dans une langue qui n'est pas la leur, et ce sont justement les gens que
// l'app essaie de mettre en relation.

export default function ApplySheet({ offer, theme, onSend, onClose }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? '#888' : '#777';
  const border = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    await onSend(note);
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
          ⚡ {tx('Apply to this project', 'Je me propose')}
        </p>
        <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5, marginBottom: '14px' }}>
          {offer?.title}
        </p>

        <p style={{ color: subText, fontSize: '12px', lineHeight: 1.6, marginBottom: '8px' }}>
          {tx(
            'Add a word so they know who you are. What you can bring, whether you are free on the date, a link.',
            'Ajoute un mot pour qu’on sache qui tu es. Ce que tu apportes, si tu es libre à la date, un lien.',
          )}
        </p>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, APPLY_NOTE_MAX))}
          rows={4}
          autoFocus
          placeholder={tx(
            'Videographer in Paris, free that Saturday. I shot two concerts last month, my book is on my profile.',
            'Vidéaste à Paris, libre ce samedi-là. J’ai filmé deux concerts le mois dernier, mon book est sur mon profil.',
          )}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: `1px solid ${border}`,
            background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color, fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box',
            outline: 'none', resize: 'none', fontFamily: 'inherit',
          }}
        />
        <p style={{ color: subText, fontSize: '11px', textAlign: 'right', marginTop: '4px', marginBottom: '12px' }}>
          {note.length}/{APPLY_NOTE_MAX} · {tx('optional', 'facultatif')}
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '22px', border: `1px solid ${border}`, background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            {tx('Cancel', 'Annuler')}
          </button>
          <button
            onClick={send}
            disabled={busy}
            style={{
              flex: 2, padding: '12px', borderRadius: '22px', border: 'none',
              background: color, color: bg, fontSize: '13px', fontWeight: '800',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? tx('Sending...', 'Envoi...') : tx('Send my application', 'Envoyer ma candidature')}
          </button>
        </div>
      </div>
    </div>
  );
}
