// Texte légal de Snappin'Buddy, partagé par l'écran CGU de l'app et par la page
// publique /cgu (Stripe a besoin d'une adresse publique pour la case d'acceptation).

// Médiateur de la consommation (obligatoire pour toute vente à des particuliers,
// article L616-1 du Code de la consommation). Tant que l'adhésion n'est pas prise,
// on laisse à null : la section n'apparaît pas, plutôt que d'annoncer un médiateur
// qui ne couvrirait pas réellement Snappin'Buddy.
// Pour l'activer : remplacer par { nom: '...', adresse: '...', site: '...' }
export const MEDIATEUR = null;

export const LEGAL_SECTIONS = [
  {
    title: '📋 Mentions légales',
    content: `Éditeur de l'application :
Ateliers 777
Entreprise individuelle
SIRET : 995 320 264 00014
Siège social : 59 rue de Ponthieu, 75008 Paris, France

Directrice de la publication : Johanna Bakouka
Contact : ateliers777.contact@gmail.com

Hébergeur :
Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA
Base de données : Supabase (infrastructure AWS, région Europe)`,
  },
  {
    title: '📍 Données collectées',
    content: `Pour fonctionner, Snappin'Buddy collecte :
· Adresse email (authentification)
· Nom, handle, rôle, bio, zone
· Photo de profil et portfolio (optionnels)
· Position géographique approximative (±400m)
· Messages et photos échangés entre utilisateurs

Aucune donnée n'est vendue à des tiers.
Aucune publicité ciblée n'est utilisée.`,
  },
  {
    title: '🔒 Utilisation des données',
    content: `Tes données sont utilisées uniquement pour :
· Afficher ton profil aux autres créatifs
· Te mettre en contact avec des collaborateurs
· Améliorer l'expérience de l'application
· Envoyer des notifications par email (propositions, projets)

Ta position est volontairement floutée de ~400m pour protéger ta vie privée. Elle n'est jamais partagée avec précision.

Base légale du traitement : exécution du contrat (CGU acceptées à l'inscription) et intérêt légitime.

Hébergement et transferts : la base de données (Supabase) est hébergée dans l'Union européenne. L'application elle-même est hébergée par Vercel Inc. (États-Unis) et les emails sont envoyés via Resend (États-Unis). Ces transferts hors Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne et le cadre de protection des données UE–États-Unis.

En cas de violation de données susceptible de créer un risque pour toi, tu seras informé(e) par email et la CNIL sera notifiée dans les 72 heures.`,
  },
  {
    title: '🍪 Cookies',
    content: `Snappin'Buddy utilise des cookies techniques strictement nécessaires au fonctionnement de l'application :
· Cookie de session (authentification Supabase)
· Préférences locales (mode sombre, langue)

Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
Ces cookies sont indispensables — l'app ne peut pas fonctionner sans eux.`,
  },
  {
    title: '🗺 Géolocalisation',
    content: `L'accès à ta position est demandé pour afficher les créatifs autour de toi sur la carte.

Ta position exacte n'est jamais stockée ni partagée. Seule une position approximative (±400m) est enregistrée et visible des autres utilisateurs.

Tu peux refuser la géolocalisation — certaines fonctionnalités de la carte seront alors limitées.`,
  },
  {
    title: '🇪🇺 RGPD & Droits',
    content: `Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), tu disposes des droits suivants :
· Droit d'accès à tes données
· Droit de rectification
· Droit à l'effacement ("droit à l'oubli")
· Droit à la portabilité
· Droit d'opposition au traitement
· Droit de retirer ton consentement à tout moment

Pour exercer ces droits : ateliers777.contact@gmail.com
Délai de réponse : 30 jours maximum.

Tu peux également introduire une réclamation auprès de la CNIL (cnil.fr).

Durée de conservation des données : jusqu'à suppression du compte + 30 jours de sauvegarde.`,
  },
  {
    title: '⏰ Durée de vie des projets',
    content: `Les projets publiés sur Snappin'Buddy expirent automatiquement après 30 jours.

Un projet expiré reste visible avec le badge "Projet complet" mais n'apparaît plus dans le feed actif. Tu peux le rouvrir gratuitement à tout moment.

Le Boost (payant) est une option de visibilité distincte : il remet ton projet en tête du feed pendant 1 ou 7 jours, indépendamment de la date d'expiration.`,
  },
  {
    title: '🔞 Âge minimum : 18 ans',
    content: `Snappin'Buddy est strictement réservé aux personnes majeures (18 ans et plus).

L'application met en relation des créatifs qui se rencontrent ensuite dans la vraie vie. C'est la raison pour laquelle aucune inscription de mineur n'est acceptée, même avec l'accord des parents.

En créant un compte, tu certifies avoir 18 ans ou plus. Tout compte dont il apparaît qu'il appartient à une personne mineure est supprimé sans préavis, et les données associées sont effacées.

Si tu penses qu'un compte appartient à un mineur, signale-le : ateliers777.contact@gmail.com`,
  },
  {
    title: '🛡 Règles de contenu et modération',
    content: `Sont interdits sur Snappin'Buddy :
· Le harcèlement, les menaces, les insultes et les propos haineux (racistes, sexistes, homophobes, etc.)
· Les contenus sexuels ou pornographiques
· L'usurpation de l'identité d'une autre personne
· La publication de photos de tiers sans leur accord
· Les annonces mensongères, les arnaques et le démarchage commercial
· Tout contenu illégal

Comment signaler : chaque profil comporte un bouton de signalement, et tu peux aussi écrire à ateliers777.contact@gmail.com. Chaque signalement est examiné, et les contenus manifestement illégaux sont retirés sans délai.

Ce qui peut arriver à un compte : avertissement, retrait du contenu, suspension ou suppression définitive selon la gravité. Toute personne dont le contenu est retiré ou dont le compte est suspendu en est informée par email, avec le motif, et peut contester la décision en répondant à cet email.

Les infractions graves peuvent être signalées aux autorités compétentes.

Point de contact (règlement européen sur les services numériques, dit DSA) : ateliers777.contact@gmail.com — en français ou en anglais.`,
  },
  {
    title: '🤝 Responsabilité des rencontres',
    content: `Snappin'Buddy facilite la mise en contact entre créatifs mais n'est pas responsable des rencontres physiques organisées via la plateforme.

Nous recommandons de :
· Se retrouver dans un lieu public
· Partager son itinéraire à un proche
· Utiliser le QR de session avant chaque rencontre

L'utilisation du QR code de session est fortement conseillée pour confirmer l'identité de votre interlocuteur.

Snappin'Buddy et Ateliers 777 ne sauraient être tenus responsables des dommages directs ou indirects résultant d'une rencontre organisée via la plateforme.`,
  },
  {
    title: '💳 Paiements',
    content: `Le seul achat possible sur Snappin'Buddy est le Boost d'un projet, qui le remet en tête du feed :
· Boost 1 jour — 1,99 € TTC
· Boost 7 jours — 4,99 € TTC

TVA non applicable, article 293 B du CGI.

Les paiements sont traités par Stripe Inc. (stripe.com), prestataire de paiement sécurisé certifié PCI-DSS. Snappin'Buddy ne stocke jamais tes données bancaires : toutes les transactions sont chiffrées et gérées par Stripe.

Le Boost est un service numérique exécuté immédiatement après le paiement. Conformément à l'article L221-28 du Code de la consommation, tu renonces à ton droit de rétractation de 14 jours en validant l'achat : le Boost est donc non remboursable une fois activé, sauf défaut technique avéré (dans ce cas : ateliers777.contact@gmail.com).

Aucun abonnement, aucun prélèvement automatique : chaque Boost est un paiement unique.`,
  },
  {
    title: '⚖️ Réclamation et médiation',
    content: `En cas de problème avec un achat (Boost), écris d'abord à ateliers777.contact@gmail.com en décrivant la situation. Une réponse te sera apportée sous 30 jours maximum.${MEDIATEUR ? `

Si cette réponse ne te satisfait pas, tu peux saisir gratuitement le médiateur de la consommation dont relève Snappin'Buddy :
${MEDIATEUR.nom}
${MEDIATEUR.adresse}
${MEDIATEUR.site}

La saisine du médiateur est gratuite pour toi et ne peut intervenir qu'après une réclamation écrite restée sans réponse satisfaisante, dans un délai d'un an à compter de cette réclamation.` : ''}

Pour toute question relative à tes données personnelles, tu peux également saisir la CNIL (cnil.fr).`,
  },
  {
    title: '📝 Modification des CGU',
    content: `Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés par email en cas de changement majeur.

L'utilisation continue de l'application après modification vaut acceptation des nouvelles conditions.

Dernière mise à jour : juin 2026
Droit applicable : droit français
Juridiction compétente : Tribunaux de Paris`,
  },
];
