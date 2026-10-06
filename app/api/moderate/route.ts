export const dynamic = 'force-dynamic';

import { ADMIN_EMAIL, getProfile, getUserEmail, requireUser, sanctionMail, sendMail, supabaseAdmin } from '../../lib/server';

// La modération, réservée à l'adresse administratrice.
//
// Avant, il n'existait aucun moyen de retirer un contenu depuis l'app : il
// fallait ouvrir le tableau de bord Supabase et modifier les lignes à la main,
// sans qu'il en reste la moindre trace. Les CGU promettent pourtant qu'un
// contenu manifestement illégal est retiré sans délai, et Apple refuse une app
// où l'on ne peut pas écarter un contenu ou un compte sous 24 heures.
//
// Le contrôle d'accès est ici, sur le serveur, et nulle part ailleurs : cacher
// le bouton dans l'app ne protège rien, puisque n'importe qui peut appeler
// l'adresse directement.

type Action =
  | 'list'
  | 'hide_profile' | 'show_profile'
  | 'remove_avatar' | 'clear_portfolio'
  | 'delete_message'
  | 'close_offer' | 'delete_offer'
  | 'suspend' | 'unsuspend'
  | 'resolve' | 'dismiss';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const email = (user.email || '').toLowerCase();
    if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '') as Action;
    const db = supabaseAdmin();

    if (action === 'list') {
      const { data: reports, error } = await db
        .from('reports')
        .select('id, reporter_id, target_type, target_id, target_user_id, reason, details, status, action, handled_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = reports || [];

      // Le contexte, pour décider sans quitter l'écran : qui est visé, et quel
      // est le contenu exact. Un signalement sans son contenu oblige à aller le
      // chercher ailleurs, et c'est le genre de friction qui fait qu'on ne
      // traite pas.
      const userIds = [...new Set(rows.flatMap(r => [r.target_user_id, r.reporter_id]).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await db.from('profiles')
          .select('user_id, username, handle, avatar_url, portfolio_urls, hidden, suspended_at')
          .in('user_id', userIds)
        : { data: [] };

      const messageIds = rows.filter(r => r.target_type === 'message').map(r => r.target_id);
      const { data: messages } = messageIds.length
        ? await db.from('messages').select('id, content, image_url, deleted').in('id', messageIds)
        : { data: [] };

      const offerIds = rows.filter(r => r.target_type === 'offer').map(r => r.target_id);
      const { data: offers } = offerIds.length
        ? await db.from('offers').select('id, title, description, status').in('id', offerIds)
        : { data: [] };

      return Response.json({
        ok: true,
        reports: rows,
        profiles: profiles || [],
        messages: messages || [],
        offers: offers || [],
      });
    }

    const targetUserId = String(body.targetUserId || '');
    const targetId = String(body.targetId || '');
    const reportId = String(body.reportId || '');

    switch (action) {
      case 'hide_profile':
      case 'show_profile': {
        if (!targetUserId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const { error } = await db.from('profiles')
          .update({ hidden: action === 'hide_profile' })
          .eq('user_id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'remove_avatar': {
        if (!targetUserId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const { error } = await db.from('profiles').update({ avatar_url: null }).eq('user_id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'clear_portfolio': {
        if (!targetUserId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const { error } = await db.from('profiles').update({ portfolio_urls: [] }).eq('user_id', targetUserId);
        if (error) throw error;
        break;
      }
      case 'delete_message': {
        if (!targetId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        // Même traitement qu'une suppression par l'auteur : la ligne reste, le
        // contenu part. La conversation garde sa trace sans garder l'image.
        const { error } = await db.from('messages')
          .update({ deleted: true, content: '', image_url: null })
          .eq('id', targetId);
        if (error) throw error;
        break;
      }
      case 'close_offer': {
        if (!targetId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const { error } = await db.from('offers').update({ status: 'closed' }).eq('id', targetId);
        if (error) throw error;
        break;
      }
      case 'delete_offer': {
        if (!targetId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const { error } = await db.from('offers').delete().eq('id', targetId);
        if (error) throw error;
        break;
      }
      case 'suspend':
      case 'unsuspend': {
        if (!targetUserId) return Response.json({ error: 'cible manquante' }, { status: 400 });
        const suspend = action === 'suspend';
        const { error } = await db.from('profiles').update({
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_reason: suspend ? String(body.reason || '').slice(0, 500) || null : null,
          // Un compte suspendu sort aussi de la carte et d'Explorer : laisser le
          // profil visible pendant une suspension n'aurait aucun sens.
          ...(suspend ? { hidden: true } : {}),
        }).eq('user_id', targetUserId);
        if (error) throw error;

        // La personne est prévenue, avec le motif et le moyen de contester.
        // Un échec d'envoi ne doit pas annuler la sanction : elle est déjà
        // appliquée, et le mail n'en est que la notification.
        try {
          const to = await getUserEmail(targetUserId);
          if (to) {
            const dest = await getProfile(targetUserId);
            await sendMail(sanctionMail(to, suspend ? 'suspend' : 'unsuspend', String(body.reason || ''), dest?.username));
          }
        } catch (e) {
          console.error('sanctionMail', e);
        }
        break;
      }
      case 'resolve':
      case 'dismiss': {
        if (!reportId) return Response.json({ error: 'signalement manquant' }, { status: 400 });
        const { error } = await db.from('reports').update({
          status: action === 'resolve' ? 'handled' : 'dismissed',
          action: String(body.note || '').slice(0, 500) || null,
          handled_at: new Date().toISOString(),
        }).eq('id', reportId);
        if (error) throw error;
        break;
      }
      default:
        return Response.json({ error: 'action inconnue' }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('moderate', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
