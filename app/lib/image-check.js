import { tx } from '../tx';

// Contrôle d'une photo AVANT son envoi : est-ce bien une image, et son contenu
// est-il acceptable ?
//
// Pourquoi ici et pas sur le serveur : les photos partent du téléphone
// directement vers le stockage, sans passer par notre serveur. Les faire
// transiter par le serveur pour les analyser voudrait dire les télécharger
// depuis le stockage, donc consommer encore de la bande passante — exactement
// ce qui a fait dépasser le quota. L'analyse se fait donc sur l'appareil :
// la photo ne quitte jamais le téléphone pour être examinée, aucune société
// extérieure ne la voit, et il n'y a ni clé d'API ni abonnement à payer.
//
// Le modèle (MobileNetV2 de nsfwjs) est servi depuis /nsfw/ et n'est téléchargé
// que la première fois que quelqu'un choisit une photo : les personnes qui
// n'envoient rien ne paient rien.

// Les seuils. Ils sont ici, nommés, pour pouvoir être ajustés sans relire tout
// le fichier. Le modèle répond avec cinq scores dont la somme fait 1 :
// Neutral, Drawing, Sexy, Porn, Hentai.
//
// On bloque le pornographique, pas le suggestif : une photo de mode, de plage
// ou de danse monte facilement en « Sexy » et serait refusée à tort, alors que
// les CGU n'interdisent que les contenus sexuels ou pornographiques.
const SEUIL_EXPLICITE = 0.6; // Porn + Hentai à eux seuls
const SEUIL_CUMULE = 0.93; // les trois catégories ensemble, quand le score se disperse

// Au-delà, on laisse passer : un modèle qui refuse de se charger ne doit pas
// empêcher les gens d'avoir une photo de profil.
const DELAI_MAX_MS = 20000;

// Les premiers octets des formats d'image réels. L'extension et le type
// annoncé par le navigateur se changent en deux clics ; ces octets, non.
const SIGNATURES = [
  { nom: 'jpeg', octets: [0xff, 0xd8, 0xff] },
  { nom: 'png', octets: [0x89, 0x50, 0x4e, 0x47] },
  { nom: 'gif', octets: [0x47, 0x49, 0x46, 0x38] },
  { nom: 'bmp', octets: [0x42, 0x4d] },
];

/**
 * Est-ce vraiment une image ? Renvoie le format trouvé, ou une chaîne vide.
 *
 * WebP et HEIC (le format des iPhone) ne tiennent pas dans la liste ci-dessus :
 * leurs quatre premiers octets sont une taille de fichier, et le format vient
 * après. On les reconnaît donc à leur marqueur de conteneur.
 */
export async function imageFormat(file) {
  try {
    const tete = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    for (const s of SIGNATURES) {
      if (s.octets.every((o, i) => tete[i] === o)) return s.nom;
    }
    const texte = String.fromCharCode(...tete.slice(4, 12));
    if (texte.startsWith('ftyp')) return 'heic'; // iPhone
    const riff = String.fromCharCode(...tete.slice(0, 4));
    if (riff === 'RIFF' && String.fromCharCode(...tete.slice(8, 12)) === 'WEBP') return 'webp';
    return '';
  } catch (e) {
    console.error('imageFormat', e);
    return 'inconnu'; // au mieux : on laisse la suite décider
  }
}

// Le modèle n'est chargé qu'une fois par session, et la promesse est partagée :
// deux photos envoyées à la suite ne le téléchargent pas deux fois.
let modelePromesse = null;

function chargeModele() {
  if (!modelePromesse) {
    modelePromesse = (async () => {
      const tf = await import('@tensorflow/tfjs');
      const { load } = await import('nsfwjs/core');
      await tf.ready();
      return load('/nsfw/', { size: 224 });
    })().catch(e => {
      // Une erreur ne doit pas rester collée : le prochain envoi réessaiera.
      modelePromesse = null;
      throw e;
    });
  }
  return modelePromesse;
}

