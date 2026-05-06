export default function ProfileScreen() {
  const styles = ['Documentary', 'Analog', 'Street', 'Cinema', 'Portrait'];
  const zones = ['Oberkampf', 'Belleville', 'Pigalle', 'Bastille'];
  return (
    <div style={{ padding: '24px 16px 100px', overflowY: 'auto', height: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#2C2C2C', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>◉</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Johanna B.</h2>
        <p style={{ color: '#666', fontSize: '13px' }}>@johannabakouka</p>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>PROJET EN COURS</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.78)' }}>Photographe documentaire et directrice creative.</p>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>STYLE</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {styles.map(s => <span key={s} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '4px 12px' }}>{s}</span>)}
        </div>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>ZONES DE SHOOT</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {zones.map(z => <span key={z} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>)}
        </div>
      </div>
      <button style={{ width: '100%', background: 'white', color: 'black', border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Modifier le profil</button>
    </div>
  );
}
