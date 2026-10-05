'use client';

// Les silhouettes grises affichées pendant le premier chargement.
//
// Avant, toutes les listes partaient d'un tableau vide, donc le premier écran
// affiché était l'état vide : Explorer disait « Aucun résultat, essaie une
// autre recherche » pendant que la requête tournait, et une conversation de
// deux cents messages s'ouvrait sur « Tout commence ici ». Quelqu'un qui
// découvre l'app en concluait qu'elle était vide, ou cassée.
//
// Une silhouette dit deux choses d'un coup : ça arrive, et voilà la forme de
// ce qui arrive.

function shimmerStyle(darkMode) {
  return {
    background: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    borderRadius: '8px',
    animation: 'sb-skeleton 1.4s ease-in-out infinite',
  };
}

/** Un bloc gris, dimensions libres. */
export function SkeletonBox({ width = '100%', height = '12px', radius = '8px', darkMode = true, style = {} }) {
  return <div style={{ ...shimmerStyle(darkMode), width, height, borderRadius: radius, ...style }} />;
}

/** La carte d'un créatif dans Explorer, ou d'un projet dans Projets. */
export function SkeletonCard({ darkMode = true, lines = 2, avatar = true, thumbs = false }) {
  return (
    <div style={{
      background: darkMode ? '#1A1A1A' : '#E8E8E8',
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderRadius: '16px', padding: '14px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {avatar && <SkeletonBox width="46px" height="46px" radius="50%" darkMode={darkMode} style={{ flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkeletonBox width="45%" height="13px" darkMode={darkMode} style={{ marginBottom: '8px' }} />
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBox
              key={i}
              width={i === lines - 1 ? '65%' : '85%'}
              height="10px"
              darkMode={darkMode}
              style={{ marginBottom: '6px' }}
            />
          ))}
        </div>
      </div>
      {thumbs && (
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
          {[0, 1, 2].map(i => <SkeletonBox key={i} width="56px" height="56px" darkMode={darkMode} />)}
        </div>
      )}
    </div>
  );
}

/** Plusieurs cartes à la suite, pour remplir l'écran. */
export function SkeletonList({ count = 3, darkMode = true, thumbs = false }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} darkMode={darkMode} thumbs={thumbs && i === 0} />
      ))}
      <SkeletonStyles />
    </div>
  );
}

/** Des bulles de conversation, alternées comme dans un vrai échange. */
export function SkeletonChat({ darkMode = true, count = 5 }) {
  const widths = ['55%', '70%', '40%', '62%', '48%'];
  return (
    <div aria-hidden="true" style={{ padding: '8px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: i % 2 ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
          <SkeletonBox width={widths[i % widths.length]} height="38px" radius="16px" darkMode={darkMode} />
        </div>
      ))}
      <SkeletonStyles />
    </div>
  );
}

/** L'animation, injectée une fois là où une silhouette est affichée. */
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes sb-skeleton {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes sb-skeleton { 0%, 100% { opacity: 1; } }
      }
    `}</style>
  );
}
