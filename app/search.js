// La normalisation des recherches, partagée par Explorer et le fil des projets.
//
// Pas de 'use client' : la fonction ne touche à rien du navigateur.
//
// Elle vivait en double, écrite à la main dans Explorer et absente du fil des
// projets. Résultat : chercher « bresil » trouvait une personne mais aucun
// projet, et « cinema » ne trouvait pas une description qui parlait de cinéma.
// Personne ne tape les accents dans une barre de recherche.

/**
 * Minuscules, sans accents, sans le @ d'un pseudo, sans ponctuation gênante.
 *
 * Les deux côtés de la comparaison passent par ici : la recherche tapée et le
 * texte cherché. C'est ce qui fait que « Sofía », « sofia » et « @sofia » se
 * trouvent les uns les autres.
 */
export function normalizeSearch(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
