'use client';
import { supabase } from './supabase';
import { imageFormat, analyseContenu, ImageRefusee } from './lib/image-check';

// Envoi d'une photo dans une conversation.
// La photo est redimensionnée dans le téléphone AVANT l'envoi : une photo d'iPhone
// fait 3 à 5 Mo, ce qui serait long à envoyer en 4G et coûteux en stockage.
// Après redimensionnement, on tombe autour de 200 Ko sans différence visible à l'écran.

export const CHAT_BUCKET = 'chat';
export const AVATAR_BUCKET = 'avatars';
export const PORTFOLIO_BUCKET = 'portfolio';
const MAX_SIDE = 1280;
const QUALITY = 0.82;

// La vignette, pour tout ce qui s'affiche petit : les pins de la carte (44 px),
// les listes d'Explorer (48 px), les miniatures de portfolio (56 px).
//
// Jusqu'ici ces endroits téléchargeaient la photo entière, 1280 pixels et
// 200 à 400 Ko, pour la dessiner dans un rond de 44 pixels. La carte le faisait
// pour tous les profils, et recommençait à chaque retour sur l'onglet. C'est ce
// qui a fait dépasser le quota de bande passante du stockage.
//
// Une vignette de 256 pixels pèse une vingtaine de kilo-octets : dix à quinze
// fois moins, sans aucune différence visible.
const THUMB_SIDE = 256;
const THUMB_QUALITY = 0.72;
const THUMB_SUFFIX = '_thumb';

/**
 * L'adresse de la vignette d'une photo, déduite de son nom.
 *
 * On aurait pu l'enregistrer dans une colonne à côté de chaque photo, mais il
 * aurait fallu une colonne pour l'avatar, une pour chaque entrée de portfolio,
 * une pour chaque message. Le nom suffit : photo.jpg et photo_thumb.jpg.
 *
 * Renvoie une chaîne vide si l'adresse n'a pas la forme attendue : l'appelant
 * retombe alors sur la photo d'origine.
 */
export function thumbUrl(url) {
  const raw = String(url || '');
  if (!raw || !raw.endsWith('.jpg')) return '';
  if (raw.endsWith(THUMB_SUFFIX + '.jpg')) return raw;
  return raw.slice(0, -'.jpg'.length) + THUMB_SUFFIX + '.jpg';
}

/** Le chemin de la vignette, à partir du chemin de la photo. */
function thumbPath(path) {
  return path.endsWith('.jpg') ? path.slice(0, -4) + THUMB_SUFFIX + '.jpg' : path + THUMB_SUFFIX;
}

/**
 * Dépose la vignette à côté de la photo. Au mieux : une vignette manquante fait
 * simplement retomber l'affichage sur la photo d'origine, alors qu'une erreur
 * ici empêcherait d'envoyer la photo tout court.
 */
async function uploadThumb(file, bucket, path) {
  try {
    const thumb = await resizeImage(file, THUMB_SIDE, THUMB_QUALITY);
    await supabase.storage
      .from(bucket)
      .upload(thumbPath(path), thumb, { contentType: 'image/jpeg', upsert: true });
  } catch (e) {
    console.error('uploadThumb', e);
  }
}

/**
 * Prévient le serveur qu'une photo a été refusée.
 *
 * Rien n'est envoyé de la photo elle-même, seulement les scores : le but est
 * que la modération repère quelqu'un qui insiste, pas de garder une trace de ce
 * qu'il a essayé d'envoyer. Au mieux, et sans attendre : un journal qui échoue
 * ne doit pas ralentir l'écran.
 */
function journaliseRefus(contexte, scores) {
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/upload-blocked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ contexte, scores }),
      });
    } catch (e) {
      console.error('journaliseRefus', e);
    }
  })();
}

/**
 * Contrôle d'une photo avant son envoi : vrai format, puis contenu.
 *
 * Le contenu est analysé sur la version redimensionnée, pas sur l'original :
 * le modèle ramène de toute façon l'image à 224 pixels, et décoder deux fois
 * une photo d'iPhone de 5 Mo n'apporterait rien.
 */
