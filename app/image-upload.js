'use client';
import { supabase } from './supabase';

// Envoi d'une photo dans une conversation.
// La photo est redimensionnée dans le téléphone AVANT l'envoi : une photo d'iPhone
// fait 3 à 5 Mo, ce qui serait long à envoyer en 4G et coûteux en stockage.
// Après redimensionnement, on tombe autour de 200 Ko sans différence visible à l'écran.

export const CHAT_BUCKET = 'chat';
export const AVATAR_BUCKET = 'avatars';
export const PORTFOLIO_BUCKET = 'portfolio';
const MAX_SIDE = 1280;
const QUALITY = 0.82;

/** Redimensionne et recompresse une image en JPEG. Renvoie un Blob. */
export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
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
        QUALITY
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
  if (!file.type.startsWith('image/')) throw new Error('fichier non image');

  const blob = await resizeImage(file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

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
  if (file.type && !file.type.startsWith('image/')) throw new Error('fichier non image');

  const blob = await resizeImage(file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

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
    if (path) await supabase.storage.from(bucket).remove([path]);
  } catch (e) {
    console.error('removeByPublicUrl', e);
  }
}
