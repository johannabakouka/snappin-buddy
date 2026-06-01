'use client';
import { useState, useRef } from 'react';
import { supabase } from '../supabase';
import EditProfileScreen from './EditProfileScreen';
import LegalScreen from './LegalScreen';
import { useT } from '../i18n';

export default function ProfileScreen({ profile, onProfileUpdate, theme, darkMode, setDarkMode }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [status, setStatus] = useState(profile?.status || 'dispo');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const fileInputRef = useRef(null);

  const isEn = t.map === 'Map';

  const STATUTS = [
    { id: 'dispo', label: isEn ? 'Available' : 'Disponible', color: '#2ECC71' },
    { id: 'shoot', label: isEn ? 'On shoot' : 'En shoot', color: '#FFD700' },
    { id: 'indispo', label: isEn ? 'Unavailable' : 'Indisponible', color: '#FF4D4D' },
  ];

  const styles = (profile?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (profile?.zone || '').split(',').map(z => z.trim()).filter(Boolean);
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardText = darkMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.78)';
  const tagColor = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const subText = darkMode ? '#666' : '#888';

  async function updateStatus(newStatus) {
    setStatus(newStatus);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ status: newStatus }).eq('user_id', user.id);
      await onProfileUpdate();
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      setAvatarUrl(url);
      await onProfileUpdate();
    }
    setUploading(false);
  }

  if (editing) return (
    <EditProfileScreen
      profile={{ ...profile, avatar_url: avatarUrl }}
      onBack={() => setEditing(false)}
      onSave={() => { setEditing(false); onProfileUpdate(); }}
      theme={theme}
    />
  );

  if (showLegal) return <LegalScreen theme={theme} onBack={() => setShowLegal(false)} />;

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.color }}>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        position: 'relative', flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: theme.color }}>
          Snappin&apos;Buddy
        </span>
        <div onClick={() => setDarkMode(!darkMode)} style={{
          position: 'absolute', right: '16px',
          width: '52px', height: '28px', borderRadius: '14px',
          background: darkMode ? '#333' : '#DDD',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          padding: '3px', transition: 'background 0.3s', boxSizing: 'border-box',
        }}>
          <span style={{ position: 'absolute', left: darkMode ? '6px' : 'auto', right: darkMode ? 'auto' : '6px', fontSize: '11px', opacity: 0.6 }}>
            {darkMode ? '🌙' : '☀️'}
          </span>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', background: 'white',
            transform: darkMode ? 'translateX(0px)' : 'translateX(24px)',
            transition: 'transform 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0,
          }}/>
        </div>
      </div>

      <div style={{ padding: '24px 16px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div onClick={() => fileInputRef.current?.click()} style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: darkMode ? '#2C2C2C' : '#DDD',
            margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', border: `2px solid ${tagBorder}`,
            cursor: 'pointer', overflow: 'hidden', position: 'relative',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (uploading ? '⏳' : '◉')}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '4px 0', fontSize: '10px', color: 'white', fontWeight: '700' }}>
              {uploading ? '...' : '✏️'}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: theme.color }}>{profile?.username}</h2>
          <p style={{ color: subText, fontSize: '13px' }}>{profile?.handle}</p>
{profile?.is_early_adopter && (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', background: 'linear-gradient(135deg, #F0B429, #FF6B6B)', borderRadius: '20px', padding: '3px 10px' }}>
    <span style={{ fontSize: '11px' }}>🌟</span>
    <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', letterSpacing: '0.5px' }}>EARLY ADOPTER</span>
  </div>
)}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            {STATUTS.map(s => (
              <button key={s.id} onClick={() => updateStatus(s.id)} style={{
                padding: '5px 12px', borderRadius: '20px',
                border: `1.5px solid ${s.color}`,
                background: status === s.id ? s.color : 'transparent',
                color: status === s.id ? '#000' : s.color,
                fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {profile?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{t.currentProject}</p>
            <p style={{ fontSize: '14px', color: cardText }}>{profile.bio}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{t.style}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {styles.map(s => (
                <span key={s} style={{ fontSize: '12px', color: tagColor, border: `1px solid ${tagBorder}`, borderRadius: '20px', padding: '4px 12px' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {zones.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{t.shootZones}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: tagColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setEditing(true)} style={{ width: '100%', background: theme.color, color: theme.bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          {t.editProfile}
        </button>

        <button onClick={() => setShowLegal(true)} style={{ width: '100%', background: 'transparent', color: subText, border: `1px solid ${tagBorder}`, borderRadius: '24px', padding: '14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
          {t.legal}
        </button>

        <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{ width: '100%', background: 'transparent', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          {t.logout}
        </button>
      </div>
    </div>
  );
}