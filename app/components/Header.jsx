export default function Header({ theme, onLogoClick }) {
  const darkMode = theme?.dark ?? true;
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 0',
      borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      flexShrink: 0,
      background: theme?.bg ?? '#0A0A0A',
    }}>
      <span
        onClick={onLogoClick}
        style={{
          fontFamily: 'var(--font-nunito)',
          fontSize: '22px',
          fontWeight: '900',
          color: theme?.color ?? 'white',
          letterSpacing: '-0.3px',
          cursor: onLogoClick ? 'pointer' : 'default',
        }}
      >
        Snappin&apos;Buddy
      </span>
    </header>
  );
}