// Cycle de vie d'un projet.
//
// Personne ne pense à fermer son annonce une fois la date passée. Résultat :
// le feed se remplit de projets morts, et quelqu'un qui découvre l'app tombe
// sur un tournage d'il y a trois mois. C'est ce qui rend une app abandonnée.
//
// Donc le projet s'archive tout seul le lendemain de sa date. Mais on n'efface
// jamais le projet de quelqu'un à sa place : il sort du feed, son auteur le
// retrouve dans « Mes projets » et décide — republier, réalisé, ou supprimer.

// Un projet sans date ne peut pas expirer par sa date : il vit 30 jours.
// C'est le même délai que la tâche quotidienne /api/expire-offers, pour que
// l'app et le serveur ne racontent jamais deux choses différentes.
export const NO_DATE_DAYS = 30;

/** La date du jour au format AAAA-MM-JJ, dans le fuseau de la personne. */
function todayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * Pourquoi ce projet est passé : 'date' si le jour est dépassé,
 * 'age' si un projet sans date a trop vieilli, null s'il est toujours d'actualité.
 * Le jour même compte comme en cours : un tournage de ce soir reste visible.
 */
export function pastReason(offer, now = new Date()) {
  if (!offer) return null;

  const date = String(offer.date || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date < todayKey(now) ? 'date' : null;
  }

  if (offer.created_at) {
    const days = (now.getTime() - new Date(offer.created_at).getTime()) / 86400000;
    if (days > NO_DATE_DAYS) return 'age';
  }
  return null;
}

export function isPast(offer, now = new Date()) {
  return pastReason(offer, now) !== null;
}

/** Depuis combien de jours ce projet est-il passé ? null s'il ne l'est pas. */
export function daysSincePast(offer, now = new Date()) {
  const reason = pastReason(offer, now);
  if (!reason) return null;
  const end = reason === 'date'
    ? new Date(`${String(offer.date).slice(0, 10)}T23:59:59`)
    : new Date(new Date(offer.created_at).getTime() + NO_DATE_DAYS * 86400000);
  return (now.getTime() - end.getTime()) / 86400000;
}

/**
 * Les projets sur lesquels on pose la question « il a été réalisé ? ».
 *
 * On ne regarde pas le statut : la tâche quotidienne ferme les projets passés,
 * et si on filtrait sur « ouvert », la question ne se poserait jamais. En
 * revanche on ne remonte pas au-delà d'un mois — relancer quelqu'un sur un
 * projet d'il y a six mois, c'est du harcèlement, pas un rappel.
 */
export function needsFollowUp(offers = [], now = new Date()) {
  return offers.filter((o) => {
    const days = daysSincePast(o, now);
    return days !== null && days <= 30;
  });
}

// « Plus tard » : on ne redemande pas à chaque ouverture de l'app.
const SKIP_KEY = 'sb:projets-passes';

export function loadSkipped() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function skipFollowUp(offerId) {
  try {
    const all = loadSkipped();
    all.add(offerId);
    localStorage.setItem(SKIP_KEY, JSON.stringify([...all]));
    return all;
  } catch {
    return loadSkipped();
  }
}
