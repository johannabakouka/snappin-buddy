'use client';

import { supabase } from './supabase';

// Qui est connecté, sans attendre le réseau.
//
// Chaque écran de l'app commençait par `supabase.auth.getUser()`. Ce nom est
// trompeur : ce n'est pas une lecture locale, c'est un aller-retour jusqu'aux
// serveurs de Supabase pour faire revalider le jeton. Rien ne commençait à
// charger avant sa réponse, et comme on change d'écran sans arrêt, on payait
// cette attente à chaque fois : carte, messages, conversation, profil. En 4G
// correcte c'est déjà deux cents millisecondes de blanc par écran, en réseau
// moyen c'est bien plus, et c'est exactement la lenteur qu'on ressentait.
//
// `getSession()` lit la session déjà rangée dans le téléphone et répond
// instantanément. Si le jeton a expiré, la bibliothèque le renouvelle d'abord :
// on ne perd donc rien en fiabilité.
//
// Et surtout, rien ici n'est une question de sécurité. Cette réponse ne sert
// qu'à l'affichage. Ce qui protège vraiment les données, ce sont les règles de
// la base et les routes du serveur, et celles-là continuent de vérifier le
// jeton auprès de Supabase, elles.
//
// La forme renvoyée est volontairement identique à celle de `getUser()`,
// pour que les appels existants n'aient rien à changer d'autre que le nom.
export async function utilisateur() {
  try {
    const { data } = await supabase.auth.getSession();
    return { data: { user: data?.session?.user ?? null } };
  } catch {
    return { data: { user: null } };
  }
}
