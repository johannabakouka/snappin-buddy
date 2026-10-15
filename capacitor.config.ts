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

    // Le WebView ne défile pas lui-même.
    //
    // Ce réglage était à `true`, en contradiction avec son propre commentaire.
    // Chaque écran de l'app fait exactement la hauteur de la fenêtre et tout
    // le défilement se passe à l'intérieur, dans les listes. Le WebView n'avait
    // donc rien à faire défiler, mais sa propre vue de défilement restait
    // active et captait les gestes en même temps que la liste : c'est ce qui
    // rendait le défilement d'une conversation mou et accrocheur, avec un
    // rebond élastique qu'aucune app native n'a.
    scrollEnabled: false,
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
      // iOS retire donc le logo de lui-même, même si l'interface n'arrive
      // jamais à se monter : on verra alors l'écran de chargement de l'app, ou
      // son message d'erreur, mais jamais un logo figé.
      //
      // Deux secondes et non trois : app/splash.js le retire désormais pour de
      // bon dès que l'interface est montée, donc ce délai n'est plus qu'un
      // filet, et un filet doit être court.
      launchAutoHide: true,
      launchShowDuration: 2000,
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
    PushNotifications: {
      // Ce qu'iOS a le droit de faire d'une notification qui arrive PENDANT
      // qu'on se sert de l'app.
      //
      // Sans ce réglage, le greffon renvoie une liste vide au système, ce qui
      // veut dire « n'affiche rien ». Et « rien », chez Apple, va plus loin
      // qu'on ne le croit : pas de bandeau, pas de son, pas de pastille, et
      // surtout la notification n'est jamais déposée dans le centre de
      // notifications. Elle est purement et simplement jetée. L'app ouverte,
      // on ne voyait donc strictement rien arriver, et on ne retrouvait rien
      // après coup en balayant depuis le haut de l'écran.
      //
      // C'est le cas de loin le plus courant pendant qu'on teste, et aussi
      // quand deux personnes s'écrivent en même temps.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      // L'heure et la batterie en blanc, puisque le fond est sombre.
      style: 'dark',
      backgroundColor: '#0A0A0A',
    },
  },
};

export default config;
