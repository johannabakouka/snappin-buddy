import { getProfile, getUserEmail, projectFilledMail, sendMail, supabaseAdmin } from './server';
import { slotsOf } from '../slots';

// Ce qu'il advient d'un projet quand une place change de main.
//
// Tout passe par le serveur, pour trois raisons : les règles d'accès empêchent
// un candidat de compter les places prises sur le projet d'un autre ; refuser
// les candidatures restantes doit se faire d'un bloc, pas depuis le téléphone
// de quelqu'un ; et c'est le seul endroit d'où l'on peut écrire aux gens.

export type OfferRow = {
  id: string;
  user_id: string;
  title: string | null;
  role_needed: string | null;
  slots: Record<string, number> | null;
  slots_filled: Record<string, number> | null;
  status: string | null;
};

/** Recompte les places prises à partir des candidatures acceptées. */
export async function recountFilled(offer: OfferRow): Promise<Record<string, number>> {
  const db = supabaseAdmin();
  const { data } = await db
    .from('collabs')
    .select('role_applied')
    .eq('offer_id', offer.id)
    .eq('status', 'accepted');

  const slots = slotsOf(offer) as Record<string, number>;
  const roles = Object.keys(slots);
  const filled: Record<string, number> = {};
  for (const r of roles) filled[r] = 0;

  const unknown: number[] = [];
  for (const row of data || []) {
    const role = String(row.role_applied || '').trim();
    if (role && role in filled) filled[role] += 1;
    else unknown.push(1);
  }
  // Une candidature acceptée avant les places ne dit pas quel rôle elle visait.
  // On la pose sur le premier rôle encore libre plutôt que de la perdre.
  for (const _ of unknown) {
    const free = roles.find(r => filled[r] < slots[r]);
    if (free) filled[free] += 1;
  }
  return filled;
}

export function isComplete(offer: OfferRow, filled: Record<string, number>): boolean {
  const slots = slotsOf(offer) as Record<string, number>;
  const roles = Object.keys(slots);
  if (roles.length === 0) return false;
  return roles.every(r => (filled[r] || 0) >= slots[r]);
}

/** Les rôles sur lesquels il reste de la place. */
export function freeRoles(offer: OfferRow, filled: Record<string, number>): string[] {
  const slots = slotsOf(offer) as Record<string, number>;
  return Object.keys(slots).filter(r => (filled[r] || 0) < slots[r]);
}

/**
 * Remet le projet à jour après une acceptation ou un désistement : places
 * prises, et ouverture ou fermeture selon qu'il reste de la place.
 *
 * Renvoie l'état obtenu, pour que l'appelant sache s'il doit prévenir les
 * candidats restants.
 */
export async function syncOffer(offer: OfferRow) {
  const db = supabaseAdmin();
  const filled = await recountFilled(offer);
  const complete = isComplete(offer, filled);

  // Était-il fermé parce qu'il était complet, ou parce que le porteur l'a fermé
  // à la main ? La différence compte : un désistement doit rouvrir le premier,
  // et surtout pas le second, qui a peut-être été annulé.
  const wasComplete = isComplete(offer, offer.slots_filled || ({} as Record<string, number>));
  const closedByCompletion = offer.status === 'closed' && wasComplete;

  const patch: Record<string, unknown> = { slots_filled: filled };
  if (complete && offer.status === 'open') patch.status = 'closed';
  const reopened = !complete && closedByCompletion;
  if (reopened) patch.status = 'open';

  await db.from('offers').update(patch).eq('id', offer.id);
  return { filled, complete, reopened };
}

/**
 * Ferme les candidatures encore en attente sur un projet et prévient chacune.
 *
 * Un seul message, et il ne parle pas de la personne : le projet a trouvé son
 * équipe. Avant, ces candidatures restaient en attente pour toujours, qu'un
 * projet se remplisse, soit fermé à la main ou expire tout seul.
 */
export async function closePendingAndNotify(offer: OfferRow): Promise<number> {
  const db = supabaseAdmin();
  const { data } = await db
    .from('collabs')
    .select('id, sender_id')
    .eq('offer_id', offer.id)
    .eq('status', 'pending');

  const waiting = data || [];
  if (waiting.length === 0) return 0;

  await db.from('collabs').update({ status: 'declined' }).in('id', waiting.map(r => r.id));

  for (const r of waiting) {
    try {
      const to = await getUserEmail(r.sender_id);
      if (!to) continue;
      const dest = await getProfile(r.sender_id);
      await sendMail(projectFilledMail(to, offer.title || '', dest?.username));
    } catch (e) {
      console.error('closePendingAndNotify', e);
    }
  }
  return waiting.length;
}
