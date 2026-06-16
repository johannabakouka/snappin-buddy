import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jfzdrccnzzwhvzbxgtjo.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Trouver les offres ouvertes de plus de 30 jours
    const { data: expiredOffers, error } = await supabase
      .from('offers')
      .select('id, title, user_id, created_at')
      .eq('status', 'open')
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!expiredOffers || expiredOffers.length === 0) {
      return NextResponse.json({ message: 'No offers to expire', count: 0 });
    }

    // Fermer les offres expirées
    const ids = expiredOffers.map(o => o.id);
    await supabase.from('offers').update({ status: 'closed' }).in('id', ids);

    // Envoyer email d'expiration pour chaque offre
    for (const offer of expiredOffers) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'offer_expiring',
            to: 'ateliers777.contact@gmail.com',
            data: {
              offerTitle: offer.title,
              expiryDate: new Date().toLocaleDateString('fr-FR'),
            },
          }),
        });
      } catch (e) {
        console.error('Email error:', e);
      }
    }

    return NextResponse.json({
      message: `${expiredOffers.length} offer(s) expired`,
      count: expiredOffers.length,
      offers: expiredOffers.map(o => o.title),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}