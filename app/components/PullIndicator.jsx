'use client';

// Le petit rond qui descend quand on tire la liste vers le bas.
//
// Il ne dit pas seulement « ça charge » : avant le déclenchement il montre
// qu'il faut tirer encore un peu, sinon on relâche trop tôt et on croit que
// le geste n'existe pas.

export default function PullIndicator({ pull, refreshing, trigger = 70, darkMode = true }) {
  if (!pull && !refreshing) return null;

  const ready = refreshing || pull >= trigger;
  const progress = Math.min(1, pull / trigger);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: `${Math.max(pull, refreshing ? trigger : 0)}px`,
        pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.97)',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', lineHeight: 1,
        opacity: 0.35 + progress * 0.65,
        transform: refreshing ? 'none' : `rotate(${progress * 180}deg)`,
        animation: refreshing ? 'sb-pull-spin 0.9s linear infinite' : 'none',
        color: ready ? '#F2E050' : (darkMode ? 'rgba(255,255,255,0.6)' : '#777'),
      }}>
        {refreshing ? '⟳' : '↓'}
      </div>
      <style>{`
        @keyframes sb-pull-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
