'use client';
import { supabase } from './supabase';
import { handleIssue } from './handle-filter';

// Gestion des pseudos (@handle) : nettoyage, vérification de disponibilité,
// et suggestions quand le pseudo voulu est déjà pris — comme sur Instagram.

export const HANDLE_MAX = 20;

/** Met le pseudo au propre : un seul @, minuscules, lettres/chiffres/point/tiret bas. */
export function cleanHandle(value) {
  const body = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // enlève les accents
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+/, '')
    .slice(0, HANDLE_MAX);
  return body ? `@${body}` : '';
}

/** Un pseudo valide fait au moins 3 caractères après le @. */
export function isHandleValid(handle) {
  return /^@[a-z0-9][a-z0-9._]{2,}$/.test(handle || '');
}

/**
 * Renvoie les pseudos déjà pris qui commencent par la racine donnée.
 * Une seule requête : on filtre ensuite en mémoire, ce qui permet aussi
 * de proposer des variantes libres sans rappeler la base.
 */
async function takenStartingWith(root) {
  const { data, error } = await supabase
    .from('profiles')
    .select('handle')
    .ilike('handle', `@${root}%`)
    .limit(200);
  if (error) throw error;
  return new Set((data || []).map(r => String(r.handle || '').toLowerCase()));
}

/**
 * Vérifie si un pseudo est libre.
 * currentUserId : l'utilisateur qui modifie son propre profil garde son pseudo actuel.
 * Renvoie { free, suggestions }. En cas de panne réseau, on renvoie free: null
 * (on ne bloque pas la personne sur une erreur technique, la base tranchera).
 */
export async function checkHandle(handle, currentUserId) {
  const clean = cleanHandle(handle);
  if (!isHandleValid(clean)) return { free: null, suggestions: [] };

  // Insultes et noms réservés : inutile d'interroger la base, c'est refusé d'office.
  const issue = handleIssue(clean);
  if (issue) return { free: false, issue, suggestions: [] };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('handle', clean)
      .limit(1);
    if (error) throw error;

    const owner = data?.[0]?.user_id;
    if (!owner || (currentUserId && owner === currentUserId)) {
      return { free: true, suggestions: [] };
    }
    return { free: false, suggestions: await suggestHandles(clean) };
  } catch (e) {
    console.error('checkHandle', e);
    return { free: null, suggestions: [] };
  }
}

/** Propose des pseudos libres construits à partir de celui qui est pris. */
export async function suggestHandles(handle) {
  const root = cleanHandle(handle).slice(1);
  if (!root) return [];

  let taken;
  try {
    taken = await takenStartingWith(root);
  } catch {
    return [];
  }

  const year = new Date().getFullYear();
  const candidates = [
    `${root}_`,
    `${root}.photo`,
    `${root}_creates`,
    `${root}.studio`,
    `${root}${year % 100}`,
    `${root}_${year}`,
    `the${root}`,
    `${root}1`,
    `${root}2`,
    `${root}_official`,
  ];

  return candidates
    .map(c => `@${c.slice(0, HANDLE_MAX)}`)
    .filter(c => !taken.has(c.toLowerCase()))
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .slice(0, 4);
}
