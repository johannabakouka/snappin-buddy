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
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
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
export function roleIdsFromStored(role) {
  const index = new Map();
  [...ROLES_FR, ...ROLES_EN].forEach(r => {
    index.set(normKey(r.id), r.id);
    index.set(normKey(r.label), r.id);
  });

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

export function roleLabels(role, roles = ROLES_FR) {
  return splitRoles(role)
    .map(id => roles.find(r => r.id === id.toLowerCase())?.label || id)
    .join(' · ');
}

export function roleIcons(role) {
  return splitRoles(role).map(id => ROLE_ICONS[id.toLowerCase()] || '✨').join(' ');
}

export function hasRole(role, wanted) {
  if (!wanted) return true;
  return splitRoles(role).some(r => r.toLowerCase() === wanted.toLowerCase());
}
