// L'écran de démarrage de l'app installée.
//
// C'est le logo sur fond noir affiché par iOS pendant que le WebView charge
// l'interface. Il n'existe que dans l'app : sur le site, il n'y a rien à
// masquer et les fonctions d'ici ne font rien.
//
// Le greffon s'importe. Lu sur `window.Capacitor.Plugins`, il était toujours
// absent : cet objet n'est rempli que par l'import du paquet. L'appel ci-dessous
// ne partait donc jamais, et le logo restait affiché tout le temps du filet de
// sécurité, à chaque lancement.

import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Dit à l'app « l'interface est prête, tu peux retirer le logo ».
 *
 * Sans cet appel, l'app restait bloquée sur l'écran de démarrage : le réglage
 * launchAutoHide de capacitor.config.ts a été remis à `true` pour que iOS le
 * retire de lui-même au bout de deux secondes quoi qu'il arrive. Mais deux
 * secondes de logo alors que l'interface est déjà montée, ça se voit. Cet
 * appel-ci le retire dès que c'est vrai, en général en moins d'une seconde.
 */
export function masquerSplash() {
  if (typeof window === 'undefined') return;
  try {
    SplashScreen.hide();
  } catch {
    // Sur le site il n'y a pas d'écran de démarrage, et dans l'app un échec
    // ici n'a pas de conséquence : iOS le retire seul au bout de deux
    // secondes. Dans les deux cas il n'y a rien à rattraper.
  }
}
