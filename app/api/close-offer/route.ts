export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';
import { closePendingAndNotify, type OfferRow } from '../../lib/slots-server';

// Fermer son projet à la main : « c'est bon, j'ai trouvé ».
//
// La fermeture existait déjà, mais elle se faisait depuis l'app et ne touchait
// que le projet : les gens qui avaient candidaté restaient en attente d'une
// réponse qui ne venait jamais. Ici, ils sont prévenus d'un seul message.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const offerId = String(body.offerId || '').trim();
    if (!offerId) return Response.json({ error: 'projet manquant' }, { status: 400 });

    const db = supabaseAdmin();
    const { data } = await db
      .from('offers')
      .select('id, user_id, title, role_needed, slots, slots_filled, status')
      .eq('id', offerId)
      .maybeSingle();
    const offer = (data as OfferRow) || null;

    if (!offer) return Response.json({ error: 'projet introuvable' }, { status: 404 });
    if (offer.user_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });

    const { error } = await db.from('offers').update({ status: 'closed' }).eq('id', offerId);
    if (error) throw error;

    const closed = await closePendingAndNotify(offer);
    return Response.json({ ok: true, closed });
  } catch (err) {
    console.error('close-offer', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
