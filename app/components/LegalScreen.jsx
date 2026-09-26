'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { LEGAL_SECTIONS } from '../legal-content';

export default function LegalScreen({ theme, onBack }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDetail, setDeleteDetail] = useState('');
  // Confirmation : la personne doit retaper son adresse email.
  // Deux taps ne doivent pas suffire pour une action définitive.
  const [myEmail, setMyEmail] = useState('');
  const [typedEmail, setTypedEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyEmail(data.user?.email || ''));
  }, []);

  // La suppression est faite par le serveur : depuis l'app, les règles de sécurité
  // de Supabase bloquaient une partie des effacements sans le dire, et le profil
  // restait visible sur la carte.
  async function deleteAccount() {
    setDeleting(true);
    setDeleteError('');
    setDeleteDetail('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('session expirée');

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const where = body.step ? ` (étape : ${body.step})` : '';
        throw new Error((body.error || `erreur ${res.status}`) + where);
      }

      await supabase.auth.signOut();
      setDeleted(true);
      setTimeout(() => window.location.reload(), 2500);
    } catch (e) {
      console.error('delete-account', e);
      setDeleteError(
        "La suppression n'a pas pu aboutir. Réessaie, et si le problème persiste écris à ateliers777.contact@gmail.com : ton compte sera supprimé manuellement sous 30 jours."
      );
      // Détail technique, affiché en petit : c'est ce qui permet de corriger la cause.
      setDeleteDetail(e.message || '');
      setDeleting(false);
    }
  }


  const emailMatches =
    myEmail.length > 0 && typedEmail.trim().toLowerCase() === myEmail.toLowerCase();

  if (deleted) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '48px' }}>✓</p>
      <p style={{ color, fontWeight: '800', fontSize: '20px' }}>Compte supprimé</p>
      <p style={{ color: subText, fontSize: '14px' }}>À bientôt 👋</p>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: `calc(env(safe-area-inset-top) + 24px) 16px calc(80px + env(safe-area-inset-bottom))` }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>CGU & Mentions légales</h2>
        </div>

        <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '16px', border: `1px solid ${cardBorder}` }}>
          <p style={{ color: subText, fontSize: '13px', lineHeight: 1.6 }}>
            En utilisant Snappin&apos;Buddy, tu acceptes les conditions suivantes. Ces mentions légales ont été rédigées dans un souci de transparence et de respect de ta vie privée.
          </p>
        </div>

        {LEGAL_SECTIONS.map((s, i) => (
          <div key={i} style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: `1px solid ${cardBorder}` }}>
            <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '10px' }}>{s.title}</p>
            <p style={{ color: subText, fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.content}</p>
          </div>
        ))}

        <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: `1px solid rgba(255,77,77,0.2)` }}>
          <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '10px' }}>🗑 Supprimer mon compte</p>
          <p style={{ color: subText, fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>
            La suppression est immédiate et irréversible. Toutes tes données (profil, messages, projets, propositions) seront définitivement effacées conformément au RGPD.
          </p>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{
              width: '100%', padding: '12px', borderRadius: '20px',
              border: '1px solid rgba(255,77,77,0.4)', background: 'transparent',
              color: '#FF4D4D', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              Supprimer mon compte
            </button>
          ) : (
            <div>
              <p style={{ color: '#FF4D4D', fontSize: '13px', fontWeight: '700', marginBottom: '10px', textAlign: 'center' }}>
                ⚠️ Cette action est irréversible !
              </p>
              {deleteError && (
                <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>
                  {deleteError}
                </p>
              )}
              {deleteDetail && (
                <p style={{ color: subText, fontSize: '10px', lineHeight: 1.4, marginBottom: '10px', wordBreak: 'break-word' }}>
                  Détail technique : {deleteDetail}
                </p>
              )}
              <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>
                Pour confirmer, retape ton adresse email :{' '}
                <span style={{ color, fontWeight: '700' }}>{myEmail}</span>
              </p>
              <input
                value={typedEmail}
                onChange={e => setTypedEmail(e.target.value)}
                placeholder="ton@email.com"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px',
                  border: `1px solid ${emailMatches ? '#FF4D4D' : cardBorder}`,
                  background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color, fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                  marginBottom: '10px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setConfirm(false); setTypedEmail(''); }} style={{
                  flex: 1, padding: '12px', borderRadius: '20px',
                  border: `1px solid ${cardBorder}`, background: 'transparent',
                  color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}>
                  Annuler
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting || !emailMatches}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '20px',
                    border: 'none',
                    background: emailMatches ? '#FF4D4D' : (darkMode ? '#2A2A2A' : '#DDD'),
                    color: emailMatches ? 'white' : subText,
                    fontSize: '13px', fontWeight: '700',
                    cursor: emailMatches ? 'pointer' : 'default',
                  }}
                >
                  {deleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ color: subText, fontSize: '11px', textAlign: 'center', marginTop: '8px', lineHeight: 1.6 }}>
          Snappin&apos;Buddy · Ateliers 777 · SIRET 995 320 264 00014 · 59 rue de Ponthieu, 75008 Paris 🗺
        </p>
      </div>
    </div>
  );
}