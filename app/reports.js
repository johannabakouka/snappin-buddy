'use client';
import { supabase } from './supabase';
import { tx } from './tx';

// Signaler un profil, un message ou un projet.
//
// Avant, seuls les profils pouvaient être signalés, et le signalement n'était
// qu'un email : une photo déplacée dans une conversation ou un projet mensonger
// n'avaient aucun bouton, alors que les CGU les interdisent nommément.

export const REPORT_REASONS = [
  { id: 'inapproprie', fr: 'Contenu inapproprié', en: 'Inappropriate content' },
  { id: 'faux_profil', fr: 'Faux profil', en: 'Fake profile' },
  { id: 'spam', fr: 'Spam', en: 'Spam' },
  { id: 'harcelement', fr: 'Harcèlement', en: 'Harassment' },
  { id: 'illegal', fr: 'Contenu illégal', en: 'Illegal content' },
  { id: 'autre', fr: 'Autre', en: 'Other' },
];

/** Le libellé d'un motif dans la langue de la personne. */
export function reasonLabel(id) {
  const r = REPORT_REASONS.find(x => x.id === id);
  return r ? tx(r.en, r.fr) : id;
}

/**
 * Envoie un signalement. Renvoie null si tout va bien, sinon un message à
 * afficher. Le serveur retrouve lui-même le propriétaire du contenu.
 */
export async function sendReport({ targetType, targetId, reason, details = '' }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return tx('Sign in again to report.', 'Reconnecte-toi pour signaler.');

    const res = await fetch('/api/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ targetType, targetId: String(targetId), reason, details }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('sendReport', body);
      return tx(
        "The report could not be sent. Write to contact@snappinbuddy.com.",
        'Le signalement n’a pas pu être envoyé. Écris à contact@snappinbuddy.com.',
      );
    }
    return null;
  } catch (e) {
    console.error('sendReport', e);
    return tx(
      "The report could not be sent. Write to contact@snappinbuddy.com.",
      'Le signalement n’a pas pu être envoyé. Écris à contact@snappinbuddy.com.',
    );
  }
}
