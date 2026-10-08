'use client';
import { ROLES_EN, ROLES_FR, roleLabels } from '../constants';
import { tx, isNotFrench } from '../tx';
import Thumb from './Thumb';

// La petite carte qui s'ouvre quand on touche un point sur la carte.
//
// C'est le premier contact : avant d'ouvrir un profil, on ne voit que ça.
// Elle vivait à l'intérieur de la carte, donc impossible de la montrer
// ailleurs. Sortie d'ici, elle sert aussi d'aperçu dans « Voir comme les
// autres », où la personne voit exactement ce qui s'affiche quand on la
// touche sur la carte.
//
// `floating` place la carte au-dessus de la carte du monde. Dans l'aperçu
// elle est posée dans la page, sans position absolue ni ombre portée.

export default function MapPreviewCard({
  buddy,
  darkMode = true,
  floating = true,
  onClose = null,
  onOpen = null,
}) {
  const isEn = isNotFrench();
  if (!buddy) return null;

  const statusColor = buddy.status === 'shoot' ? '#FFD700' : buddy.status === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = buddy.status === 'shoot'
    ? tx('On shoot', 'En shoot')
    : buddy.status === 'indispo'
      ? tx('Unavailable', 'Indisponible')
      : tx('Available', 'Disponible');

  const styles = (buddy.styles || '').split(',').map(s => s.trim()).filter(Boolean);

  const frame = floating
    ? {
      position: 'absolute', bottom: '100px', left: '16px', right: '16px', zIndex: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }
    : { position: 'relative' };

  return (
    <div style={{
      ...frame,
      background: darkMode ? '#1A1A1A' : '#FFFFFF',
      borderRadius: '18px', padding: '16px',
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: darkMode ? '#2C2C2C' : '#DDD',
          overflow: 'hidden', flexShrink: 0,
          border: `2px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>
          {buddy.avatar_url
            ? <Thumb src={buddy.avatar_url} alt={buddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '◉'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: '900', fontSize: '17px', color: darkMode ? 'white' : '#111' }}>
            {buddy.username}
          </div>
          <div style={{ fontSize: '11px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontWeight: '600' }}>
            {buddy.role && (
              <span style={{ marginRight: '6px' }}>
                {roleLabels(buddy.role, isEn ? ROLES_EN : ROLES_FR, buddy.role_other)}
              </span>
            )}
            {styles.length > 0 && styles.join(' · ')}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label={tx('Close', 'Fermer')} style={{
            background: 'none', border: 'none',
            color: darkMode ? '#555' : '#999',
            fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
          }}>✕</button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: '11px', color: statusColor, fontWeight: '700' }}>{statusLabel}</span>
      </div>

      {buddy.bio && (
        <p style={{
          color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          fontSize: '12px', fontStyle: 'italic', lineHeight: 1.5,
          borderLeft: '2.5px solid rgba(128,128,128,0.3)',
          paddingLeft: '8px', marginBottom: onOpen ? '14px' : '0',
        }}>
          « {buddy.bio} »
        </p>
      )}

      {onOpen && (
        <button
          onClick={onOpen}
          style={{
            width: '100%', padding: '11px', borderRadius: '24px', border: 'none',
            background: darkMode ? 'white' : '#111',
            color: darkMode ? 'black' : 'white',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          }}
        >
          {tx('See profile & create together →', 'Voir le profil & créer ensemble →')}
        </button>
      )}
    </div>
  );
}
