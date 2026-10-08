export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Export de ses données (droit d'accès et de portabilité, RGPD art. 15 et 20).
//
// Les CGU promettaient ce droit, mais ne proposaient qu'une adresse email pour
// l'exercer : il fallait écrire, attendre, et quelqu'un devait aller fabriquer
// le fichier à la main. Ici, la personne appuie sur un bouton et reçoit tout.
//
// Le format est du JSON : c'est ce que l'article 20 appelle « structuré,
// couramment utilisé et lisible par machine ».
//
// Deux limites volontaires :
//
// · Les SIGNALEMENTS reçus apparaissent sans l'identité de qui a signalé.
//   Le droit d'accès s'arrête là où il porte atteinte aux droits d'autrui
//   (art. 15.4) : savoir qui vous a signalé permettrait de s'en prendre à
//   cette personne.
//
// · Les MESSAGES des conversations sont inclus des deux côtés, parce qu'une
//   conversation est autant la donnée de celui qui l'a reçue. En revanche on
//   ne descend pas dans le profil des autres : seuls leurs identifiants
//   apparaissent, tels qu'ils sont déjà visibles dans l'app.

const BUCKETS = ['avatars', 'portfolio', 'chat'];

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const id = user.id;

    /**
     * Une lecture qui ne fait pas échouer tout l'export si une table manque.
     * Un export partiel vaut mieux qu'une erreur : la personne a droit à ses
     * données, pas à un message d'échec parce qu'une table a changé de nom.
     */
    async function sur(
      requete: PromiseLike<{ data: unknown[] | null; error: unknown }>,
      nom: string,
    ): Promise<unknown[]> {
      try {
        const { data, error } = await requete;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error(`export-data [${nom}]`, e);
        return [];
      }
    }

    const [
      profil,
      projets,
      candidatures,
      messages,
      abonnements,
      abonnes,
      projetsEnregistres,
      blocages,
      alertesVille,
      preferencesConversation,
      sessionsQr,
      signalementsEnvoyes,
      signalementsRecus,
      photosRefusees,
    ] = await Promise.all([
      sur(db.from('profiles').select('*').eq('user_id', id), 'profiles'),
      sur(db.from('offers').select('*').eq('user_id', id), 'offers'),
      sur(db.from('collabs').select('*').or(`sender_id.eq.${id},receiver_id.eq.${id}`), 'collabs'),
      sur(db.from('messages').select('*').or(`sender_id.eq.${id},receiver_id.eq.${id}`), 'messages'),
      sur(db.from('follows').select('*').eq('follower_id', id), 'follows_sortants'),
      sur(db.from('follows').select('*').eq('following_id', id), 'follows_entrants'),
      sur(db.from('saved_offers').select('*').eq('user_id', id), 'saved_offers'),
      sur(db.from('blocks').select('*').eq('blocker_id', id), 'blocks'),
      sur(db.from('city_watch').select('*').eq('user_id', id), 'city_watch'),
      sur(db.from('conversation_prefs').select('*').eq('user_id', id), 'conversation_prefs'),
      sur(db.from('qr_sessions').select('*').or(`user_id.eq.${id},scanned_by.eq.${id}`), 'qr_sessions'),
      sur(db.from('reports').select('*').eq('reporter_id', id), 'reports_envoyes'),
      // Sans reporter_id : voir la note en tête de fichier.
      sur(
        db.from('reports')
          .select('id, target_type, reason, status, created_at, handled_at')
          .eq('target_user_id', id),
        'reports_recus',
      ),
      sur(db.from('upload_blocks').select('id, context, scores, created_at').eq('user_id', id), 'upload_blocks'),
    ]);

    // Les photos vivent dans le stockage, pas dans la base : on en donne la
    // liste et les adresses, pour que les fichiers soient récupérables.
    const photos: Record<string, { fichier: string; taille?: number; adresse: string }[]> = {};
    for (const seau of BUCKETS) {
      try {
        const { data } = await db.storage.from(seau).list(id);
        photos[seau] = (data || []).map(f => ({
          fichier: f.name,
          taille: (f as { metadata?: { size?: number } }).metadata?.size,
          adresse: db.storage.from(seau).getPublicUrl(`${id}/${f.name}`).data.publicUrl,
        }));
      } catch (e) {
        console.error(`export-data [storage ${seau}]`, e);
        photos[seau] = [];
      }
    }

    const dossier = {
      a_propos_de_cet_export: {
        application: "Snappin'Buddy",
        responsable: 'Ateliers 777 · 59 rue de Ponthieu, 75008 Paris · SIRET 995 320 264 00014',
        contact: 'contact@snappinbuddy.com',
        genere_le: new Date().toISOString(),
        base_legale: 'RGPD art. 15 (droit d’accès) et art. 20 (droit à la portabilité)',
        note_signalements:
          'Les signalements reçus sont donnés sans l’identité de qui a signalé, conformément à l’art. 15.4.',
      },
      compte: {
        identifiant: user.id,
        email: user.email,
        cree_le: user.created_at,
        derniere_connexion: user.last_sign_in_at,
        email_confirme_le: user.email_confirmed_at,
      },
      profil: profil[0] || null,
      projets,
      candidatures,
      messages,
      abonnements,
      abonnes,
      projets_enregistres: projetsEnregistres,
      comptes_bloques: blocages,
      alertes_ville: alertesVille,
      preferences_conversation: preferencesConversation,
      sessions_qr: sessionsQr,
      signalements_envoyes: signalementsEnvoyes,
      signalements_recus: signalementsRecus,
      photos_refusees_a_l_envoi: photosRefusees,
      photos,
    };

    const jour = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(dossier, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="snappinbuddy-mes-donnees-${jour}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('export-data', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
