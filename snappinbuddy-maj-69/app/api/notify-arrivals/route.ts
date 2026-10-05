export const dynamic = 'force-dynamic';

import { notifyArrivals } from '../../lib/arrivals';

// Déclenchement à la main de « préviens-moi quand quelqu'un arrive ».
// La logique est dans app/lib/arrivals.ts, et la tâche quotidienne qui existait
// déjà (app/api/expire-offers) l'appelle aussi : Vercel limite le nombre de
// tâches planifiées, donc on n'en ajoute pas une troisième.
//
// Protégée par CRON_SECRET comme les autres routes de ce genre.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await notifyArrivals();
    return Response.json({ message: 'OK', ...result });
  } catch (e) {
    console.error('notify-arrivals', e);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
