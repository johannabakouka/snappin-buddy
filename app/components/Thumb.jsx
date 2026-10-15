'use client';
import { useState } from 'react';
import { thumbUrl } from '../image-upload';

// Une photo affichée petit : vignette d'abord, photo d'origine en secours.
//
// Partout où une image apparaît en petit — un pin de carte, une ligne de liste,
// une miniature de portfolio — l'app téléchargeait la photo complète, 1280
// pixels et quelques centaines de kilo-octets, pour la dessiner dans un rond de
// 44 pixels. Multiplié par tous les profils de la carte, rechargés à chaque
// retour sur l'onglet, c'est ce qui a fait exploser la bande passante.
//
// Les photos envoyées avant ce changement n'ont pas de vignette : leur adresse
// ne répond pas, et on retombe alors sur l'originale. Rien ne casse, elles
// restent seulement lourdes jusqu'à ce que leur propriétaire rouvre l'app.

export default function Thumb({ src, alt = '', style, ...rest }) {
  // L'adresse pour laquelle la vignette a échoué. En la gardant plutôt qu'un
  // simple drapeau, un changement de photo repart de la vignette sans effet.
  const [failedFor, setFailedFor] = useState(null);
  // Vrai dès que l'image est peinte, ou qu'on sait qu'elle ne le sera pas.
  const [arrivee, setArrivee] = useState(false);

  const petite = thumbUrl(src);
  const url = (!petite || failedFor === src) ? src : petite;
  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={url}
      alt={alt}
      // Ne télécharger que ce qui va être vu. Sur un fil de projets ou une
      // carte de cent profils, le navigateur ouvrait cent connexions d'un coup
      // et les premières vignettes attendaient derrière les dernières.
      loading="lazy"
      // Le décodage part sur un autre fil : sans ça, une grande photo fige
      // brièvement le défilement au moment où elle s'affiche.
      decoding="async"
      style={{
        // Un fond de la bonne taille pendant le chargement. Avant, la place
        // restait vide puis l'image apparaissait d'un coup : c'est ce clignement
        // qui faisait « page web » plutôt qu'app.
        backgroundColor: 'rgba(255,255,255,0.06)',
        // Le fondu ne part jamais de l'invisible sans filet : les deux
        // gestionnaires ci-dessous le lèvent, y compris en cas d'échec, donc
        // une image ne peut pas rester transparente pour toujours.
        opacity: arrivee ? 1 : 0,
        transition: 'opacity 0.22s ease-out',
        ...style,
      }}
      onLoad={() => setArrivee(true)}
      // Le gestionnaire d'erreur ne suffit pas : quand la page est fabriquée
      // par le serveur, l'image peut échouer avant que React ne l'ait pris en
      // charge, et l'erreur est alors perdue. On regarde donc aussi l'état de
      // l'image au moment où elle arrive dans la page.
      ref={el => {
        if (!el || !el.complete) return;
        if (el.naturalWidth === 0 && failedFor !== src) setFailedFor(src);
        // Image déjà en cache : `onLoad` ne se déclenchera pas, et sans ceci
        // elle resterait transparente. C'est le cas le plus fréquent dès le
        // deuxième passage sur un écran.
        else if (!arrivee) setArrivee(true);
      }}
      onError={() => { setArrivee(true); setFailedFor(src); }}
    />
  );
}
