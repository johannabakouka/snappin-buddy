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
    }
  : {};

export default nextConfig;
