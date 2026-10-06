export const dynamic = 'force-dynamic';

import { ADMIN_EMAIL, getProfile, reportMail, requireUser, sendMail, supabaseAdmin } from '../../lib/server';

// Un signalement, enregistré puis envoyé par email.
//
// Avant, il n'était qu'un email vers une boîte Gmail : rien n'était gardé, donc
// rien ne pouvait être suivi, et un signalement perdu dans la boîte était perdu
// tout court. Les CGU promettent qu'il est examiné, et Apple demande de pouvoir
// écarter un contenu sous 24 heures : les deux supposent qu'il en reste une
// trace.
//
// L'app n'envoie que le type, l'identifiant et le motif. Le serveur retrouve le
// propriétaire du contenu lui-même : personne ne peut faire accuser quelqu'un
// d'autre en bricolant la requête.

type Target = 'profile' | 'message' | 'offer';

const REASONS = new Set([
  'inapproprie', 'faux_profil', 'spam', 'harcelement', 'illegal', 'autre',
]);

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const targetType = String(body.targetType || '') as Target;
    const targetId = String(body.targetId || '').trim();
    const reason = String(body.reason || '').trim();
    const details = String(body.details || '').slice(0, 2000).trim();

    if (!['profile', 'message', 'offer'].includes(targetType) || !targetId) {
      return Response.json({ error: 'signalement incomplet' }, { status: 400 });
    }
    if (!REASONS.has(reason)) return Response.json({ error: 'motif inconnu' }, { status: 400 });

    const db = supabaseAdmin();

    // Le propriétaire du contenu est retrouvé côté serveur, jamais fourni par
    // l'app : sinon n'importe qui pourrait faire porter un signalement sur le
    // compte de quelqu'un d'autre.
    let targetUserId: string | null = null;
    if (targetType === 'profile') {
      targetUserId = targetId;
    } else if (targetType === 'message') {
      const { data } = await db.from('messages').select('sender_id').eq('id', targetId).maybeSingle();
      targetUserId = data?.sender_id ?? null;
    } else {
      const { data } = await db.from('offers').select('user_id').eq('id', targetId).maybeSingle();
      targetUserId = data?.user_id ?? null;
    }
    if (!targetUserId) return Response.json({ error: 'contenu introuvable' }, { status: 404 });
    if (targetUserId === user.id) return Response.json({ error: 'auto-signalement' }, { status: 400 });

    const { error } = await db.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId,
      reason,
      details: details || null,
    });
    if (error) {
      console.error('report insert', error);
      return Response.json({ error: 'enregistrement impossible' }, { status: 500 });
    }

    // L'email est un confort, pas la trace. S'il échoue, le signalement est
    // quand même enregistré et apparaîtra dans l'écran de modération.
    try {
      const reported = await getProfile(targetUserId);
      const label = targetType === 'profile' ? 'profil' : targetType === 'message' ? 'message' : 'projet';
      const text = `${label} ${targetId}\nMotif : ${reason}${details ? `\n\n${details}` : ''}`;
      await sendMail(reportMail(ADMIN_EMAIL, user.id, { id: targetUserId, ...reported }, text));
    } catch (e) {
      console.error('report mail', e);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('report', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
