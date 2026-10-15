import http2 from 'node:http2';
import crypto from 'node:crypto';
import { supabaseAdmin } from './server';

// L'envoi des notifications sur les iPhone.
//
// Pourquoi ce fichier existe plutôt qu'une bibliothèque : Apple exige du
// HTTP/2 pour parler à son service de notifications, et `fetch` ne sait pas
// faire de HTTP/2. On passe donc par le module `node:http2`, présent dans Node
// sans rien installer. L'authentification se fait avec un jeton signé par la
// clé APNs du compte développeur, pas avec un mot de passe.
//
// RÈGLE ABSOLUE DE CE FICHIER : rien de ce qui se passe ici ne doit jamais
// faire échouer l'action qui l'a déclenché. Un message envoyé reste envoyé même
// si la notification ne part pas. Toutes les fonctions avalent leurs erreurs et
// se contentent de les écrire dans les journaux.

const HOTE = 'https://api.push.apple.com';
const SUJET = process.env.APNS_BUNDLE_ID || 'com.snappinbuddy.app';

/** Le jeton d'authentification, et l'instant où il a été fabriqué. */
let jetonCache: { valeur: string; ne: number } | null = null;

/**
 * Le jeton signé que réclame Apple, valable une heure.
 *
 * Apple refuse qu'on en fabrique un nouveau à chaque envoi : au-delà d'un
 * certain rythme, le service répond « TooManyProviderTokenUpdates » et coupe.
 * On garde donc le même pendant cinquante minutes.
 */
function jeton(): string | null {
  const cle = process.env.APNS_PRIVATE_KEY;
  const kid = process.env.APNS_KEY_ID;
  const iss = process.env.APNS_TEAM_ID;
  if (!cle || !kid || !iss) return null;

  const maintenant = Math.floor(Date.now() / 1000);
  if (jetonCache && maintenant - jetonCache.ne < 50 * 60) return jetonCache.valeur;

  // La clé est recopiée depuis un fichier .p8 dans une variable d'environnement.
  // Les retours à la ligne y deviennent souvent la suite « \n » en deux
  // caractères : sans cette remise en forme, la signature échoue sans rien dire.
  const pem = cle.includes('\\n') ? cle.replace(/\\n/g, '\n') : cle;

  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const entete = b64({ alg: 'ES256', kid });
  const charge = b64({ iss, iat: maintenant });

  try {
    const signature = crypto
      .createSign('SHA256')
      .update(`${entete}.${charge}`)
      .sign({ key: pem, dsaEncoding: 'ieee-p1363' })
      .toString('base64url');
    const valeur = `${entete}.${charge}.${signature}`;
    jetonCache = { valeur, ne: maintenant };
    return valeur;
  } catch (e) {
    console.error('push: clé APNs illisible', e);
    return null;
  }
}

type Envoi = {
  titre: string;
  corps: string;
  /** Chemin ouvert quand on touche la notification, par exemple /?buddy=lea */
  lien?: string;
  /** Nombre affiché sur la pastille rouge de l'icône. */
  badge?: number;
};

/** Envoie à UN appareil. Renvoie le code HTTP d'Apple, ou 0 si rien n'est parti. */
function envoyerA(appareil: string, auth: string, envoi: Envoi): Promise<number> {
  return new Promise(resolve => {
    let session: http2.ClientHttp2Session;
    try {
      session = http2.connect(HOTE);
    } catch {
      resolve(0);
      return;
    }
    const fini = (code: number) => {
      try { session.close(); } catch { /* déjà fermée */ }
      resolve(code);
    };
    session.on('error', () => fini(0));

    const corps = JSON.stringify({
      aps: {
        alert: { title: envoi.titre, body: envoi.corps },
        sound: 'default',
        ...(typeof envoi.badge === 'number' ? { badge: envoi.badge } : {}),
      },
      lien: envoi.lien || '/',
    });

    const requete = session.request({
      ':method': 'POST',
      ':path': `/3/device/${appareil}`,
      'authorization': `bearer ${auth}`,
      'apns-topic': SUJET,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    requete.setTimeout(8000, () => fini(0));
    let code = 0;
    requete.on('response', entetes => { code = Number(entetes[':status']) || 0; });
    requete.on('error', () => fini(0));
    requete.on('end', () => fini(code));
    requete.on('data', () => { /* le corps ne nous sert pas */ });
    requete.end(corps);
  });
}

/**
 * Le nombre à afficher sur la pastille rouge de l'icône.
 *
 * C'est tout ce qui attend la personne : ses messages non lus, et les
 * candidatures reçues sur ses projets qu'elle n'a pas encore traitées. Le même
 * calcul que les pastilles de la barre du bas, pour que les deux disent la
 * même chose.
 */
async function pastille(userId: string): Promise<number | undefined> {
  try {
    const db = supabaseAdmin();
    const commun = { count: 'exact' as const, head: true };
    const [{ count: messages }, { count: candidatures }] = await Promise.all([
      db.from('messages').select('*', commun).eq('receiver_id', userId).eq('read', false),
      db.from('collabs').select('*', commun).eq('receiver_id', userId).eq('status', 'pending'),
    ]);
    return (messages || 0) + (candidatures || 0);
  } catch {
    return undefined;
  }
}

/**
 * Prévient quelqu'un sur tous ses appareils.
 *
 * Les jetons refusés sont supprimés au passage : Apple répond 410 quand l'app
 * a été désinstallée, et garder ces lignes ferait grossir la table pour rien
 * tout en ralentissant chaque envoi.
 */
export async function pousser(userId: string, envoi: Omit<Envoi, 'badge'>): Promise<void> {
  try {
    const auth = jeton();
    if (!auth) return;   // clés absentes : l'app marche, sans notifications

    const db = supabaseAdmin();
    const { data } = await db
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);
    const appareils = (data || []).map(r => r.token as string).filter(Boolean);
    if (appareils.length === 0) return;

    const badge = await pastille(userId);
    const resultats = await Promise.all(
      appareils.map(a => envoyerA(a, auth, { ...envoi, badge })),
    );

    const perimes = appareils.filter((_, i) => resultats[i] === 410);
    if (perimes.length > 0) {
      await db.from('device_tokens').delete().in('token', perimes);
    }
  } catch (e) {
    console.error('pousser', e);
  }
}
