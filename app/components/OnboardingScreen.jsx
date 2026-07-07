'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useT, useRoles, useUnivers } from '../i18n';

export default function OnboardingScreen({ user, onComplete }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const ROLES = useRoles();
  const UNIVERS = useUnivers();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUnivers, setSelectedUnivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handleSuggestions, setHandleSuggestions] = useState([]);

  const darkMode = true;
  const bg = '#0A0A0A';
  const color = 'white';
  const subText = '#555';
  const inputBg = 'rgba(255,255,255,0.06)';
  const inputBorder = 'rgba(255,255,255,0.1)';

  function generateHandle(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return [
      `@${base}`,
      `@${base}_creates`,
      `@${base}.studio`,
      `@${base}_snaps`,
    ].filter(h => h.length > 2);
  }

  function handleUsernameChange(val) {
    setUsername(val);
    if (val.length >= 2) {
      setHandleSuggestions(generateHandle(val));
    } else {
      setHandleSuggestions([]);
    }
  }

  function toggleUnivers(s) {
    setSelectedUnivers(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function handleCreate() {
    if (!username || !handle || !selectedRole) {
      setError(isEn ? 'Please fill in all required fields.' : 'Remplis tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    setError('');

    const { UNIVERS_FR, UNIVERS_EN } = await import('../constants');
    const universToSave = selectedUnivers.map(label => {
      if (!isEn) return label;
      const idx = UNIVERS_EN.indexOf(label);
      return idx >= 0 ? UNIVERS_FR[idx] : label;
    });

    const { error: insertError } = await supabase.from('profiles').insert({
      user_id: user.id,
      username,
      handle,
      role: selectedRole,
      styles: universToSave.join(', '),
      status: 'dispo',
    });

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        setError(t.handleTaken);
      } else {
        setError(insertError.message);
      }
      setLoading(false);
      return;
    }
    onComplete();
  }

  const stepLabel = `${t.step} ${step}/3`;

  return (
    <div style={{ padding: '40px 24px', minHeight: '100vh', background: bg, color, display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: subText, fontWeight: '600', letterSpacing: '1px' }}>{stepLabel}</span>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: 'white', borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {step === 1 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-nunito)', fontSize: '26px', fontWeight: '900', marginBottom: '8px', marginTop: '24px' }}>
            {t.whoAreYou}
          </h2>
          <p style={{ color: subText, fontSize: '14px', marginBottom: '32px' }}>{t.whoSub}</p>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
              {isEn ? 'NAME OR USERNAME *' : 'PRÉNOM OU PSEUDO *'}
            </p>
            <input
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              placeholder='Sofia, Alex, Luca...'
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: subText, fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
              HANDLE *
            </p>
            <input
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder='@tonhandle'
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
            />
            {handleSuggestions.length > 0 && !handle && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {handleSuggestions.map(h => (
                  <button key={h} onClick={() => setHandle(h)} style={{
                    padding: '6px 12px', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.6)',
                    fontSize: '12px', cursor: 'pointer',
                  }}>
                    {t.useThis} {h}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          <button
            onClick={() => {
              if (username && handle) { setError(''); setStep(2); }
              else setError(isEn ? 'Fill in your name and handle first.' : "Remplis ton prénom et ton handle d'abord.");
            }}
            style={{ width: '100%', padding: '16px', borderRadius: '24px', border: 'none', background: username && handle ? 'white' : 'rgba(255,255,255,0.15)', color: username && handle ? 'black' : subText, fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: 'auto' }}
          >
            {t.continue}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-nunito)', fontSize: '26px', fontWeight: '900', marginBottom: '8px', marginTop: '24px' }}>
            {t.yourRole}
          </h2>
          <p style={{ color: subText, fontSize: '14px', marginBottom: '32px' }}>{t.roleSub}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '32px' }}>
            {ROLES.map(r => {
              const active = selectedRole === r.id;
              return (
                <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
                  padding: '16px 8px', borderRadius: '14px',
                  border: `1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'white' : 'rgba(255,255,255,0.04)',
                  color: active ? 'black' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '24px' }}>{r.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', textAlign: 'center', lineHeight: 1.2 }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <button onClick={() => setStep(1)} style={{ padding: '16px 24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>←</button>
            <button
              onClick={() => {
                if (selectedRole) { setError(''); setStep(3); }
                else setError(isEn ? 'Choose a role.' : 'Choisis un rôle.');
              }}
              style={{ flex: 1, padding: '16px', borderRadius: '24px', border: 'none', background: selectedRole ? 'white' : 'rgba(255,255,255,0.15)', color: selectedRole ? 'black' : subText, fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              {t.continue}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-nunito)', fontSize: '26px', fontWeight: '900', marginBottom: '8px', marginTop: '24px' }}>
            {t.yourUnivers}
          </h2>
          <p style={{ color: subText, fontSize: '14px', marginBottom: '32px' }}>{t.universSub}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
            {UNIVERS.map(s => {
              const active = selectedUnivers.includes(s);
              return (
                <button key={s} onClick={() => toggleUnivers(s)} style={{
                  padding: '10px 18px', borderRadius: '24px',
                  border: `1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.15)'}`,
                  background: active ? 'white' : 'transparent',
                  color: active ? 'black' : 'rgba(255,255,255,0.65)',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {s}
                </button>
              );
            })}
          </div>

          {error && <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <button onClick={() => setStep(2)} style={{ padding: '16px 24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>←</button>
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{ flex: 1, padding: '16px', borderRadius: '24px', border: 'none', background: 'white', color: 'black', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              {loading ? t.creating : t.createProfile}
            </button>
          </div>
        </>
      )}
    </div>
  );
}