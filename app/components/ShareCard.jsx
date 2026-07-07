'use client';
import { useRef } from 'react';
import { useRoles, useT } from '../i18n';

export default function ShareCard({ offer, onClose }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const ROLES = useRoles();
  const cardRef = useRef(null);

  const roles = (offer.role_needed || '').split(',').map(r => r.trim()).filter(Boolean);
  const styles = (offer.styles_needed || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
          {isEn ? '📸 Screenshot this card and share it on your story!' : '📸 Screenshot cette carte et partage-la en story !'}
        </p>

        {/* La carte à screenshot */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
          borderRadius: '20px',
          padding: '32px 24px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Fond décoratif */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '150px', height: '150px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: 'black',
              flexShrink: 0,
            }}>S</div>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '14px', letterSpacing: '-0.3px' }}>
              Snappin&apos;Buddy
            </span>
          </div>

          {/* Badge projet */}
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '4px 12px', marginBottom: '16px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
              {isEn ? '⚡ PROJECT' : '⚡ PROJET'}
            </span>
          </div>

          {/* Titre */}
          <h2 style={{
            color: 'white', fontSize: '22px', fontWeight: '900',
            lineHeight: 1.2, marginBottom: '20px',
            fontFamily: 'sans-serif',
          }}>
            {offer.title}
          </h2>

          {/* Description */}
          {offer.description && (
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: '13px',
              lineHeight: 1.6, marginBottom: '20px',
            }}>
              {offer.description.length > 100 ? offer.description.substring(0, 100) + '...' : offer.description}
            </p>
          )}

          {/* Rôles */}
          {roles.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>
                {isEn ? 'LOOKING FOR' : 'ON CHERCHE'}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {roles.map(r => {
                  const role = ROLES.find(x => x.id === r);
                  return (
                    <span key={r} style={{
                      background: 'rgba(255,255,255,0.12)', color: 'white',
                      borderRadius: '20px', padding: '5px 12px',
                      fontSize: '12px', fontWeight: '700',
                    }}>
                      {role?.icon} {role?.label || r}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {styles.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {styles.map(s => (
                  <span key={s} style={{
                    border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
                    borderRadius: '20px', padding: '3px 10px', fontSize: '11px',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Infos */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {offer.zone && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                📍 {offer.zone}
              </span>
            )}
            {offer.date && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                📅 {offer.date}
              </span>
            )}
          </div>

          {/* Séparateur */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.4 }}>
              {isEn ? 'Join on' : 'Rejoins sur'}{'\n'}
              <span style={{ color: 'white', fontWeight: '700' }}>snappin-buddy.vercel.app</span>
            </p>
            <div style={{
              background: 'white', color: 'black',
              borderRadius: '20px', padding: '8px 16px',
              fontSize: '12px', fontWeight: '900',
            }}>
              {isEn ? 'Join ⚡' : 'Me proposer ⚡'}
            </div>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
          {isEn
            ? 'Hold down on the card to save it, then share on Instagram!'
            : 'Appuie longuement sur la carte pour la sauvegarder, puis partage en story !'}
        </p>
      </div>

      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        color: 'white', borderRadius: '24px', padding: '12px 32px',
        fontSize: '14px', fontWeight: '700', cursor: 'pointer',
      }}>
        {isEn ? 'Close' : 'Fermer'}
      </button>
    </div>
  );
}