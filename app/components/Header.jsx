export default function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--font-nunito)',
        fontSize: '22px',
        fontWeight: '900',
        color: 'white',
        letterSpacing: '-0.3px',
      }}>
        Snappin&apos;Buddy
      </span>
    </header>
  );
}