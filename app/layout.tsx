import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Nunito ne sert plus qu'au nom et aux titres, et tous sont en 800 ou 900 :
// charger 400 et 700 revenait à télécharger deux fichiers que personne n'affiche.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  // Adresse de base du site. Sans elle, une image d'aperçu donnée en chemin
  // relatif n'est pas retrouvée par Facebook, WhatsApp ou Instagram.
  metadataBase: new URL("https://snappinbuddy.com"),
  title: "Snappin\u2019Buddy",
  // Cet aperçu est lu dans le monde entier, et la bannière og.png est en
  // anglais : la description suit, sinon le lien partagé est à moitié français.
  description: "Find the creatives around you and create together. Photographers, videographers, models, stylists, makeup artists and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Snappin\u2019Buddy",
  },
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
  openGraph: {
    title: "Snappin\u2019Buddy",
    description: "Find the creatives around you and create together. A map, a project, a collab.",
    type: "website",
    url: "https://snappinbuddy.com",
    // Sans cette image, un lien partagé en message ou en story arrivait nu :
    // du texte sur un rectangle vide, au moment précis où il faut donner
    // envie de cliquer.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Snappin\u2019Buddy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snappin\u2019Buddy",
    description: "Find the creatives around you and create together. A map, a project, a collab.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // La langue réelle est posée par le navigateur au chargement (voir page.tsx) :
    // le serveur ne peut pas la deviner, et l'anglais est la langue par défaut.
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Snappin&#8217;Buddy" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Le thème est posé avant le premier pixel.
            Lu plus tard, en JavaScript, il arrivait toujours trop tard : la page
            est fabriquée par le serveur, qui ne peut pas connaître le réglage,
            donc l'app s'ouvrait en sombre puis basculait en clair d'un coup. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            try {
              var dark = localStorage.getItem('darkMode') !== 'false';
              var root = document.documentElement;
              root.style.setProperty('--sb-bg', dark ? '#0A0A0A' : '#F5F5F5');
              root.style.setProperty('--sb-color', dark ? '#FFFFFF' : '#111111');
            } catch (e) {}
          })();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                // Une nouvelle version est en ligne : on l'active sans attendre.
                reg.addEventListener('updatefound', function() {
                  var sw = reg.installing;
                  if (sw) sw.addEventListener('statechange', function() {
                    if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                      sw.postMessage('clear-cache');
                      sw.postMessage('skip-waiting');
                    }
                  });
                });
                reg.update();
              }).catch(function() {});

              // Le nouveau cache vient de prendre la main : la page affichée
              // vient encore de l'ancienne version, on la recharge une fois.
              //
              // Sans ça, quelqu'un qui avait ajouté l'app à son écran d'accueil
              // pouvait rester des heures sur une version déjà corrigée en
              // ligne, et voir des bugs que plus personne n'avait.
              var reloading = false;
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                if (reloading) return;
                reloading = true;
                window.location.reload();
              });
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}