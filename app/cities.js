// La liste des villes du monde, partagée par la carte, le formulaire de projet
// et le serveur.
//
// Pas de 'use client' : les fonctions de calcul ne touchent à rien du
// navigateur, et la tâche quotidienne s'en sert pour écrire la ville des
// comptes qui n'en ont pas encore. Seul loadCities() est réservé au
// navigateur, puisqu'il va chercher le fichier par une adresse relative.
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
 * Au-delà, la ville la plus proche n'est plus la ville de la personne : mieux
 * vaut n'afficher aucun lieu qu'un lieu faux.
 */
export const CITY_SNAP_KM = 75;

/**
 * Les arrondissements, écartés comme lieu d'habitation.
 *
 * La liste contient « Paris 4e », « Marseille 1er », « Lyon 3e » comme des
 * villes à part entière, et elles sont forcément plus proches du point que le
 * centre de la ville. Sans ce filtre, quelqu'un au centre de Paris était
 * étiqueté « Paris 4e », et deux personnes du même quartier se retrouvaient
 * affichées dans deux « villes » différentes. Aucune vraie ville ne porte un
 * nom de cette forme.
 */
const DISTRICT_RE = /\s\d+\s*(er|e|ème|º)?$/i;

/**
 * La ville la plus proche d'un point, ou null si la plus proche est trop loin.
 *
 * Sert à écrire un nom de ville sur un profil. Jusqu'ici l'app ne gardait que
 * des coordonnées : dans Explorer, aucune ligne ne disait où était la personne,
 * il fallait ouvrir son profil pour le découvrir.
 *
 * La règle est volontairement bête : la plus proche, et rien d'autre. Préférer
 * la plus peuplée du voisinage donnait de meilleurs résultats au centre des
 * grandes villes et de bien pires en banlieue, où quelqu'un à Joinville se
 * retrouvait affiché à Montreuil.
 *
 * Le calcul se fait une seule fois, au moment où la position est posée, et le
 * résultat est enregistré sur le profil : charger les 765 Ko de la liste à
 * chaque ouverture d'Explorer serait payé par tout le monde, tout le temps.
 */
export function nearestCity(cities, lat, lng, maxKm = CITY_SNAP_KM) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  let best = null;
  let bestScore = Infinity;
  // Un filtre grossier en degrés avant le vrai calcul : comparer 23 000 villes
  // avec des sinus coûte, les écarter avec deux soustractions ne coûte rien.
  const box = maxKm / 70;
  const lngBox = box / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < cities.length; i++) {
    const c = cities[i];
    if (Math.abs(c.lat - lat) > box) continue;
    if (Math.abs(c.lng - lng) > lngBox) continue;
    if (DISTRICT_RE.test(c.name)) continue;
    const d = roughKm(lat, lng, c.lat, c.lng);
    if (d > maxKm) continue;
    const score = d - reachKm(i);
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return best;
}

/**
 * Le rayon sur lequel une ville « déborde » : une grande ville garde ses
 * habitants sous son nom bien au-delà de son point central, une petite non.
 *
 * La liste est triée par population décroissante, donc l'indice fait office de
 * taille. Sans ça, la ville la plus proche d'un point du 18e arrondissement
 * n'était pas Paris mais Saint-Ouen, et Brooklyn devenait Bushwick. Avec un
 * rayon unique pour tout le monde, c'est l'inverse qui cassait : quelqu'un à
 * Joinville-le-Pont se retrouvait affiché à Montreuil.
 */
function reachKm(rank) {
  if (rank < 300) return 12;
  if (rank < 1200) return 8;
  if (rank < 5000) return 3;
  return 0;
}

function roughKm(aLat, aLng, bLat, bLng) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

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
