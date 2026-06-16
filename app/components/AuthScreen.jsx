'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';

export default function AuthScreen({ onLogin, theme }) {
  const t = useT();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const subText = darkMode ? '#555' : '#999';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const isEn = t.map === 'Map';

  async function handleSubmit() {
    if (mode === 'signup' && !cguAccepted) {
      setMessage(isEn ? 'Please accept the terms of use to continue.' : 'Accepte les CGU pour continuer.');
      return;
    }
    setLoading(true);
    setMessage('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage(isEn ? 'Check your email to confirm your account!' : 'Vérifie ton email pour confirmer ton compte !');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else onLogin();
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) { setMessage(t.enterEmailFirst); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://snappin-buddy.vercel.app',
    });
    if (error) setMessage(error.message);
    else setMessage(t.resetSent);
    setLoading(false);
  }

  return (
    <div style={{ padding: '60px 24px', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: bg, color }}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}>
        <img
          src={darkMode ? '/logo.png' : '/logo-dark.png'}
          alt="Snappin'Buddy"
          style={{ width: '130px', height: '130px', objectFit: 'contain', marginBottom: '16px' }}
        />
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '42px', fontWeight: '900', color, letterSpacing: '-1px', lineHeight: 1.1, textAlign: 'center' }}>
          Snappin&apos;Buddy
        </span>
        <span style={{ color: subText, fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '8px' }}>
          match and create
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => { setMode('login'); setMessage(''); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: mode === 'login' ? color : 'transparent', color: mode === 'login' ? bg : color, fontWeight: '700', cursor: 'pointer' }}>{t.login}</button>
        <button onClick={() => { setMode('signup'); setMessage(''); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: mode === 'signup' ? color : 'transparent', color: mode === 'signup' ? bg : color, fontWeight: '700', cursor: 'pointer' }}>{t.signup}</button>
      </div>

      <input
        type="email" placeholder={t.email} value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }}
      />

      {mode !== 'reset' && (
        <input
          type="password" placeholder={t.password} value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
        />
      )}

      {mode === 'login' && (
        <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: subText, fontSize: '12px', cursor: 'pointer', textAlign: 'right', marginBottom: '16px', padding: 0 }}>
          {t.forgotPassword}
        </button>
      )}

      {mode === 'signup' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', marginTop: '8px' }}>
          <div
            onClick={() => setCguAccepted(!cguAccepted)}
            style={{
              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
              border: `2px solid ${cguAccepted ? color : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}`,
              background: cguAccepted ? color : 'transparent',
              cursor: 'pointer', marginTop: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {cguAccepted && <span style={{ color: bg, fontSize: '12px', fontWeight: '900' }}>✓</span>}
          </div>
          <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
            {isEn ? "I accept the " : "J'accepte les "}
            <span
              onClick={() => setShowLegal(true)}
              style={{ color, textDecoration: 'underline', cursor: 'pointer', fontWeight: '700' }}
            >
              {isEn ? "Terms of Use & Privacy Policy" : "CGU & Politique de confidentialité"}
            </span>
            {isEn ? " of Snappin'Buddy" : " de Snappin'Buddy"}
          </p>
        </div>
      )}

      {message && (
        <p style={{ color: message.includes('envoyé') || message.includes('sent') || message.includes('confirmer') || message.includes('confirm') ? '#2ECC71' : '#FF4D4D', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
          {message}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || (mode === 'signup' && !cguAccepted)}
        style={{
          width: '100%', padding: '14px', borderRadius: '24px', border: 'none',
          background: mode === 'signup' && !cguAccepted ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : color,
          color: mode === 'signup' && !cguAccepted ? subText : bg,
          fontSize: '14px', fontWeight: '700', cursor: mode === 'signup' && !cguAccepted ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loading ? t.loading : mode === 'login' ? t.signIn : t.signUp}
      </button>

      {/* Modal CGU */}
      {showLegal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)',
          overflowY: 'auto', padding: '24px 16px 60px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setShowLegal(false)} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color }}>CGU & Politique de confidentialité</h2>
          </div>
          <div style={{ background: darkMode ? '#1A1A1A' : '#E8E8E8', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{`Éditeur : Ateliers 777 — SIRET 995 320 264 00014
59 rue de Ponthieu, 75008 Paris, France
Contact : ateliers777.contact@gmail.com

Snappin'Buddy collecte ton email, ton profil créatif et ta position approximative (±400m) pour te mettre en contact avec d'autres créatifs.

Aucune donnée n'est vendue à des tiers. Tu peux supprimer ton compte à tout moment depuis l'app.

Conformément au RGPD, tu disposes d'un droit d'accès, de rectification et d'effacement de tes données.

Les paiements sont sécurisés par Stripe (PCI-DSS). Les offres expirent après 30 jours.

Droit applicable : droit français. Juridiction : Tribunaux de Paris.

Pour toute question : ateliers777.contact@gmail.com`}</p>
          </div>
          <button
            onClick={() => { setCguAccepted(true); setShowLegal(false); }}
            style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            ✓ {isEn ? 'Accept and continue' : 'Accepter et continuer'}
          </button>
        </div>
      )}
    </div>
  );
}