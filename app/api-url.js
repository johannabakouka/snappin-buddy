'use client';

// L'adresse des routes serveur, selon l'endroit d'où l'app tourne.
//
// Sur le web, tout est servi par le même domaine : « /api/send-email » suffit,
// le navigateur complète avec snappinbuddy.com.
//
// Dans l'app iPhone et Android, l'interface est embarquée dans l'app et servie
// depuis l'appareil lui-même, pas depuis le domaine. « /api/send-email »
// chercherait alors un fichier à l'intérieur de l'app, et ne trouverait rien :
// envoyer un message, se proposer sur un projet, acheter un Boost ou supprimer
// son compte tomberaient tous en panne. Il faut donc l'adresse complète.
//
// Pourquoi une fonction et pas une constante : le même code tourne dans les
// deux mondes, et c'est seulement à l'exécution qu'on sait lequel.

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://snappinbuddy.com';

/**
 * Sommes-nous dans l'app installée plutôt que dans un navigateur ?
 *
 * Capacitor pose un objet global qui répond à la question. On ne l'importe pas :
 * ce fichier doit rester utilisable sur le web, où Capacitor n'existe pas.
 *
 * Sans cet objet, on regarde le protocole. L'app iOS sert ses fichiers depuis
 * « capacitor:// », ce qui n'est ni http ni https.
 */
function dansLApp() {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function') {
    try { return cap.isNativePlatform(); } catch { /* version ancienne */ }
  }
  const p = window.location.protocol;
  return p !== 'http:' && p !== 'https:';
}

/**
 * Transforme « /api/send-email » en adresse utilisable là où on se trouve.
 *
 * Sur le web le chemin est renvoyé tel quel, donc rien ne change pour les
 * personnes qui utilisent snappinbuddy.com dans leur navigateur.
 */
export function api(chemin) {
  const c = String(chemin || '');
  if (!c.startsWith('/')) return c; // déjà une adresse complète
  return dansLApp() ? SITE + c : c;
}
