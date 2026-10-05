import { getProfile, getUserEmail, nearbyArrivalMail, sendMail, supabaseAdmin } from './server';
import { distanceKm, NEARBY_KM } from '../constants';

// « Préviens-moi quand quelqu'un arrive. »
//
// Sur la carte, les gens arrivés les premiers dans leur ville peuvent demander
// à être prévenus quand quelqu'un s'installe autour d'eux. Chaque ligne garde
// le nombre de créatifs présents au moment de la demande, donc on n'écrit que
// si ce nombre a augmenté depuis : un seul mail par demande, au moment où il a
// du sens, et la ligne est marquée juste après l'envoi.
//
// Le code est ici et pas dans la route parce qu'il tourne depuis deux endroits :
// la tâche quotidienne qui existait déjà (app/api/expire-offers) et une route
// dédiée pour pouvoir le déclencher à la main. Vercel limite le nombre de
// tâches planifiées, donc on n'en ajoute pas une troisième.

type Watch = { id: string; user_id: string; lat: number; lng: number; baseline: number };
type Placed = { user_id: string; lat: number; lng: number };

export type ArrivalsResult = { watches: number; emailsSent: number; marked: number };

export async function notifyArrivals(): Promise<ArrivalsResult> {
  const db = supabaseAdmin();

  const { data: watchRows, error: watchError } = await db
    .from('city_watch')
    .select('id, user_id, lat, lng, baseline')
    .is('notified_at', null);
  if (watchError) throw watchError;
  const watches = (watchRows || []) as Watch[];
  if (watches.length === 0) return { watches: 0, emailsSent: 0, marked: 0 };

  // Les profils placés sur la carte. La comparaison est une distance, donc elle
  // ne se filtre pas en SQL sans extension : on lit les colonnes utiles une
  // fois et on compare en mémoire.
  const { data: profileRows, error: profileError } = await db
    .from('profiles')
    .select('user_id, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    // Mode invisible : quelqu'un qui s'est retiré de la carte ne déclenche pas
    // de mail. Les comptes créés avant ce réglage ont la colonne vide, donc on
    // accepte explicitement le vide : « différent de vrai » les écarterait tous.
    .or('hidden.is.null,hidden.eq.false');
  if (profileError) throw profileError;
  const placed = (profileRows || []) as Placed[];

  let emailsSent = 0;
  const notified: string[] = [];

  for (const w of watches) {
    const around = placed.filter(p => (
      p.user_id !== w.user_id && distanceKm(w.lat, w.lng, p.lat, p.lng) <= NEARBY_KM
    )).length;
    const arrived = around - (w.baseline || 0);
    if (arrived <= 0) continue;

    try {
      const to = await getUserEmail(w.user_id);
      // Compte supprimé entre-temps : la ligne est marquée quand même, sinon
      // elle serait relue tous les jours sans jamais aboutir.
      if (to) {
        const dest = await getProfile(w.user_id);
        await sendMail(nearbyArrivalMail(to, arrived, dest?.username));
        emailsSent++;
      }
      notified.push(w.id);
    } catch (e) {
      console.error('notifyArrivals email', e);
    }
  }

  if (notified.length) {
    const { error: markError } = await db
      .from('city_watch')
      .update({ notified_at: new Date().toISOString() })
      .in('id', notified);
    if (markError) throw markError;
  }

  return { watches: watches.length, emailsSent, marked: notified.length };
}
