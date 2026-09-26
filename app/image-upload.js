'use client';
import { supabase } from './supabase';

// Envoi d'une photo dans une conversation.
// La photo est redimensionnée dans le téléphone AVANT l'envoi : une photo d'iPhone
// fait 3 à 5 Mo, ce qui serait long à envoyer en 4G et coûteux en stockage.
// Après redimensionnement, on tombe autour de 200 Ko sans différence visible à l'écran.

export const CHAT_BUCKET = 'chat';
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
