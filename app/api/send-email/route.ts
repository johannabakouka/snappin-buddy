export const dynamic = 'force-dynamic';

import {
  ADMIN_EMAIL, applicationAcceptedMail, getProfile, getUserEmail, newApplicationMail,
  offerTitleFromMessage, reportMail, requireUser, sendMail, supabaseAdmin,
} from '../../lib/server';

// L'app envoie seulement le type d'email et l'identifiant concerné.
// Le serveur vérifie l'utilisateur, retrouve le bon destinataire et construit le contenu :
// personne ne peut choisir l'adresse ni le texte, donc pas de spam possible via notre domaine.
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { type } = body as { type?: string };

    if (type === 'new_application' || type === 'application_accepted') {
      const collabId = body.collabId;
      if (!collabId) return Response.json({ error: 'collabId manquant' }, { status: 400 });

      const { data: collab } = await supabaseAdmin()
        .from('collabs')
        .select('id, sender_id, receiver_id, message, status')
        .eq('id', collabId)
        .maybeSingle();
      if (!collab) return Response.json({ error: 'candidature introuvable' }, { status: 404 });

      const offerTitle = offerTitleFromMessage(collab.message) || 'ton projet';

      if (type === 'new_application') {
        // Seul le candidat peut déclencher cet email, et il part au porteur du projet.
        if (collab.sender_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
        const to = await getUserEmail(collab.receiver_id);
        if (!to) return Response.json({ error: 'destinataire sans email' }, { status: 404 });
        const me = await getProfile(user.id);
        await sendMail(newApplicationMail(to, me?.username || 'Un créatif', me?.role || '', offerTitle));
      } else {
        // Seul le porteur du projet peut accepter, et l'email part au candidat.
        if (collab.receiver_id !== user.id || collab.status !== 'accepted') {
          return Response.json({ error: 'forbidden' }, { status: 403 });
        }
        const to = await getUserEmail(collab.sender_id);
        if (!to) return Response.json({ error: 'destinataire sans email' }, { status: 404 });
        const me = await getProfile(user.id);
        await sendMail(applicationAcceptedMail(to, me?.username || 'Un créatif', offerTitle));
      }
      return Response.json({ ok: true });
    }

    if (type === 'report') {
      const reportedUserId = String(body.reportedUserId || '');
      const reason = String(body.reason || '').slice(0, 2000).trim();
      if (!reportedUserId || !reason) return Response.json({ error: 'signalement incomplet' }, { status: 400 });
      const reported = await getProfile(reportedUserId);
      await sendMail(reportMail(ADMIN_EMAIL, user.id, { id: reportedUserId, ...reported }, reason));
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'type inconnu' }, { status: 400 });
  } catch (err) {
    console.error('send-email', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
