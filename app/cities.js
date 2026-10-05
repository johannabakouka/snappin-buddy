'use client';

// La liste des villes du monde, partagée par la carte et par le formulaire de
// projet.
//
// Elle vivait uniquement dans CityPicker, et le formulaire de projet avait sa
// propre liste écrite à la main, surtout européenne : quelqu'un à Mexico ou à
// Séoul n'avait donc aucune suggestion et écrivait sa ville comme il voulait.
// Résultat, « Ciudad de México » et « CDMX » ne se croisaient jamais dans le
// filtre, et un projet publié là-bas restait invisible pour les gens du coin.
//
// public/cities.json : [nom, codePays, lat, lng, alias?][], trié par population
// décroissante. Source : GeoNames (villes de plus de 15 000 habitants), via
// all-the-cities (MIT).

let citiesPromise = null;

/** Minuscules, sans accents, tirets et apostrophes ramenés à des espaces. */
export function normalizeCity(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Charge la liste une seule fois pour toute la session. Les 765 Ko ne partent
 * qu'au premier besoin réel, et le même téléchargement sert ensuite à la carte
 * comme au formulaire de projet.
 */
export function loadCities() {
  if (!citiesPromise) {
    citiesPromise = fetch('/cities.json')
      .then(r => r.json())
      .then(rows => rows.map(([name, country, lat, lng, aliases]) => ({
        name, country, lat, lng,
        keys: [name, ...(aliases ? aliases.split('|') : [])].map(normalizeCity),
      })))
      .catch(err => {
        // On remet à zéro pour qu'une coupure réseau n'empêche pas de réessayer.
        citiesPromise = null;
        throw err;
      });
  }
  return citiesPromise;
}

export const CITY_MAX_RESULTS = 6;

/**
 * Les villes dont un nom commence par la recherche passent devant celles où
 * elle apparaît en début d'un mot suivant : on tape « san » pour San Francisco,
 * pas pour Sanxenxo.
 */
export function searchCities(cities, query, max = CITY_MAX_RESULTS) {
  const q = normalizeCity(query);
  if (q.length < 2) return [];
  const prefix = [];
  const wordStart = [];
  const wordQ = ' ' + q;
  for (const c of cities) {
    if (c.keys.some(k => k.startsWith(q))) {
      prefix.push(c);
      if (prefix.length >= max) break;
    } else if (wordStart.length < max && c.keys.some(k => (' ' + k).includes(wordQ))) {
      wordStart.push(c);
    }
  }
  return [...prefix, ...wordStart].slice(0, max);
}
