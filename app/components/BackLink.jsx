'use client';
import { tx } from '../tx';

// Le retour des pages publiques (profil partagé, projet partagé).
//
// Ces pages s'ouvrent depuis une story ou un message, et n'avaient que le logo,
// qui ramène à l'accueil de l'app : impossible de revenir d'où l'on venait sans
// chercher le geste du navigateur.
//
// S'il y a une page précédente, on y retourne. Sinon, le lien a été ouvert
// directement et il n'y a rien derrière : on va à l'accueil plutôt que de
// laisser un bouton qui ne fait rien.

export default function BackLink({ color = '#F2E050' }) {
  function back() {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }

  return (
    <button
      onClick={back}
      aria-label={tx('Back', 'Retour')}
      style={{
        background: 'none', border: 'none', color, cursor: 'pointer',
        fontSize: '22px', lineHeight: 1, padding: '4px 10px 4px 0',
        marginLeft: '-4px',
      }}
    >
      ←
    </button>
  );
}
