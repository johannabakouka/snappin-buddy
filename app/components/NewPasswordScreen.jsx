'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';
import { tx } from '../tx';

// Affiché quand on arrive depuis le lien « Mot de passe oublié » reçu par email.
// Supabase connecte la personne avec une session de récupération : il reste à choisir le nouveau mot de passe.
export default function NewPasswordScreen({ theme, onDone }) {
  const t = useT();
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function save() {
    setError('');
    if (password.length < 6) { setError(tx('Password too short (6 characters minimum).', 'Mot de passe trop court (6 caractères minimum).')); return; }
    if (password !== confirm) { setError(tx('Passwords do not match.', 'Les mots de passe ne correspondent pas.')); return; }
    setSaving(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (e) setError(e.message);
    else setDone(true);
  }

  const inputStyle = {
    width: '100%', padding: '14px 48px 14px 14px', borderRadius: '12px', border: `1px solid ${inputBorder}`,
    background: inputBg, color, fontSize: '14px', boxSizing: 'border-box', outline: 'none', marginBottom: '12px',
  };

  return (
    <div style={{ padding: 'calc(env(safe-area-inset-top) + 60px) 24px calc(60px + env(safe-area-inset-bottom))', height: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: bg, color }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>{done ? '✅' : '🔑'}</div>
        <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
          {done ? tx('Password updated! ✓', 'Mot de passe modifié ! ✓') : tx('Choose a new password', 'Choisis un nouveau mot de passe')}
        </h1>
        {!done && <p style={{ color: subText, fontSize: '13px' }}>{tx('At least 6 characters.', 'Au moins 6 caractères.')}</p>}
      </div>

      {done ? (
        <button onClick={onDone} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          {tx('Continue to the app →', "Continuer vers l'app →")}
        </button>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
              placeholder={tx('New password', 'Nouveau mot de passe')}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              type="button" onClick={() => setShow(v => !v)}
              aria-label={show ? t.hidePassword : t.showPassword} title={show ? t.hidePassword : t.showPassword}
              style={{ position: 'absolute', right: '6px', top: '6px', width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', color: subText, fontSize: '18px' }}
            >
              {show ? '🙈' : '👁'}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
            placeholder={tx('Confirm password', 'Confirme le mot de passe')}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            style={inputStyle}
          />
          {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? tx('Saving...', 'Sauvegarde...') : tx('Save password', 'Enregistrer le mot de passe')}
          </button>
        </>
      )}
    </div>
  );
}
