/**
 * Lire une table entière, sans s'arrêter à la millième ligne.
 *
 * Supabase renvoie au maximum 1000 lignes par requête, et ne le signale pas :
 * pas d'erreur, pas d'avertissement, juste une liste qui s'arrête. Tant qu'une
 * table tient sous ce plafond on ne voit rien ; le jour où elle le dépasse, des
 * créatifs disparaissent de la carte et personne ne comprend pourquoi.
 *
 * On lit donc par tranches jusqu'à ce qu'une tranche revienne incomplète.
 *
 * Le tri est obligatoire et doit être sans égalité possible, sinon deux
 * tranches peuvent se recouvrir ou sauter des lignes : c'est la base qui
 * choisit l'ordre quand rien ne le fixe, et elle peut en changer d'une requête
 * à l'autre.
 */

export const TRANCHE = 1000;

// Garde-fou : au-delà, c'est qu'une boucle est partie de travers. On préfère
// une liste tronquée et une trace dans la console à une page qui ne répond plus.
const PLAFOND = 50000;

type Reponse<T> = { data: T[] | null; error: unknown };
type Requete<T> = { range: (de: number, a: number) => PromiseLike<Reponse<T>> };

export async function lireTout<T>(construire: () => Requete<T>): Promise<Reponse<T>> {
  const tout: T[] = [];
  for (let debut = 0; debut < PLAFOND; debut += TRANCHE) {
    const { data, error } = await construire().range(debut, debut + TRANCHE - 1);
    if (error) {
      // On rend ce qu'on a déjà : une liste partielle vaut mieux qu'un écran
      // vide, et l'appelant voit l'erreur.
      return { data: tout.length ? tout : null, error };
    }
    const lot = data || [];
    tout.push(...lot);
    if (lot.length < TRANCHE) return { data: tout, error: null };
  }
  console.error('lireTout: plafond de sécurité atteint, liste tronquée');
  return { data: tout, error: null };
}
