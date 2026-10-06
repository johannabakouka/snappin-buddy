export const dynamic = 'force-dynamic';

import { backfillCities } from '../../lib/backfill-cities';

// Déclenchement à la main du remplissage des villes manquantes.
// La logique est dans app/lib/backfill-cities.ts, et la tâche quotidienne
// (app/api/expire-offers) l'appelle aussi : Vercel limite le nombre de tâches
// planifiées, donc on n'en ajoute pas une de plus.
//
// Protégée par CRON_SECRET comme les autres routes de ce genre.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await backfillCities();
    return Response.json({ message: 'OK', ...result });
  } catch (e) {
    console.error('backfill-cities', e);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
