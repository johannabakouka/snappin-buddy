export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// « Marquer le projet comme réalisé ».
//
// Ça note que la collab est finie, des deux côtés. Ça ne fait PAS monter le
// compteur « Projets validés » : seul le scan d'un QR, donc une vraie
// rencontre, compte. Deux personnes peuvent se mettre d'accord pour cliquer
// un bouton, elles ne peuvent pas se scanner sans se voir — c'est toute la
// différence entre un chiffre déclaré et un chiffre prouvé.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const collabId = body.collabId;
    if (!collabId) return Response.json({ error: 'collabId manquant' }, { status: 400 });

    const db = supabaseAdmin();

    const { data: collab } = await db
      .from('collabs')
      .select('id, sender_id, receiver_id, status, validated_at, done_by_sender, done_by_receiver')
      .eq('id', collabId)
      .maybeSingle();

    if (!collab) return Response.json({ error: 'collab introuvable' }, { status: 404 });
    if (collab.sender_id !== user.id && collab.receiver_id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    if (collab.status !== 'accepted') {
      return Response.json({ error: 'collab non acceptée', reason: 'not_accepted' }, { status: 400 });
    }

    const iAmSender = collab.sender_id === user.id;
    const patch = iAmSender ? { done_by_sender: true } : { done_by_receiver: true };
    await db.from('collabs').update(patch).eq('id', collab.id);

    const theirs = iAmSender ? collab.done_by_receiver : collab.done_by_sender;
    const both = Boolean(theirs);

    // On ne touche pas à validated_at : cette date appartient au scan du QR.
    // Si on la posait ici, un scan ultérieur ne compterait plus.
    return Response.json({
      ok: true,
      both,
      counted: false,
      alreadyScanned: Boolean(collab.validated_at),
      waitingForBuddy: !both,
    });
  } catch (err) {
    console.error('mark-done', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
