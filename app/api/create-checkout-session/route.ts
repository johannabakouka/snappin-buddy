import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { offerId, offerTitle, boostDays, price } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `🚀 Boost "${offerTitle}"`,
              description: `Votre offre en tête du feed pendant ${boostDays} jour${boostDays > 1 ? 's' : ''}`,
            },
            unit_amount: price, // en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/boost-success?offer_id=${offerId}&days=${boostDays}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: { offerId, boostDays: String(boostDays) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}