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

/** Vrai une fois les écouteurs posés : ils ne doivent l'être qu'une fois. */
let branche = false;

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
  if (!dansLApp()) return;

  try {
    brancherEcouteurs();

    // `checkPermissions` d'abord : si la personne a déjà accepté, on
    // réenregistre sans rien lui demander, ce qui permet de récupérer un jeton
    // neuf quand iOS en change, ce qu'il fait après une mise à jour du système.
    let { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt' || receive === 'prompt-with-rationale') {
      if (localStorage.getItem(DEJA_DEMANDE) === '1') return;
      localStorage.setItem(DEJA_DEMANDE, '1');
      ({ receive } = await PushNotifications.requestPermissions());
    }
    if (receive !== 'granted') return;

    await PushNotifications.register();
  } catch (e) {
    console.error('activerNotifications', e);
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
      if (!jeton?.value) return;
      // L'écriture passe par le serveur, pas par la base directement : la
      // table est fermée aux téléphones, et seul le serveur peut faire changer
      // une ligne de propriétaire quand on change de compte sur le même
      // téléphone. Voir app/api/register-device/route.ts.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(api('/api/register-device'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token: jeton.value }),
      });
    } catch (e) {
      console.error('enregistrement du jeton', e);
    }
  });

  PushNotifications.addListener('registrationError', err => {
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