/**
 * La décision, à partir des cinq scores. À part, pour être vérifiable : une
 * comparaison inversée ici refuserait toutes les photos, ou aucune.
 */
export function estBloquee(scores) {
  const porn = scores?.Porn || 0;
  const hentai = scores?.Hentai || 0;
  const sexy = scores?.Sexy || 0;
  return porn + hentai >= SEUIL_EXPLICITE || porn + hentai + sexy >= SEUIL_CUMULE;
}

/**
 * Commence à charger le modèle sans attendre la photo.
 *
 * À appeler au moment où la galerie s'ouvre : choisir une photo prend quelques
 * secondes, et c'est exactement le temps qu'il faut au modèle pour arriver.
 * Sans ça, le premier envoi de la session attend cinq secondes après le choix,
 * ce qui ressemble à une panne.
 *
 * Ne lève jamais : si le chargement échoue, l'envoi réessaiera et, en dernier
 * recours, passera sans analyse.
 */
export function prechauffeControle() {
  chargeModele().catch(() => {});
}

/** Charge un Blob dans un élément image, que le modèle sait lire. */
function enImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, liberer: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image illisible'));
    };
    img.src = url;
  });
}

function avecDelai(promesse, ms) {
  return new Promise((resolve, reject) => {
    const minuteur = setTimeout(() => reject(new Error('délai dépassé')), ms);
    promesse.then(
      v => { clearTimeout(minuteur); resolve(v); },
      e => { clearTimeout(minuteur); reject(e); }
    );
  });
}

/**
 * Analyse le contenu d'une image.
 *
 * Renvoie { bloquee, scores } — et bloquee vaut false si l'analyse n'a pas pu
 * se faire. C'est volontaire : mieux vaut une photo douteuse qui passe et sera
 * signalée qu'une photo de profil impossible à mettre.
 */
export async function analyseContenu(blob) {
  try {
    const modele = await avecDelai(chargeModele(), DELAI_MAX_MS);
    const { img, liberer } = await enImage(blob);
    let predictions;
    try {
      predictions = await avecDelai(modele.classify(img), DELAI_MAX_MS);
    } finally {
      liberer();
    }

    const scores = {};
    for (const p of predictions) scores[p.className] = p.probability;
    return { bloquee: estBloquee(scores), scores };
  } catch (e) {
    console.error('analyseContenu', e);
    return { bloquee: false, scores: null };
  }
}

/**
 * L'erreur levée quand une photo est refusée. Un type à part permet aux écrans
 * de distinguer « contenu refusé » d'une panne d'envoi, et d'afficher le bon
 * message.
 */
export class ImageRefusee extends Error {
  constructor(motif, scores) {
    super(motif === 'format' ? 'fichier non image' : 'contenu refusé');
    this.name = 'ImageRefusee';
    this.motif = motif; // 'format' ou 'contenu'
    this.scores = scores || null;
  }
}

/**
 * Le message à afficher quand un envoi échoue.
 *
 * Toutes les photos passent par le même contrôle, donc tous les écrans doivent
 * dire la même chose : d'où ce seul endroit. Le message de refus donne aussi
 * l'adresse pour contester, parce qu'une décision prise par une machine doit
 * pouvoir être revue par quelqu'un.
 */
export function messageEnvoi(err, secours) {
  if (err && err.name === 'ImageRefusee') {
    if (err.motif === 'format') {
      return tx(
        'That file is not a photo. Choose an image.',
        'Ce fichier n’est pas une photo. Choisis une image.',
      );
    }
    return tx(
      'This photo cannot be published: it was detected as sexual content, which the terms do not allow. If that is a mistake, write to contact@snappinbuddy.com.',
      'Cette photo ne peut pas être publiée : elle a été détectée comme un contenu sexuel, que les CGU n’autorisent pas. Si c’est une erreur, écris à contact@snappinbuddy.com.',
    );
  }
  return secours;
}
