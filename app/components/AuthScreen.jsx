'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    <div style={{ padding: '60px 24px', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0A0A0A' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}>
        <svg width="110" height="72" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px' }}>
          <circle cx="28" cy="14" r="10" fill="white"/>
          <path d="M8 60 Q8 38 28 38 Q48 38 48 60" fill="white"/>
          <circle cx="92" cy="14" r="10" fill="white"/>
          <path d="M72 60 Q72 38 92 38 Q112 38 112 60" fill="white"/>
          <rect x="48" y="20" width="24" height="36" rx="4" fill="#222" stroke="white" strokeWidth="1.5"/>
          <rect x="52" y="26" width="16" height="20" rx="2" fill="#333"/>
          <circle cx="60" cy="34" r="3" fill="#FFD700"/>
          <path d="M60 37 L60 42" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M60 18 L61.5 22 L66 22 L62.5 24.5 L64 28.5 L60 26 L56 28.5 L57.5 24.5 L54 22 L58.5 22 Z" fill="#FFD700"/>
          <path d="M44 44 L50 36" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M76 44 L70 36" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>

        <span style={{
          fontFamily: 'var(--font-nunito)',
          fontSize: '42px',
          fontWeight: '900',
          color: 'white',
          letterSpacing: '-1px',
          lineHeight: 1.1,
          textAlign: 'center',
        }}>
          Snappin&apos;Buddy
        </span>
        <span style={{
          color: '#555',
          fontSize: '12px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: '8px',
        }}>
          match and create
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => setMode('login')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: mode === 'login' ? 'white' : 'transparent', color: mode === 'login' ? 'black' : 'white', fontWeight: '700', cursor: 'pointer' }}>Connexion</button>
        <button onClick={() => setMode('signup')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: mode === 'signup' ? 'white' : 'transparent', color: mode === 'signup' ? 'black' : 'white', fontWeight: '700', cursor: 'pointer' }}>Inscription</button>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box' }}
      />

      {message && <p style={{ color: message.includes('email') ? '#3DFF8F' : '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: 'white', color: 'black', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
      </button>
    </div>
  );
}