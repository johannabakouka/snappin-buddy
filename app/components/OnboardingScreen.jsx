'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

const STEPS = [
  {
    id: 'identity',
    title: 'Qui es-tu ?',
    subtitle: 'Commence par te présenter',
    fields: [
      { key: 'username', label: 'Ton prénom ou pseudo *', placeholder: 'Ex: Léa Moreau' },
      { key: 'handle', label: 'Ton handle *', placeholder: '@leamorphoto' },
      { key: 'role', label: 'Ton rôle *', placeholder: 'Photographe, Vidéaste...' },
    ]
  },
  {
    id: 'style',
    title: 'Ton univers',
    subtitle: 'Ce qui te définit en tant que créatif',
    fields: [
      { key: 'bio', label: 'Ton projet en cours', placeholder: 'Une phrase sur ce sur quoi tu travailles...' },
      { key: 'zone', label: 'Ta zone de shoot', placeholder: 'Oberkampf, Belleville, Pigalle...' },
    ],
    styleSelector: true,
  },
];

const STYLE_OPTIONS = ['doc', 'portrait', 'street', 'mode', 'analog', 'vidéo', 'studio', 'architecture', 'nature'];

export default function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ username: '', handle: '', role: '', bio: '', zone: '', styles: '' });
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = STEPS[step];

  function toggleStyle(s) {
    setSelectedStyles(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function canNext() {
    if (step === 0) return values.username && values.handle && values.role;
    return true;
  }

  async function handleFinish() {
    setLoading(true);
    setError('');
    const stylesStr = selectedStyles.join(', ');
    const { error } = await supabase.from('profiles').insert({
      username: values.username,
      handle: values.handle,
      role: values.role,
      bio: values.bio,
      zone: values.zone,
      styles: stylesStr,
      is_active: true,
      user_id: user.id,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    onComplete();
    setLoading(false);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

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
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', fontWeight: '700' }}>
            ÉTAPE {step + 1}/{STEPS.length}
          </span>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '6px', fontFamily: 'var(--font-nunito)' }}>{current.title}</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>{current.subtitle}</p>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>

        {current.fields.map(field => (
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

        {/* Sélecteur de styles */}
        {current.styleSelector && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>TES STYLES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STYLE_OPTIONS.map(s => {
                const active = selectedStyles.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStyle(s)}
                    style={{
                      padding: '8px 16px', borderRadius: '20px',
                      border: `1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.15)'}`,
                      background: active ? 'white' : 'transparent',
                      color: active ? '#000' : 'rgba(255,255,255,0.6)',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {selectedStyles.length > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '12px' }}>
                {selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''} sélectionné{selectedStyles.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
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
          <button
            onClick={handleFinish}
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: '24px', border: 'none',
              background: 'white', color: 'black',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            {loading ? 'Création...' : '🚀 Rejoindre Snappin\'Buddy'}
          </button>
        )}
      </div>
    </div>
  );
}