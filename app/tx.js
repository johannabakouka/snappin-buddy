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

/**
 * Même chose, mais pour une langue donnée.
 * Les pages publiques (profil partagé, projet partagé) sont fabriquées par le
 * serveur, où il n'y a pas de navigateur : getLang() ne peut donc rien deviner
 * et renvoyait du français à tout le monde. Ces pages sont justement celles
 * qu'on ouvre depuis une story, souvent depuis un autre pays.
 */
export function txIn(lang, en, fr) {
  if (lang === 'fr') return fr;
  if (lang === 'en') return en;
  return TX[lang]?.[en] ?? en;
}

/**
 * Langue déduite de l'en-tête Accept-Language du navigateur, par exemple
 * « fr-FR,fr;q=0.9,en-US;q=0.8 ». On prend la première langue qu'on sait
 * parler, et l'anglais par défaut.
 */
export function langFromHeader(acceptLanguage) {
  const raw = String(acceptLanguage || '').toLowerCase();
  if (!raw) return 'en';
  const wanted = raw
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
      return { tag: tag.trim(), q: q ? parseFloat(q.slice(2)) : 1 };
    })
    .filter(x => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    for (const code of ['fr', 'pt', 'es', 'de', 'it', 'en']) {
      if (tag.startsWith(code)) return code;
    }
  }
  return 'en';
}
