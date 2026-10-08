export const dynamic = 'force-dynamic';

import { requireUser, supabaseAdmin, sendMail, uploadBlockedMail, getProfile, ADMIN_EMAIL } from '../../lib/server';

// Journal des photos refusées par le contrôle automatique.
//
// Le contrôle a lieu sur l'appareil, donc rien n'arrive jamais dans le stockage
// et il n'y a rien à retirer. Mais sans trace, personne ne saurait que
// quelqu'un essaie : d'où cette ligne, qui apparaît dans l'écran de modération.
//
// On n'enregistre PAS la photo, ni même une empreinte : seulement le moment, le
// contexte et les scores du modèle. Le but est de repérer l'insistance, pas de
// constituer un dossier.
//
// Au-delà de trois refus en 24 heures, un email part vers la modération : sans
// cela il faudrait penser à ouvrir l'écran pour s'en apercevoir.

const CONTEXTES = ['avatar', 'portfolio', 'chat'];
const SEUIL_ALERTE = 3;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const contexte = CONTEXTES.includes(body?.contexte) ? body.contexte : 'autre';
    // Les scores viennent de l'app : on ne garde que des nombres, et seulement
    // les cinq clés attendues.
    const scores: Record<string, number> = {};
    for (const cle of ['Neutral', 'Drawing', 'Sexy', 'Porn', 'Hentai']) {
      const v = body?.scores?.[cle];
      if (typeof v === 'number' && Number.isFinite(v)) scores[cle] = Math.round(v * 1000) / 1000;
    }

    const db = supabaseAdmin();
    const { error } = await db.from('upload_blocks').insert({
      user_id: user.id,
      context: contexte,
      scores: Object.keys(scores).length ? scores : null,
    });
    if (error) throw error;

    // Combien de refus pour cette personne depuis 24 heures ?
    const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await db
      .from('upload_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', depuis);

    if ((count || 0) === SEUIL_ALERTE) {
      // Une seule fois, pile au franchissement du seuil : sinon chaque nouvel
      // essai enverrait un mail de plus.
      try {
        const profil = await getProfile(user.id);
        await sendMail(uploadBlockedMail(ADMIN_EMAIL, {
          id: user.id,
          username: profil?.username,
          handle: profil?.handle,
          count: count || SEUIL_ALERTE,
          contexte,
        }));
      } catch (e) {
        console.error('upload-blocked [mail]', e);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('upload-blocked', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
