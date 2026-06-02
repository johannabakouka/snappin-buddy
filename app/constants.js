export const ROLES_FR = [
  { id: 'photographe', label: 'Photographe', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéaste', icon: '🎬' },
  { id: 'directeur artistique', label: 'Dir. Artistique', icon: '🎨' },
  { id: 'directeur créatif', label: 'Dir. Créatif', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Monteur vidéo', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Éditeur photo', icon: '🖼️' },
  { id: 'styliste', label: 'Styliste', icon: '👗' },
  { id: 'maquilleur', label: 'Maquilleur·se', icon: '💄' },
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
  { id: 'designer', label: 'Designer', icon: '✏️' },
  { id: 'musicien', label: 'Musicien·ne', icon: '🎵' },
  { id: 'chanteur', label: 'Chanteur·se', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
  { id: 'autre', label: 'Autre', icon: '✨' },
];

export const ROLES_EN = [
  { id: 'photographe', label: 'Photographer', icon: '📷' },
  { id: 'vidéaste', label: 'Videographer', icon: '🎬' },
  { id: 'directeur artistique', label: 'Art Director', icon: '🎨' },
  { id: 'directeur créatif', label: 'Creative Director', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Video Editor', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Photo Editor', icon: '🖼️' },
  { id: 'styliste', label: 'Stylist', icon: '👗' },
  { id: 'maquilleur', label: 'Makeup Artist', icon: '💄' },
  { id: 'modèle', label: 'Model', icon: '🧍' },
  { id: 'designer', label: 'Designer', icon: '✏️' },
  { id: 'musicien', label: 'Musician', icon: '🎵' },
  { id: 'chanteur', label: 'Singer', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
  { id: 'autre', label: 'Other', icon: '✨' },
];

export const UNIVERS_FR = [
  'mode', 'beauté', 'street', 'corporate', 'art',
  'musique', 'sport', 'nature', 'voyage', 'architecture',
  'mariage', 'food', 'culture', 'entertainment',
];

export const UNIVERS_EN = [
  'fashion', 'beauty', 'street', 'corporate', 'art',
  'music', 'sport', 'nature', 'travel', 'architecture',
  'wedding', 'food', 'culture', 'entertainment',
];

// Compatibilité — IDs toujours en FR en base
export const ROLES = ROLES_FR;
export const UNIVERS = UNIVERS_FR;

export const ROLE_ICONS = {
  'photographe': '📷', 'vidéaste': '🎬', 'directeur artistique': '🎨',
  'directeur créatif': '🎯', 'monteur vidéo': '🎞️', 'éditeur photo': '🖼️',
  'styliste': '👗', 'maquilleur': '💄', 'modèle': '🧍',
  'designer': '✏️', 'musicien': '🎵', 'chanteur': '🎤',
  'beatmaker': '🎛️', 'brand owner': '🏷️', 'autre': '✨',
};

export const ROLE_FILTERS = [
  { id: 'photographe', label: 'Photo', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéo', icon: '🎬' },
  { id: 'directeur artistique', label: 'DA', icon: '🎨' },
  { id: 'directeur créatif', label: 'Dir. Créatif', icon: '🎯' },
  { id: 'monteur vidéo', label: 'Montage', icon: '🎞️' },
  { id: 'éditeur photo', label: 'Retouche', icon: '🖼️' },
  { id: 'styliste', label: 'Style', icon: '👗' },
  { id: 'maquilleur', label: 'Makeup', icon: '💄' },
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
  { id: 'designer', label: 'Design', icon: '✏️' },
  { id: 'musicien', label: 'Musique', icon: '🎵' },
  { id: 'chanteur', label: 'Chant', icon: '🎤' },
  { id: 'beatmaker', label: 'Beatmaker', icon: '🎛️' },
  { id: 'brand owner', label: 'Brand', icon: '🏷️' },
];

export const COLORS = {
  dispo: '#2ECC71',
  shoot: '#F0B429',
  indispo: '#FF4D4D',
};