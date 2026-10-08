'use client';
import { supabase } from './supabase';

// Les créatifs qu'on suit : une liste privée, pour garder sous la main
// quelqu'un qu'on a croisé et avec qui on veut shooter un jour.
//
// La logique vivait entièrement dans l'écran Messages, donc le bouton Suivre
// n'existait que là : dans l'onglet Buddies et dans l'onglet Suivis lui-même.
// Autrement dit, on ne pouvait suivre que des gens déjà suivis ou déjà
// acceptés, et l'écran vide conseillait pourtant d'aller suivre des créatifs
// « depuis Explorer », où aucun bouton ne l'a jamais permis.
//
// Tout est ici pour que n'importe quel écran puisse l'utiliser.

const CHANGED = 'sb:follows-changed';

export function notifyFollowsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

/** S'abonne aux changements de suivi. Renvoie la fonction pour se désabonner. */
export function onFollowsChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED, handler);
  return () => window.removeEventListener(CHANGED, handler);
}

/** Les identifiants des personnes que je suis. */
export async function loadFollowingIds(myUserId) {
  if (!myUserId) return new Set();
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', myUserId);
    if (error) throw error;
    return new Set((data || []).map(r => r.following_id));
  } catch (e) {
    console.error('loadFollowingIds', e);
    return new Set();
  }
}

export async function followUser(myUserId, targetId) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: myUserId, following_id: targetId });
  // Déjà suivi : du point de vue de la personne, c'est le résultat voulu.
  if (error && !/duplicate|unique/i.test(error.message || '')) throw error;
  notifyFollowsChanged();
}

export async function unfollowUser(myUserId, targetId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myUserId)
    .eq('following_id', targetId);
  if (error) throw error;
  notifyFollowsChanged();
}
