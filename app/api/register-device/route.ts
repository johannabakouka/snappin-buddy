export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin } from '../../lib/server';

// L'app annonce l'identifiant d'appareil qu'iOS vient de lui donner.
//
// Pourquoi passer par le serveur plutôt que d'écrire directement dans la base
// depuis le téléphone : un même téléphone peut changer de compte. La ligne
// existe alors déjà au nom de quelqu'un d'autre, et aucune règle de sécurité
// raisonnable ne laisse une personne modifier la ligne d'une autre. Ici, le
// serveur vérifie d'abord qui parle, puis écrit avec les droits
// d'administration : le changement de propriétaire est net, et la table reste
// totalement fermée aux téléphones.

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    // Un jeton APNs est une suite de 64 caractères hexadécimaux. On refuse tout
    // le reste plutôt que de laisser s'accumuler des lignes qui ne serviront
    // jamais et ralentiront chaque envoi.
    if (!/^[0-9a-fA-F]{64}$/.test(token)) {
      return Response.json({ error: 'jeton invalide' }, { status: 400 });
    }

    const { error } = await supabaseAdmin()
      .from('device_tokens')
      .upsert(
        { token, user_id: user.id, platform: 'ios' },
        { onConflict: 'token' },
      );
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (e) {
    console.error('register-device', e);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
