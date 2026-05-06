const profiles = [
  { id: 1, name: 'Léa Moreau', handle: '@leamorphoto', role: 'Photographe', styles: ['Documentary', 'Portrait'], zone: 'Oberkampf', active: true },
  { id: 2, name: 'Marcus D.', handle: '@marcusdvideo', role: 'Vidéaste', styles: ['Cinéma', 'Street'], zone: 'Belleville', active: true },
  { id: 3, name: 'Sonia K.', handle: '@soniakfilm', role: 'Photographe', styles: ['Analog', 'Fashion'], zone: 'Pigalle', active: false },
  { id: 4, name: 'Yanis R.', handle: '@yanisreel', role: 'Vidéaste', styles: ['Documentary', 'Events'], zone: 'Bastille', active: true },
];

export default function ExploreScreen() {
  return (
    <div style={{ padding: '24px 16px 100px', overflowY: 'auto', height: '100vh' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>Explorer</h2>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Créatifs autour de toi</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {profiles.map(p => (
          <div key={p.id} style={{
            background: '#1A1A1A',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              background: '#2C2C2C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0,
            }}>◉</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{p.name}</span>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: p.active ? '#3DFF8F' : '#444',
                }}/>
              </div>
              <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{p.handle} · {p.zone}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {p.styles.map(s => (
                  <span key={s} style={{
                    fontSize: '11px', color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '20px', padding: '2px 10px',
                  }}>{s}</span>
                ))}
              </div>
            </div>
            <button style={{
              background: 'white', color: 'black',
              border: 'none', borderRadius: '20px',
              padding: '8px 14px', fontSize: '12px',
              fontWeight: '700', cursor: 'pointer',
            }}>Voir</button>
          </div>
        ))}
      </div>
    </div>
  );
}