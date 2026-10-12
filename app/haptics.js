'use client';

// Vibration courte sur les actions qui comptent. Jamais pour décorer :
// seulement là où quelque chose vient vraiment de partir.
//
// Pourquoi deux chemins : `navigator.vibrate` ne fait strictement RIEN sur
// iPhone. Safari ne l'a jamais implémenté, et aucune page web ne peut faire
// vibrer un iPhone. Dans l'app installée en revanche, Capacitor donne accès au
// moteur haptique du téléphone, celui qui produit le petit coup sec qu'on sent
// dans Instagram quand on aime une photo.
//
// On passe par l'objet global que Capacitor pose lui-même plutôt que par un
// import : ce fichier doit rester utilisable sur le web, où le module n'existe
// pas, et un import manquant casserait la compilation.

/** Le greffon haptique de Capacitor, ou rien si on n'est pas dans l'app. */
function moteurNatif() {
  if (typeof window === 'undefined') return null;
  const plugins = window.Capacitor?.Plugins;
  return plugins?.Haptics || null;
}

/**
 * Le coup sec d'une action réussie : un message parti, une proposition envoyée.
 *
 * `ms` ne sert que sur Android et sur le web, où la vibration se demande en
 * millisecondes. Sur iPhone, le système choisit lui-même l'intensité à partir
 * du style demandé, et c'est ce qui donne cette sensation nette plutôt qu'un
 * bourdonnement.
 */
export function tap(ms = 18) {
  try {
    const natif = moteurNatif();
    if (natif?.impact) { natif.impact({ style: 'Light' }); return; }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  } catch { /* certains navigateurs refusent hors geste utilisateur */ }
}

/** Plus appuyé : une collaboration validée, un paiement passé. */
export function tapFort() {
  try {
    const natif = moteurNatif();
    if (natif?.impact) { natif.impact({ style: 'Medium' }); return; }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
  } catch { /* idem */ }
}

/**
 * La secousse d'un refus : photo bloquée, formulaire incomplet.
 *
 * Sur iPhone, c'est une vibration de notification d'erreur, reconnaissable
 * entre toutes. Ailleurs, deux impulsions brèves, ce que le système sait faire.
 */
export function tapErreur() {
  try {
    const natif = moteurNatif();
    if (natif?.notification) { natif.notification({ type: 'Error' }); return; }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([12, 60, 12]);
  } catch { /* idem */ }
}
