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

export default function Thumb({ src, alt = '', ...rest }) {
  // L'adresse pour laquelle la vignette a échoué. En la gardant plutôt qu'un
  // simple drapeau, un changement de photo repart de la vignette sans effet.
  const [failedFor, setFailedFor] = useState(null);

  const petite = thumbUrl(src);
  const url = (!petite || failedFor === src) ? src : petite;
  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={url}
      alt={alt}
      // Le gestionnaire d'erreur ne suffit pas : quand la page est fabriquée
      // par le serveur, l'image peut échouer avant que React ne l'ait pris en
      // charge, et l'erreur est alors perdue. On regarde donc aussi l'état de
      // l'image au moment où elle arrive dans la page.
      ref={el => {
        if (el && el.complete && el.naturalWidth === 0 && failedFor !== src) setFailedFor(src);
      }}
      onError={() => setFailedFor(src)}
    />
  );
}
