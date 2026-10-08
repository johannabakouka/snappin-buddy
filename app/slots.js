// Les places d'un projet.
//
// Un projet cherche un certain nombre de personnes par rôle : un vidéaste, ou
// un photographe et trois modèles. Chaque acceptation prend une place, et quand
// la dernière est prise le projet est pourvu.
//
// Pas de 'use client' : le serveur s'en sert aussi, pour savoir qui prévenir
// quand un projet se remplit.

/** Le nombre maximum de personnes qu'on peut demander pour un même rôle. */
export const SLOT_MAX = 10;

/** Les identifiants de rôles d'un projet, dans l'ordre où ils ont été choisis. */
export function rolesOf(offer) {
  return String(offer?.role_needed || '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
}

/**
 * Le nombre de places par rôle : { photographe: 1, modèle: 3 }.
 *
 * Un projet publié avant les places n'a rien d'enregistré : on compte alors une
 * place par rôle, ce qui était le comportement d'avant.
 */
export function slotsOf(offer) {
  const roles = rolesOf(offer);
  const stored = offer?.slots && typeof offer.slots === 'object' ? offer.slots : null;
  const out = {};
  for (const role of roles) {
    const n = stored ? Number(stored[role]) : 1;
    out[role] = Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), SLOT_MAX) : 1;
  }
  return out;
}

/** Le nombre total de personnes recherchées. */
export function totalSlots(offer) {
  return Object.values(slotsOf(offer)).reduce((a, b) => a + b, 0);
}

/**
 * Les places prises, par rôle, d'après les candidatures acceptées.
 *
 * Une candidature acceptée avant les places n'indique pas quel rôle elle visait.
 * Quand le projet ne demande qu'un rôle, il n'y a pas d'ambiguïté. Sinon on la
 * compte sur le premier rôle encore libre, faute de mieux, plutôt que de la
 * perdre.
 */
export function filledSlots(offer, collabs) {
  const slots = slotsOf(offer);
  const roles = Object.keys(slots);
  const filled = {};
  for (const role of roles) filled[role] = 0;

  const accepted = (collabs || []).filter(c => c.status === 'accepted');
  const unknown = [];
  for (const c of accepted) {
    const role = String(c.role_applied || '').trim();
    if (role && role in filled) filled[role] += 1;
    else unknown.push(c);
  }
  for (const _ of unknown) {
    const free = roles.find(r => filled[r] < slots[r]);
    if (free) filled[free] += 1;
  }
  return filled;
}

/** Les rôles sur lesquels il reste de la place. */
export function openRoles(offer, collabs) {
  const slots = slotsOf(offer);
  const filled = filledSlots(offer, collabs);
  return Object.keys(slots).filter(r => filled[r] < slots[r]);
}

/** Vrai quand toutes les places sont prises. */
export function isTeamComplete(offer, collabs) {
  const roles = rolesOf(offer);
  if (roles.length === 0) return false;
  return openRoles(offer, collabs).length === 0;
}

/** Les places prises telles qu'enregistrées sur le projet. */
export function filledOf(offer) {
  const stored = offer?.slots_filled && typeof offer.slots_filled === 'object' ? offer.slots_filled : {};
  const out = {};
  for (const role of Object.keys(slotsOf(offer))) {
    const n = Number(stored[role]);
    out[role] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

/**
 * Les rôles où il reste de la place, lus sur le projet lui-même.
 *
 * Les règles d'accès empêchent quelqu'un de lire les candidatures d'un projet
 * qui n'est pas le sien : le compte vit donc sur le projet, que tout le monde
 * peut lire, et c'est le serveur qui le tient à jour.
 */
export function freeRolesOf(offer) {
  const slots = slotsOf(offer);
  const filled = filledOf(offer);
  return Object.keys(slots).filter(r => filled[r] < slots[r]);
}

/** Vrai quand toutes les places du projet sont prises. */
export function isFilled(offer) {
  const roles = rolesOf(offer);
  if (roles.length === 0) return false;
  return freeRolesOf(offer).length === 0;
}
