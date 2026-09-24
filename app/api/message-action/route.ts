export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// Actions sur un message : modifier, épingler, réagir.
// Le serveur vérifie que la personne a le droit de le faire.
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const messageId = String(body.messageId || '');
    if (!messageId) return Response.json({ error: 'messageId manquant' }, { status: 400 });

    const db = supabaseAdmin();
    const { data: msg } = await db.from('messages')
      .select('id, sender_id, receiver_id, deleted, reactions')
      .eq('id', messageId).maybeSingle();
    if (!msg) return Response.json({ error: 'message introuvable' }, { status: 404 });

    const inConversation = msg.sender_id === user.id || msg.receiver_id === user.id;
    if (!inConversation) return Response.json({ error: 'forbidden' }, { status: 403 });

    // Modifier : seulement ses propres messages, et pas un message supprimé
    if (action === 'edit') {
      if (msg.sender_id !== user.id || msg.deleted) return Response.json({ error: 'forbidden' }, { status: 403 });
      const content = String(body.content || '').trim().slice(0, 2000);
      if (!content) return Response.json({ error: 'texte vide' }, { status: 400 });
      const { error } = await db.from('messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
      return Response.json({ ok: true });
    }

    // Épingler : un seul message épinglé par conversation
    if (action === 'pin' || action === 'unpin') {
      const other = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (action === 'pin') {
        await db.from('messages').update({ pinned: false })
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${user.id})`)
          .eq('pinned', true);
      }
      const { error } = await db.from('messages').update({ pinned: action === 'pin' }).eq('id', messageId);
      if (error) throw error;
      return Response.json({ ok: true });
    }

    // Réagir : on ajoute ou on retire son emoji
    if (action === 'react') {
      const emoji = [...String(body.emoji || '')].slice(0, 2).join('');
      if (!emoji) return Response.json({ error: 'emoji manquant' }, { status: 400 });
      const reactions: Record<string, string[]> = (msg.reactions as Record<string, string[]>) || {};
      const next: Record<string, string[]> = {};
      // une seule réaction par personne : on retire l'ancienne
      for (const [key, users] of Object.entries(reactions)) {
        const kept = (users || []).filter(id => id !== user.id);
        if (kept.length) next[key] = kept;
      }
      const already = (reactions[emoji] || []).includes(user.id);
      if (!already) next[emoji] = [...(next[emoji] || []), user.id];
      const { error } = await db.from('messages').update({ reactions: next }).eq('id', messageId);
      if (error) throw error;
      return Response.json({ ok: true, reactions: next });
    }

    return Response.json({ error: 'action inconnue' }, { status: 400 });
  } catch (err) {
    console.error('message-action', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
