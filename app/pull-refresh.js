'use client';
import { useEffect, useRef, useState } from 'react';

// Tirer vers le bas pour recharger.
//
// Sur un téléphone, c'est le geste qu'on fait sans y penser quand on se
// demande s'il y a du nouveau. Sans lui, il faut fermer et rouvrir l'app, et
// beaucoup de gens en concluent simplement qu'il ne se passe rien.
//
// Le geste ne se déclenche que si la liste est déjà tout en haut : ailleurs,
// c'est un défilement normal et on n'y touche pas. L'appui long sur une
// conversation reste possible, parce qu'on ne retient le doigt qu'à partir du
// moment où il descend vraiment.

const TRIGGER = 70;   // distance à parcourir pour déclencher
const MAX = 110;      // au-delà, l'indicateur ne descend plus
const SLOP = 8;       // en dessous, c'est un appui, pas un geste

export function usePullToRefresh(scrollRef, onRefresh, enabled = true) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Ces références servent à l'intérieur des écouteurs tactiles, qui sont
  // installés une seule fois : sans elles il faudrait les réinstaller à chaque
  // pixel parcouru et à chaque rendu du parent.
  const gesture = useRef({ startY: 0, pulling: false, armed: false, distance: 0 });
  const handler = useRef(onRefresh);
  const busy = useRef(false);

  useEffect(() => { handler.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const node = scrollRef?.current;
    if (!node || !enabled) return;

    function onStart(e) {
      if (busy.current || e.touches.length !== 1) return;
      gesture.current.armed = node.scrollTop <= 0;
      gesture.current.startY = e.touches[0].clientY;
      gesture.current.pulling = false;
      gesture.current.distance = 0;
    }

    function onMove(e) {
      const g = gesture.current;
      if (!g.armed || busy.current || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - g.startY;
      // Vers le haut, ou plus en haut de liste : on rend la main au défilement.
      if (dy <= SLOP || node.scrollTop > 0) {
        if (g.pulling) { g.pulling = false; g.distance = 0; setPull(0); }
        return;
      }
      g.pulling = true;
      // Résistance : le doigt avance plus vite que l'indicateur, le geste ne
      // part pas tout seul au moindre frôlement.
      g.distance = Math.min(MAX, (dy - SLOP) * 0.5);
      setPull(g.distance);
      if (e.cancelable) e.preventDefault();
    }

    async function onEnd() {
      const g = gesture.current;
      if (!g.pulling) { g.armed = false; return; }
      const reached = g.distance >= TRIGGER;
      g.pulling = false;
      g.armed = false;
      g.distance = 0;
      if (!reached || busy.current) { setPull(0); return; }
      busy.current = true;
      setRefreshing(true);
      setPull(TRIGGER);
      try {
        await handler.current?.();
      } catch (err) {
        console.error('pull-to-refresh', err);
      } finally {
        busy.current = false;
        setRefreshing(false);
        setPull(0);
      }
    }

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    node.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollRef, enabled]);

  return { pull, refreshing, trigger: TRIGGER };
}
