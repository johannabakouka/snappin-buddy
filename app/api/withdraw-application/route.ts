export const dynamic = 'force-dynamic';

import { getProfile, getUserEmail, requireUser, sendMail, slotFreedMail, supabaseAdmin } from '../../lib/server';
import { syncOffer, type OfferRow } from '../../lib/slots-server';
import { ROLES_FR } from '../../constants';

// Retirer sa candidature, ou se désister après avoir été accepté.
//
// Rien ne permettait de le faire : quelqu'un qui avait candidaté par erreur, ou
// qui n'était plus disponible, restait candidat pour toujours, et la personne en
// face perdait du temps avec un candidat fantôme.
//
// Se désister après acceptation est un cas différent : la place redevient libre,
// le projet revient dans le fil, et le porteur est prévenu. On ne le fait pas
// disparaître en silence.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const collabId = String(body.collabId || '').trim();
    if (!collabId) return Response.json({ error: 'candidature manquante' }, { status: 400 });

    const db = supabaseAdmin();
    const { data: collab } = await db
      .from('collabs')
      .select('id, sender_id, receiver_id, status, offer_id, role_applied')
      .eq('id', collabId)
      .maybeSingle();

    if (!collab) return Response.json({ error: 'candidature introuvable' }, { status: 404 });
    if (collab.sender_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
    if (!['pending', 'accepted'].includes(collab.status)) {
      return Response.json({ error: 'deja traitee' }, { status: 409 });
    }

    const wasAccepted = collab.status === 'accepted';

    const { error } = await db.from('collabs').delete().eq('id', collabId);
    if (error) throw error;

    let reopened = false;

    // Une place occupée vient de se libérer : on remet le projet à jour, et on
    // prévient le porteur. Une candidature en attente ne changeait rien, elle.
    if (wasAccepted && collab.offer_id) {
      const { data } = await db
        .from('offers')
        .select('id, user_id, title, role_needed, slots, slots_filled, status')
        .eq('id', collab.offer_id)
        .maybeSingle();
      const offer = (data as OfferRow) || null;

      if (offer) {
        const state = await syncOffer(offer);
        reopened = state.reopened;
        try {
          const to = await getUserEmail(offer.user_id);
          if (to) {
            const dest = await getProfile(offer.user_id);
            const roleId = String(collab.role_applied || '').trim();
            const label = ROLES_FR.find(r => r.id === roleId)?.label || roleId;
            await sendMail(slotFreedMail(to, offer.title || '', label, dest?.username));
          }
        } catch (e) {
          console.error('slotFreedMail', e);
        }
      }
    }

    return Response.json({ ok: true, reopened });
  } catch (err) {
    console.error('withdraw-application', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
