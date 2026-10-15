'use client';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Vibration courte sur les actions qui comptent. Jamais pour décorer :
// seulement là où quelque chose vient vraiment de partir, ou là où la
// sélection vient de changer.
//
// POURQUOI UN IMPORT, ET PAS `window.Capacitor.Plugins.Haptics`
//
// Ce fichier lisait le greffon sur l'objet global. Cet objet existe, mais il
// reste VIDE tant que le paquet n'a pas été importé : dans @capacitor/core, la
// ligne `Plugins[pluginName] = proxy` ne s'exécute qu'à l'intérieur de
// `registerPlugin()`, appelée par l'import du paquet et par rien d'autre.
// Résultat : pas une seule vibration n'est jamais partie sur iPhone, et le
// repli `navigator.vibrate` n'y changeait rien puisque Safari ne l'a jamais
// implémenté. Le même motif avait été recopié dans partage.js et splash.js.
//
// L'import est sans danger pour le site : @capacitor/core se rattache à
// `globalThis` et s'importe sans erreur sur un serveur, et l'implémentation
// web du greffon, qui appelle `navigator.vibrate`, n'est chargée qu'au premier
// appel depuis un navigateur. Sur le site, ces fonctions font donc exactement
// ce que le navigateur sait faire, c'est-à-dire rien du tout sur iPhone.

/**
 * Demande une vibration sans jamais laisser une erreur remonter.
 *
 * Les méthodes du greffon renvoient une promesse : un simple try/catch ne
 * suffirait pas, un refus arrivant plus tard deviendrait un rejet non traité
 * dans la console. Une vibration qui ne part pas ne doit jamais rien casser.
 */
function demander(action) {
  try {
    action()?.catch?.(() => {});
  } catch { /* le greffon refuse parfois hors geste utilisateur */ }
}

/**
 * Le coup sec d'une action réussie : un message parti, une proposition envoyée.
 *
 * Sur iPhone, le système choisit lui-même l'intensité à partir du style
 * demandé, et c'est ce qui donne cette sensation nette plutôt qu'un
 * bourdonnement. L'argument en millisecondes de l'ancienne version ne servait
 * qu'au repli `navigator.vibrate`, qui ne faisait rien : les appels qui le
 * passent encore restent valables, il est simplement ignoré.
 */
export function tap() {
  demander(() => Haptics.impact({ style: ImpactStyle.Light }));
}

/** Plus appuyé : une collaboration validée, un paiement passé. */
export function tapFort() {
  demander(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

/**
 * Le petit clic d'un choix : on change d'onglet, on touche un filtre.
 *
 * Ce n'est pas la même chose que `tap`. `tap` confirme qu'une action est
 * partie ; ici rien ne part, c'est la sélection qui a changé. iOS fait la même
 * distinction avec son retour « selection », nettement plus discret qu'un
 * impact : c'est exactement la sensation du sélecteur de date du système, ou
 * du passage d'un onglet à l'autre dans Instagram.
 *
 * Utiliser l'impact pour ça rendrait l'app fatigante au bout de dix minutes.
 */
export function tapChoix() {
  demander(() => Haptics.selectionChanged());
}

/**
 * La secousse d'un refus : photo bloquée, formulaire incomplet.
 *
 * Sur iPhone, c'est la vibration de notification d'erreur du système,
 * reconnaissable entre toutes.
 */
export function tapErreur() {
  demander(() => Haptics.notification({ type: NotificationType.Error }));
}
