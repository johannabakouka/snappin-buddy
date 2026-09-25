export const dynamic = 'force-dynamic';

import { stripe, supabaseAdmin } from '../../lib/server';

// Stripe nous prévient dès qu'un paiement est réussi, même si la personne
// a fermé l'onglet avant de revenir sur l'app. C'est la sécurité qui garantit
// qu'un boost payé est toujours activé.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('stripe-webhook : STRIPE_WEBHOOK_SECRET manquant');
    return Response.json({ error: 'webhook non configuré' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'signature manquante' }, { status: 400 });

  let event;
  try {
    const raw = await request.text();
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error('stripe-webhook : signature invalide', err);
    return Response.json({ error: 'signature invalide' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as {
        payment_status?: string;
        created?: number;
        metadata?: Record<string, string> | null;
      };
      if (session.payment_status !== 'paid') return Response.json({ received: true });

      const offerId = session.metadata?.offerId;
      const days = Number(session.metadata?.days);
      if (!offerId || !days) return Response.json({ received: true });

      const paidUntil = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000 + days * 24 * 60 * 60 * 1000);

      const db = supabaseAdmin();
      const { data: offer } = await db.from('offers').select('boosted_until').eq('id', offerId).maybeSingle();
      if (!offer) return Response.json({ received: true });

      // Si le boost a déjà été activé au retour sur l'app, on garde la date la plus lointaine :
      // recevoir l'événement deux fois ne double jamais la durée.
      const current = offer.boosted_until ? new Date(offer.boosted_until) : null;
      const boostedUntil = current && current > paidUntil ? current : paidUntil;

      await db.from('offers').update({ boosted_until: boostedUntil.toISOString() }).eq('id', offerId);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('stripe-webhook', err);
    // On renvoie une erreur pour que Stripe réessaie plus tard
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
