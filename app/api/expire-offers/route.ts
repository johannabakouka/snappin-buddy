export const dynamic = 'force-dynamic';

import { getProfile, getUserEmail, offerExpiringMail, sendMail, supabaseAdmin } from '../../lib/server';
import { isPast, pastReason, NO_DATE_DAYS } from '../../offers-life';
import { notifyArrivals } from '../../lib/arrivals';
import { backfillCities } from '../../lib/backfill-cities';
import { closePendingAndNotify } from '../../lib/slots-server';

const DAY = 24 * 60 * 60 * 1000;

// Lancée chaque jour à 9h par Vercel (vercel.json à la racine).
// Si CRON_SECRET est défini dans Vercel, seul Vercel peut l'appeler.
//
// Avant, tout projet de plus de 30 jours était fermé, même si sa date était
// encore à venir : un mariage réservé deux mois à l'avance disparaissait avant
// d'avoir eu lieu. Maintenant c'est la date qui décide, et les 30 jours ne
// servent qu'aux projets qui n'en ont pas.

type Offer = { id: number; title: string; user_id: string; created_at: string; date: string | null };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const now = Date.now();

    // On relit tous les projets ouverts : la règle mélange une date et un âge,
    // ce qui ne se filtre pas proprement côté base. À l'échelle de l'app, c'est
    // quelques centaines de lignes une fois par jour.
    const { data, error } = await db
      .from('offers')
      .select('id, title, user_id, created_at, date')
      .eq('status', 'open');
    if (error) throw error;
    const open = (data || []) as Offer[];

    const expired = open.filter(o => isPast(o));

    // Rappel 7 jours avant la fin, pour les seuls projets sans date : quand il y
    // a une date, la personne la connaît déjà, un rappel de plus est du bruit.
    const reminders = open.filter(o => {
      if (isPast(o)) return false;
      if (String(o.date || '').trim()) return false;
      const age = (now - new Date(o.created_at).getTime()) / DAY;
      return age > NO_DATE_DAYS - 7 && age <= NO_DATE_DAYS - 6;
    });

    if (expired.length) {
      const { error: closeError } = await db
        .from('offers')
        .update({ status: 'closed' })
        .in('id', expired.map(o => o.id));
      if (closeError) throw closeError;

      // Un projet qui expire laissait ses candidats en attente pour toujours.
      // Ils sont prévenus comme pour une équipe au complet : le projet est
      // clos, ce n'est pas un refus qui leur est adressé.
      for (const o of expired) {
        try {
          await closePendingAndNotify({
            id: String(o.id), user_id: o.user_id, title: o.title,
            role_needed: null, slots: null, slots_filled: null, status: 'closed',
          });
        } catch (e) {
          console.error('closePendingAndNotify', o.id, e);
        }
      }
    }

    let emailsSent = 0;
    const notify = async (offer: Offer, isExpired: boolean) => {
      try {
        const to = await getUserEmail(offer.user_id);
        if (!to) return;
        const reason = pastReason(offer) === 'date' ? 'date' : 'age';
        const deadline = String(offer.date || '').trim()
          ? new Date(offer.date as string).toLocaleDateString('fr-FR')
          : new Date(new Date(offer.created_at).getTime() + NO_DATE_DAYS * DAY).toLocaleDateString('fr-FR');
        const dest = await getProfile(offer.user_id);
        await sendMail(offerExpiringMail(to, offer.title, deadline, isExpired, dest?.username, reason));
        emailsSent++;
      } catch (e) {
        console.error('Email error:', e);
      }
    };

    for (const offer of expired) await notify(offer, true);
    for (const offer of reminders) await notify(offer, false);

    // « Préviens-moi quand quelqu'un arrive » : même passage quotidien, parce
    // que Vercel limite le nombre de tâches planifiées. Un échec ici ne doit
    // pas faire passer la clôture des projets pour ratée.
    let arrivals = null;
    try {
      arrivals = await notifyArrivals();
    } catch (e) {
      console.error('notifyArrivals', e);
    }

    // Villes manquantes sur les profils. Même passage quotidien, et un échec
    // ici ne doit pas faire passer le reste de la tâche pour raté.
    let cities = null;
    try {
      cities = await backfillCities();
    } catch (e) {
      console.error('backfillCities', e);
    }

    return Response.json({
      message: 'Cron OK',
      expired: expired.length,
      reminders: reminders.length,
      emailsSent,
      arrivals,
      cities,
    });
  } catch (err) {
    console.error('expire-offers', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
