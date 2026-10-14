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
  : {};

export default nextConfig;
