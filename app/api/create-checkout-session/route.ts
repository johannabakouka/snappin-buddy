export const dynamic = 'force-dynamic';

import { requireUser, stripe, supabaseAdmin } from '../../lib/server';

// Les prix sont fixés ici, côté serveur : l'app ne peut pas envoyer son propre montant.
// Doit rester aligné avec les boutons de MatchScreen (1 jour · 1,99 € / 7 jours · 4,99 €).
const BOOST_PRICES_CENTS: Record<number, number> = { 1: 199, 7: 499 };

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const offerId = body.offerId;
    const days = Number(body.boostDays);
    const amount = BOOST_PRICES_CENTS[days];
    if (!offerId || !amount) return Response.json({ error: 'boost invalide' }, { status: 400 });

    const { data: offer } = await supabaseAdmin()
      .from('offers')
      .select('id, title, user_id')
      .eq('id', offerId)
      .maybeSingle();
    if (!offer) return Response.json({ error: 'projet introuvable' }, { status: 404 });
    if (offer.user_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const label = days === 1 ? '1 jour' : `${days} jours`;

    const params = {
      mode: 'payment' as const,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amount,
          product_data: { name: `Boost ${label} · ${String(offer.title || 'Projet').slice(0, 80)}` },
        },
      }],
      customer_email: user.email || undefined,
      client_reference_id: String(offer.id),
      metadata: { offerId: String(offer.id), days: String(days), userId: user.id },
      // Information obligatoire avant le paiement : service numérique exécuté tout de suite,
      // donc pas de droit de rétractation de 14 jours.
      custom_text: {
        submit: {
          message: `Ton projet passe en tête du feed pendant ${label}, tout de suite après le paiement. Paiement unique, sans abonnement. Service numérique exécuté immédiatement : non remboursable une fois activé (art. L221-28 du Code de la consommation).`,
        },
      },
      success_url: `${origin}/boost-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    };

    // Case « j'accepte les conditions générales », pour pouvoir prouver l'accord
    // du client en cas de litige. Stripe la refuse tant que l'adresse des CGU n'est
    // pas renseignée dans son tableau de bord : dans ce cas on réessaie sans la case
    // plutôt que de bloquer le paiement.
    let session;
    try {
      session = await stripe().checkout.sessions.create({
        ...params,
        consent_collection: { terms_of_service: 'required' },
      });
    } catch (consentError) {
      console.warn('create-checkout-session : case CGU indisponible, paiement sans case', consentError);
      session = await stripe().checkout.sessions.create(params);
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
