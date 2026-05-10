'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthScreen({ onLogin, theme }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';

  async function handleSubmit() {
    setLoading(true);
    setMessage('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage('Vérifie ton email pour confirmer ton compte !');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else onLogin();
    }
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
        <span style={{
          fontFamily: 'var(--font-nunito)',
          fontSize: '42px',
          fontWeight: '900',
          color,
          letterSpacing: '-1px',
          lineHeight: 1.1,
          textAlign: 'center',
        }}>
          Snappin&apos;Buddy
        </span>
        <span style={{
          color: darkMode ? '#555' : '#999',
          fontSize: '12px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: '8px',
        }}>
          match and create
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => setMode('login')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: mode === 'login' ? color : 'transparent', color: mode === 'login' ? bg : color, fontWeight: '700', cursor: 'pointer' }}>Connexion</button>
        <button onClick={() => setMode('signup')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: mode === 'signup' ? color : 'transparent', color: mode === 'signup' ? bg : color, fontWeight: '700', cursor: 'pointer' }}>Inscription</button>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color, fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box' }}
      />

      {message && <p style={{ color: message.includes('email') ? '#3DFF8F' : '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
      </button>
    </div>
  );
}