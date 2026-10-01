// Liens saisis à la main : les gens tapent « monsite.com », « www.monsite.com »
// ou collent une adresse complète. On accepte les trois, et on refuse tout ce
// qui n'est pas une vraie adresse web.
//
// Le refus de « javascript: » et « data: » n'est pas de la coquetterie : ce sont
// les deux schémas qui permettent de faire exécuter du code à l'app par un lien
// affiché sur un profil. Un lien de profil est écrit par quelqu'un d'autre, donc
// il est traité comme du texte hostile jusqu'à preuve du contraire.

/**
 * Renvoie l'adresse propre, '' si le champ est vide, ou null si c'est invalide.
 * On garde http tel quel : forcer https casserait pour de bon un site qui ne le
 * gère pas, alors qu'un lien ouvert dans un nouvel onglet fonctionne très bien
 * en http.
 */
export function cleanUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  let url;
  try {
    url = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  // Un nom de domaine comporte au moins un point, et pas d'espace.
  if (!url.hostname.includes('.') || /\s/.test(url.hostname)) return null;
  if (url.hostname.startsWith('.') || url.hostname.endsWith('.')) return null;

  const clean = url.toString();
  return clean.endsWith('/') && url.pathname === '/' && !url.search && !url.hash
    ? clean.slice(0, -1)
    : clean;
}

/** Version courte pour l'affichage : sans le schéma ni le www. */
export function prettyUrl(value) {
  return String(value || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}
