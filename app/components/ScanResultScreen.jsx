'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { tx } from '../tx';

// Écran affiché après avoir scanné le QR d'un buddy avec l'appareil photo.
// C'est le moment le plus enthousiaste de l'app : deux personnes viennent de
// se rencontrer pour créer. D'où l'invitation à partager juste après.

export default function ScanResultScreen({ sessionId, theme, onDone }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? '#777' : '#888';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const [state, setState] = useState('loading');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    async function validate() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (alive) setState('signed_out'); return; }

        const res = await fetch('/api/validate-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ sessionId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!alive) return;

        if (res.ok) {
          setResult(body);
          setState('ok');
        } else {
          setResult(body);
          setState(body.reason || 'error');
        }
      } catch (e) {
        console.error('validate-scan', e);
        if (alive) setState('error');
      }
    }

    validate();
    return () => { alive = false; };
  }, [sessionId]);

  const messages = {
    loading: { emoji: '⏳', title: tx('Checking…', 'Vérification…'), text: '' },
    signed_out: {
      emoji: '🔐',
      title: tx('Sign in first', 'Connecte-toi d’abord'),
      text: tx('Log in and scan the QR again.', 'Connecte-toi puis scanne le QR à nouveau.'),
    },
    self: {
      emoji: '🪞',
      title: tx('That’s your own QR', 'C’est ton propre QR'),
      text: tx('Scan the other person’s QR, not yours.', 'C’est le QR de l’autre personne qu’il faut scanner, pas le tien.'),
    },
    expired: {
      emoji: '⌛',
      title: tx('This QR has expired', 'Ce QR a expiré'),
      text: tx('QR codes last 30 minutes. Ask for a new one.', 'Un QR dure 30 minutes. Demande-lui d’en regénérer un.'),
    },
    not_yours: {
      emoji: '🙅',
      title: tx('Not your collab', 'Ce n’est pas ta collab'),
      text: tx('This QR belongs to a project you’re not part of.', 'Ce QR concerne un projet dont tu ne fais pas partie.'),
    },
    unknown: {
      emoji: '🤔',
      title: tx('QR not recognised', 'QR non reconnu'),
      text: tx('This code doesn’t match any meeting.', 'Ce code ne correspond à aucune rencontre.'),
    },
    error: {
      emoji: '🙈',
      title: tx('Something went wrong', 'Quelque chose a coincé'),
      text: tx('Try scanning again.', 'Réessaie de scanner.'),
    },
  };

  const buddyName = result?.buddy?.username || tx('your buddy', 'ton buddy');
  const buddyHandle = result?.buddy?.handle || '';

  async function copyCaption() {
    const caption = tx(
      `Shot with ${buddyHandle || buddyName} — met on @snappinbuddy 🗺 #snappinbuddy`,
      `Shooting avec ${buddyHandle || buddyName} — rencontré·e sur @snappinbuddy 🗺 #snappinbuddy`
    );
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('copy', e);
    }
  }

  const info = messages[state] || messages.error;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9800, background: bg, color,
      overflowY: 'auto',
      padding: 'calc(env(safe-area-inset-top) + 60px) 24px calc(40px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>

        {state === 'ok' ? (
          <>
            <p style={{ fontSize: '58px', marginBottom: '8px' }}>🤝</p>
            <h2 style={{ fontFamily: 'var(--font-nunito)', fontSize: '26px', fontWeight: '900', marginBottom: '10px' }}>
              {result?.alreadyCounted
                ? tx('Already validated', 'Déjà validée')
                : tx('Meeting validated!', 'Rencontre validée !')}
            </h2>
            <p style={{ color: subText, fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
              {result?.alreadyCounted
                ? tx(
                    `This meeting with ${buddyName} was already counted.`,
                    `Cette rencontre avec ${buddyName} était déjà comptée.`
                  )
                : tx(
                    `You and ${buddyName} each earned a validated project. It now shows on your profiles.`,
                    `${buddyName} et toi gagnez chacun·e un projet validé. Il apparaît maintenant sur vos profils.`
                  )}
            </p>

            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px', textAlign: 'left' }}>
              <p style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>
                📸 {tx('Share your shoot', 'Partagez votre shoot')}
              </p>
              <p style={{ color: subText, fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>
                {tx(
                  'Post a photo from today in your story, tag @snappinbuddy and add #snappinbuddy — the best collabs get reposted on our page.',
                  'Poste une photo du jour en story, tague @snappinbuddy et mets #snappinbuddy — les plus belles collabs sont repostées sur notre page.'
                )}
              </p>
              <button onClick={copyCaption} style={{
                width: '100%', padding: '12px', borderRadius: '22px', border: 'none',
                background: '#F2E050', color: '#0A0A0D', fontSize: '13px', fontWeight: '800', cursor: 'pointer',
              }}>
                {copied ? tx('Caption copied ✓', 'Légende copiée ✓') : tx('Copy the caption', 'Copier la légende')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '54px', marginBottom: '10px' }}>{info.emoji}</p>
            <h2 style={{ fontFamily: 'var(--font-nunito)', fontSize: '23px', fontWeight: '900', marginBottom: '10px' }}>
              {info.title}
            </h2>
            {info.text && (
              <p style={{ color: subText, fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>{info.text}</p>
            )}
          </>
        )}

        {state !== 'loading' && (
          <button onClick={onDone} style={{
            width: '100%', padding: '15px', borderRadius: '24px', border: 'none',
            background: color, color: bg, fontSize: '15px', fontWeight: '800', cursor: 'pointer',
          }}>
            {tx('Back to the app', 'Retour à l’app')}
          </button>
        )}
      </div>
    </div>
  );
}
