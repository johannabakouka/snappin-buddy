'use client';
import { useState } from 'react';
import { tx } from '../tx';
import { REPORT_REASONS, sendReport } from '../reports';

// Le panneau de signalement, le même partout.
//
// Il n'existait que sur les profils, écrit à la main dans BuddyProfileScreen.
// Une photo déplacée dans une conversation ou un projet mensonger n'avaient
// aucun bouton, alors que les CGU les interdisent nommément. Un seul composant
// pour les trois, c'est aussi la garantie que les motifs restent les mêmes et
// que la modération compare des choses comparables.
//
// targetType : 'profile' | 'message' | 'offer'

export default function ReportSheet({ targetType, targetId, theme, onClose }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? '#888' : '#777';
  const border = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const title = targetType === 'message'
    ? tx('Report this message', 'Signaler ce message')
    : targetType === 'offer'
      ? tx('Report this project', 'Signaler ce projet')
      : tx('Report this profile', 'Signaler ce profil');

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    const problem = await sendReport({ targetType, targetId, reason, details });
    if (problem) setError(problem);
    else setSent(true);
    setBusy(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.55)',
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
        {sent ? (
          <>
            <p style={{ color: '#2ECC71', fontSize: '15px', fontWeight: '800', marginBottom: '8px' }}>
              ✓ {tx('Report sent', 'Signalement envoyé')}
            </p>
            <p style={{ color: subText, fontSize: '13px', lineHeight: 1.6, marginBottom: '18px' }}>
              {tx(
                'It is recorded and will be reviewed. If the content is clearly illegal, it is taken down without delay.',
                'Il est enregistré et sera examiné. Si le contenu est manifestement illégal, il est retiré sans délai.',
              )}
            </p>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '13px', borderRadius: '22px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
            >
              {tx('Close', 'Fermer')}
            </button>
          </>
        ) : (
          <>
            <p style={{ color, fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}>🚩 {title}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {REPORT_REASONS.map(r => {
                const active = reason === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setReason(r.id)}
                    style={{
                      padding: '11px 14px', borderRadius: '12px', textAlign: 'left',
                      border: `1px solid ${active ? '#FF4D4D' : border}`,
                      background: active ? 'rgba(255,77,77,0.1)' : 'transparent',
                      color: active ? '#FF4D4D' : subText,
                      fontSize: '13px', cursor: 'pointer', fontWeight: active ? '700' : '400',
                    }}
                  >
                    {tx(r.en, r.fr)}
                  </button>
                );
              })}
            </div>

            {/* Le champ libre manquait : « Autre » tout seul n'apprend rien à
                la personne qui lira le signalement. */}
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value.slice(0, 500))}
              placeholder={tx('Anything else we should know? (optional)', 'Quelque chose à ajouter ? (facultatif)')}
              rows={3}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: `1px solid ${border}`,
                background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color, fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                resize: 'none', marginBottom: '12px', fontFamily: 'inherit',
              }}
            />

            {error && (
              <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '12px', borderRadius: '22px', border: `1px solid ${border}`, background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                {tx('Cancel', 'Annuler')}
              </button>
              <button
                onClick={submit}
                disabled={!reason || busy}
                style={{
                  flex: 1, padding: '12px', borderRadius: '22px', border: 'none',
                  background: reason ? '#FF4D4D' : 'rgba(255,77,77,0.3)',
                  color: 'white', fontSize: '13px', fontWeight: '800',
                  cursor: reason && !busy ? 'pointer' : 'default',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? tx('Sending...', 'Envoi...') : tx('Send report', 'Envoyer')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
