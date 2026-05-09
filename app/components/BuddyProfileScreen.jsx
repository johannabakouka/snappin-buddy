'use client';

export default function BuddyProfileScreen({ buddy, onBack }) {
  const styles = (buddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (buddy?.zone || '').split(',').map(z => z.trim()).filter(Boolean);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: '#0A0A0A', overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 100px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', marginBottom: '24px' }}>←</button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#2C2C2C', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '2px solid rgba(255,255,255,0.22)' }}>◉</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{buddy?.username}</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>{buddy?.handle}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: buddy?.is_active ? '#3DFF8F' : '#444' }}/>
            <span style={{ color: buddy?.is_active ? '#3DFF8F' : '#444', fontSize: '12px' }}>{buddy?.is_active ? 'Disponible' : 'Indisponible'}</span>
          </div>
        </div>

        {buddy?.bio && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>PROJET EN COURS</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.78)' }}>{buddy.bio}</p>
          </div>
        )}

        {buddy?.role && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>ROLE</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.78)' }}>{buddy.role}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>STYLE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {styles.map(s => (
                <span key={s} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '4px 12px' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {zones.length > 0 && (
          <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>ZONES DE SHOOT</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        <button style={{ width: '100%', background: 'white', color: 'black', border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          ⚡ Proposer un collab
        </button>
      </div>
    </div>
  );
}