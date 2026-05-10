export default function Navbar({ screen, setScreen, theme }) {
  const darkMode = theme?.dark ?? true;
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
      background: darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)',
      borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px 0 24px',
      zIndex: 9999,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            color: screen === tab.id ? (darkMode ? '#FFFFFF' : '#000000') : '#888',
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