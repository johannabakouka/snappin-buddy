export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM = "Snappin'Buddy <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

  try {
    const { type, to, data } = await req.json();

    let subject = '';
    let html = '';

    if (type === 'new_application') {
      subject = `⚡ ${data.applicantName} veut créer avec toi sur "${data.offerTitle}"`;
      html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0A0A0A; color: white; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">⚡ Nouvelle proposition !</h1>
          <p style="color: #888; font-size: 14px; margin-bottom: 24px;">Quelqu'un veut créer avec toi 🎨</p>
          <div style="background: #1A1A1A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${data.applicantName}</p>
            <p style="color: #888; font-size: 13px;">${data.applicantRole || 'Créatif'}</p>
          </div>
          <p style="font-size: 14px; color: #ccc; margin-bottom: 24px;">
            Se propose pour ton projet : <strong style="color: white;">"${data.offerTitle}"</strong>
          </p>
          <a href="https://snappin-buddy.vercel.app" style="display: block; background: white; color: black; text-align: center; padding: 14px; border-radius: 24px; font-weight: 700; font-size: 14px; text-decoration: none;">
            Voir la proposition →
          </a>
          <p style="color: #444; font-size: 11px; text-align: center; margin-top: 24px;">Snappin'Buddy · Ateliers 777 · Paris · créez quelque chose de beau 🎨</p>
        </div>
      `;
    }

    else if (type === 'application_accepted') {
      subject = `🎉 C'est parti ! Vous allez créer quelque chose de beau`;
      html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0A0A0A; color: white; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">🎉 Proposition acceptée !</h1>
          <p style="color: #888; font-size: 14px; margin-bottom: 24px;">La création peut commencer ✨</p>
          <div style="background: #1A1A1A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #ccc;">
              <strong style="color: white;">${data.posterName}</strong> a accepté ta proposition pour le projet <strong style="color: white;">"${data.offerTitle}"</strong>
            </p>
          </div>
          <p style="font-size: 14px; color: #2ECC71; font-weight: 700; margin-bottom: 24px;">
            ⚡ Vous pouvez maintenant vous organiser et créer quelque chose de beau ensemble !
          </p>
          <a href="https://snappin-buddy.vercel.app" style="display: block; background: white; color: black; text-align: center; padding: 14px; border-radius: 24px; font-weight: 700; font-size: 14px; text-decoration: none;">
            Ouvrir la conversation →
          </a>
          <p style="color: #444; font-size: 11px; text-align: center; margin-top: 24px;">Snappin'Buddy · Ateliers 777 · Paris · créez quelque chose de beau 🎨</p>
        </div>
      `;
    }

    else if (type === 'offer_expiring') {
      subject = `⏰ Ton projet "${data.offerTitle}" expire dans 7 jours`;
      html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0A0A0A; color: white; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">⏰ Ton projet expire bientôt</h1>
          <p style="color: #888; font-size: 14px; margin-bottom: 24px;">Plus que 7 jours</p>
          <div style="background: #1A1A1A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-weight: 700; color: white; margin-bottom: 4px;">${data.offerTitle}</p>
            <p style="color: #888; font-size: 13px;">Expire le ${data.expiryDate}</p>
          </div>
          <p style="font-size: 14px; color: #ccc; margin-bottom: 16px;">
            Renouvelle ton projet gratuitement ou booste-le pour le remettre en tête du feed 🚀
          </p>
          <a href="https://snappin-buddy.vercel.app" style="display: block; background: white; color: black; text-align: center; padding: 14px; border-radius: 24px; font-weight: 700; font-size: 14px; text-decoration: none; margin-bottom: 10px;">
            Renouveler mon projet →
          </a>
          <a href="https://snappin-buddy.vercel.app" style="display: block; background: linear-gradient(135deg, #F0B429, #FF6B35); color: black; text-align: center; padding: 14px; border-radius: 24px; font-weight: 700; font-size: 14px; text-decoration: none;">
            🚀 Booster pour 1,99€
          </a>
          <p style="color: #444; font-size: 11px; text-align: center; margin-top: 24px;">Snappin'Buddy · Ateliers 777 · Paris · créez quelque chose de beau 🎨</p>
        </div>
      `;
    }

    else if (type === 'boost_suggestion') {
      subject = `🔥 Ton projet "${data.offerTitle}" attire des créatifs !`;
      html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0A0A0A; color: white; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">🔥 Ton projet cartonne !</h1>
          <p style="color: #888; font-size: 14px; margin-bottom: 24px;">Des créatifs veulent rejoindre ton projet</p>
          <div style="background: #1A1A1A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-weight: 700; color: white; margin-bottom: 4px;">${data.offerTitle}</p>
            <p style="color: #2ECC71; font-size: 13px; font-weight: 700;">${data.count} proposition${data.count > 1 ? 's' : ''} reçue${data.count > 1 ? 's' : ''}</p>
          </div>
          <p style="font-size: 14px; color: #ccc; margin-bottom: 16px;">
            Booste ton projet pour le remettre en tête du feed et recevoir encore plus de propositions !
          </p>
          <a href="https://snappin-buddy.vercel.app" style="display: block; background: linear-gradient(135deg, #F0B429, #FF6B35); color: black; text-align: center; padding: 14px; border-radius: 24px; font-weight: 700; font-size: 14px; text-decoration: none;">
            🚀 Booster mon projet — 1,99€
          </a>
          <p style="color: #444; font-size: 11px; text-align: center; margin-top: 24px;">Snappin'Buddy · Ateliers 777 · Paris · créez quelque chose de beau 🎨</p>
        </div>
      `;
    }

    if (!subject) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });

    const { data: result, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true, id: result?.id });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}