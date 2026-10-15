'use client';

import { Share } from '@capacitor/share';
import { dansLApp } from './api-url';

// Le partage, selon l'endroit d'où l'app tourne.
//
// Sur le web, le navigateur sait partager un fichier : `navigator.share` ouvre
// le panneau du système avec l'image de la carte, et sinon on la télécharge.
// C'est ce que fait déjà l'app depuis le début, et ça marche.
//
// Dans l'app installée, non. Le WKWebView d'iOS n'expose pas le partage de
// fichiers, donc `navigator.canShare` répond non et on retombait sur un
// téléchargement, qui ne mène nulle part dans une app : on appuyait sur
// « Partager » et il ne se passait rien.
//
// Capacitor, lui, donne accès au vrai panneau de partage d'iOS. Il ne prend
// pas une image en mémoire, mais il prend un lien, et un lien est de toute
// façon ce qu'on veut envoyer à quelqu'un : il ouvre la page du projet ou du
// profil, image comprise.

// Le greffon s'importe, il ne se cueille pas sur window : `Capacitor.Plugins`
// reste vide tant que le paquet n'a pas été importé. Lu sur window, ce partage
// natif n'est jamais parti une seule fois.
/** Le panneau de partage du système. */
function panneauNatif() {
  return Share;
}

/**
 * Ouvre le panneau de partage du système avec un lien.
 *
 * Renvoie true si le panneau s'est ouvert, false s'il faut se rabattre sur
 * autre chose. Un partage que la personne annule compte comme réussi : elle a
 * bien vu le panneau, elle a simplement changé d'avis.
 */
export async function partagerLien(lien, titre) {
  const natif = panneauNatif();
  if (!natif || !dansLApp() || !lien) return false;
  try {
    await natif.share({ title: titre, url: lien, dialogTitle: titre });
    return true;
  } catch (e) {
    const message = String(e?.message || '').toLowerCase();
    if (message.includes('cancel') || message.includes('abort')) return true;
    return false;
  }
}
