export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Suppression définitive d'un compte (droit à l'effacement, RGPD art. 17).
//
// Depuis le SQL 32, c'est la base de données qui fait le gros du travail :
// supprimer le compte entraîne automatiquement la suppression du profil,
// des projets, des collabs, des abonnements et des sessions QR.
//
// Deux exceptions, volontaires :
//
// · Les MESSAGES sont conservés chez la personne qui les a reçus. Une
//   conversation appartient aussi à son destinataire, et quelqu'un ne doit
//   pas pouvoir effacer la trace d'un harcèlement en supprimant son compte.
//   Comme le profil disparaît, l'app affiche « Compte supprimé ».
//
// · Les PHOTOS vivent dans le stockage, pas dans la base : elles ne peuvent
//   pas être supprimées automatiquement, on s'en occupe ici.

type StepError = { step: string; message: string };

export async function POST(request: Request) {
  const problems: StepError[] = [];

  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const id = user.id;

    /** Vide le dossier de stockage de l'utilisateur dans un bucket donné. */
    async function emptyFolder(bucket: string) {
      try {
        const { data, error } = await db.storage.from(bucket).list(id);
        if (error) throw error;
        if (!data?.length) return;
        const { error: removeError } = await db.storage
          .from(bucket)
          .remove(data.map(f => `${id}/${f.name}`));
        if (removeError) throw removeError;
      } catch (e) {
        problems.push({ step: `photos_${bucket}`, message: (e as Error).message });
        console.error(`delete-account [photos_${bucket}]`, e);
      }
    }

    // Les photos d'abord : une fois le compte parti, on ne saurait plus
    // à qui appartenaient ces fichiers.
    await emptyFolder('avatars');
    await emptyFolder('portfolio');
    await emptyFolder('chat');

    // Puis le compte. La base supprime le reste en chaîne.
    const { error: authError } = await db.auth.admin.deleteUser(id);
    if (authError) {
      console.error('delete-account [compte]', authError);
      return Response.json(
        { error: authError.message, step: 'compte', problems },
        { status: 500 }
      );
    }

    // Filet de sécurité : si le SQL 32 n'a pas encore été appliqué, la
    // suppression en chaîne n'existe pas et le profil pourrait survivre.
    // On vérifie, et on efface à la main le cas échéant.
    const { data: leftover } = await db
      .from('profiles')
      .select('user_id')
      .eq('user_id', id)
      .maybeSingle();
    if (leftover) {
      problems.push({ step: 'cascade', message: 'profil encore présent, effacé manuellement' });
      await db.from('profiles').delete().eq('user_id', id);
      await db.from('offers').delete().eq('user_id', id);
      await db.from('collabs').delete().eq('sender_id', id);
      await db.from('collabs').delete().eq('receiver_id', id);
      await db.from('follows').delete().eq('follower_id', id);
      await db.from('follows').delete().eq('following_id', id);
      await db.from('qr_sessions').delete().eq('user_id', id);
      await db.from('qr_sessions').delete().eq('scanned_by', id);
    }

    return Response.json({ ok: true, problems });
  } catch (err) {
    console.error('delete-account', err);
    return Response.json(
      { error: (err as Error).message, step: 'inattendu', problems },
      { status: 500 }
    );
  }
}
