export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Marque comme lus les messages reçus d'une personne, quand on ouvre la conversation.
// Passe par le serveur pour ne pas dépendre des règles d'accès de la table messages.
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const buddyId = String(body.buddyId || '');
    if (!buddyId) return Response.json({ error: 'buddyId manquant' }, { status: 400 });

    const { error } = await supabaseAdmin()
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', buddyId)
      // Même définition de « non lu » que la barre du bas : les messages
      // d'avant l'existence de la colonne ont `read` à NULL. Avec le seul
      // `.eq('read', false)` qui était écrit ici, ils ne passaient jamais à
      // lu, alors que la pastille, elle, les comptait. Le petit chiffre rouge
      // restait donc affiché pour toujours, sans qu'aucune lecture ne
      // l'efface.
      .or('read.is.null,read.eq.false');
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('mark-read', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
