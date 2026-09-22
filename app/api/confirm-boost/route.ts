export const dynamic = 'force-dynamic';

import { stripe, supabaseAdmin } from '../../lib/server';

// Appelée par la page /boost-success après le retour de Stripe.
// Le boost n'est activé que si Stripe confirme que la session est bien payée.
// Rejouer la même session donne le même résultat (pas de boost gratuit en rechargeant la page).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || '');
    if (!sessionId.startsWith('cs_')) return Response.json({ error: 'session invalide' }, { status: 400 });

    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'paiement non confirmé' }, { status: 402 });
    }

    const offerId = session.metadata?.offerId;
    const days = Number(session.metadata?.days);
    if (!offerId || !days) return Response.json({ error: 'session incomplète' }, { status: 400 });

    const paidUntil = new Date(session.created * 1000 + days * 24 * 60 * 60 * 1000);

    const db = supabaseAdmin();
    const { data: offer } = await db.from('offers').select('boosted_until').eq('id', offerId).maybeSingle();
    if (!offer) return Response.json({ error: 'projet introuvable' }, { status: 404 });

    // On garde la date la plus lointaine si un boost est déjà en cours
    const current = offer.boosted_until ? new Date(offer.boosted_until) : null;
    const boostedUntil = current && current > paidUntil ? current : paidUntil;

    const { error } = await db.from('offers').update({ boosted_until: boostedUntil.toISOString() }).eq('id', offerId);
    if (error) throw error;

    return Response.json({ ok: true, days, boostedUntil: boostedUntil.toISOString() });
  } catch (err) {
    console.error('confirm-boost', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
