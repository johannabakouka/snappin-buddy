export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// « Marquer le projet comme réalisé », pour les collabs faites à distance.
//
// Le QR couvre les rencontres physiques. Ici, chacun confirme de son côté,
// et le projet n'est validé que quand les deux l'ont fait — même règle que
// le scan : on ne peut pas faire monter son compteur tout seul.

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

    const mineNow = true;
    const theirs = iAmSender ? collab.done_by_receiver : collab.done_by_sender;
    const both = mineNow && Boolean(theirs);

    // Les deux ont confirmé et ce n'était pas déjà validé : ça compte.
    let counted = false;
    if (both && !collab.validated_at) {
      const { data: updated } = await db
        .from('collabs')
        .update({ validated_at: new Date().toISOString() })
        .eq('id', collab.id)
        .is('validated_at', null)
        .select('id');

      // Le compteur ne monte que si c'est bien nous qui avons posé la date :
      // deux confirmations simultanées ne comptent pas deux fois.
      if (updated?.length) {
        counted = true;
        for (const id of [collab.sender_id, collab.receiver_id]) {
          const { data: p } = await db
            .from('profiles')
            .select('validated_projects')
            .eq('user_id', id)
            .maybeSingle();
          if (p) {
            await db
              .from('profiles')
              .update({ validated_projects: (p.validated_projects || 0) + 1 })
              .eq('user_id', id);
          }
        }
      }
    }

    return Response.json({
      ok: true,
      both,
      counted,
      waitingForBuddy: !both,
    });
  } catch (err) {
    console.error('mark-done', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
