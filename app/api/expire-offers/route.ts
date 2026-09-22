export const dynamic = 'force-dynamic';

import { getUserEmail, offerExpiringMail, sendMail, supabaseAdmin } from '../../lib/server';

const DAY = 24 * 60 * 60 * 1000;

// Lancée chaque jour à 9h par Vercel (vercel.json à la racine).
// Si CRON_SECRET est défini dans Vercel, seul Vercel peut l'appeler.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * DAY).toISOString();
    const twentyThreeDaysAgo = new Date(now - 23 * DAY).toISOString();
    const twentyFourDaysAgo = new Date(now - 24 * DAY).toISOString();

    // 1. Projets à fermer (plus de 30 jours)
    const { data: expiredOffers, error: e1 } = await db
      .from('offers')
      .select('id, title, user_id, created_at')
      .eq('status', 'open')
      .lt('created_at', thirtyDaysAgo);
    if (e1) throw e1;

    // 2. Projets à rappeler (7 jours avant la fin, fenêtre de 24h)
    const { data: expiringOffers, error: e2 } = await db
      .from('offers')
      .select('id, title, user_id, created_at')
      .eq('status', 'open')
      .lt('created_at', twentyThreeDaysAgo)
      .gt('created_at', twentyFourDaysAgo);
    if (e2) throw e2;

    if (expiredOffers?.length) {
      const { error } = await db.from('offers').update({ status: 'closed' }).in('id', expiredOffers.map(o => o.id));
      if (error) throw error;
    }

    let emailsSent = 0;
    const notify = async (offer: { title: string; user_id: string; created_at: string }, expired: boolean) => {
      try {
        const to = await getUserEmail(offer.user_id);
        if (!to) return;
        const expiry = new Date(new Date(offer.created_at).getTime() + 30 * DAY).toLocaleDateString('fr-FR');
        await sendMail(offerExpiringMail(to, offer.title, expiry, expired));
        emailsSent++;
      } catch (e) {
        console.error('Email error:', e);
      }
    };

    for (const offer of expiredOffers || []) await notify(offer, true);
    for (const offer of expiringOffers || []) await notify(offer, false);

    return Response.json({
      message: 'Cron OK',
      expired: expiredOffers?.length || 0,
      reminders: expiringOffers?.length || 0,
      emailsSent,
    });
  } catch (err) {
    console.error('expire-offers', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
