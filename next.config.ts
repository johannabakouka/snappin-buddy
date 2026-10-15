import type { NextConfig } from "next";

// Deux compilations différentes à partir du même code.
//
// Sans variable : la compilation du site, celle que Vercel lance à chaque
// dépôt. Rien ne change par rapport à avant.
//
// Avec BUILD_APP=1 : la compilation de l'interface embarquée dans l'app iPhone
// et Android. Next.js produit alors des fichiers statiques dans out/, sans
// serveur, puisqu'il n'y a pas de serveur dans un téléphone. C'est
// `npm run build:app` qui pose cette variable, jamais Vercel.
const pourLApp = process.env.BUILD_APP === '1';

const nextConfig: NextConfig = pourLApp
  ? {
      output: 'export',
      // L'optimisation d'images de Next.js a besoin d'un serveur pour
      // redimensionner à la volée. Dans l'app, les images viennent de Supabase
      // et sont servies telles quelles.
      images: { unoptimized: true },
      // Marque le paquet comme étant celui de l'app. L'interface s'en sert pour
      // masquer ce qui n'a pas le droit d'y figurer, le Boost payant en tête.
      // C'est une constante posée à la compilation, donc identique côté serveur
      // et côté navigateur : pas de bouton interdit qui clignote une fraction de
      // seconde avant de disparaître.
      env: { NEXT_PUBLIC_DANS_APP: '1' },
    }
  : {
      // Autoriser l'app installée à parler aux routes serveur.
      //
      // Dans l'app, l'interface n'est pas servie par snappinbuddy.com : elle est
      // embarquée dans le téléphone et servie depuis « capacitor://localhost ».
      // Chaque appel à /api/... est donc, pour le navigateur interne, un appel
      // vers un AUTRE site. Avant d'envoyer un POST qui porte un en-tête
      // Authorization, il demande d'abord la permission au serveur. Aucune
      // route ne répondait à cette question, donc toutes les demandes étaient
      // refusées avant même de partir, avec pour seul message « Load failed ».
      //
      // Les dix-huit routes appelées depuis l'app étaient concernées, pas
      // seulement l'enregistrement des notifications : signaler un contenu,
      // supprimer un message, valider un scan, prévenir par email d'un nouveau
      // message. Toutes échouaient en silence, parce qu'aucune n'attend de
      // réponse.
      //
      // L'étoile ne rend rien public : ces routes vérifient toutes le jeton de
      // la personne, aucune ne s'appuie sur un cookie, et la permission donnée
      // ici ne fait que laisser le navigateur poser la question. C'est
      // exactement ce que fait Supabase pour sa propre API.
      async headers() {
        return [
          {
            source: '/api/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: '*' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
              // Sans ça, une question de permission partirait avant CHAQUE
              // appel : deux allers-retours au lieu d'un, sur un téléphone en
              // 4G, pour chaque message envoyé.
              { key: 'Access-Control-Max-Age', value: '86400' },
            ],
          },
        ];
      },
    };

export default nextConfig;
