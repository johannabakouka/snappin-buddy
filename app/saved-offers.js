'use client';
import { supabase } from './supabase';

// Les projets mis de côté.
//
// On tombe sur un projet qui plaît sans être prêt à se proposer tout de suite :
// la date est à vérifier, il faut regarder son agenda, ou simplement y
// réfléchir. Le fil bouge, et le projet est perdu. Les créatifs, eux, ont
// l'onglet Suivis depuis toujours ; les projets n'avaient rien.
//
// La liste est privée. Personne ne sait qu'on a enregistré son projet : c'est
// exprès, un compteur d'enregistrements transformerait le fil en concours.

const CHANGED = 'sb:saved-offers-changed';

export function notifySavedChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

/** S'abonne aux changements. Renvoie la fonction pour se désabonner. */
export function onSavedChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED, handler);
  return () => window.removeEventListener(CHANGED, handler);
}

/** Les identifiants des projets que j'ai enregistrés. */
export async function loadSavedOfferIds(myUserId) {
  if (!myUserId) return new Set();
  try {
    const { data, error } = await supabase
      .from('saved_offers')
      .select('offer_id')
      .eq('user_id', myUserId);
    if (error) throw error;
    // Les identifiants deviennent des chaînes : selon le projet Supabase,
    // offers.id est un uuid ou un nombre, et comparer 12 à « 12 » échouerait.
    return new Set((data || []).map(r => String(r.offer_id)));
  } catch (e) {
    console.error('loadSavedOfferIds', e);
    return new Set();
  }
}

export async function saveOffer(myUserId, offerId) {
  const { error } = await supabase
    .from('saved_offers')
    .insert({ user_id: myUserId, offer_id: offerId });
  if (error && !/duplicate|unique/i.test(error.message || '')) throw error;
  notifySavedChanged();
}

export async function unsaveOffer(myUserId, offerId) {
  const { error } = await supabase
    .from('saved_offers')
    .delete()
    .eq('user_id', myUserId)
    .eq('offer_id', offerId);
  if (error) throw error;
  notifySavedChanged();
}
