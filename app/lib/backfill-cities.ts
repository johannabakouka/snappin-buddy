import { supabaseAdmin } from './server';
import { nearestCity } from '../cities';

// Remplit le nom de ville des profils qui n'en ont pas encore.
//
// L'app écrit la ville au moment où la position est posée, mais les comptes
// créés avant ce réglage n'ont que des coordonnées. Chacun répare le sien en
// ouvrant la carte, sauf que personne n'ouvre la carte tous les jours : dans
// Explorer, la plupart des profils n'affichaient donc aucun lieu, et on pouvait
// croire que ces gens avaient refusé de le dire.
//
// Le serveur fait le tour une fois par jour. La liste des villes est lue par le
// réseau plutôt que depuis le disque : les fichiers de public/ ne sont pas
// forcément présents à côté du code une fois déployé.

type Row = { user_id: string; lat: number; lng: number; city: string | null; country: string | null };
type City = { name: string; country: string; lat: number; lng: number };

export type BackfillResult = { candidats: number; remplis: number };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://snappinbuddy.com';
// Garde-fou : au-delà, on repasse demain plutôt que de faire traîner la tâche.
const MAX_PAR_PASSAGE = 500;

export async function backfillCities(): Promise<BackfillResult> {
  const db = supabaseAdmin();

  // Ville manquante OU pays manquant : le pays est arrivé après la ville, donc
  // les profils déjà remplis n'en ont pas et resteraient introuvables par une
  // recherche de pays.
  const { data, error } = await db
    .from('profiles')
    .select('user_id, lat, lng, city, country')
    .or('city.is.null,country.is.null')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(MAX_PAR_PASSAGE);
  if (error) throw error;
  const rows = (data || []) as Row[];
  if (rows.length === 0) return { candidats: 0, remplis: 0 };

  const res = await fetch(`${APP_URL}/cities.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`cities.json: ${res.status}`);
  const raw = (await res.json()) as [string, string, number, number][];
  const cities: City[] = raw.map(([name, country, lat, lng]) => ({ name, country, lat, lng }));

  let remplis = 0;
  for (const row of rows) {
    const found = nearestCity(cities, row.lat, row.lng);
    // Pas de ville assez proche : on laisse vide plutôt que d'écrire un lieu faux.
    if (!found?.name) continue;

    // On n'écrit que ce qui manque. Quelqu'un a pu choisir sa ville à la main
    // entre la lecture et ici, et son choix doit gagner sur notre calcul.
    const champs: { city?: string; country?: string } = {};
    if (!row.city) champs.city = found.name;
    if (!row.country && found.country) champs.country = found.country;
    if (Object.keys(champs).length === 0) continue;

    let requete = db.from('profiles').update(champs).eq('user_id', row.user_id);
    if (champs.city) requete = requete.is('city', null);
    if (champs.country) requete = requete.is('country', null);
    const { error: upError } = await requete;
    if (upError) {
      console.error('backfillCities', row.user_id, upError);
      continue;
    }
    remplis++;
  }

  return { candidats: rows.length, remplis };
}
