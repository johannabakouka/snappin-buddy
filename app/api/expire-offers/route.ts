export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jfzdrccnzzwhvzbxgtjo.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    const now = new Date();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const twentyThreeDaysAgo = new Date();
    twentyThreeDaysAgo.setDate(now.getDate() - 23);

    const twentyFourDaysAgo = new Date();
    twentyFourDaysAgo.setDate(now.getDate() - 24);

    // 1. Offres à fermer (+ de 30 jours)
    const { data: expiredOffers } = await supabase
      .from('offers')
      .select('id, title, user_id, created_at')
      .eq('status', 'open')
      .lt('created_at', thirtyDaysAgo.toISOString());

    // 2. Offres à rappeler (entre J+23 et J+24 — fenêtre de 24h)
    const { data: expiringOffers } = await supabase
      .from('offers')
      .select('id, title, user_id, created_at')
      .eq('status', 'open')
      .lt('created_at', twentyThreeDaysAgo.toISOString())
      .gt('created_at', twentyFourDaysAgo.toISOString());

    // Fermer les offres expirées
    if (expiredOffers && expiredOffers.length > 0) {
      const ids = expiredOffers.map(o => o.id);
      await supabase.from('offers').update({ status: 'closed' }).in('id', ids);

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
                expired: true,
              },
            }),
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }

    // Envoyer rappel 7 jours avant expiration
    if (expiringOffers && expiringOffers.length > 0) {
      for (const offer of expiringOffers) {
        const expiryDate = new Date(offer.created_at);
        expiryDate.setDate(expiryDate.getDate() + 30);
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'offer_expiring',
              to: 'ateliers777.contact@gmail.com',
              data: {
                offerTitle: offer.title,
                expiryDate: expiryDate.toLocaleDateString('fr-FR'),
              },
            }),
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }

    return NextResponse.json({
      message: 'Cron OK',
      expired: expiredOffers?.length || 0,
      reminders: expiringOffers?.length || 0,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}