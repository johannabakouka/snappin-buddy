// L'écran de démarrage de l'app installée.
//
// C'est le logo sur fond noir affiché par iOS pendant que le WebView charge
// l'interface. Il n'existe que dans l'app : sur le site, il n'y a rien à
// masquer et les fonctions d'ici ne font rien.
//
// On passe par window.Capacitor plutôt que par un import du paquet
// @capacitor/splash-screen, comme pour le partage natif dans partage.js :
// l'import ferait entrer du code Capacitor dans la compilation du site, qui
// est fabriquée par un serveur où `window` n'existe pas. Le greffon natif, lui,
// s'inscrit tout seul dans window.Capacitor.Plugins au lancement de l'app.

/**
 * Dit à l'app « l'interface est prête, tu peux retirer le logo ».
 *
 * Sans cet appel, l'app restait bloquée sur l'écran de démarrage : le réglage
 * launchAutoHide de capacitor.config.ts a été remis à `true` pour que iOS le
 * retire de lui-même au bout de trois secondes quoi qu'il arrive, mais trois
 * secondes de logo alors que l'interface est déjà montée, ça se voit. Cet
 * appel-ci le retire dès que c'est vrai, en général en moins d'une seconde.
 */
export function masquerSplash() {
  if (typeof window === 'undefined') return;
  try {
    const greffon = window.Capacitor?.Plugins?.SplashScreen;
    if (greffon?.hide) greffon.hide();
  } catch {
    // Sur le site il n'y a pas d'écran de démarrage, et dans l'app un échec
    // ici n'a pas de conséquence : iOS le retire seul au bout de trois
    // secondes. Dans les deux cas il n'y a rien à rattraper.
  }
}