async function controleAvantEnvoi(file, blob, contexte) {
  if (!(await imageFormat(file))) throw new ImageRefusee('format');

  const { bloquee, scores } = await analyseContenu(blob);
  if (bloquee) {
    journaliseRefus(contexte, scores);
    throw new ImageRefusee('contenu', scores);
  }
}

/** Redimensionne et recompresse une image en JPEG. Renvoie un Blob. */
export function resizeImage(file, maxSide = MAX_SIDE, quality = QUALITY) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('conversion impossible'))),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image illisible'));
    };

    img.src = url;
  });
}

/**
 * Redimensionne puis dépose la photo dans le stockage.
 * Le chemin commence par l'identifiant de l'expéditeur : c'est ce qui permet
 * d'effacer toutes ses photos quand il supprime son compte.
 */
export async function uploadChatImage(file, userId) {
  const blob = await resizeImage(file);
  await controleAvantEnvoi(file, blob, 'chat');

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  await uploadThumb(file, CHAT_BUCKET, path);

  const { data } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Dépose une photo de profil ou de portfolio, et renvoie son adresse publique.
 *
 * Deux différences avec l'ancien code, et chacune corrigeait une panne muette :
 *
 * · la photo est convertie en JPEG. Un iPhone fournit du HEIC, un format que la
 *   plupart des navigateurs n'affichent pas et que le stockage pouvait refuser.
 *   L'envoi échouait, l'erreur n'était pas lue, et il ne se passait rien.
 *
 * · le nom du fichier est unique à chaque envoi. L'ancien nom fixe
 *   (« avatar.jpg ») demandait un droit de remplacement que les règles de
 *   sécurité du stockage n'accordent pas : la première photo passait, toutes
 *   les suivantes étaient refusées. D'où « modifier la photo ne marche pas ».
 */
export async function uploadProfileImage(file, userId, bucket) {
  if (!file) throw new Error('aucun fichier');
  if (!userId) throw new Error('session expirée');

  const blob = await resizeImage(file);
  await controleAvantEnvoi(file, blob, bucket === AVATAR_BUCKET ? 'avatar' : 'portfolio');

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  await uploadThumb(file, bucket, path);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Efface une photo dont on n'a que l'adresse publique. Au mieux : si la
 * suppression est refusée, on n'en fait pas une erreur — l'ancienne photo qui
 * traîne dans le stockage ne doit pas empêcher la nouvelle de s'afficher.
 */
export async function removeByPublicUrl(url, bucket) {
  try {
    const marker = `/${bucket}/`;
    const at = String(url || '').indexOf(marker);
    if (at < 0) return;
    const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
    if (path) await supabase.storage.from(bucket).remove([path, thumbPath(path)]);
  } catch (e) {
    console.error('removeByPublicUrl', e);
  }
}

/**
 * Fabrique les vignettes manquantes des photos d'une personne.
 *
 * Les photos envoyées avant les vignettes n'en ont pas : elles continuent d'être
 * servies en pleine taille à tous ceux qui les regardent. Plutôt qu'une
 * migration, chacun répare les siennes en ouvrant l'app, une seule fois, comme
 * on l'a fait pour les villes.
 *
 * Tout est au mieux : une vignette qui échoue laisse simplement la photo
 * d'origine en place.
 */
export async function ensureThumbs(urls) {
  const liste = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  let faites = 0;

  for (const url of liste) {
    const cible = thumbUrl(url);
    if (!cible || cible === url) continue;
    try {
      // La vignette existe-t-elle déjà ? Une requête de tête ne télécharge rien.
      const deja = await fetch(cible, { method: 'HEAD' });
      if (deja.ok) continue;

      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const petite = await resizeImage(blob, THUMB_SIDE, THUMB_QUALITY);

      // Le nom du seau et le chemin se relisent dans l'adresse publique.
      const m = String(url).match(/\/object\/public\/([^/]+)\/(.+)$/);
      if (!m) continue;
      const seau = m[1];
      const chemin = decodeURIComponent(m[2].split('?')[0]);

      await supabase.storage
        .from(seau)
        .upload(thumbPath(chemin), petite, { contentType: 'image/jpeg', upsert: true });
      faites++;
    } catch (e) {
      console.error('ensureThumbs', e);
    }
  }
  return faites;
}
