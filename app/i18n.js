export const translations = {
  fr: {
    // Auth
    login: 'Connexion',
    signup: 'Inscription',
    email: 'Email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    signIn: 'Se connecter',
    signUp: "S'inscrire",
    loading: 'Chargement...',
    acceptCgu: "En t'inscrivant tu acceptes nos conditions d'utilisation",
    resetSent: 'Email de réinitialisation envoyé ! Vérifie ta boîte mail 📩',
    enterEmailFirst: "Entre ton email d'abord !",

    // Welcome
    skip: 'Passer →',
    continue: 'Continuer →',
    join: "🚀 Rejoindre Snappin'Buddy",
    slide1Title: 'Les meilleurs projets naissent des meilleures rencontres',
    slide1Sub: 'Photographes, vidéastes, stylistes, DA... Trouve les créatifs qui partagent ton univers.',
    slide2Title: 'Ton prochain shooting commence ici',
    slide2Sub: "Poste une offre, réponds à un projet, construis des collabs qui te ressemblent.",
    slide3Title: 'Des rencontres réelles, en toute sécurité',
    slide3Sub: "Chaque session est sécurisée par QR code. Ta sécurité, notre priorité.",
    slide4Title: 'Une app créée par une créative, pour les créatifs',
    slide4Sub: "On a tous besoin des uns et des autres pour réaliser de beaux projets. Bienvenue dans la communauté Snappin'Buddy.",

    // Navbar
    map: 'Carte',
    explore: 'Explorer',
    match: 'Match',
    messages: 'Messages',
    profile: 'Profil',

    // Explorer
    exploreTitle: 'Explorer',
    exploreSubtitle: 'Créatifs autour de toi',
    sortedByMatch: '· TRIÉS PAR COMPATIBILITÉ',

    // Match
    offers: '⚡ Offres',
    matchTab: '🤝 Match',
    postOffer: '+ Poster une offre',
    cancelOffer: '✕ Annuler',
    myOffers: 'MES OFFRES',
    offersNow: 'OFFRES DU MOMENT',
    noOffers: 'Aucune offre pour l\'instant',
    beFirst: 'Sois le premier à poster une offre !',
    applyOffer: '⚡ Candidater',
    noMatch: 'Pas encore de match',
    noMatchSub: 'Poste une offre ou explore les créatifs',
    seeOffers: 'Voir les offres',
    received: 'REÇUES',
    sent: 'ENVOYÉES',
    accept: 'Accepter',
    decline: 'Refuser',
    generateQR: '🔒 Générer mon QR de session',

    // Profile
    currentProject: 'PROJET EN COURS',
    style: 'STYLE',
    shootZones: 'ZONES DE SHOOT',
    editProfile: 'Modifier le profil',
    logout: 'Se déconnecter',
    legal: 'CGU & Mentions légales',

    // Onboarding
    step: 'ÉTAPE',
    whoAreYou: 'Qui es-tu ?',
    whoSub: 'Commence par te présenter',
    yourRole: 'Ton rôle',
    roleSub: 'Comment tu contribues à un projet ?',
    yourUnivers: 'Ton univers',
    universSub: 'Dans quels domaines tu crées ?',
    createProfile: "🚀 Rejoindre Snappin'Buddy",
    creating: 'Création...',
    handleTaken: 'Ce handle est déjà pris !',
    useThis: 'Utiliser',
  },

  en: {
    // Auth
    login: 'Login',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    signUp: 'Sign up',
    loading: 'Loading...',
    acceptCgu: 'By signing up you accept our terms of use',
    resetSent: 'Reset email sent! Check your inbox 📩',
    enterEmailFirst: 'Enter your email first!',

    // Welcome
    skip: 'Skip →',
    continue: 'Continue →',
    join: "🚀 Join Snappin'Buddy",
    slide1Title: 'The best projects start with the best connections',
    slide1Sub: 'Photographers, videographers, stylists, art directors... Find creatives who share your vision.',
    slide2Title: 'Your next shoot starts here',
    slide2Sub: 'Post a brief, respond to projects, build collabs that match your style.',
    slide3Title: 'Real meetings, safely',
    slide3Sub: 'Every session is secured by QR code. Your safety is our priority.',
    slide4Title: 'An app built by a creative, for creatives',
    slide4Sub: "We all need each other to create beautiful projects. Welcome to the Snappin'Buddy community.",

    // Navbar
    map: 'Map',
    explore: 'Explore',
    match: 'Match',
    messages: 'Messages',
    profile: 'Profile',

    // Explorer
    exploreTitle: 'Explore',
    exploreSubtitle: 'Creatives around you',
    sortedByMatch: '· SORTED BY COMPATIBILITY',

    // Match
    offers: '⚡ Briefs',
    matchTab: '🤝 Match',
    postOffer: '+ Post a brief',
    cancelOffer: '✕ Cancel',
    myOffers: 'MY BRIEFS',
    offersNow: 'CURRENT BRIEFS',
    noOffers: 'No briefs yet',
    beFirst: 'Be the first to post a brief!',
    applyOffer: '⚡ Apply',
    noMatch: 'No matches yet',
    noMatchSub: 'Post a brief or explore creatives',
    seeOffers: 'See briefs',
    received: 'RECEIVED',
    sent: 'SENT',
    accept: 'Accept',
    decline: 'Decline',
    generateQR: '🔒 Generate my session QR',

    // Profile
    currentProject: 'CURRENT PROJECT',
    style: 'STYLE',
    shootZones: 'SHOOT ZONES',
    editProfile: 'Edit profile',
    logout: 'Sign out',
    legal: 'Terms & Legal',

    // Onboarding
    step: 'STEP',
    whoAreYou: 'Who are you?',
    whoSub: 'Start by introducing yourself',
    yourRole: 'Your role',
    roleSub: 'How do you contribute to a project?',
    yourUnivers: 'Your world',
    universSub: 'Which creative fields are yours?',
    createProfile: "🚀 Join Snappin'Buddy",
    creating: 'Creating...',
    handleTaken: 'This handle is already taken!',
    useThis: 'Use',
  },
};

export function getLang() {
  if (typeof window === 'undefined') return 'fr';
  const lang = navigator.language?.toLowerCase() || 'fr';
  if (lang.startsWith('fr')) return 'fr';
  return 'en'; // Default to English for all other languages
}

export function useT() {
  const lang = getLang();
  return translations[lang] || translations.en;
}