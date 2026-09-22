import { getLang } from './i18n';
import TX from './tx-dict';

/**
 * Texte dans la langue de l'utilisateur : tx('English', 'Français').
 * Français et anglais sont écrits directement dans l'écran ; espagnol, portugais,
 * allemand et italien viennent de tx-dict.js (clé = texte anglais).
 * La langue est lue au moment de l'affichage, comme useT().
 */
export function tx(en, fr) {
  const lang = getLang();
  if (lang === 'fr') return fr;
  if (lang === 'en') return en;
  return TX[lang]?.[en] ?? en;
}

/** true pour toute langue autre que le français (les listes de rôles et d'univers passent en anglais). */
export function isNotFrench() {
  return getLang() !== 'fr';
}
