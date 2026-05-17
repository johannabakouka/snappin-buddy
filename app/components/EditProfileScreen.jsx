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
  const card = darkMode ? '#1A1A1A' : '#F0F0F0';

  async function handleSave() {
    if (!username || !handle || !role) { setError('Champs obligatoires manquants'); return; }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ username, handle, role, bio, zone, styles }).eq('user_id', profile.user_id);
    if (error) setError(error.message);
    else onSave();
    setLoading(false);
  }

  const fields = [
    { label: 'Nom', value: username, set: setUsername, placeholder: 'Ton prénom ou pseudo' },
    { label: 'Handle', value: handle, set: setHandle, placeholder: '@tonhandle' },
    { label: 'Rôle', value: role, set: setRole, placeholder: 'Photographe, vidéaste...' },
    { label: 'Pitch', value: bio, set: setBio, placeholder: 'Ton projet en cours...' },
    { label: 'Zone', value: zone, set: setZone, placeholder: 'Belleville, Oberkampf...' },
    { label: 'Styles', value: styles, set: setStyles, placeholder: 'doc, portrait, street...' },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto', padding: '24px 16px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>Modifier le profil</h2>
      </div>

      {/* Avatar */}
      {profile?.avatar_url && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={profile.avatar_url} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}` }} />
        </div>
      )}

      {/* Aide styles */}
      <div style={{ background: card, borderRadius: '12px', padding: '12px 14px', marginBottom: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <p style={{ color: subText, fontSize: '11px', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>STYLES DISPONIBLES</p>
        <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5 }}>doc · portrait · street · mode · analog · vidéo · studio · architecture · nature</p>
        <p style={{ color: subText, fontSize: '11px', marginTop: '6px' }}>Sépare-les par des virgules</p>
      </div>

      {fields.map(({ label, value, set, placeholder }) => (
        <div key={label} style={{ marginBottom: '16px' }}>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>{label}</p>
          <input
            value={value}
            onChange={e => set(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%', padding: '13px 14px', borderRadius: '12px',
              border: `1px solid ${inputBorder}`,
              background: inputBg, color, fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      ))}

      {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
        {loading ? 'Sauvegarde...' : 'Enregistrer'}
      </button>
    </div>
  );
}