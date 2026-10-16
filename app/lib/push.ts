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
    // Tout ce qui sort d'ici part dans les journaux de Vercel.
    //
    // Sans ça, un envoi refusé est indiscernable d'un envoi réussi : Apple
    // répond par un code et une raison en un mot, et ces deux informations
    // étaient jetées. « BadDeviceToken », « TopicDisallowed » et
    // « ExpiredProviderToken » demandent trois corrections complètement
    // différentes, et on ne pouvait pas savoir laquelle.
    const fini = (code: number, raison?: string) => {
      try { session.close(); } catch { /* déjà fermée */ }
      if (code !== 200) {
        console.error('push: refus APNs', { code, raison: raison || '(aucune)', appareil: appareil.slice(0, 8) + '…' });
      } else {
        console.log('push: accepté par Apple', appareil.slice(0, 8) + '…');
      }
      resolve(code);
    };
    session.on('error', e => fini(0, `connexion: ${(e as Error).message}`));

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
    requete.setTimeout(8000, () => fini(0, 'délai dépassé'));
    let code = 0;
    let reponse = '';
    requete.on('response', entetes => { code = Number(entetes[':status']) || 0; });
    requete.on('error', e => fini(0, `requête: ${(e as Error).message}`));
    // Le corps sert, en fait : quand Apple refuse, il y met la raison, et
    // c'est la seule façon de savoir quoi corriger.
    requete.on('data', (m: Buffer) => { reponse += m.toString(); });
    requete.on('end', () => {
      let raison: string | undefined;
      try { raison = JSON.parse(reponse || '{}').reason; } catch { raison = reponse.slice(0, 120); }
      fini(code, raison);
    });
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
    // Les conversations mises en sourdine ne comptent pas.
    //
    // La barre du bas les exclut déjà de sa pastille : c'est tout l'intérêt de
    // la sourdine. Sans la même exclusion ici, l'icône de l'app annonçait 3 là
    // où l'onglet Messages affichait 1, et c'est le genre d'écart qui fait
    // cesser de croire la pastille.
    const { data: sourdines } = await db
      .from('conversation_prefs')
      .select('buddy_id')
      .eq('user_id', userId)
      .eq('muted', true);
    const tus = (sourdines || []).map(r => r.buddy_id as string).filter(Boolean);

    let nonLus = db.from('messages').select('*', commun)
      .eq('receiver_id', userId)
      // `read.is.null` en plus de `read.eq.false`, exactement comme la barre du
      // bas : les messages antérieurs à la colonne ont NULL et ne sont donc ni
      // lus ni non lus. Sans ça, l'icône et l'onglet ne comptent pas la même
      // chose.
      .or('read.is.null,read.eq.false');
    if (tus.length) nonLus = nonLus.not('sender_id', 'in', `(${tus.join(',')})`);

    const [{ count: messages }, { count: candidatures }] = await Promise.all([
      nonLus,
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
    if (!auth) {
      // L'app continue de marcher sans notifications, mais en silence c'est
      // indiscernable d'un envoi qui part et n'arrive pas. On dit lesquelles
      // des trois variables manquent, sans jamais écrire la clé elle-même.
      console.error('push: pas de jeton, variables Vercel', {
        APNS_PRIVATE_KEY: process.env.APNS_PRIVATE_KEY ? 'présente' : 'ABSENTE',
        APNS_KEY_ID: process.env.APNS_KEY_ID ? 'présente' : 'ABSENTE',
        APNS_TEAM_ID: process.env.APNS_TEAM_ID ? 'présente' : 'ABSENTE',
      });
      return;
    }

    const db = supabaseAdmin();
    const { data } = await db
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);
    const appareils = (data || []).map(r => r.token as string).filter(Boolean);
    if (appareils.length === 0) {
      // Cas très courant et trompeur : l'envoi « marche », mais il n'y a
      // personne à prévenir. Souvent parce que la notification part vers le
      // mauvais compte, pas parce que la mécanique est cassée.
      console.error('push: aucun appareil enregistré pour', userId);
      return;
    }

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
