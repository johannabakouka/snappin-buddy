'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';
import { tx } from '../tx';
import { authErrorMessage } from '../auth-errors';

// Écran « Compte & sécurité » : changer son adresse email, changer son mot de passe.
// Il manquait complètement — on ne pouvait changer son mot de passe qu'en passant
// par « mot de passe oublié », et son adresse email pas du tout.
//
// Dans les deux cas on redemande le mot de passe actuel. Ce n'est pas une
// formalité : sur un téléphone laissé déverrouillé, sans cette vérification
// n'importe qui pourrait changer l'adresse du compte et se l'approprier.
export default function AccountScreen({ theme, onBack }) {
  const t = useT();
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const subText = darkMode ? '#666' : '#888';

  const [myEmail, setMyEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // Mode invisible. Quelqu'un peut vouloir rester sur l'app sans être
  // localisable : une période chargée, un métier qui ne cherche rien en ce
  // moment, ou simplement l'envie de ne pas figurer sur une carte publique.
  // Sans ce réglage, la seule sortie était de supprimer son compte.
  const [hidden, setHidden] = useState(false);
  const [hiddenBusy, setHiddenBusy] = useState(false);
  const [hiddenError, setHiddenError] = useState('');
  const [myId, setMyId] = useState('');

  // Formulaire email
  const [openEmail, setOpenEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailOk, setEmailOk] = useState('');

  // Formulaire mot de passe
  const [openPass, setOpenPass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState('');
  const [passOk, setPassOk] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setMyEmail(data.user?.email || '');
      // Supabase garde la future adresse ici tant que le lien n'est pas ouvert.
      setPendingEmail(data.user?.new_email || '');
      setMyId(data.user?.id || '');
      if (data.user?.id) {
        supabase.from('profiles').select('hidden').eq('user_id', data.user.id).maybeSingle()
          .then(({ data: row }) => { if (alive) setHidden(!!row?.hidden); });
      }
    });
    return () => { alive = false; };
  }, []);

  async function toggleHidden() {
    if (!myId || hiddenBusy) return;
    const next = !hidden;
    setHiddenBusy(true);
    setHiddenError('');
    const { error } = await supabase.from('profiles').update({ hidden: next }).eq('user_id', myId);
    if (error) {
      console.error('toggleHidden', error);
      setHiddenError(tx("Couldn't save. Try again.", 'L’enregistrement a échoué. Réessaie.'));
    } else {
      setHidden(next);
    }
    setHiddenBusy(false);
  }

  // Vérifie le mot de passe actuel en se reconnectant avec lui. Même session,
  // même compte : ça ne déconnecte personne, mais une mauvaise saisie est
  // refusée ici plutôt que de laisser modifier le compte.
  async function checkPassword(password) {
    if (!myEmail) return tx('Connection failed. Check your internet.', 'Connexion impossible. Vérifie ton réseau.');
    const { error } = await supabase.auth.signInWithPassword({ email: myEmail, password });
    if (!error) return null;
    const raw = String(error.message || '').toLowerCase();
    if (raw.includes('invalid login credentials')) {
      return tx('Wrong password.', 'Mot de passe incorrect.');
    }
    return authErrorMessage(error);
  }

  async function saveEmail() {
    setEmailError('');
    setEmailOk('');
    const clean = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setEmailError(tx('This email address looks invalid.', 'Cette adresse email semble invalide.'));
      return;
    }
    if (clean === myEmail.toLowerCase()) {
      setEmailError(tx('This is already your email address.', 'C’est déjà ton adresse email.'));
      return;
    }
    if (!emailPass) {
      setEmailError(tx('Enter your current password.', 'Saisis ton mot de passe actuel.'));
      return;
    }

    setEmailBusy(true);
    const bad = await checkPassword(emailPass);
    if (bad) { setEmailError(bad); setEmailBusy(false); return; }

    const { error } = await supabase.auth.updateUser({ email: clean });
    if (error) { setEmailError(authErrorMessage(error)); setEmailBusy(false); return; }

    // Selon les réglages du projet, le changement est immédiat ou attend que le
    // lien reçu par email soit ouvert. On regarde ce qui s'est réellement passé
    // au lieu d'annoncer l'un ou l'autre au hasard.
    const { data } = await supabase.auth.getUser();
    const now = (data.user?.email || '').toLowerCase();
    setEmailBusy(false);
    if (now === clean) {
      setMyEmail(data.user?.email || clean);
      setPendingEmail('');
      setEmailOk(tx('Email address updated ✓', 'Adresse email modifiée ✓'));
    } else {
      setPendingEmail(clean);
      setEmailOk(tx(
        'Check your emails: open the confirmation link we just sent to your new address. Your address changes only then. If you also get one at your old address, open that link too.',
        'Regarde tes mails : ouvre le lien de confirmation envoyé à ta nouvelle adresse. L’adresse ne change qu’à ce moment-là. Si tu reçois aussi un mail à l’ancienne adresse, ouvre ce lien aussi.',
      ));
    }
    setEmailPass('');
    setNewEmail('');
  }

  async function savePassword() {
    setPassError('');
    setPassOk('');
    if (!currentPass) {
      setPassError(tx('Enter your current password.', 'Saisis ton mot de passe actuel.'));
      return;
    }
    if (newPass.length < 6) {
      setPassError(tx('Password too short (6 characters minimum).', 'Mot de passe trop court (6 caractères minimum).'));
      return;
    }
    if (newPass !== confirmPass) {
      setPassError(tx('Passwords do not match.', 'Les mots de passe ne correspondent pas.'));
      return;
    }
    if (newPass === currentPass) {
      setPassError(tx('Choose a password different from the old one.', 'Choisis un mot de passe différent de l’ancien.'));
      return;
    }

    setPassBusy(true);
    const bad = await checkPassword(currentPass);
    if (bad) { setPassError(bad); setPassBusy(false); return; }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassBusy(false);
    if (error) { setPassError(authErrorMessage(error)); return; }
    setPassOk(tx('Password updated! ✓', 'Mot de passe modifié ! ✓'));
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  }

  const inputStyle = {
    width: '100%', padding: '13px 14px', borderRadius: '12px',
    border: `1px solid ${inputBorder}`, background: inputBg, color,
    fontSize: '14px', boxSizing: 'border-box', outline: 'none', marginBottom: '10px',
  };

  const rowButton = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'transparent', border: `1px solid ${inputBorder}`, borderRadius: '20px',
    padding: '12px 16px', cursor: 'pointer', color, fontSize: '13px', fontWeight: '700',
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: `calc(env(safe-area-inset-top) + 24px) 16px calc(80px + env(safe-area-inset-bottom))` }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onBack} aria-label={tx('Back', 'Retour')} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>
            {tx('Account & security', 'Compte & sécurité')}
          </h2>
        </div>

        {/* ──────────── Adresse email ──────────── */}
        <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${cardBorder}` }}>
          <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
            ✉️ {tx('Email address', 'Adresse email')}
          </p>
          <p style={{ color: subText, fontSize: '13px', lineHeight: 1.5, marginBottom: '4px', wordBreak: 'break-all' }}>
            {myEmail || tx('Loading…', 'Chargement…')}
          </p>
          <p style={{ color: subText, fontSize: '11px', lineHeight: 1.5, marginBottom: '12px' }}>
            {tx('This is the address you sign in with.', 'C’est l’adresse avec laquelle tu te connectes.')}
          </p>

          {pendingEmail && !emailOk && (
            <p style={{ color: '#FFD700', fontSize: '12px', lineHeight: 1.5, marginBottom: '12px', wordBreak: 'break-all' }}>
              ⏳ {tx('Waiting for confirmation for', 'En attente de confirmation pour')} {pendingEmail}
            </p>
          )}

          {emailOk && (
            <p style={{ color: '#2ECC71', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
              {emailOk}
            </p>
          )}

          {!openEmail ? (
            <button onClick={() => { setOpenEmail(true); setEmailOk(''); }} style={rowButton}>
              <span>{tx('Change my email address', 'Modifier mon adresse email')}</span>
              <span style={{ color: subText, fontWeight: '600' }}>→</span>
            </button>
          ) : (
            <div>
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder={tx('New email address', 'Nouvelle adresse email')}
                autoCapitalize="none" autoCorrect="off" inputMode="email" autoComplete="email"
                style={inputStyle}
              />
              <input
                type="password" autoComplete="current-password"
                value={emailPass}
                onChange={e => setEmailPass(e.target.value)}
                placeholder={tx('Current password', 'Mot de passe actuel')}
                style={inputStyle}
              />
              <p style={{ color: subText, fontSize: '11px', lineHeight: 1.5, marginBottom: '10px' }}>
                {tx('Your password is asked to confirm it’s really you.', 'Ton mot de passe est demandé pour vérifier que c’est bien toi.')}
              </p>
              {emailError && <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{emailError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setOpenEmail(false); setEmailError(''); setNewEmail(''); setEmailPass(''); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '20px', border: `1px solid ${inputBorder}`, background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {tx('Cancel', 'Annuler')}
                </button>
                <button
                  onClick={saveEmail} disabled={emailBusy}
                  style={{ flex: 1, padding: '12px', borderRadius: '20px', border: 'none', background: color, color: bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: emailBusy ? 0.6 : 1 }}
                >
                  {emailBusy ? tx('Saving...', 'Sauvegarde...') : tx('Save', 'Enregistrer')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ──────────── Mot de passe ──────────── */}
        <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${cardBorder}` }}>
          <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
            🔑 {tx('Password', 'Mot de passe')}
          </p>
          <p style={{ color: subText, fontSize: '11px', lineHeight: 1.5, marginBottom: '12px' }}>
            {tx('At least 6 characters.', 'Au moins 6 caractères.')}
          </p>

          {passOk && (
            <p style={{ color: '#2ECC71', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
              {passOk}
            </p>
          )}

          {!openPass ? (
            <button onClick={() => { setOpenPass(true); setPassOk(''); }} style={rowButton}>
              <span>{tx('Change my password', 'Modifier mon mot de passe')}</span>
              <span style={{ color: subText, fontWeight: '600' }}>→</span>
            </button>
          ) : (
            <div>
              <input
                type="password" autoComplete="current-password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder={tx('Current password', 'Mot de passe actuel')}
                style={inputStyle}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} autoComplete="new-password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder={tx('New password', 'Nouveau mot de passe')}
                  style={{ ...inputStyle, padding: '13px 48px 13px 14px' }}
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? t.hidePassword : t.showPassword}
                  title={showPass ? t.hidePassword : t.showPassword}
                  style={{ position: 'absolute', right: '6px', top: '5px', width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', color: subText, fontSize: '18px' }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'} autoComplete="new-password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePassword()}
                placeholder={tx('Confirm password', 'Confirme le mot de passe')}
                style={inputStyle}
              />
              {passError && <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{passError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setOpenPass(false); setPassError(''); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '20px', border: `1px solid ${inputBorder}`, background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {tx('Cancel', 'Annuler')}
                </button>
                <button
                  onClick={savePassword} disabled={passBusy}
                  style={{ flex: 1, padding: '12px', borderRadius: '20px', border: 'none', background: color, color: bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: passBusy ? 0.6 : 1 }}
                >
                  {passBusy ? tx('Saving...', 'Sauvegarde...') : tx('Save password', 'Enregistrer le mot de passe')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>
                {tx('Invisible mode', 'Mode invisible')}
              </p>
              <p style={{ color: subText, fontSize: '12px', lineHeight: 1.6 }}>
                {hidden
                  ? tx(
                    'You are hidden from the map and from Explore. Your conversations keep working, and your profile link still works for anyone you share it with.',
                    'Tu n’apparais plus sur la carte ni dans Explorer. Tes conversations continuent, et ton lien de profil reste valable pour qui tu le partages.',
                  )
                  : tx(
                    'Stay on the app without appearing on the map or in Explore. You can turn it off whenever you want.',
                    'Rester sur l’app sans apparaître sur la carte ni dans Explorer. Tu peux le désactiver quand tu veux.',
                  )}
              </p>
            </div>
            <div
              role="button"
              tabIndex={0}
              aria-label={tx('Invisible mode', 'Mode invisible')}
              aria-pressed={hidden}
              onClick={toggleHidden}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHidden(); } }}
              style={{
                width: '52px', height: '28px', borderRadius: '14px', flexShrink: 0,
                background: hidden ? '#F2E050' : (darkMode ? '#333' : '#DDD'),
                cursor: hiddenBusy ? 'default' : 'pointer', opacity: hiddenBusy ? 0.6 : 1,
                display: 'flex', alignItems: 'center', padding: '3px',
                transition: 'background 0.25s', boxSizing: 'border-box',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: hidden ? '#0A0A0A' : 'white',
                transform: hidden ? 'translateX(24px)' : 'translateX(0px)',
                transition: 'transform 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
          {hiddenError && (
            <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginTop: '10px' }}>{hiddenError}</p>
          )}
        </div>

        <p style={{ color: subText, fontSize: '11px', lineHeight: 1.6, textAlign: 'center', marginTop: '16px' }}>
          {tx(
            'Forgot your password? Sign out, then use “Forgot password” on the sign-in screen.',
            'Mot de passe oublié ? Déconnecte-toi, puis utilise « Mot de passe oublié » sur l’écran de connexion.',
          )}
        </p>
      </div>
    </div>
  );
}
