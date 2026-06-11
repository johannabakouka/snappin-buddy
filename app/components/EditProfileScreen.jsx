'use client';
import { useState, useRef } from 'react';
import { supabase } from '../supabase';
import { useRoles, useUnivers, useT } from '../i18n';

const BIO_MAX = 150;

function getVideoEmbed(url) {
  if (!url) return null;
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (url.includes('tiktok.com/')) {
    const id = url.split('/video/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${id}` };
  }
  if (url.includes('instagram.com/')) {
    return { type: 'link', src: url };
  }
  return null;
}

export default function EditProfileScreen({ profile, onSave, onBack, theme }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const ROLES = useRoles();
  const UNIVERS = useUnivers();

  const [username, setUsername] = useState(profile?.username || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [selectedRole, setSelectedRole] = useState(profile?.role || null);
  const [bio, setBio] = useState(profile?.bio || '');
  const [zone, setZone] = useState(profile?.zone || '');
  const [videoUrl, setVideoUrl] = useState(profile?.video_url || '');
  const [selectedUnivers, setSelectedUnivers] = useState(
    profile?.styles ? profile.styles.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const [portfolioUrls, setPortfolioUrls] = useState(profile?.portfolio_urls || []);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const portfolioInputRef = useRef(null);

  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const subText = darkMode ? '#888' : '#999';

  function toggleUnivers(s) {
    setSelectedUnivers(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function charCount(val, max) {
    const remaining = max - val.length;
    const c = remaining <= 10 ? '#FF4D4D' : remaining <= 30 ? '#FFD700' : subText;
    return <span style={{ fontSize: '11px', color: c }}>{val.length}/{max}</span>;
  }

  async function handlePortfolioUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (portfolioUrls.length + files.length > 5) { setError(isEn ? 'Maximum 5 portfolio photos' : 'Maximum 5 photos de portfolio'); return; }
    setUploadingPortfolio(true);
    const { data: { user } } = await supabase.auth.getUser();
    const newUrls = [...portfolioUrls];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('portfolio').upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setPortfolioUrls(newUrls);
    setUploadingPortfolio(false);
  }

  async function handleSave() {
    if (!username || !handle || !selectedRole) { setError(isEn ? 'Required fields missing' : 'Champs obligatoires manquants'); return; }
    setLoading(true);
    const { UNIVERS_FR, UNIVERS_EN } = await import('../constants');
    const universToSave = selectedUnivers.map(label => {
      if (!isEn) return label;
      const idx = UNIVERS_EN.indexOf(label);
      return idx >= 0 ? UNIVERS_FR[idx] : label;
    });
    const { error } = await supabase.from('profiles').update({
      username, handle, role: selectedRole,
      bio, zone, styles: universToSave.join(', '),
      portfolio_urls: portfolioUrls,
      video_url: videoUrl || null,
    }).eq('user_id', profile.user_id);
    if (error) setError(error.message);
    else onSave();
    setLoading(false);
  }

  const embedUrl = getVideoEmbed(videoUrl);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto', padding: '24px 16px 40px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>{isEn ? 'Edit profile' : 'Modifier le profil'}</h2>
      </div>

      {profile?.avatar_url && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={profile.avatar_url} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}` }} />
        </div>
      )}

      {[
        { label: isEn ? 'Name' : 'Nom', value: username, set: setUsername, placeholder: isEn ? 'Your name or username' : 'Ton prénom ou pseudo', max: null },
        { label: 'Handle', value: handle, set: setHandle, placeholder: '@tonhandle', max: null },
        { label: isEn ? 'Area' : 'Zone', value: zone, set: setZone, placeholder: isEn ? 'Shoreditch, Kreuzberg...' : 'Belleville, Oberkampf...', max: null },
      ].map(({ label, value, set, placeholder }) => (
        <div key={label} style={{ marginBottom: '16px' }}>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>{label}</p>
          <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '13px 14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
        </div>
      ))}

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <p style={{ color: subText, fontSize: '12px', fontWeight: '600' }}>{isEn ? 'Pitch' : 'Pitch'}</p>
          {charCount(bio, BIO_MAX)}
        </div>
        <input
          value={bio}
          onChange={e => e.target.value.length <= BIO_MAX && setBio(e.target.value)}
          placeholder={isEn ? 'Current project...' : 'Ton projet en cours...'}
          style={{ width: '100%', padding: '13px 14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>{isEn ? 'ROLE *' : 'RÔLE *'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {ROLES.map(r => {
          const active = selectedRole === r.id;
          return (
            <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
              padding: '12px 8px', borderRadius: '12px',
              border: `1.5px solid ${active ? color : (darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`,
              background: active ? color : inputBg,
              color: active ? bg : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '20px' }}>{r.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: '700', textAlign: 'center', lineHeight: 1.2 }}>{r.label}</span>
            </button>
          );
        })}
      </div>

      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>{isEn ? 'UNIVERSE' : 'UNIVERS'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {UNIVERS.map(s => {
          const active = selectedUnivers.includes(s);
          return (
            <button key={s} onClick={() => toggleUnivers(s)} style={{
              padding: '7px 14px', borderRadius: '20px',
              border: `1.5px solid ${active ? color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
              background: active ? color : 'transparent',
              color: active ? bg : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
            }}>{s}</button>
          );
        })}
      </div>

      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>PORTFOLIO <span style={{ fontWeight: '400' }}>(max 5)</span></p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {portfolioUrls.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
            <img src={url} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
            <button onClick={() => setPortfolioUrls(prev => prev.filter(u => u !== url))}
              style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#FF4D4D', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        ))}
        {portfolioUrls.length < 5 && (
          <button onClick={() => portfolioInputRef.current?.click()}
            style={{ width: '80px', height: '80px', borderRadius: '10px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: subText, fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploadingPortfolio ? '⏳' : '+'}
          </button>
        )}
      </div>
      <input ref={portfolioInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePortfolioUpload} />

      <p style={{ color: subText, fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>🎬 {isEn ? 'VIDEO LINK' : 'LIEN VIDÉO'} <span style={{ fontWeight: '400' }}>(YouTube, Vimeo, TikTok, Instagram)</span></p>
      <input
        value={videoUrl}
        onChange={e => setVideoUrl(e.target.value)}
        placeholder="https://youtube.com, vimeo.com, tiktok.com, instagram.com..."
        style={{ width: '100%', padding: '13px 14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', boxSizing: 'border-box', outline: 'none', marginBottom: '12px' }}
      />
      {embedUrl && embedUrl.type === 'iframe' && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', aspectRatio: '16/9' }}>
          <iframe src={embedUrl.src} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
        </div>
      )}
      {embedUrl && embedUrl.type === 'link' && (
        <a href={embedUrl.src} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', color: 'white', fontWeight: '700', fontSize: '13px', textAlign: 'center', marginBottom: '16px', textDecoration: 'none' }}>
          📸 {isEn ? 'View on Instagram →' : 'Voir sur Instagram →'}
        </a>
      )}

      {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? (isEn ? 'Saving...' : 'Sauvegarde...') : (isEn ? 'Save' : 'Enregistrer')}
      </button>
    </div>
  );
}