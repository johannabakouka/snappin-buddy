'use client';
import { supabase } from './supabase';

// « Préviens-moi quand quelqu'un arrive. »
//
// Quelqu'un qui s'inscrit dans une ville encore vide voyait un message
// honnête (« tu es parmi les premiers ») et repartait. Rien ne lui permettait
// de laisser une trace, donc l'app perdait exactement les gens qui ouvrent une
// ville : ceux qui arrivent avant tout le monde.
//
// Une ligne par personne, qui garde le nombre de créatifs autour d'elle au
// moment où elle s'inscrit. Le serveur recompte une fois par jour et n'écrit
// que si ce nombre a augmenté : un seul mail, au moment où il a du sens, et la
// ligne est marquée comme prévenue pour ne jamais recommencer.
//
// On réutilise la position du profil, celle qui est déjà floutée. Aucune
// adresse, aucun nom de ville en plus : rien de nouveau n'est collecté.

/** La veille de la personne, ou null si elle n'en a pas. */
export async function loadMyWatch(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('city_watch')
    .select('id, lat, lng, baseline, notified_at, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('loadMyWatch', error);
    return null;
  }
  return data || null;
}

/**
 * Pose ou met à jour la veille. `baseline` est le nombre de créatifs déjà
 * présents autour : sans lui, le serveur enverrait un mail dès le premier
 * passage pour annoncer des gens qui étaient là avant l'inscription.
 */
export async function watchNearby(userId, lat, lng, baseline = 0) {
  if (!userId || typeof lat !== 'number' || typeof lng !== 'number') return false;
  const { error } = await supabase.from('city_watch').upsert(
    {
      user_id: userId,
      lat,
      lng,
      baseline,
      // Une nouvelle inscription repart de zéro, même si la personne avait
      // déjà été prévenue une fois et veut l'être à nouveau.
      notified_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('watchNearby', error);
    return false;
  }
  return true;
}

/** Retire la veille. Ne pas en avoir n'est pas une erreur. */
export async function unwatchNearby(userId) {
  if (!userId) return false;
  const { error } = await supabase.from('city_watch').delete().eq('user_id', userId);
  if (error) {
    console.error('unwatchNearby', error);
    return false;
  }
  return true;
}
