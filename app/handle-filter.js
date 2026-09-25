// Filtre des pseudos : insultes, propos haineux et noms réservés.
//
// Deux listes, pour éviter de bloquer des pseudos innocents :
//
// PARTOUT  = termes bloqués même collés à autre chose. Réservé aux insultes
//            qui n'existent dans aucun mot normal (« connard », « hitler »).
// ENTIERS  = termes bloqués seulement s'ils forment un mot à part entière.
//            Indispensable pour « con » (concert, contact), « anal » (analog.film),
//            « bite » (bitesize), « nique » (unique, Véronique, technique), « cul »
//            (culture) ou « pute » (dispute) : les bloquer partout casserait des
//            pseudos parfaitement légitimes.

const PARTOUT = [
  // Insultes et propos haineux, français
  'connard', 'connasse', 'salope', 'salopard', 'encule', 'enculer', 'enculade',
  'putain', 'pouffiasse', 'batard', 'baltringue', 'negre', 'negresse', 'bougnoule',
  'bamboula', 'youpin', 'bicot', 'gouine', 'feujhaine',
  // Insultes et propos haineux, anglais
  'nigger', 'nigga', 'faggot', 'chink', 'kike', 'wetback', 'tranny', 'cunt',
  'motherfucker', 'fuckyou', 'fucker', 'asshole', 'bitchass',
  // Haine et violence
  'hitler', 'heilhitler', 'holocauste', 'holocaust', 'kkk', 'suprematiste',
  // Contenus sexuels et pédocriminalité
  'pedophile', 'pedocriminel', 'childporn', 'porno', 'pornhub', 'hardcore',
  'viol eur', 'violeur', 'rapist',
];

const ENTIERS = [
  // Français
  'con', 'cons', 'conne', 'pd', 'pede', 'pedale', 'tapette', 'pute', 'putes',
  'merde', 'merdeux', 'bite', 'couille', 'couilles', 'chatte', 'cul', 'zizi',
  'nique', 'niquer', 'ntm', 'fdp', 'tg', 'ferme ta gueule', 'gueule',
  'penis', 'vagin', 'sperme', 'ejac', 'branle', 'branleur', 'salaud',
  'viol', 'nazi', 'nazis', 'pedo', 'sexe', 'porn',
  // Anglais
  'fuck', 'fucking', 'shit', 'bitch', 'slut', 'whore', 'dick', 'cock',
  'pussy', 'anal', 'ass', 'arse', 'bastard', 'wanker', 'twat', 'boobs',
  'retard', 'rape', 'nude', 'nudes', 'sex',
];

// Noms qui pourraient faire croire à un compte officiel.
const RESERVES = [
  'snappinbuddy', 'snappin', 'snappinbuddyofficiel', 'snappinbuddyofficial',
  'ateliers777', 'super8memories',
  'admin', 'administrateur', 'administrator', 'moderateur', 'moderator', 'modo',
  'support', 'help', 'aide', 'contact', 'officiel', 'official', 'team', 'equipe',
  'root', 'system', 'www', 'api', 'null', 'undefined', 'staff',
];

// Mots parfaitement normaux qui contiennent par hasard une suite interdite.
// Scunthorpe est une vraie ville anglaise : c'est le cas d'école du filtre
// trop zélé. Ajouter ici tout faux positif signalé par un utilisateur.
const EXCEPTIONS = ['scunthorpe', 'penistone', 'lightwater', 'cockburn', 'assisi', 'cannes'];

// Les chiffres et symboles utilisés pour déguiser un mot (« c0nn4rd »).
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '$': 's', '@': 'a' };

/** Ramène le pseudo à des lettres seules, en annulant les déguisements. */
function decode(handle) {
  return String(handle || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^@+/, '')
    .replace(/[0134578 9$@]/g, c => LEET[c] || c);
}

/**
 * Dit pourquoi un pseudo est refusé, ou null s'il est acceptable.
 * Renvoie 'insulte' ou 'reserve'.
 */
export function handleIssue(handle) {
  const decoded = decode(handle);
  const colle = decoded.replace(/[._]/g, '');
  if (!colle) return null;

  // Les noms réservés se comparent aussi sans décodage : « ateliers777 » ne doit
  // pas devenir « ateliersttt » avant d'être reconnu.
  const brut = String(handle || '').toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9]/g, '');
  if (RESERVES.includes(colle) || RESERVES.includes(brut)) return 'reserve';

  if (EXCEPTIONS.some(mot => colle.includes(mot))) return null;

  if (PARTOUT.some(mot => colle.includes(mot.replace(/\s/g, '')))) return 'insulte';

  // Mots entiers : on découpe sur les points et tirets bas, puis on retire
  // les chiffres restants pour que « connard92 » soit vu comme « connard ».
  const morceaux = decoded.split(/[._]+/).map(p => p.replace(/[^a-z]/g, '')).filter(Boolean);
  if (morceaux.some(p => ENTIERS.includes(p))) return 'insulte';

  return null;
}
