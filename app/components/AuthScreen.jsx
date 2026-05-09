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
    <div style={{ padding: '60px 24px', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
     // APRÈS
<img src="/logo.jpeg" alt="Snappin'Buddy" style={{ width: '140px', marginBottom: '16px' }} />
<p style={{ color: '#666', fontSize: '14px', marginBottom: '40px' }}>La communauté des créatifs visuels</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => setMode('login')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: mode === 'login' ? 'white' : 'transparent', color: mode === 'login' ? 'black' : 'white', fontWeight: '700', cursor: 'pointer' }}>Connexion</button>
        <button onClick={() => setMode('signup')} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: mode === 'signup' ? 'white' : 'transparent', color: mode === 'signup' ? 'black' : 'white', fontWeight: '700', cursor: 'pointer' }}>Inscription</button>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px', marginBottom: '12px' }}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px', marginBottom: '20px' }}
      />

      {message && <p style={{ color: message.includes('email') ? '#3DFF8F' : '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: 'white', color: 'black', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
      </button>
    </div>
  );
}