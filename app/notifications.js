'use client';

import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { api, dansLApp } from './api-url';

// Les notifications de l'app installée.
//
// Elles n'existent que dans l'app : un site web ne peut pas poser de pastille
// rouge sur une icône d'écran d'accueil, et Safari sur iPhone ne reçoit pas les
// notifications d'Apple. Sur snappinbuddy.com, tout ce fichier ne fait rien.
//
// Le greffon s'importe, comme haptics.js et partage.js : lu sur
// `window.Capacitor.Plugins`, il serait toujours absent.

/** Mémorise qu'on a déjà demandé, pour ne pas harceler à chaque lancement. */
const DEJA_DEMANDE = 'notifications-demandees';

/** Où en est l'enregistrement, pour que l'écran Compte puisse l'afficher. */
const ETAT = 'notifications-etat';

/** Vrai une fois les écouteurs posés : ils ne doivent l'être qu'une fois. */
let branche = false;

/**
 * Note l'étape atteinte, pour qu'elle soit lisible depuis l'app.
 *
 * Toute cette mécanique est invisible : elle se passe entre iOS, le greffon et
 * le serveur, et quand elle échoue elle échoue en silence. Sur un téléphone il
 * n'y a pas de console à ouvrir. Sans cette trace, la seule façon de savoir si
 * ça marche est de regarder la base de données depuis un ordinateur, et la
 * seule façon de savoir POURQUOI ça ne marche pas est de deviner.
 *
 * On garde donc la dernière étape atteinte, et l'écran Compte & sécurité
 * l'affiche en clair. C'est utile bien au-delà du dépannage : une personne qui
 * ne reçoit rien veut savoir si c'est elle qui a refusé, ou l'app qui est en
 * panne.
 */
function noter(etape, detail) {
  try {
    localStorage.setItem(ETAT, JSON.stringify({ etape, detail: detail || '', quand: Date.now() }));
  } catch { /* navigation privée : on se passe de la trace */ }
}

/** La dernière étape atteinte, telle que l'écran Compte doit l'afficher. */
export function derniereEtape() {
  try {
    const brut = localStorage.getItem(ETAT);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

/** L'autorisation telle qu'iOS la voit en ce moment même. */
export async function permissionActuelle() {
  if (!dansLApp()) return 'hors-app';
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return receive;
  } catch {
    return 'inconnu';
  }
}

/**
 * Enregistre l'appareil pour qu'il puisse recevoir des notifications.
 *
 * À appeler une fois la personne connectée et son profil créé, jamais au
 * premier écran : iOS ne pose la question qu'UNE SEULE FOIS dans la vie de
 * l'app. Posée avant qu'on ait compris à quoi sert l'app, elle se solde par un
 * refus définitif, que seul un détour par les réglages du téléphone peut
 * annuler. Apple refuse d'ailleurs les apps qui la posent à froid.
 */
export async function activerNotifications() {
  if (!dansLApp()) {
    noter('hors-app');
    return;
  }

  try {
    brancherEcouteurs();

    // `checkPermissions` d'abord : si la personne a déjà accepté, on
    // réenregistre sans rien lui demander, ce qui permet de récupérer un jeton
    // neuf quand iOS en change, ce qu'il fait après une mise à jour du système.
    let { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt' || receive === 'prompt-with-rationale') {
      if (localStorage.getItem(DEJA_DEMANDE) === '1') {
        noter('jamais-repondu');
        return;
      }
      localStorage.setItem(DEJA_DEMANDE, '1');
      ({ receive } = await PushNotifications.requestPermissions());
    }
    if (receive !== 'granted') {
      noter('refuse', receive);
      return;
    }

    noter('attente-jeton');
    await PushNotifications.register();
  } catch (e) {
    noter('erreur-greffon', String(e?.message || e));
    console.error('activerNotifications', e);
  }
}

/**
 * Reprend l'enregistrement à zéro, à la demande.
 *
 * Utile quand l'autorisation est accordée mais que l'écriture côté serveur
 * avait échoué : un réseau coupé au mauvais moment suffisait à laisser
 * l'appareil inconnu pour toujours, puisque plus rien ne relançait la tentative.
 */
export async function reessayerNotifications() {
  if (!dansLApp()) return 'hors-app';
  try {
    brancherEcouteurs();
    const { receive } = await PushNotifications.checkPermissions();
    if (receive !== 'granted') {
      noter('refuse', receive);
      return receive;
    }
    noter('attente-jeton');
    await PushNotifications.register();
    return 'granted';
  } catch (e) {
    noter('erreur-greffon', String(e?.message || e));
    return 'erreur';
  }
}

/** Pose les écouteurs : jeton reçu, et notification touchée. */
function brancherEcouteurs() {
  if (branche) return;
  branche = true;

  // iOS donne le jeton de l'appareil quelques instants après `register()`.
  // C'est lui qu'Apple exige pour savoir à quel téléphone parler.
  PushNotifications.addListener('registration', async jeton => {
    try {
      if (!jeton?.value) {
        noter('jeton-vide');
        return;
      }
      noter('jeton-recu');
      // L'écriture passe par le serveur, pas par la base directement : la
      // table est fermée aux téléphones, et seul le serveur peut faire changer
      // une ligne de propriétaire quand on change de compte sur le même
      // téléphone. Voir app/api/register-device/route.ts.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        noter('pas-de-session');
        return;
      }
      const reponse = await fetch(api('/api/register-device'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token: jeton.value }),
      });
      if (reponse.ok) noter('enregistre');
      else noter('refus-serveur', `HTTP ${reponse.status}`);
    } catch (e) {
      // Le réseau, le plus souvent : l'app vient de s'ouvrir et la connexion
      // n'est pas encore là. Le bouton « Réessayer » de l'écran Compte sert
      // exactement à ça.
      noter('erreur-reseau', String(e?.message || e));
      console.error('enregistrement du jeton', e);
    }
  });

  PushNotifications.addListener('registrationError', err => {
    noter('refus-ios', String(err?.error || err?.message || err));
    console.error('notifications refusées par iOS', err);
  });

  // La personne touche la notification : on l'emmène où il faut.
  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const lien = action?.notification?.data?.lien;
    if (typeof lien === 'string' && lien.startsWith('/')) {
      window.location.href = lien;
    }
  });
}

/**
 * Efface la pastille rouge de l'icône.
 *
 * À appeler quand l'app s'ouvre : la personne est en train de regarder, le
 * compteur n'a plus de raison d'être. Sans ça, la pastille reste affichée des
 * jours et on cesse de la croire.
 */
export async function effacerPastille() {
  if (!dansLApp()) return;
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch { /* rien de grave si le système refuse */ }
}
