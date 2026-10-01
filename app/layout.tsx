import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
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
  description: "Trouve ton prochain photographe, styliste, vidéaste... et créez quelque chose de beau.",
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
    description: "Trouve ton prochain photographe, styliste, vidéaste... et créez quelque chose de beau.",
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
    description: "Trouve ton prochain photographe, styliste, vidéaste... et créez quelque chose de beau.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Snappin&#8217;Buddy" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                // Une nouvelle version est en ligne : on l'active sans attendre
                reg.addEventListener('updatefound', function() {
                  var sw = reg.installing;
                  if (sw) sw.addEventListener('statechange', function() {
                    if (sw.state === 'installed' && navigator.serviceWorker.controller) sw.postMessage('clear-cache');
                  });
                });
                reg.update();
              }).catch(function() {});
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}