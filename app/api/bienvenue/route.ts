export const dynamic = 'force-dynamic';

import { supabaseAdmin, getUserEmail, sendMail, bienvenueMail } from '../../lib/server';

/**
 * Le mail de bienvenue, déclenché par un webhook Supabase.
 *
 * Supabase appelle cette route en POST à chaque insertion dans profiles,
 * c'est à dire au moment exact où la personne termine son inscription et où
 * son handle existe. Rien n'est déclenché depuis l'app : aucune mise à jour
 * iPhone n'est nécessaire, et le mail part aussi bien pour quelqu'un venu de
 * l'App Store que du site.
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
};

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Le webhook envoie { type, table, record, old_record }. On accepte aussi
  // un simple { user_id } pour pouvoir rejouer un envoi à la main.
  const corps = (await request.json().catch(() => null)) as
    { record?: Ligne; user_id?: string } | null;
  const userId = corps?.record?.user_id || corps?.user_id;
  if (!userId) return Response.json({ error: 'user_id manquant' }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from('profiles')
    .select('user_id, username, handle, welcome_sent_at')
    .eq('user_id', userId)
    .maybeSingle();
  const profil = data as Ligne | null;

  if (!profil) return Response.json({ message: 'profil introuvable' });
  if (profil.welcome_sent_at) return Response.json({ message: 'deja envoye' });

  const email = await getUserEmail(userId);
  if (!email) return Response.json({ message: 'pas d adresse email' });

  // On marque AVANT d'envoyer : si deux webhooks partent en même temps, le
  // second voit la marque et s'arrête. Un mail perdu vaut mieux qu'un doublon.
  await db
    .from('profiles')
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq('user_id', userId);

  try {
    await sendMail(bienvenueMail(email, profil.username, profil.handle, profil.handle ?? undefined));
  } catch (e) {
    console.error('bienvenue', e);
    // L'envoi a échoué : on retire la marque pour qu'un rejeu soit possible.
    await db.from('profiles').update({ welcome_sent_at: null }).eq('user_id', userId);
    return Response.json({ error: 'envoi impossible' }, { status: 500 });
  }

  return Response.json({ message: 'OK' });
}
