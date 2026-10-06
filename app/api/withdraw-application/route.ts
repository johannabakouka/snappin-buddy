export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Retirer sa candidature.
//
// Rien ne permettait de le faire : quelqu'un qui avait candidaté par erreur, ou
// qui n'était plus disponible, restait candidat pour toujours, et la personne
// en face perdait du temps avec un candidat fantôme.
//
// Seulement tant que la candidature est en attente. Une fois acceptée, ce n'est
// plus une candidature mais une conversation ouverte : on s'y parle, on ne
// disparaît pas en silence.

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
      .select('id, sender_id, status')
      .eq('id', collabId)
      .maybeSingle();

    if (!collab) return Response.json({ error: 'candidature introuvable' }, { status: 404 });
    if (collab.sender_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
    if (collab.status !== 'pending') {
      return Response.json({ error: 'deja traitee' }, { status: 409 });
    }

    const { error } = await db.from('collabs').delete().eq('id', collabId);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('withdraw-application', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
