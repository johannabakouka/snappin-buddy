import { LOOKING_FOR, LOOKING_FOR_ICONS, parseLookingFor } from './constants';
import { tx, txIn } from './tx';

// Les libellés de « ce que tu cherches ». Ils vivent ici et pas dans
// constants.js parce qu'ils passent par le dictionnaire, qui dépend de la
// langue. Pas de 'use client' : la page publique d'un profil est fabriquée par
// le serveur, qui a besoin des mêmes libellés dans la langue du visiteur.
//
// Un seul tableau pour les deux usages : écrire les textes deux fois, une fois
// pour l'app et une fois pour le serveur, c'est la garantie qu'ils finiront par
// se contredire.
const LABELS = {
  paid: ['Paid work', 'Missions rémunérées'],
  tfp: ['Portfolio collab', 'Collab pour le book'],
  exchange: ['Skill swap', 'Échange de services'],
  personal: ['Personal project', 'Projet perso'],
  assist: ['Assisting, learning', 'Assister, apprendre'],
  meet: ['Meet local creatives', 'Rencontrer des créatifs du coin'],
};

const HINTS = {
  paid: ['You are looking for jobs that pay.', 'Tu cherches des missions payées.'],
  tfp: ['Shooting together to build both books.', 'Shooter ensemble pour nourrir les deux books.'],
  exchange: ['Your skill against theirs, no money.', 'Ta compétence contre la sienne, sans argent.'],
  personal: ['A project of your own, looking for people.', 'Un projet à toi, tu cherches des gens.'],
  assist: ['Being on set to learn, paid or not.', 'Être sur le plateau pour apprendre, payé ou pas.'],
  meet: ['No project yet, just meeting people nearby.', 'Pas de projet encore, juste rencontrer des gens autour.'],
};

/** Libellé court, pour une puce sur un profil. */
export function lookingLabel(id) {
  const pair = LABELS[id];
  return pair ? tx(pair[0], pair[1]) : id;
}

/** Même libellé, dans une langue donnée : pour les pages faites par le serveur. */
export function lookingLabelIn(lang, id) {
  const pair = LABELS[id];
  return pair ? txIn(lang, pair[0], pair[1]) : id;
}

/** La phrase explicative sous le choix, dans l'écran d'édition. */
export function lookingHint(id) {
  const pair = HINTS[id];
  return pair ? tx(pair[0], pair[1]) : '';
}

/** Les puces à afficher sur un profil : { id, icon, label }. */
export function lookingChips(stored) {
  return parseLookingFor(stored).map(id => ({
    id,
    icon: LOOKING_FOR_ICONS[id] || '•',
    label: lookingLabel(id),
  }));
}

/** Les mêmes puces, dans une langue donnée. */
export function lookingChipsIn(lang, stored) {
  return parseLookingFor(stored).map(id => ({
    id,
    icon: LOOKING_FOR_ICONS[id] || '•',
    label: lookingLabelIn(lang, id),
  }));
}

export { LOOKING_FOR, LOOKING_FOR_ICONS, parseLookingFor };
