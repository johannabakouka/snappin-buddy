'use client';
import { useEffect, useRef, useState } from 'react';
import { tx } from '../tx';

// Visionneuse plein écran, partagée par tous les écrans qui montrent un
// portfolio. Avant, le travail des gens ne s'affichait qu'en vignettes de
// 80 pixels : autant dire qu'on ne le voyait pas.
//
// Balayage gauche / droite au doigt, flèches du clavier sur ordinateur,
// Échap pour fermer. On ne ferme pas sur un simple balayage vertical : c'est
// le geste qu'on fait par erreur en voulant faire défiler.
// `captions` donne un nom à chaque photo, et `onCaptionClick` ouvre le profil
// derrière. C'est ce qui permet de feuilleter les books de plusieurs personnes
// à la suite sans perdre de vue à qui on est en train de regarder le travail.
export default function PhotoViewer({ photos = [], captions = [], startIndex = 0, onClose, onCaptionClick = null }) {
  const list = (photos || []).filter(Boolean);
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(list.length - 1, 0)));
  const touch = useRef(null);

  const total = list.length;
  const hasMany = total > 1;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
      if (!total) return;   // pas de modulo par zéro si la liste est vide
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % total);
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + total) % total);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, onClose]);

  // Le fond de la page ne doit pas défiler derrière la visionneuse.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  if (total === 0) return null;

  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Mouvement franchement horizontal : on change de photo.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      setIndex(i => (dx < 0 ? (i + 1) % total : (i - 1 + total) % total));
    }
  }

  const arrow = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%',
    border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white',
    fontSize: '20px', cursor: 'pointer', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top) + 56px) 12px calc(env(safe-area-inset-bottom) + 56px)',
      }}
    >
      <button
        onClick={onClose}
        aria-label={tx('Close', 'Fermer')}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', right: '12px',
          width: '40px', height: '40px', borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '18px',
          cursor: 'pointer', zIndex: 2,
        }}
      >
        ✕
      </button>

      {hasMany && (
        <p style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 20px)', left: '0', right: '0',
          textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700',
        }}>
          {index + 1} / {total}
        </p>
      )}

      {/* Le clic sur la photo ne ferme pas : seul le fond, la croix, ou Échap. */}
      <img
        src={list[index]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
      />

      {captions[index] && (
        <button
          onClick={e => { e.stopPropagation(); onCaptionClick?.(index); }}
          disabled={!onCaptionClick}
          style={{
            position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 32px)',
            padding: '9px 16px', borderRadius: '22px', border: 'none',
            background: 'rgba(255,255,255,0.14)', color: 'white',
            fontSize: '13px', fontWeight: '700', zIndex: 2,
            cursor: onCaptionClick ? 'pointer' : 'default',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {captions[index]}{onCaptionClick ? ' →' : ''}
        </button>
      )}

      {hasMany && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i - 1 + total) % total); }}
            aria-label={tx('Previous', 'Précédente')}
            style={{ ...arrow, left: '10px' }}
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % total); }}
            aria-label={tx('Next', 'Suivante')}
            style={{ ...arrow, right: '10px' }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
