'use client';

/** Vibration courte sur les actions qui comptent. Silencieuse si l'appareil ne
 * sait pas vibrer, et jamais utilisée pour décorer : seulement là où quelque
 * chose vient vraiment de partir. */
export function tap(ms = 18) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  } catch { /* certains navigateurs refusent hors geste utilisateur */ }
}
