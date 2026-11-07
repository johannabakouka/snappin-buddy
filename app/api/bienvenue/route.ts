export const dynamic = 'force-dynamic';

import { supabaseAdmin, getUserEmail, sendMail, escapeHtml, atHandle } from '../../lib/server';

/**
 * Le mail de bienvenue, déclenché par un webhook Supabase.
 *
 * Supabase appelle cette route en POST à chaque insertion dans profiles,
 * c'est à dire au moment exact où la personne termine son inscription et où
 * son handle existe. Rien n'est déclenché depuis l'app : aucune mise à jour
 * iPhone n'est nécessaire, et le mail part aussi bien pour quelqu'un venu de
 * l'App Store que du site.
 *
 * Le modèle du mail est écrit ici plutôt que dans app/lib/server.ts, à la
 * suite des autres, pour une raison pratique : ça évite de modifier un
 * fichier de 375 lignes à la main depuis l'éditeur web de GitHub. La forme
 * reste celle des autres mails, français puis anglais, et il passe par le
 * même sendMail, donc la même mise en page et le même expéditeur.
 *
 * Protégée par CRON_SECRET, comme les autres routes appelées de l'extérieur,
 * pour que personne ne puisse déclencher des envois en masse en appelant
 * l'adresse à la main.
 *
 * La colonne welcome_sent_at garantit qu'un même compte ne reçoit jamais le
 * mail deux fois, même si le webhook est rejoué.
 */

type Ligne = {
  user_id?: string;
  username?: string | null;
  handle?: string | null;
  welcome_sent_at?: string | null;
  created_at?: string | null;
};

const APP_STORE = 'https://apps.apple.com/app/id6822036127';
const PETIT = 'font-size:12px;color:rgba(255,255,255,.45)';

function bienvenueMail(to: string, username?: string | null, handle?: string | null) {
  const pseudo = escapeHtml(username);
  const h = atHandle(handle);
  const nu = String(handle ?? '').replace(/^@+/, '');

  return {
    to,
    subject: nu ? `Bienvenue sur Snappin'Buddy, @${nu}` : "Bienvenue sur Snappin'Buddy",

    titleFr: 'Te voilà sur la carte 📍',
    bodyFr:
      (pseudo ? `Bienvenue ${pseudo} !<br><br>` : '') +
      `Ton identifiant est <b>${h}</b>. C’est comme ça que les autres créatifs te trouvent, ` +
      'et c’est ce que tu partages quand tu veux qu’on te retrouve.<br><br>' +
      'Snappin’Buddy sert à une chose : trouver des créatifs autour de toi et créer ensemble. ' +
      'Ouvre la carte, regarde qui shoote près de chez toi, et envoie une proposition.<br><br>' +
      '<b>Personne autour de toi pour l’instant ?</b> C’est normal au début, la carte se remplit ' +
      'tous les jours. Depuis la carte, tu peux demander à être prévenu dès qu’un créatif ' +
      's’installe près de chez toi.<br><br>' +
      '<b>Active les notifications</b> pour ne pas rater une proposition : Profil, puis ' +
      'Compte &amp; sécurité.<br><br>' +
      `<span style="${PETIT}">L’app est disponible sur ` +
      `<a href="${APP_STORE}" style="color:#F2E050">l’App Store</a>. ` +
      'La version Android est en préparation.</span>',

    titleEn: 'You’re on the map 📍',
    bodyEn:
      (pseudo ? `Welcome ${pseudo}!<br><br>` : '') +
      `Your handle is <b>${h}</b>. That’s how other creatives find you, ` +
      'and what you share when you want to be found.<br><br>' +
      'Snappin’Buddy does one thing: find creatives around you and create together. ' +
      'Open the map, see who’s shooting near you, and send a proposal.<br><br>' +
      '<b>Nobody around you yet?</b> That’s normal at the start, the map fills up every day. ' +
      'From the map, you can ask to be notified as soon as a creative settles near you.<br><br>' +
      '<b>Turn on notifications</b> so you don’t miss a proposal: Profile, then ' +
      'Account &amp; security.<br><br>' +
      `<span style="${PETIT}">The app is available on the ` +
      `<a href="${APP_STORE}" style="color:#F2E050">App Store</a>. ` +
      'The Android version is in preparation.</span>',

    cta: '',
    forUser: handle ?? undefined,
  };
}

const FRAICHEUR_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  const secret = process.env.BIENVENUE_SECRET || process.env.CRON_SECRET;
  const autorise = !!secret && request.headers.get('authorization') === `Bearer ${secret}`;

  // Le webhook envoie { type, table, record, old_record }. On accepte aussi
  // un simple { user_id } pour pouvoir rejouer un envoi à la main.
  const corps = (await request.json().catch(() => null)) as
    { record?: Ligne; user_id?: string } | null;
  const userId = corps?.record?.user_id || corps?.user_id;
  if (!userId) return Response.json({ error: 'user_id manquant' }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from('profiles')
    .select('user_id, username, handle, welcome_sent_at, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  const profil = data as Ligne | null;

  if (!profil) return Response.json({ message: 'profil introuvable' });
  if (profil.welcome_sent_at) return Response.json({ message: 'deja envoye' });

  if (!autorise) {
    const cree = Date.parse(profil.created_at || '');
    if (!Number.isFinite(cree) || Date.now() - cree > FRAICHEUR_MS) {
      return Response.json({ message: 'profil trop ancien' });
    }
  }

  const email = await getUserEmail(userId);
  if (!email) return Response.json({ message: 'pas d adresse email' });

  // On marque AVANT d'envoyer : si deux webhooks partent en même temps, le
  // second voit la marque et s'arrête. Un mail perdu vaut mieux qu'un doublon.
  await db
    .from('profiles')
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq('user_id', userId);

  try {
    await sendMail(bienvenueMail(email, profil.username, profil.handle));
  } catch (e) {
    console.error('bienvenue', e);
    // L'envoi a échoué : on retire la marque pour qu'un rejeu soit possible.
    await db.from('profiles').update({ welcome_sent_at: null }).eq('user_id', userId);
    return Response.json({ error: 'envoi impossible' }, { status: 500 });
  }

  return Response.json({ message: 'OK' });
}
