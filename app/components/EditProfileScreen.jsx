'use client';
import { useState, useRef } from 'react';
import { supabase } from '../supabase';

const ROLES = [
  { id: 'photographe', label: 'Photographe', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéaste', icon: '🎬' },
  { id: 'directeur artistique', label: 'Dir. Artistique', icon: '🎨' },
  { id: 'styliste', label: 'Styliste', icon: '👗' },
  { id: 'maquilleur', label: 'Maquilleur·se', icon: '💄' },
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
  { id: 'directeur casting', label: 'Dir. Casting', icon: '🎭' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
  { id: 'autre', label: 'Autre', icon: '✨' },
];

const STYLE_OPTIONS = ['doc', 'portrait', 'street', 'mode', 'analog', 'vidéo', 'studio', 'architecture', 'nature'];

export default function EditProfileScreen({ profile, onSave, onBack, theme }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [handle, setHandle] = useState(profile?.handle || '');
  const [selectedRole, setSelectedRole] = useState(profile?.role || null);
  const [bio, setBio] = useState(profile?.bio || '');
  const [zone, setZone] = useState(profile?.zone || '');
  const [selectedStyles, setSelectedStyles] = useState(
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

  function toggleStyle(s) {
    setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handlePortfolioUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (portfolioUrls.length + files.length > 5) {
      setError('Maximum 5 photos de portfolio');
      return;
    }
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

  async function removePortfolioPhoto(url) {
    setPortfolioUrls(prev => prev.filter(u => u !== url));
  }

  async function handleSave() {
    if (!username || !handle || !selectedRole) { setError('Champs obligatoires manquants'); return; }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      username, handle, role: selectedRole,
      bio, zone, styles: selectedStyles.join(', '),
      portfolio_urls: portfolioUrls,
    }).eq('user_id', profile.user_id);
    if (error) setError(error.message);
    else onSave();
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto', padding: '24px 16px 40px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>Modifier le profil</h2>
      </div>

      {profile?.avatar_url && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={profile.avatar_url} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}` }} />
        </div>
      )}

      {[
        { label: 'Nom', value: username, set: setUsername, placeholder: 'Ton prénom ou pseudo' },
        { label: 'Handle', value: handle, set: setHandle, placeholder: '@tonhandle' },
        { label: 'Pitch', value: bio, set: setBio, placeholder: 'Ton projet en cours...' },
        { label: 'Zone', value: zone, set: setZone, placeholder: 'Belleville, Oberkampf...' },
      ].map(({ label, value, set, placeholder }) => (
        <div key={label} style={{ marginBottom: '16px' }}>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>{label}</p>
          <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '13px 14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
        </div>
      ))}

      {/* Rôle */}
      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>RÔLE *</p>
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

      {/* Styles */}
      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>STYLES</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {STYLE_OPTIONS.map(s => {
          const active = selectedStyles.includes(s);
          return (
            <button key={s} onClick={() => toggleStyle(s)} style={{
              padding: '7px 14px', borderRadius: '20px',
              border: `1.5px solid ${active ? color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
              background: active ? color : 'transparent',
              color: active ? bg : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
            }}>{s}</button>
          );
        })}
      </div>

      {/* Portfolio */}
      <p style={{ color: subText, fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>PORTFOLIO <span style={{ color: subText, fontWeight: '400' }}>(max 5 photos)</span></p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {portfolioUrls.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
            <img src={url} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
            <button
              onClick={() => removePortfolioPhoto(url)}
              style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#FF4D4D', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        ))}
        {portfolioUrls.length < 5 && (
          <button
            onClick={() => portfolioInputRef.current?.click()}
            style={{ width: '80px', height: '80px', borderRadius: '10px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: subText, fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {uploadingPortfolio ? '⏳' : '+'}
          </button>
        )}
      </div>
      <input ref={portfolioInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePortfolioUpload} />

      {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: color, color: bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
        {loading ? 'Sauvegarde...' : 'Enregistrer'}
      </button>
    </div>
  );
}