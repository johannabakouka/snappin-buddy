import Header from './Header';

export default function MatchScreen() {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>Match</h2>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Tes propositions de collab</p>
        <div style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p style={{ fontWeight: '700', marginBottom: '4px' }}>Propose un collab</p>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Trouve un créatif et lance une session</p>
          <button style={{ background: 'white', color: 'black', border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Explorer les créatifs</button>
        </div>
        <div style={{ color: '#444', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Aucun match en cours</div>
      </div>
    </div>
  );
}