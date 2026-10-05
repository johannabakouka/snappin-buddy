export const ROLES_FR = [
  { id: 'photographe', label: 'Photographe', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéaste', icon: '🎬' },
  { id: 'créateur de contenu', label: 'Créateur·rice de contenu', icon: '📱' },
  { id: 'directeur artistique', label: 'Dir. Artistique', icon: '🎨' },
  { id: 'directeur créatif', label: 'Dir. Créatif', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Monteur vidéo', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Éditeur photo', icon: '🖼️' },
  { id: 'styliste', label: 'Styliste', icon: '👗' },
  { id: 'maquilleur', label: 'Maquilleur·se', icon: '💄' },
  { id: 'coiffeur', label: 'Coiffeur·se', icon: '💇' },
  // Un seul rôle, deux mots : « mannequin » et « modèle » désignent les mêmes
  // personnes. Deux rôles séparés couperaient en deux la même population, et
  // chaque filtre en manquerait la moitié.
  { id: 'modèle', label: 'Modèle / Mannequin', icon: '🧍' },
  { id: 'designer', label: 'Designer', icon: '✏️' },
  { id: 'musicien', label: 'Musicien·ne', icon: '🎵' },
  { id: 'chanteur', label: 'Chanteur·se', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
  { id: 'wedding planner', label: 'Wedding planner', icon: '💍' },
  { id: 'organisateur événements', label: 'Organisateur·rice d’événements', icon: '🎉' },
  { id: 'autre', label: 'Autre', icon: '✨' },
];

export const ROLES_EN = [
  { id: 'photographe', label: 'Photographer', icon: '📷' },
  { id: 'vidéaste', label: 'Videographer', icon: '🎬' },
  { id: 'créateur de contenu', label: 'Content Creator', icon: '📱' },
  { id: 'directeur artistique', label: 'Art Director', icon: '🎨' },
  { id: 'directeur créatif', label: 'Creative Director', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Video Editor', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Photo Editor', icon: '🖼️' },
  { id: 'styliste', label: 'Stylist', icon: '👗' },
  { id: 'maquilleur', label: 'Makeup Artist', icon: '💄' },
  { id: 'coiffeur', label: 'Hair Stylist', icon: '💇' },
  { id: 'modèle', label: 'Model', icon: '🧍' },
  { id: 'designer', label: 'Designer', icon: '✏️' },
  { id: 'musicien', label: 'Musician', icon: '🎵' },
  { id: 'chanteur', label: 'Singer', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
  { id: 'wedding planner', label: 'Wedding Planner', icon: '💍' },
  { id: 'organisateur événements', label: 'Event Planner', icon: '🎉' },
  { id: 'autre', label: 'Other', icon: '✨' },
];

export const UNIVERS_FR = [
  'mode', 'beauté', 'portrait', 'street', 'corporate', 'art',
  'musique', 'sport', 'nature', 'voyage', 'architecture',
  'mariage', 'food', 'culture', 'entertainment',
];

export const UNIVERS_EN = [
  'fashion', 'beauty', 'portrait', 'street', 'corporate', 'art',
  'music', 'sport', 'nature', 'travel', 'architecture',
  'wedding', 'food', 'culture', 'entertainment',
];

// Compatibilité — IDs toujours en FR en base
export const ROLES = ROLES_FR;
export const UNIVERS = UNIVERS_FR;

/**
 * « Ce que tu cherches » : l'intention, stockée dans profiles.looking_for sous
 * forme d'identifiants séparés par des virgules.
 *
 * Deux personnes peuvent avoir le même métier et la même ville et n'avoir
 * strictement rien à se proposer : l'une cherche des missions payées, l'autre
 * veut juste rencontrer des gens du coin. Sans cette ligne sur le profil, on le
 * découvre après trois messages.
 *
 * Contrairement aux rôles et aux univers, les identifiants ne sont pas des mots
 * français : les libellés viennent du dictionnaire. Les rôles stockés en
 * français obligent à traduire dans les deux sens à chaque enregistrement, et
 * c'est la source d'un bug à chaque fois qu'une langue s'ajoute.
 */
export const LOOKING_FOR = ['paid', 'tfp', 'exchange', 'personal', 'assist', 'meet'];

export const LOOKING_FOR_ICONS = {
  paid: '💼', tfp: '📸', exchange: '🤝', personal: '✨', assist: '🎓', meet: '📍',
};

/** Au-delà, la ligne déborde sur le profil et ne veut plus dire grand-chose. */
export const LOOKING_FOR_MAX = 3;

/** Les identifiants valides d'une chaîne stockée, dans l'ordre de la liste. */
export function parseLookingFor(stored) {
  const ids = String(stored || '').split(',').map(s => s.trim()).filter(Boolean);
  return LOOKING_FOR.filter(id => ids.includes(id));
}

export const ROLE_ICONS = {
  'photographe': '📷', 'vidéaste': '🎬', 'créateur de contenu': '📱', 'directeur artistique': '🎨',
  'directeur créatif': '🎯', 'monteur vidéo': '🎞️', 'éditeur photo': '🖼️',
  'styliste': '👗', 'maquilleur': '💄', 'coiffeur': '💇', 'modèle': '🧍',
  'designer': '✏️', 'musicien': '🎵', 'chanteur': '🎤',
  'beatmaker': '🎛️', 'brand owner': '🏷️',
  'wedding planner': '💍', 'organisateur événements': '🎉', 'autre': '✨',
};

export const ROLE_FILTERS = [
  { id: 'photographe', label: 'Photo', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéo', icon: '🎬' },
  { id: 'créateur de contenu', label: 'Contenu', icon: '📱' },
  { id: 'directeur artistique', label: 'DA', icon: '🎨' },
  { id: 'directeur créatif', label: 'Dir. Créatif', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Montage', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Retouche', icon: '🖼️' },
  { id: 'styliste', label: 'Style', icon: '👗' },
  { id: 'maquilleur', label: 'Makeup', icon: '💄' },
  { id: 'coiffeur', label: 'Coiffure', icon: '💇' },
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
  { id: 'designer', label: 'Design', icon: '✏️' },
  { id: 'musicien', label: 'Musique', icon: '🎵' },
  { id: 'chanteur', label: 'Chant', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand', icon: '🏷️' },
  { id: 'wedding planner', label: 'Mariage', icon: '💍' },
  { id: 'organisateur événements', label: 'Événements', icon: '🎉' },
];

export const COLORS = {
  dispo: '#2ECC71',
  shoot: '#F0B429',
  indispo: '#FF4D4D',
};
// Un profil peut avoir plusieurs rôles : ils sont enregistrés séparés par des virgules
// dans la même colonne, comme les univers. Un ancien profil à un seul rôle reste valide.
export function splitRoles(role) {
  return (role || '').split(',').map(r => r.trim()).filter(Boolean);
}

/** Clé de comparaison : minuscules, sans accents, espaces resserrés. */
export function normKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retrouve les rôles d'un profil, quelle que soit la façon dont ils ont été
 * enregistrés : identifiants, libellés français ou anglais, avec ou sans
 * accents, avec ou sans majuscules.
 *
 * Avant, la comparaison était stricte. Un seul écart d'écriture — un accent
 * perdu, une majuscule — et l'écran de modification s'ouvrait avec AUCUN rôle
 * coché : il fallait tout re-sélectionner pour changer une photo de portfolio.
 */
/** Mots que les gens emploient pour un rôle, sans que ce soit son libellé. */
const ROLE_SYNONYMS = {
  'mannequin': 'modèle',
  'mua': 'maquilleur',
  'make up artist': 'maquilleur',
  'da': 'directeur artistique',
  'videographe': 'vidéaste',
};

export function roleIdsFromStored(role) {
  const index = new Map();
  [...ROLES_FR, ...ROLES_EN].forEach(r => {
    index.set(normKey(r.id), r.id);
    index.set(normKey(r.label), r.id);
  });
  Object.entries(ROLE_SYNONYMS).forEach(([mot, id]) => index.set(normKey(mot), id));

  const found = [];
  splitRoles(role).forEach(piece => {
    const id = index.get(normKey(piece));
    if (id && !found.includes(id)) found.push(id);
  });
  return found;
}

/**
 * Même principe pour les univers, renvoyés dans la langue affichée : un profil
 * enregistré en français doit s'allumer aussi quand l'app est en anglais.
 */
export function universFromStored(styles, isEn) {
  const target = isEn ? UNIVERS_EN : UNIVERS_FR;
  const found = [];

  String(styles || '').split(',').map(s => s.trim()).filter(Boolean).forEach(piece => {
    const key = normKey(piece);
    let idx = UNIVERS_FR.findIndex(u => normKey(u) === key);
    if (idx < 0) idx = UNIVERS_EN.findIndex(u => normKey(u) === key);
    const label = idx >= 0 ? target[idx] : piece;
    if (!found.includes(label)) found.push(label);
  });
  return found;
}

/**
 * Libellés des rôles, séparés par des points médians.
 *
 * Le troisième argument est le métier écrit à la main quand on a choisi
 * « Autre ». Beaucoup de métiers créatifs n'entrent dans aucune case de la
 * liste, et afficher « Autre » sur un profil ne dit rien de ce que la personne
 * fait. Quand ce texte existe, il remplace le mot « Autre ».
 */
export function roleLabels(role, roles = ROLES_FR, roleOther = '') {
  const custom = String(roleOther || '').trim();
  return splitRoles(role)
    .map(id => {
      const key = id.toLowerCase();
      if (key === OTHER_ROLE_ID && custom) return custom;
      return roles.find(r => r.id === key)?.label || id;
    })
    .join(' · ');
}

/** Identifiant du rôle « Autre », celui qui ouvre le champ libre. */
export const OTHER_ROLE_ID = 'autre';
/** Un métier écrit à la main reste court, sinon il déborde partout dans l'app. */
export const ROLE_OTHER_MAX = 40;

/** Nettoie le métier libre : espaces resserrés, longueur bornée. */
export function cleanRoleOther(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, ROLE_OTHER_MAX);
}

export function roleIcons(role) {
  return splitRoles(role).map(id => ROLE_ICONS[id.toLowerCase()] || '✨').join(' ');
}

export function hasRole(role, wanted) {
  if (!wanted) return true;
  return splitRoles(role).some(r => r.toLowerCase() === wanted.toLowerCase());
}

// Ouverture de l'app. Sert à dire « ouverte depuis N jours » plutôt qu'un
// nombre écrit en dur, qui vieillit et finit par être faux.
// À corriger ici si la date exacte est différente.
export const LAUNCH_DATE = '2026-09-22';

/** Nombre de jours écoulés depuis l'ouverture, jamais négatif. */
export function daysSinceLaunch(now = new Date()) {
  const launch = new Date(`${LAUNCH_DATE}T00:00:00Z`);
  const days = Math.floor((now.getTime() - launch.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

/**
 * Distance approximative en kilomètres entre deux points.
 * Suffisant pour répondre à « est-ce qu'il y a quelqu'un près de moi ».
 */
export function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// En dessous de ce nombre de créatifs, on n'affiche pas le total : un petit
// chiffre affiché en grand dessert l'app plus qu'il ne la sert.
export const COUNT_VISIBLE_FROM = 50;
// Rayon considéré comme « autour de moi », et nombre en dessous duquel on
// explique que la carte est jeune plutôt que de laisser croire qu'elle est morte.
export const NEARBY_KM = 60;
export const NEARBY_SPARSE_BELOW = 3;
