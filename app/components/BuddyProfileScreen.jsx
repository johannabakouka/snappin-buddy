'use client';

export default function BuddyProfileScreen({ buddy, onBack, theme }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const subText = darkMode ? '#666' : '#888';
  const tagColor = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const avatarBorder = darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';

  const styles = (buddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (buddy?.zone || '').split(',').map(z => z.trim()).filter(Boolean);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 100px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer', marginBottom: '24px' }}>←</button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: avatarBg, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${avatarBorder}` }}>◉</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>{buddy?.username}</h2>
          <p style={{ color: subText, fontSize: '13px' }}>{buddy?.handle}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: buddy?.is_active ? '#3DFF8F' : '#444' }}/>
            <span style={{ color: buddy?.is_active ? '#3DFF8F' : '#444', fontSize: '12px' }}>{buddy?.is_active ? 'Disponible' : 'Indisponible'}</span>
          </div>
        </div>

        {buddy?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>PROJET EN COURS</p>
            <p style={{ fontSize: '14px', color }}>{buddy.bio}</p>
          </div>
        )}

        {buddy?.role && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>ROLE</p>
            <p style={{ fontSize: '14px', color }}>{buddy.role}</p>
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

        <button style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          ⚡ Proposer un collab
        </button>
      </div>
    </div>
  );
}