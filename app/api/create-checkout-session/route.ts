import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
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
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://snappin-buddy.vercel.app/boost-success?offer_id=${offerId}&days=${boostDays}`,
      cancel_url: `https://snappin-buddy.vercel.app/`,
      metadata: { offerId, boostDays: String(boostDays) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}