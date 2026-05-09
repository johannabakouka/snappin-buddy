export default function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 0 12px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <img
        src="/logo.jpeg"
        alt="Snappin'Buddy"
        style={{
          height: '28px',
          objectFit: 'contain',
          mixBlendMode: 'lighten',
        }}
      />
    </header>
  );
}