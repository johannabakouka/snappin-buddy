/**
 * L'adresse d'une vidéo, transformée en aperçu affichable.
 *
 * Rendue commune parce que la page publique d'un profil ne montrait aucune
 * vidéo : elle ne lisait même pas la colonne. Un profil avec cinq photos et
 * une vidéo donnait donc six choses à regarder dans l'app et cinq sur le
 * site, pour la même personne, ce qui ressemblait à des photos manquantes.
 *
 * À faire au prochain nettoyage : BuddyProfileScreen.jsx et
 * EditProfileScreen.jsx portent encore chacun leur propre copie de cette
 * fonction. Elles sont identiques à celle-ci. On les remplacera par cet
 * import, en dehors d'une soirée de dépôt.
 */
export function getVideoEmbed(url) {
  if (!url) return null;
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (url.includes('tiktok.com/')) {
    const id = url.split('/video/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${id}` };
  }
  if (url.includes('instagram.com/')) {
    return { type: 'link', src: url };
  }
  return null;
}
