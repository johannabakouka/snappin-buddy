export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Suppression définitive d'un compte (droit à l'effacement, RGPD art. 17).
//
// Pourquoi côté serveur : depuis l'app, les règles de sécurité de Supabase (RLS)
// empêchent d'effacer certaines lignes, et l'échec passait inaperçu — le profil
// restait visible sur la carte alors que la personne croyait son compte supprimé.
// Ici on utilise la clé d'administration, qui a le droit de tout effacer.
//
// ORDRE DES OPÉRATIONS — le point important.
// On supprime le compte d'authentification EN PREMIER, avant toute donnée.
// C'est l'étape la plus susceptible d'échouer, et tant qu'elle n'a pas réussi
// rien d'autre n'est touché : en cas de problème, la personne garde son profil
// intact et peut réessayer. L'ordre inverse laissait un compte à moitié
// supprimé — plus de profil, mais toujours un accès.

type StepError = { step: string; message: string };

export async function POST(request: Request) {
  const problems: StepError[] = [];

  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const id = user.id;

    // ÉTAPE BLOQUANTE : le compte lui-même. Si elle échoue, on s'arrête
    // sans rien avoir effacé, et on renvoie la cause exacte.
    const { error: authError } = await db.auth.admin.deleteUser(id);
    if (authError) {
      console.error('delete-account [compte]', authError);
      return Response.json(
        { error: authError.message, step: 'compte', problems },
        { status: 500 }
      );
    }

    // À partir d'ici le compte n'existe plus : on nettoie les données.
    // Une erreur sur l'une de ces étapes est signalée mais n'arrête pas les autres.
    async function step(name: string, run: () => PromiseLike<unknown> | unknown) {
      try {
        const result = (await run()) as { error?: unknown } | null | undefined;
        const error = result && typeof result === 'object' && 'error' in result ? result.error : null;
        if (error) {
          const message = (error as { message?: string }).message || String(error);
          problems.push({ step: name, message });
          console.error(`delete-account [${name}]`, error);
        }
      } catch (e) {
        problems.push({ step: name, message: (e as Error).message });
        console.error(`delete-account [${name}]`, e);
      }
    }

    /** Vide le dossier de stockage d'un utilisateur (avatars, portfolio, chat). */
    async function emptyFolder(bucket: string) {
      const { data, error } = await db.storage.from(bucket).list(id);
      if (error) return { error };
      if (!data?.length) return;
      return db.storage.from(bucket).remove(data.map(f => `${id}/${f.name}`));
    }

    // Le profil d'abord : c'est lui qui rend la personne visible sur la carte.
    await step('profil', () => db.from('profiles').delete().eq('user_id', id));

    await step('messages_envoyes', () => db.from('messages').delete().eq('sender_id', id));
    await step('messages_recus', () => db.from('messages').delete().eq('receiver_id', id));

    await step('qr_sessions', () => db.from('qr_sessions').delete().eq('user_id', id));
    await step('collabs_envoyees', () => db.from('collabs').delete().eq('sender_id', id));
    await step('collabs_recues', () => db.from('collabs').delete().eq('receiver_id', id));

    await step('offres', () => db.from('offers').delete().eq('user_id', id));
    await step('abonnements_suivis', () => db.from('follows').delete().eq('follower_id', id));
    await step('abonnements_abonnes', () => db.from('follows').delete().eq('following_id', id));

    // Les photos sont publiques : il faut les effacer du stockage,
    // et pas seulement retirer leur adresse du profil.
    await step('photos_avatar', () => emptyFolder('avatars'));
    await step('photos_portfolio', () => emptyFolder('portfolio'));
    await step('photos_chat', () => emptyFolder('chat'));

    return Response.json({ ok: true, problems });
  } catch (err) {
    console.error('delete-account', err);
    return Response.json(
      { error: (err as Error).message, step: 'inattendu', problems },
      { status: 500 }
    );
  }
}
