export default function MapScreen() {
  return (
    <div style={{
      height: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
      }}>◎</div>
      <p style={{color: '#666', fontSize: '14px'}}>Carte des buddies</p>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px 24px',
        textAlign: 'center',
      }}>
        <p style={{fontSize: '13px', color: '#888'}}>Active ta localisation</p>
        <p style={{fontSize: '12px', color: '#555', marginTop: '4px'}}>pour voir les créatifs autour de toi</p>
      </div>
    </div>
  );
}