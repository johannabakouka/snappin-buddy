export default function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      <img
        src="/logo.jpeg"
        alt="Snappin'Buddy"
        style={{
          height: '44px',
          objectFit: 'contain',
          mixBlendMode: 'lighten',
        }}
      />
    </header>
  );
}