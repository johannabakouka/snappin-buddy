export default function Header() {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '390px',
      background: 'rgba(10,10,10,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 0',
      zIndex: 1000,
      height: '52px',
    }}>
      <img
        src="/logo.jpeg"
        alt="Snappin'Buddy"
        style={{
          height: '32px',
          objectFit: 'contain',
          mixBlendMode: 'lighten',
        }}
      />
    </header>
  );
}