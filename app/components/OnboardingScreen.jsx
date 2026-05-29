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

const STEPS = [
  { id: 'identity', title: 'Qui es-tu ?', subtitle: 'Commence par te présenter' },
  { id: 'role', title: 'Ton rôle', subtitle: 'Comment tu contribues à un projet ?' },
  { id: 'style', title: 'Ton univers', subtitle: 'Ce qui te définit en tant que créatif' },
];

export default function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ username: '', handle: '', bio: '', zone: '' });
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function toggleStyle(s) {
    setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function canNext() {
    if (step === 0) return values.username && values.handle;
    if (step === 1) return selectedRole !== null;
    return true;
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl + '?t=' + Date.now());
    }
    setUploading(false);
  }

  async function handleFinish() {
    setLoading(true);
    setError('');
    const { error } = await supabase.from('profiles').insert({
      username: values.username,
      handle: values.handle,
      role: selectedRole,
      bio: values.bio,
      zone: values.zone,
      styles: selectedStyles.join(', '),
      avatar_url: avatarUrl,
      is_active: true,
      user_id: user.id,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    onComplete();
    setLoading(false);
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* Barre de progression */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: 'white', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '32px 24px 0', flexShrink: 0 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer', marginBottom: '16px', padding: 0 }}>←</button>
        )}
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', fontWeight: '700' }}>
          ÉTAPE {step + 1}/{STEPS.length}
        </span>
        <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '6px', marginTop: '8px', fontFamily: 'var(--font-nunito)' }}>{current.title}</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>{current.subtitle}</p>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>

        {/* Étape 1 — Identité + Avatar */}
        {step === 0 && (
          <>
            {/* Avatar upload */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '88px', height: '88px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px dashed rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', marginBottom: '2px' }}>{uploading ? '⏳' : '📷'}</p>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>PHOTO</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            {[
              { key: 'username', label: 'Ton prénom ou pseudo *', placeholder: 'Ex: Léa Moreau' },
              { key: 'handle', label: 'Ton handle *', placeholder: '@leamorphoto' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '16px' }}>
                <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>{field.label}</p>
                <input
                  value={values[field.key]}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)', color: 'white',
                    fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            ))}
          </>
        )}

        {/* Étape 2 — Rôle */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {ROLES.map(r => {
              const active = selectedRole === r.id;
              return (
                <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
                  padding: '16px 12px', borderRadius: '16px',
                  border: `1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'white' : 'rgba(255,255,255,0.04)',
                  color: active ? '#000' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '24px' }}>{r.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>{r.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Étape 3 — Univers */}
        {step === 2 && (
          <>
            {[
              { key: 'bio', label: 'Ton projet en cours', placeholder: 'Une phrase sur ce sur quoi tu travailles...' },
              { key: 'zone', label: 'Ta zone', placeholder: 'Oberkampf, Belleville, Pigalle...' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '16px' }}>
                <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>{field.label}</p>
                <input
                  value={values[field.key]}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)', color: 'white',
                    fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            ))}

            <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>TES STYLES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {STYLE_OPTIONS.map(s => {
                const active = selectedStyles.includes(s);
                return (
                  <button key={s} onClick={() => toggleStyle(s)} style={{
                    padding: '8px 16px', borderRadius: '20px',
                    border: `1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.15)'}`,
                    background: active ? 'white' : 'transparent',
                    color: active ? '#000' : 'rgba(255,255,255,0.6)',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                  }}>{s}</button>
                );
              })}
            </div>
            {selectedStyles.length > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '8px' }}>
                {selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''} sélectionné{selectedStyles.length > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}

        {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
      </div>

      {/* Bouton */}
      <div style={{ padding: '16px 24px 40px', flexShrink: 0 }}>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => { setError(''); if (canNext()) setStep(s => s + 1); else setError('Remplis les champs obligatoires !'); }}
            style={{
              width: '100%', padding: '16px', borderRadius: '24px', border: 'none',
              background: canNext() ? 'white' : 'rgba(255,255,255,0.15)',
              color: canNext() ? 'black' : 'rgba(255,255,255,0.4)',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Continuer →
          </button>
        ) : (
          <button onClick={handleFinish} disabled={loading} style={{
            width: '100%', padding: '16px', borderRadius: '24px', border: 'none',
            background: 'white', color: 'black',
            fontSize: '15px', fontWeight: '700', cursor: 'pointer',
          }}>
            {loading ? 'Création...' : "🚀 Rejoindre Snappin'Buddy"}
          </button>
        )}
      </div>
    </div>
  );
}