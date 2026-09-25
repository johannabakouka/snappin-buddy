'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useT, useRoles, useUnivers } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { cleanHandle, isHandleValid, checkHandle } from '../handles';
import { handleIssue } from '../handle-filter';

export default function OnboardingScreen({ user, onComplete }) {
  const t = useT();
  const isEn = isNotFrench();
  const ROLES = useRoles();
  const UNIVERS = useUnivers();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);

  function toggleRole(id) {
    setSelectedRoles(prev => {
      if (prev.includes(id)) return prev.filter(r => r !== id);
      if (prev.length >= 3) return prev; // 3 rôles maximum
      return [...prev, id];
    });
  }
  const [selectedUnivers, setSelectedUnivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handleSuggestions, setHandleSuggestions] = useState([]);
  // Disponibilité du pseudo. On mémorise le pseudo vérifié en même temps que le
  // résultat : tant que ce n'est pas le pseudo affiché, c'est que la vérification
  // est encore en cours.
  const [handleCheck, setHandleCheck] = useState({ handle: '', free: null, suggestions: [] });

  // Pause de 500 ms pour ne pas interroger la base à chaque lettre tapée.
  useEffect(() => {
    if (!isHandleValid(handle)) return;
    const timer = setTimeout(async () => {
      const { free, suggestions, issue } = await checkHandle(handle);
      setHandleCheck({ handle, free, suggestions, issue });
    }, 500);
    return () => clearTimeout(timer);
  }, [handle]);

  const checked = handleCheck.handle === handle;
  const handleFree = checked ? handleCheck.free : null;
  const takenSuggestions = checked ? handleCheck.suggestions : [];
  const handleIssueCode = checked ? handleCheck.issue : null;
  const checkingHandle = isHandleValid(handle) && !checked;

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
    if (!username || !handle || selectedRoles.length === 0) {
      setError(tx('Please fill in all required fields.', 'Remplis tous les champs obligatoires.'));
      return;
    }
    // Dernier contrôle avant l'enregistrement, au cas où la vérification
    // pendant la saisie n'aurait pas eu le temps de se faire.
    if (handleIssue(handle)) {
      setError(tx('This handle is not allowed.', "Ce handle n'est pas autorisé."));
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
      role: selectedRoles.join(', '),
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
  const canContinue = Boolean(username) && isHandleValid(handle) && handleFree !== false;

  return (
    <div style={{ padding: 'calc(env(safe-area-inset-top) + 40px) 24px calc(40px + env(safe-area-inset-bottom))', minHeight: '100dvh', background: bg, color, display: 'flex', flexDirection: 'column' }}>

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
              {tx('NAME OR USERNAME *', 'PRÉNOM OU PSEUDO *')}
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
              onChange={e => setHandle(cleanHandle(e.target.value))}
              placeholder='@tonhandle'
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: `1px solid ${handleFree === false ? '#FF4D4D' : handleFree === true ? '#4CD964' : inputBorder}`,
                background: inputBg, color, fontSize: '15px', boxSizing: 'border-box', outline: 'none',
              }}
            />

            {handle && !isHandleValid(handle) && (
              <p style={{ color: subText, fontSize: '12px', marginTop: '8px' }}>
                {tx('At least 3 characters: letters, numbers, . or _', 'Au moins 3 caractères : lettres, chiffres, point ou tiret bas')}
              </p>
            )}
            {checkingHandle && isHandleValid(handle) && (
              <p style={{ color: subText, fontSize: '12px', marginTop: '8px' }}>
                {tx('Checking…', 'Vérification…')}
              </p>
            )}
            {!checkingHandle && handleFree === true && (
              <p style={{ color: '#4CD964', fontSize: '12px', marginTop: '8px', fontWeight: '600' }}>
                ✓ {tx('Available', 'Disponible')}
              </p>
            )}
            {!checkingHandle && handleFree === false && (
              <>
                <p style={{ color: '#FF4D4D', fontSize: '12px', marginTop: '8px', fontWeight: '600' }}>
                  {handleIssueCode === 'insulte'
                    ? tx('This handle is not allowed', "Ce handle n'est pas autorisé")
                    : handleIssueCode === 'reserve'
                    ? tx('This handle is reserved', 'Ce handle est réservé')
                    : tx('Already taken', 'Déjà pris')}
                </p>
                {takenSuggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {takenSuggestions.map(h => (
                      <button key={h} onClick={() => setHandle(h)} style={{
                        padding: '6px 12px', borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent', color: 'rgba(255,255,255,0.6)',
                        fontSize: '12px', cursor: 'pointer',
                      }}>
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

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
              if (!username || !handle) {
                setError(tx('Fill in your name and handle first.', "Remplis ton prénom et ton handle d'abord."));
              } else if (!isHandleValid(handle)) {
                setError(tx('Your handle needs at least 3 characters.', 'Ton handle doit faire au moins 3 caractères.'));
              } else if (handleFree === false) {
                setError(tx('This handle is already taken.', 'Ce handle est déjà pris.'));
              } else {
                setError(''); setStep(2);
              }
            }}
            style={{ width: '100%', padding: '16px', borderRadius: '24px', border: 'none', background: canContinue ? 'white' : 'rgba(255,255,255,0.15)', color: canContinue ? 'black' : subText, fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: 'auto' }}
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
          <p style={{ color: subText, fontSize: '14px', marginBottom: '8px' }}>{t.roleSub}</p>
          <p style={{ color: subText, fontSize: '13px', marginBottom: '28px' }}>
            {tx('You can pick up to 3.', 'Tu peux en choisir jusqu’à 3.')} <span style={{ fontWeight: '700', color: 'white' }}>{selectedRoles.length}/3</span>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '32px' }}>
            {ROLES.map(r => {
              const active = selectedRoles.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggleRole(r.id)} style={{
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
                if (selectedRoles.length) { setError(''); setStep(3); }
                else setError(tx('Choose at least one role.', 'Choisis au moins un rôle.'));
              }}
              style={{ flex: 1, padding: '16px', borderRadius: '24px', border: 'none', background: selectedRoles.length ? 'white' : 'rgba(255,255,255,0.15)', color: selectedRoles.length ? 'black' : subText, fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
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