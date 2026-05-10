'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

export default function EditProfileScreen({ profile, onSave, onBack, theme }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [role, setRole] = useState(profile?.role || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [zone, setZone] = useState(profile?.zone || '');
  const [styles, setStyles] = useState(profile?.styles || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const subText = darkMode ? '#888' : '#999';

  async function handleSave() {
    if (!username || !handle || !role) { setError('Champs obligatoires manquants'); return; }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ username, handle, role, bio, zone, styles }).eq('user_id', profile.user_id);
    if (error) setError(error.message);
    else onSave();
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>Modifier le profil</h2>
      </div>

      {[['Nom', username, setUsername], ['Handle', handle, setHandle], ['Role', role, setRole], ['Pitch', bio, setBio], ['Zone', zone, setZone], ['Styles', styles, setStyles]].map(([label, val, set]) => (
        <div key={label} style={{ marginBottom: '16px' }}>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '6px' }}>{label}</p>
          <input value={val} onChange={e => set(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
      ))}

      {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? 'Sauvegarde...' : 'Enregistrer'}
      </button>
    </div>
  );
}