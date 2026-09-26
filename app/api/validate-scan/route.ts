export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Validation d'une rencontre par QR.
//
// Le QR affiché par une personne contient un lien vers l'app avec l'identifiant
// de sa session. L'autre le scanne avec l'appareil photo de son téléphone —
// celui d'origine, pas un scanner intégré, qui ne marche pas sur iPhone — et
// atterrit ici.
//
// Les vérifications sont toutes faites côté serveur : on ne peut pas valider
// son propre QR, ni le QR d'une collab dont on ne fait pas partie, ni un QR
// expiré, et une même rencontre ne compte qu'une fois.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || '');
    if (!sessionId) return Response.json({ error: 'scan invalide' }, { status: 400 });

    const db = supabaseAdmin();

    const { data: session } = await db
      .from('qr_sessions')
      .select('id, user_id, collab_id, expires_at, status, scanned_by')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return Response.json({ error: 'introuvable', reason: 'unknown' }, { status: 404 });
    }
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'expiré', reason: 'expired' }, { status: 410 });
    }
    // On ne valide pas son propre QR : il en faut deux.
    if (session.user_id === user.id) {
      return Response.json({ error: 'c’est ton propre QR', reason: 'self' }, { status: 400 });
    }

    const { data: collab } = await db
      .from('collabs')
      .select('id, sender_id, receiver_id, message, validated_at')
      .eq('id', session.collab_id)
      .maybeSingle();

    if (!collab) {
      return Response.json({ error: 'collab introuvable', reason: 'unknown' }, { status: 404 });
    }
    // Seul l'autre participant de cette collab peut valider.
    if (collab.sender_id !== user.id && collab.receiver_id !== user.id) {
      return Response.json({ error: 'forbidden', reason: 'not_yours' }, { status: 403 });
    }

    await db
      .from('qr_sessions')
      .update({ scanned_by: user.id, status: 'validated' })
      .eq('id', session.id);

    const buddyId = collab.sender_id === user.id ? collab.receiver_id : collab.sender_id;

    // Une rencontre ne compte qu'une fois, même si le QR est scanné deux fois.
    const alreadyCounted = Boolean(collab.validated_at);
    if (!alreadyCounted) {
      await db
        .from('collabs')
        .update({ validated_at: new Date().toISOString() })
        .eq('id', collab.id)
        .is('validated_at', null);

      // Le compteur monte pour les deux : une rencontre se fait à deux.
      for (const id of [user.id, buddyId]) {
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

    const { data: buddy } = await db
      .from('profiles')
      .select('username, handle, avatar_url')
      .eq('user_id', buddyId)
      .maybeSingle();

    return Response.json({
      ok: true,
      alreadyCounted,
      buddy: buddy || null,
      project: collab.message || '',
    });
  } catch (err) {
    console.error('validate-scan', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
