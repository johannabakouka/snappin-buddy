export default function Header({ theme, onLogoClick }) {
  const darkMode = theme?.dark ?? true;
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 16px) 0 16px',
      borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      flexShrink: 0,
      background: theme?.bg ?? '#0A0A0A',
    }}>
      <span
        onClick={onLogoClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          fontFamily: 'var(--font-nunito)',
          fontSize: '22px',
          fontWeight: '900',
          color: theme?.color ?? 'white',
          letterSpacing: '-0.3px',
          cursor: onLogoClick ? 'pointer' : 'default',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={26} height={26} style={{ borderRadius: '7px', display: 'block', flexShrink: 0 }} />
        Snappin&apos;Buddy
      </span>
    </header>
  );
}