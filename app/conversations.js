'use client';
import { supabase } from './supabase';

// Préférences de conversation : épinglée, sourdine, retirée de ma liste,
// marquée comme non lue.
//
// Tout est personnel. Retirer une conversation ne l'efface pas chez l'autre :
// on ne peut pas supprimer la correspondance de quelqu'un d'autre, ni
// techniquement ici, ni légalement. Elle disparaît de MA liste, et elle
// revient si la personne m'écrit à nouveau — comme sur Instagram.

/** Toutes mes préférences, rangées par identifiant de buddy. */
export async function loadPrefs(userId) {
  if (!userId) return {};
  const { data, error } = await supabase
    .from('conversation_prefs')
    .select('buddy_id, pinned_at, muted, hidden_at, unread_forced')
    .eq('user_id', userId);
  if (error) {
    console.error('conversation_prefs', error);
    return {};
  }
  const byBuddy = {};
  for (const row of data || []) byBuddy[row.buddy_id] = row;
  return byBuddy;
}

/** Les conversations en sourdine : ni mail, ni pastille. */
export async function loadMutedIds(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from('conversation_prefs')
    .select('buddy_id')
    .eq('user_id', userId)
    .eq('muted', true);
  // En cas d'échec on renvoie un ensemble vide comme avant, mais au moins la
  // trace existe : sinon une sourdine perdue passe pour une absence de sourdine.
  if (error) console.error('loadMutedIds', error);
  return new Set((data || []).map(r => r.buddy_id));
}

/** Écrit une préférence. La ligne est créée si elle n'existait pas. */
async function setPref(userId, buddyId, patch) {
  if (!userId || !buddyId) return null;
  const { data, error } = await supabase
    .from('conversation_prefs')
    .upsert(
      { user_id: userId, buddy_id: buddyId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,buddy_id' },
    )
    .select('buddy_id, pinned_at, muted, hidden_at, unread_forced')
    .maybeSingle();
  if (error) {
    console.error('conversation_prefs', error);
    return null;
  }
  // null veut dire « refusé », et seulement ça : l'écran s'en sert pour
  // afficher un message. Un enregistrement réussi qui ne renverrait aucune
  // ligne ne doit donc pas passer pour un échec.
  return data || true;
}

export function pinConversation(userId, buddyId, pinned) {
  return setPref(userId, buddyId, { pinned_at: pinned ? new Date().toISOString() : null });
}

export function muteConversation(userId, buddyId, muted) {
  return setPref(userId, buddyId, { muted: Boolean(muted) });
}

/** Retire la conversation de ma liste. Elle revient au prochain message reçu. */
export function hideConversation(userId, buddyId) {
  return setPref(userId, buddyId, { hidden_at: new Date().toISOString(), pinned_at: null });
}

export function markUnread(userId, buddyId) {
  return setPref(userId, buddyId, { unread_forced: true });
}

/** À l'ouverture d'une conversation : elle n'est plus « non lue » ni masquée. */
export function clearUnread(userId, buddyId) {
  return setPref(userId, buddyId, { unread_forced: false, hidden_at: null });
}
