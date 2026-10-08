export const dynamic = 'force-dynamic';

import {
  applicationAcceptedMail, getProfile, getUserEmail,
  requireUser, sendMail, supabaseAdmin,
} from '../../lib/server';
import { closePendingAndNotify, freeRoles, syncOffer, type OfferRow } from '../../lib/slots-server';

// Accepter ou écarter une candidature.
//
// C'était fait depuis l'app, et il n'en découlait rien : le projet restait
// ouvert, les autres candidats restaient « en attente » pour toujours, et
// personne n'était prévenu de rien. Un candidat sans réponse ne revient pas.
//
// Ici, accepter prend une place. Quand la dernière est prise, le projet est
// pourvu, les candidatures restantes sont closes d'un bloc, et chacune reçoit
// un seul message : le projet a trouvé son équipe. Pas un refus personnel.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const collabId = String(body.collabId || '').trim();
    const decision = String(body.decision || '');
    if (!collabId || !['accepted', 'declined'].includes(decision)) {
      return Response.json({ error: 'demande incomplete' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: collab } = await db
      .from('collabs')
      .select('id, sender_id, receiver_id, status, offer_id, role_applied')
      .eq('id', collabId)
      .maybeSingle();
    if (!collab) return Response.json({ error: 'candidature introuvable' }, { status: 404 });
    // Seule la personne à qui la candidature est adressée peut y répondre.
    if (collab.receiver_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
    if (collab.status !== 'pending') return Response.json({ error: 'deja traitee' }, { status: 409 });

    let offer: OfferRow | null = null;
    if (collab.offer_id) {
      const { data } = await db
        .from('offers')
        .select('id, user_id, title, role_needed, slots, slots_filled, status')
        .eq('id', collab.offer_id)
        .maybeSingle();
      offer = (data as OfferRow) || null;
    }

    // La place visée est-elle encore libre ? Deux acceptations lancées coup sur
    // coup pourraient sinon prendre la même place.
    if (decision === 'accepted' && offer) {
      const libres = freeRoles(offer, offer.slots_filled || {});
      const wanted = String(collab.role_applied || '').trim();
      if (libres.length === 0) {
        return Response.json({ error: 'complet' }, { status: 409 });
      }
      if (wanted && !libres.includes(wanted)) {
        return Response.json({ error: 'place prise' }, { status: 409 });
      }
    }

    const { error } = await db.from('collabs').update({ status: decision }).eq('id', collabId);
    if (error) throw error;

    let complete = false;
    let closedCount = 0;

    if (offer) {
      const state = await syncOffer(offer);
      complete = state.complete;

      // Toutes les candidatures encore en attente sont closes d'un coup, et
      // chacune est prévenue. C'est le seul mail de ce genre que l'app envoie :
      // écarter quelqu'un individuellement n'en déclenche aucun.
      if (complete) closedCount = await closePendingAndNotify(offer);
    }

    // Le mail à la personne acceptée, comme avant.
    if (decision === 'accepted') {
      try {
        const to = await getUserEmail(collab.sender_id);
        if (to) {
          const me = await getProfile(user.id);
          const dest = await getProfile(collab.sender_id);
          await sendMail(applicationAcceptedMail(to, me?.username || 'Un créatif', offer?.title || 'ton projet', dest?.username));
        }
      } catch (e) {
        console.error('applicationAcceptedMail', e);
      }
    }

    return Response.json({ ok: true, complete, closed: closedCount });
  } catch (err) {
    console.error('respond-application', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
