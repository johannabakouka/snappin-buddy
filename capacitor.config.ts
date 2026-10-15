import type { CapacitorConfig } from '@capacitor/cli';

// La configuration de l'app installée, iPhone et Android.
//
// Rien ici ne concerne le site : snappinbuddy.com continue de tourner sur
// Vercel exactement comme avant. Ce fichier ne sert qu'au moment de fabriquer
// l'app, et il est ignoré par la compilation du site.

const config: CapacitorConfig = {
  // L'identifiant de l'app chez Apple et Google. Il se lit à l'envers, comme
  // une adresse : com.snappinbuddy.app pour le domaine snappinbuddy.com.
  //
  // Il est DÉFINITIF. Une fois une app publiée sous cet identifiant, il ne peut
  // plus être changé : il faudrait publier une autre app et redemander à tout
  // le monde de l'installer.
  appId: 'com.snappinbuddy.app',

  // Le nom affiché sous l'icône, sur l'écran d'accueil du téléphone.
  appName: "Snappin'Buddy",

  // Le dossier produit par `npm run build:app`, qui contient l'interface
  // compilée en fichiers statiques. C'est ce dossier qui part dans l'app.
  webDir: 'out',

  ios: {
    // Le fond derrière l'interface pendant le premier dixième de seconde.
    // En blanc par défaut, il produisait un éclair blanc au lancement d'une app
    // entièrement sombre.
    backgroundColor: '#0A0A0A',

    // Le rebond élastique du WebView quand on tire au-delà du contenu. Aucune
    // app native ne fait ça sur une liste qui ne se rafraîchit pas, et ça entre
    // en conflit avec le tirer-pour-rafraîchir de l'app.
    scrollEnabled: true,
    contentInset: 'never',
  },

  android: {
    backgroundColor: '#0A0A0A',
  },

  plugins: {
    SplashScreen: {
      // L'écran de démarrage part dès que l'interface est montée : c'est
      // app/splash.js qui le dit, depuis app/page.tsx.
      //
      // Il était réglé sur launchAutoHide: false, c'est-à-dire « ne disparaît
      // jamais tout seul, attends qu'on te le demande ». Personne ne le
      // demandait : l'app restait bloquée sur le logo, définitivement, sur
      // tous les téléphones.
      //
      // La leçon n'est pas de remettre le réglage dans l'autre sens, c'est de
      // ne jamais confier à du JavaScript le seul moyen de sortir d'un écran.
      // iOS retire donc le logo de lui-même au bout de trois secondes, même si
      // l'interface n'arrive jamais à se monter : on verra alors l'écran de
      // chargement de l'app, ou son message d'erreur, mais jamais un logo figé.
      launchAutoHide: true,
      launchShowDuration: 3000,
      launchFadeOutDuration: 200,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
    },
    Keyboard: {
      // Le clavier pousse la vue au lieu de la recouvrir : sans ce réglage, le
      // champ de saisie d'une conversation se retrouve caché derrière.
      resize: 'native',
      style: 'dark',
    },
    StatusBar: {
      // L'heure et la batterie en blanc, puisque le fond est sombre.
      style: 'dark',
      backgroundColor: '#0A0A0A',
    },
  },
};

export default config;
