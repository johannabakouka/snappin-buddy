export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Supprime définitivement un projet de l'utilisateur connecté,
// ainsi que les candidatures encore en attente sur ce projet.
// Les collabs déjà acceptées sont gardées (la conversation continue).
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const offerId = String(body.offerId || '');
    if (!offerId) return Response.json({ error: 'offerId manquant' }, { status: 400 });

    const db = supabaseAdmin();
    const { data: offer, error: readError } = await db.from('offers').select('id, user_id, title').eq('id', offerId).single();
    if (readError || !offer) return Response.json({ error: 'projet introuvable' }, { status: 404 });
    if (offer.user_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });

    // Candidatures en attente : leur message se termine par ": <titre du projet>"
    if (offer.title) {
      const { data: pending } = await db.from('collabs').select('id, message')
        .eq('receiver_id', user.id).eq('status', 'pending');
      const ids = (pending || [])
        .filter(c => (c.message || '').trim().endsWith(`: ${offer.title}`))
        .map(c => c.id);
      if (ids.length) await db.from('collabs').delete().in('id', ids);
    }

    const { error } = await db.from('offers').delete().eq('id', offerId);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('delete-offer', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
