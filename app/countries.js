// Les pays : du code à deux lettres au nom affiché, et l'inverse pour la recherche.
//
// Pas de 'use client' : le serveur s'en sert aussi, pour la tâche quotidienne.
//
// Aucun fichier de données. Les noms de pays sont déjà dans le téléphone, dans
// toutes les langues, par Intl.DisplayNames : stocker une liste de deux cents
// pays en cinq langues aurait été deux cents kilo-octets pour redire ce que le
// navigateur sait déjà.
//
// Ce qui est stocké en base est le code (FR, BR, US), jamais le nom : « Brésil »,
// « Brazil » et « Brasile » désignent le même pays, et quelqu'un qui cherche en
// italien doit trouver un projet publié depuis une app en français.

/** Minuscules, sans accents. La même règle que pour les villes. */
export function normalizeCountry(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Les codes présents dans la liste des villes du monde. Écrits ici plutôt que
// déduits de public/cities.json, qui pèse 765 Ko et ne doit pas être téléchargé
// pour afficher un nom de pays.
const CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR',
  'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM',
  'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB',
  'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU',
  'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW',
  'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC',
  'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT',
  'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS',
  'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG',
  'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF',
  'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

// Quelques noms que personne n'écrit comme la norme, et sans lesquels la
// recherche échoue sur des pays très présents. Intl renvoie « États-Unis »,
// mais on tape « usa » ; « Royaume-Uni », mais on tape « angleterre ».
const SURNOMS = {
  US: ['usa', 'etats unis', 'united states', 'america', 'amerique'],
  GB: ['uk', 'angleterre', 'england', 'ecosse', 'scotland', 'grande bretagne', 'britain'],
  AE: ['dubai', 'dubaï', 'emirats', 'emirates'],
  KR: ['coree du sud', 'south korea', 'coree'],
  NL: ['hollande', 'holland'],
  CH: ['suisse', 'switzerland'],
  CI: ['cote d ivoire', 'ivory coast'],
  CD: ['congo kinshasa', 'rdc'],
  CZ: ['tchequie', 'republique tcheque', 'czech republic'],
  MM: ['birmanie', 'burma'],
  TR: ['turquie', 'turkiye'],
  CV: ['cap vert', 'cape verde'],
};

// Construit une fois par langue : deux cents appels à Intl ne se refont pas à
// chaque frappe dans la barre de recherche.
const cache = new Map();

function table(langue) {
  const cle = langue || 'en';
  if (!cache.has(cle)) {
    let noms;
    try {
      noms = new Intl.DisplayNames([cle], { type: 'region' });
    } catch {
      noms = null;
    }
    const versNom = new Map();
    const versCode = new Map();
    for (const code of CODES) {
      let nom = code;
      try {
        nom = noms?.of(code) || code;
      } catch {
        nom = code;
      }
      versNom.set(code, nom);
      versCode.set(normalizeCountry(nom), code);
      versCode.set(normalizeCountry(code), code);
      for (const surnom of SURNOMS[code] || []) versCode.set(normalizeCountry(surnom), code);
    }
    cache.set(cle, { versNom, versCode });
  }
  return cache.get(cle);
}

/**
 * Le nom du pays dans une langue donnée, ou une chaîne vide si le code est
 * inconnu. On ne renvoie jamais le code brut : « BR » affiché sur un profil
 * ressemble à un bug, mieux vaut ne rien afficher.
 */
export function countryName(code, langue = 'fr') {
  const c = String(code || '').toUpperCase();
  if (!c) return '';
  const nom = table(langue).versNom.get(c);
  return nom && nom !== c ? nom : '';
}

/**
 * Le code d'un pays tapé à la main, ou une chaîne vide.
 *
 * On cherche dans la langue de la personne ET en anglais : quelqu'un qui a mis
 * son app en français peut très bien taper « brazil ».
 */
export function countryCode(saisie, langue = 'fr') {
  const q = normalizeCountry(saisie);
  if (q.length < 2) return '';
  return table(langue).versCode.get(q) || table('en').versCode.get(q) || '';
}

/**
 * Est-ce que ce pays correspond à la recherche ?
 *
 * Plus permissif que countryCode : « bres » doit déjà trouver le Brésil, sinon
 * les résultats n'apparaissent qu'au dernier caractère tapé.
 */
export function countryMatches(code, saisie, langue = 'fr') {
  const c = String(code || '').toUpperCase();
  if (!c) return false;
  const q = normalizeCountry(saisie);
  if (q.length < 2) return false;
  if (normalizeCountry(c) === q) return true;
  for (const l of [langue, 'en']) {
    const nom = normalizeCountry(table(l).versNom.get(c) || '');
    if (nom && (nom.startsWith(q) || (' ' + nom).includes(' ' + q))) return true;
  }
  return (SURNOMS[c] || []).some(s => normalizeCountry(s).startsWith(q));
}
