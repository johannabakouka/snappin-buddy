import Header from './Header';

export default function MatchScreen({ theme }) {
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>Match</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '20px' }}>Tes propositions de collab</p>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p style={{ fontWeight: '700', marginBottom: '4px', color: theme?.color }}>Propose un collab</p>
          <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>Trouve un créatif et lance une session</p>
          <button style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Explorer les créatifs</button>
        </div>
        <div style={{ color: subText, fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Aucun match en cours</div>
      </div>
    </div>
  );
}