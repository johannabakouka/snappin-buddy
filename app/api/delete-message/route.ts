export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Supprime un de ses propres messages : le texte disparaît des deux côtés,
// la ligne reste pour garder l'ordre de la conversation.
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const messageId = String(body.messageId || '');
    if (!messageId) return Response.json({ error: 'messageId manquant' }, { status: 400 });

    const db = supabaseAdmin();
    const { data: msg } = await db.from('messages').select('id, sender_id').eq('id', messageId).maybeSingle();
    if (!msg) return Response.json({ error: 'message introuvable' }, { status: 404 });
    if (msg.sender_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });

    const { error } = await db.from('messages').update({ deleted: true, content: '' }).eq('id', messageId);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('delete-message', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
