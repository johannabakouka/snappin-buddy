'use client';

import { useState } from 'react';
import { supabase } from '../supabase';
import EditProfileScreen from './EditProfileScreen';
import Header from './Header';

export default function ProfileScreen({ profile, onProfileUpdate }) {
  const [editing, setEditing] = useState(false);
  const styles = (profile?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (profile?.zone || '').split(',').map(z => z.trim()).filter(Boolean);

  if (editing) return (
    <EditProfileScreen
      profile={profile}
      onBack={() => setEditing(false)}
      onSave={() => { setEditing(false); onProfileUpdate(); }}
    />
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ padding: '24px 16px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#2C2C2C', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '2px solid rgba(255,255,255,0.22)' }}>◉</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{profile?.username}</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>{profile?.handle}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3DFF8F' }}/>
            <span style={{ color: '#3DFF8F', fontSize: '12px' }}>Disponible</span>
          </div>
        </div>

        {profile?.bio && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>PROJET EN COURS</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.78)' }}>{profile.bio}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>STYLE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {styles.map(s => (
                <span key={s} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '4px 12px' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {zones.length > 0 && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>ZONES DE SHOOT</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setEditing(true)} style={{ width: '100%', background: 'white', color: 'black', border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>Modifier le profil</button>

        <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{ width: '100%', background: 'transparent', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}