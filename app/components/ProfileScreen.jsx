'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import EditProfileScreen from './EditProfileScreen';

export default function ProfileScreen({ profile, onProfileUpdate, theme, darkMode, setDarkMode }) {
  const [editing, setEditing] = useState(false);
  const styles = (profile?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (profile?.zone || '').split(',').map(z => z.trim()).filter(Boolean);

  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardText = darkMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.78)';
  const tagColor = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const subText = darkMode ? '#666' : '#999';

  if (editing) return (
    <EditProfileScreen
      profile={profile}
      onBack={() => setEditing(false)}
      onSave={() => { setEditing(false); onProfileUpdate(); }}
    />
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.color }}>
      
      {/* Header avec toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        position: 'relative',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-nunito)',
          fontSize: '22px',
          fontWeight: '900',
          color: theme.color,
        }}>
          Snappin&apos;Buddy
        </span>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            position: 'absolute',
            right: '16px',
            background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '16px',
            cursor: 'pointer',
            color: theme.color,
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ padding: '24px 16px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#DDD', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${tagBorder}` }}>◉</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: theme.color }}>{profile?.username}</h2>
          <p style={{ color: subText, fontSize: '13px' }}>{profile?.handle}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3DFF8F' }}/>
            <span style={{ color: '#3DFF8F', fontSize: '12px' }}>Disponible</span>
          </div>
        </div>

        {profile?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>PROJET EN COURS</p>
            <p style={{ fontSize: '14px', color: cardText }}>{profile.bio}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>STYLE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {styles.map(s => (
                <span key={s} style={{ fontSize: '12px', color: tagColor, border: `1px solid ${tagBorder}`, borderRadius: '20px', padding: '4px 12px' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {zones.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>ZONES DE SHOOT</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: tagColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setEditing(true)} style={{ width: '100%', background: theme.color, color: theme.bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>Modifier le profil</button>

        <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{ width: '100%', background: 'transparent', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}