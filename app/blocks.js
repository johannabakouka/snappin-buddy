'use client';
import { supabase } from './supabase';

// Blocages entre utilisateurs.
//
// Le blocage coupe dans les deux sens : la personne bloquée disparaît de mon
// app, et je disparais de la sienne. Sinon elle continuerait de voir un profil
// qu'elle ne peut plus contacter, ce qui est pire que tout.
//
// La vraie protection est en base : les règles d'écriture de Supabase refusent
// un message ou une proposition venant d'une personne bloquée, même si
// quelqu'un contournait l'application.

// Les écrans déjà affichés doivent se mettre à jour tout de suite après un
// blocage, sans attendre qu'on change d'onglet.
const CHANGED = 'sb:blocks-changed';

export function notifyBlocksChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

/** S'abonne aux changements de blocage. Renvoie la fonction pour se désabonner. */
export function onBlocksChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED, handler);
  return () => window.removeEventListener(CHANGED, handler);
}

/** Uniquement les personnes que J'AI bloquées (identifiants). */
export async function loadIBlockedIds(myUserId) {
  if (!myUserId) return new Set();
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', myUserId);
    if (error) throw error;
    return new Set((data || []).map(r => r.blocked_id));
  } catch (e) {
    console.error('loadIBlockedIds', e);
    return new Set();
  }
}

/** Est-ce que cette personne m'a bloqué ? Sert à couper l'envoi côté app. */
export async function hasBlockedMe(myUserId, otherId) {
  if (!myUserId || !otherId) return false;
  try {
    const { data } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', otherId)
      .eq('blocked_id', myUserId)
      .limit(1);
    return Boolean(data?.length);
  } catch (e) {
    console.error('hasBlockedMe', e);
    return false;
  }
}

/** Renvoie l'ensemble des identifiants avec qui tout contact est coupé. */
export async function loadBlockedIds(myUserId) {
  if (!myUserId) return new Set();
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${myUserId},blocked_id.eq.${myUserId}`);
    if (error) throw error;
    const ids = new Set();
    for (const row of data || []) {
      ids.add(row.blocker_id === myUserId ? row.blocked_id : row.blocker_id);
    }
    return ids;
  } catch (e) {
    console.error('loadBlockedIds', e);
    return new Set();
  }
}

/** Les personnes que J'AI bloquées, avec leur profil, pour pouvoir les débloquer. */
export async function loadMyBlocks(myUserId) {
  if (!myUserId) return [];
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', myUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const ids = (data || []).map(r => r.blocked_id);
    if (!ids.length) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, handle, avatar_url')
      .in('user_id', ids);

    return ids.map(id => profiles?.find(p => p.user_id === id) || { user_id: id });
  } catch (e) {
    console.error('loadMyBlocks', e);
    return [];
  }
}

export async function blockUser(myUserId, targetId) {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: myUserId, blocked_id: targetId });
  // Déjà bloqué : ce n'est pas une erreur pour la personne.
  if (error && !/duplicate|unique/i.test(error.message || '')) throw error;
  notifyBlocksChanged();
}

export async function unblockUser(myUserId, targetId) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', myUserId)
    .eq('blocked_id', targetId);
  if (error) throw error;
  notifyBlocksChanged();
}
