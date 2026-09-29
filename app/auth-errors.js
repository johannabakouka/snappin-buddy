'use client';
import { tx } from './tx';

// Supabase renvoie ses erreurs en anglais et en langage technique.
// « For security purposes, you can only request this after 47 seconds »
// n'apprend rien à quelqu'un qui voulait juste récupérer son mot de passe.
//
// On traduit les cas courants et on garde le message d'origine en dernier
// recours : mieux vaut une phrase en anglais qu'un écran muet.

export function authErrorMessage(error) {
  const raw = String(error?.message || error || '').trim();
  const low = raw.toLowerCase();

  // Limite anti-spam : le nombre de secondes vient de Supabase.
  const wait = low.match(/after (\d+) seconds?/);
  if (wait) {
    const s = wait[1];
    return tx(
      `Too many requests in a row. Try again in ${s} seconds.`,
      `Trop de demandes d'affilée. Réessaie dans ${s} secondes.`,
    );
  }

  if (low.includes('invalid login credentials')) {
    return tx('Wrong email or password.', 'Email ou mot de passe incorrect.');
  }
  if (low.includes('email not confirmed')) {
    return tx(
      'Your address is not confirmed yet. Check your emails, and your spam folder.',
      'Ton adresse n’est pas encore confirmée. Regarde tes mails, et tes spams.',
    );
  }
  if (low.includes('already registered') || low.includes('already been registered')) {
    return tx('An account already exists with this email.', 'Un compte existe déjà avec cette adresse.');
  }
  if (low.includes('unable to validate email') || low.includes('invalid format')) {
    return tx('This email address looks invalid.', 'Cette adresse email semble invalide.');
  }
  if (low.includes('password should be at least')) {
    return tx('Password too short (6 characters minimum).', 'Mot de passe trop court (6 caractères minimum).');
  }
  if (low.includes('different from the old password')) {
    return tx('Choose a password different from the old one.', 'Choisis un mot de passe différent de l’ancien.');
  }
  if (low.includes('email rate limit') || low.includes('over_email_send_rate_limit')) {
    return tx('Too many emails sent. Try again in a few minutes.', 'Trop de mails envoyés. Réessaie dans quelques minutes.');
  }
  if (low.includes('signups not allowed')) {
    return tx('Sign-ups are closed for the moment.', 'Les inscriptions sont fermées pour le moment.');
  }
  if (low.includes('failed to fetch') || low.includes('networkerror') || low.includes('network request failed')) {
    return tx('Connection failed. Check your internet.', 'Connexion impossible. Vérifie ton réseau.');
  }
  if (low.includes('expired') && low.includes('token')) {
    return tx('This link has expired. Ask for a new one.', 'Ce lien a expiré. Demande-en un nouveau.');
  }

  return raw;
}
