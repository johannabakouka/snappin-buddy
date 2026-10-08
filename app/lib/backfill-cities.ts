import { supabaseAdmin } from './server';
import { nearestCity, normalizeCity } from '../cities';

// Remplit le lieu manquant : la ville et le pays des profils, le pays des projets.
//
// L'app écrit la ville au moment où la position est posée, mais les comptes
// créés avant ce réglage n'ont que des coordonnées. Chacun répare le sien en
// ouvrant la carte, sauf que personne n'ouvre la carte tous les jours : dans
// Explorer, la plupart des profils n'affichaient donc aucun lieu, et on pouvait
// croire que ces gens avaient refusé de le dire.
//
// Le pays est arrivé encore plus tard. Le jour où la colonne est créée, elle
// est vide pour TOUT LE MONDE : chercher « Brésil » ne trouve personne, même
// avec dix créatifs à Rio, parce que l'app ignore encore que Rio est au Brésil.
// C'est ce passage qui le lui apprend.
//
// Les projets sont dans le même cas, et eux n'ont aucun rattrapage automatique :
// un projet n'est pas « ouvert » par son auteur comme une carte, il est publié
// une fois et plus personne n'y touche. Sans ce passage, la recherche par pays
// dans le fil ne fonctionnerait que pour les projets créés après la mise à jour.
//
// Le serveur fait le tour une fois par jour, et l'écran de modération a un
// bouton pour le déclencher tout de suite. La liste des villes est lue par le
// réseau plutôt que depuis le disque : les fichiers de public/ ne sont pas
// forcément présents à côté du code une fois déployé.

type Row = { user_id: string; lat: number; lng: number; city: string | null; country: string | null };
type OfferRow = { id: string | number; zone: string | null };
type City = { name: string; country: string; lat: number; lng: number };

export type BackfillResult = {
  candidats: number;
  remplis: number;
  projetsCandidats: number;
  projetsRemplis: number;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://snappinbuddy.com';
// Garde-fou : au-delà, on repasse demain plutôt que de faire traîner la tâche.
const MAX_PAR_PASSAGE = 500;

/**
 * La liste des villes, et un index du nom vers le pays.
 *
 * L'index sert aux projets, qui ne portent qu'un nom de ville écrit à la main.
 * Les alias sont inclus : quelqu'un a pu taper « Estambul » plutôt que
 * « Istanbul ». La liste étant classée par population, la première ville d'un
 * nom donné gagne — c'est la même règle que dans le formulaire de projet, donc
 * « Paris » reste la France et pas le Texas.
 */
async function chargerVilles() {
  const res = await fetch(`${APP_URL}/cities.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`cities.json: ${res.status}`);
  const raw = (await res.json()) as [string, string, number, number, string?][];

  const cities: City[] = [];
  const paysParNom = new Map<string, string>();
  for (const [name, country, lat, lng, aliases] of raw) {
    cities.push({ name, country, lat, lng });
    if (!country) continue;
    for (const nom of [name, ...(aliases ? aliases.split('|') : [])]) {
      const cle = normalizeCity(nom);
      if (cle && !paysParNom.has(cle)) paysParNom.set(cle, country);
    }
  }
  return { cities, paysParNom };
}

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

  // Les projets qui ont une ville mais pas de pays. Un projet sans ville n'a
  // rien à déduire : on n'invente pas un lieu.
  const { data: offerData, error: offerError } = await db
    .from('offers')
    .select('id, zone')
    .is('country', null)
    .not('zone', 'is', null)
    .neq('zone', '')
    .limit(MAX_PAR_PASSAGE);
  if (offerError) throw offerError;
  const offerRows = (offerData || []) as OfferRow[];

  if (rows.length === 0 && offerRows.length === 0) {
    return { candidats: 0, remplis: 0, projetsCandidats: 0, projetsRemplis: 0 };
  }

  const { cities, paysParNom } = await chargerVilles();

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

  let projetsRemplis = 0;
  for (const offre of offerRows) {
    // Le champ peut contenir plusieurs lieux séparés par une virgule : le
    // premier décide, c'est celui que le formulaire propose.
    const premier = String(offre.zone || '').split(',')[0];
    const pays = paysParNom.get(normalizeCity(premier));
    // Ville inconnue de la liste, écrite à la main ou mal orthographiée : on
    // préfère pas de pays à un pays faux, qui ferait apparaître le projet dans
    // la mauvaise recherche.
    if (!pays) continue;

    const { error: upError } = await db
      .from('offers')
      .update({ country: pays })
      .eq('id', offre.id)
      .is('country', null);
    if (upError) {
      console.error('backfillCities [offre]', offre.id, upError);
      continue;
    }
    projetsRemplis++;
  }

  return {
    candidats: rows.length,
    remplis,
    projetsCandidats: offerRows.length,
    projetsRemplis,
  };
}
