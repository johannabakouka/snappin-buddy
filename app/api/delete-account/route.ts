export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Suppression définitive d'un compte (droit à l'effacement, RGPD art. 17).
//
// Pourquoi côté serveur : depuis l'app, les règles de sécurité de Supabase (RLS)
// empêchent d'effacer certaines lignes, et l'échec passait inaperçu — le profil
// restait visible sur la carte alors que la personne croyait son compte supprimé.
// Ici on utilise la clé d'administration, qui a le droit de tout effacer.

/** Vide un dossier de stockage (avatars, portfolio) appartenant à l'utilisateur. */
async function emptyFolder(bucket: string, userId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.storage.from(bucket).list(userId);
  if (error || !data?.length) return;
  const paths = data.map(f => `${userId}/${f.name}`);
  await db.storage.from(bucket).remove(paths);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const id = user.id;

    // 1. Les messages : ceux envoyés et ceux reçus.
    await db.from('messages').delete().eq('sender_id', id);
    await db.from('messages').delete().eq('receiver_id', id);

    // 2. Les sessions QR, puis les collabs (les QR pointent vers une collab).
    await db.from('qr_sessions').delete().eq('user_id', id);
    await db.from('collabs').delete().eq('sender_id', id);
    await db.from('collabs').delete().eq('receiver_id', id);

    // 3. Les projets publiés et les abonnements dans les deux sens.
    await db.from('offers').delete().eq('user_id', id);
    await db.from('follows').delete().eq('follower_id', id);
    await db.from('follows').delete().eq('following_id', id);

    // 4. Les photos (avatar et portfolio) : elles sont publiques, il faut les effacer
    //    du stockage, pas seulement retirer leur adresse du profil.
    await emptyFolder('avatars', id);
    await emptyFolder('portfolio', id);

    // 5. Le profil : c'est lui qui rend la personne visible sur la carte.
    const { error: profileError } = await db.from('profiles').delete().eq('user_id', id);
    if (profileError) throw profileError;

    // 6. Le compte d'authentification lui-même (email et mot de passe).
    //    Sans cette étape, l'email resterait pris et la personne ne pourrait pas
    //    se réinscrire avec la même adresse.
    const { error: authError } = await db.auth.admin.deleteUser(id);
    if (authError) throw authError;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('delete-account', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
