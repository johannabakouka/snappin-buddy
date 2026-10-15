export const dynamic = 'force-dynamic';

import {
  ADMIN_EMAIL, applicationAcceptedMail, getProfile, getUserEmail, newApplicationMail, newProposalMail,
  newMessageMail, offerTitleFromMessage, reportMail, requireUser, sendMail, supabaseAdmin,
} from '../../lib/server';
import { pousser } from '../../lib/push';

// L'app envoie seulement le type d'email et l'identifiant concerné.
// Le serveur vérifie l'utilisateur, retrouve le bon destinataire et construit le contenu :
// personne ne peut choisir l'adresse ni le texte, donc pas de spam possible via notre domaine.
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { type } = body as { type?: string };

    // Nouveau message dans le chat : un seul email tant que la personne n'a pas lu.
    // Si elle a déjà des messages non lus de notre part, on n'envoie rien de plus.
    if (type === 'new_message') {
      const toUserId = String(body.toUserId || '');
      if (!toUserId || toUserId === user.id) return Response.json({ error: 'destinataire invalide' }, { status: 400 });

      const db = supabaseAdmin();

      // Conversation mise en sourdine par le destinataire : pas de mail.
      // C'est sa préférence, et lui seul peut la lire ou la changer.
      const { data: pref } = await db.from('conversation_prefs')
        .select('muted')
        .eq('user_id', toUserId).eq('buddy_id', user.id)
        .maybeSingle();
      if (pref?.muted) return Response.json({ ok: true, skipped: 'sourdine' });

      // La notification part AVANT la limitation qui suit, et à chaque message.
      //
      // Le mail, lui, n'est envoyé qu'une fois tant que la personne n'a pas lu :
      // dix mails pour dix messages, c'est du harcèlement. Une notification,
      // non : c'est ce qu'on attend de toutes les messageries, et elle
      // disparaît d'elle-même quand on ouvre l'app.
      const expediteur = await getProfile(user.id);
      await pousser(toUserId, {
        titre: expediteur?.username || 'Un créatif',
        // Tutoiement, comme partout ailleurs dans l'app. Cette ligne était la
        // seule des quatre notifications à vouvoyer.
        corps: 't\'a envoyé un message',
        lien: '/?screen=messages',
      });

      const { count } = await db.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id).eq('receiver_id', toUserId).eq('read', false);
      if ((count || 0) !== 1) return Response.json({ ok: true, skipped: 'deja prevenu' });

      const to = await getUserEmail(toUserId);
      if (!to) return Response.json({ error: 'destinataire sans email' }, { status: 404 });
      const me = await getProfile(user.id);
      const dest = await getProfile(toUserId);
      await sendMail(newMessageMail(to, me?.username || 'Un créatif', dest?.username));
      return Response.json({ ok: true });
    }

    if (type === 'new_application' || type === 'new_proposal' || type === 'application_accepted') {
      const collabId = body.collabId;
      if (!collabId) return Response.json({ error: 'collabId manquant' }, { status: 400 });

      const { data: collab } = await supabaseAdmin()
        .from('collabs')
        .select('id, sender_id, receiver_id, message, status, offer_id')
        .eq('id', collabId)
        .maybeSingle();
      if (!collab) return Response.json({ error: 'candidature introuvable' }, { status: 404 });

      // Le titre vient du projet lui-même. Il était lu dans le texte du message,
      // ce qui obligeait l'app à y recopier le titre et empêchait les gens
      // d'écrire leur propre mot. Le repli sur l'ancienne lecture couvre les
      // candidatures envoyées avant ce changement.
      let offerTitle = '';
      if (collab.offer_id) {
        const { data: offer } = await supabaseAdmin()
          .from('offers').select('title').eq('id', collab.offer_id).maybeSingle();
        offerTitle = offer?.title || '';
      }
      if (!offerTitle) offerTitle = offerTitleFromMessage(collab.message) || 'ton projet';

      if (type === 'new_application' || type === 'new_proposal') {
        // Seul l'expéditeur peut déclencher cet email, et il part au destinataire de la proposition.
        if (collab.sender_id !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
        const to = await getUserEmail(collab.receiver_id);
        if (!to) return Response.json({ error: 'destinataire sans email' }, { status: 404 });
        const me = await getProfile(user.id);
        const dest = await getProfile(collab.receiver_id);
        await sendMail(type === 'new_application'
          ? newApplicationMail(to, me?.username || 'Un créatif', me?.role || '', offerTitle, dest?.username)
          : newProposalMail(to, me?.username || 'Un créatif', me?.role || '', collab.message || '', dest?.username));
        await pousser(collab.receiver_id, {
          titre: `${me?.username || 'Un créatif'} se propose`,
          corps: offerTitle,
          lien: '/?screen=match',
        });
      } else {
        // Seul le porteur du projet peut accepter, et l'email part au candidat.
        if (collab.receiver_id !== user.id || collab.status !== 'accepted') {
          return Response.json({ error: 'forbidden' }, { status: 403 });
        }
        const to = await getUserEmail(collab.sender_id);
        if (!to) return Response.json({ error: 'destinataire sans email' }, { status: 404 });
        const me = await getProfile(user.id);
        const dest = await getProfile(collab.sender_id);
        await sendMail(applicationAcceptedMail(to, me?.username || 'Un créatif', offerTitle, dest?.username));
        await pousser(collab.sender_id, {
          titre: 'Candidature acceptée 🎉',
          corps: `${me?.username || 'Un créatif'} t'a retenu·e pour « ${offerTitle} »`,
          lien: '/?screen=match',
        });
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
