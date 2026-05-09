'use client';

import { useState } from 'react';
import { supabase } from '../supabase';

export default function OnboardingScreen({ user, onComplete }) {
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [zone, setZone] = useState('');
  const [styles, setStyles] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!username || !handle || !role) {
      setError('Remplis au moins ton nom, handle et rôle !');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('profiles').insert({
      username,
      handle,
      role,
      bio,
      zone,
      styles,
      is_active: true,
      user_id: user.id,
    }).select();
    console.log('data:', data, 'error:', error);
    if (error) setError(error.message);
    else onComplete();
    setLoading(false);
  }

  return (
    <div style={{ padding: '40px 24px 100px', overflowY: 'auto', height: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '4px' }}>Ton profil</h2>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '32px' }}>Comment tu veux apparaître sur Snappin&apos;Buddy ?</p>

      {[
        { label: 'Nom complet *', value: username, set: setUsername, placeholder: 'Ex: Léa Moreau' },
        { label: 'Handle *', value: handle, set: setHandle, placeholder: 'Ex: @leamorphoto' },
        { label: 'Rôle *', value: role, set: setRole, placeholder: 'Photographe, Vidéaste...' },
        { label: 'Pitch', value: bio, set: setBio, placeholder: 'Décris ton univers en une phrase' },
        { label: 'Zone de shoot', value: zone, set: setZone, placeholder: 'Ex: Oberkampf, Belleville...' },
        { label: 'Styles', value: styles, set: setStyles, placeholder: 'Ex: Documentary, Analog, Street' },
      ].map(field => (
        <div key={field.label} style={{ marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '6px' }}>{field.label}</p>
          <input
            value={field.value}
            onChange={e => field.set(e.target.value)}
            placeholder={field.placeholder}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px' }}
          />
        </div>
      ))}

      {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: 'white', color: 'black', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
        {loading ? 'Sauvegarde...' : 'Créer mon profil'}
      </button>
    </div>
  );
}