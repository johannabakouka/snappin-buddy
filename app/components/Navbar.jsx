export default function Navbar({ screen, setScreen }) {
  const tabs = [
    { id: 'map', label: 'Carte', icon: '◎' },
    { id: 'explore', label: 'Explorer', icon: '⊞' },
    { id: 'match', label: 'Match', icon: '⚡' },
    { id: 'messages', label: 'Messages', icon: '◻' },
    { id: 'profile', label: 'Profil', icon: '◉' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '390px',
      background: 'rgba(10,10,10,0.94)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px 0 24px',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            color: screen === tab.id ? '#FFFFFF' : '#555',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          <span>{tab.icon}</span>
          <span style={{ fontSize: '10px' }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}