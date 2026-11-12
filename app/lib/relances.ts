import { getProfile, getUserEmail, pendingProposalsMail, sendMail, supabaseAdmin } from './server';
import { pousser } from './push';

// « Tu as des propositions en attente. »
//
// Une candidature à un projet finit toujours par se clore : la tâche
// quotidienne ferme le projet quand sa date est passée et prévient tout le
// monde. Une proposition envoyée directement depuis un profil n'a pas de
// projet derrière, donc rien ne la clôt jamais. Si la personne ne répond pas,
// l'expéditeur reste en « en attente » indéfiniment, sans jamais savoir.
//
// Le rappel s'adresse au destinataire, parce que c'est le seul qui peut
// débloquer la situation. Un oui ou un non valent mieux qu'un silence.
//
// Il part une fois par personne et par période : la date du dernier envoi est
// gardée sur le profil, sinon le rappel repartirait tous les matins.

const JOUR = 24 * 60 * 60 * 1000;

// Une proposition est « oubliée » au bout d'une semaine. Assez long pour
// laisser le temps de répondre, assez court pour que l'expéditeur n'ait pas
// encore tourné la page.
export const JOURS_AVANT_RAPPEL = 7;

// On ne relance pas plus d'une fois toutes les deux semaines, même si de
// nouvelles propositions arrivent entre-temps. Au-delà, ce n'est plus un
// rappel, c'est du harcèlement.
export const JOURS_ENTRE_RAPPELS = 14;

export type RelancesResult = {
  destinataires: number;
  emailsSent: number;
  ignores: number;
};

export async function relancerPropositions(): Promise<RelancesResult> {
  const db = supabaseAdmin();
  const maintenant = Date.now();
  const limite = new Date(maintenant - JOURS_AVANT_RAPPEL * JOUR).toISOString();

  // Les propositions reçues, encore en attente, et assez vieilles.
  const { data: enAttente, error } = await db
    .from('collabs')
    .select('id, receiver_id, created_at')
    .eq('status', 'pending')
    .lt('created_at', limite);
  if (error) throw error;

  // Combien chacun en a.
  const parPersonne = new Map<string, number>();
  for (const ligne of enAttente || []) {
    const qui = String(ligne.receiver_id || '');
    if (!qui) continue;
    parPersonne.set(qui, (parPersonne.get(qui) || 0) + 1);
  }
  if (parPersonne.size === 0) return { destinataires: 0, emailsSent: 0, ignores: 0 };

  // Qui a déjà été relancé récemment.
  //
  // Si cette lecture échoue — typiquement parce que la colonne n'existe pas
  // encore en base — on n'envoie RIEN. Sans la mémoire du dernier envoi, le
  // rappel repartirait à chaque passage, c'est-à-dire tous les matins, aux
  // mêmes personnes. Mieux vaut ne rien envoyer que relancer tous les jours.
  const { data: profils, error: erreurProfils } = await db
    .from('profiles')
    .select('user_id, username, relance_propositions_le')
    .in('user_id', [...parPersonne.keys()]);
  if (erreurProfils) {
    console.error('relancerPropositions: mémoire des rappels illisible, aucun envoi', erreurProfils);
    return { destinataires: parPersonne.size, emailsSent: 0, ignores: parPersonne.size };
  }

  const dejaRelance = new Map<string, string | null>();
  for (const p of profils || []) {
    dejaRelance.set(String(p.user_id), (p.relance_propositions_le as string | null) || null);
  }

  let emailsSent = 0;
  let ignores = 0;

  for (const [userId, nombre] of parPersonne) {
    const derniere = dejaRelance.get(userId);
    if (derniere && maintenant - new Date(derniere).getTime() < JOURS_ENTRE_RAPPELS * JOUR) {
      ignores += 1;
      continue;
    }

    // Un échec sur une personne ne doit pas empêcher les suivantes.
    try {
      const to = await getUserEmail(userId);
      if (!to) { ignores += 1; continue; }
      const profil = await getProfile(userId);
      await sendMail(pendingProposalsMail(to, nombre, profil?.username));
      await pousser(userId, {
        titre: nombre > 1 ? `${nombre} personnes attendent ta réponse` : 'Quelqu’un attend ta réponse',
        corps: 'Ouvre tes propositions de collab',
        lien: '/?screen=match',
      });
      emailsSent += 1;

      // Marqué seulement après l'envoi : si l'email échoue, la personne sera
      // reprise demain au lieu d'être oubliée pour deux semaines.
      //
      // En revanche, si on n'arrive pas à écrire la date, on arrête tout de
      // suite : sans cette trace, les personnes suivantes seraient relancées
      // de nouveau demain, et le lendemain encore.
      const { error: erreurMarque } = await db
        .from('profiles')
        .update({ relance_propositions_le: new Date(maintenant).toISOString() })
        .eq('user_id', userId);
      if (erreurMarque) {
        console.error('relancerPropositions: date du rappel non enregistrée, on arrête', erreurMarque);
        return { destinataires: parPersonne.size, emailsSent, ignores: parPersonne.size - emailsSent };
      }
    } catch (e) {
      console.error('relancerPropositions', userId, e);
      ignores += 1;
    }
  }

  return { destinataires: parPersonne.size, emailsSent, ignores };
}
