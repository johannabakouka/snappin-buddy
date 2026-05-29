'use client';

export default function LegalScreen({ theme, onBack }) {
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';

  const sections = [
    {
      title: '📋 Éditeur',
      content: `Snappin'Buddy est une application développée par Ateliers 777, agence de communication créative fondée par Johanna Bakouka.

Ateliers 777 regroupe :
· Ateliers 777 — photo & vidéo pop culture
· Super 8 Memories — photo & vidéo mariage
· Snappin'Buddy — mise en contact des créatifs visuels

Contact : contact@ateliers777.com`,
    },
    {
      title: '📍 Données collectées',
      content: `Pour fonctionner, Snappin'Buddy collecte :
· Adresse email (authentification)
· Nom, handle, rôle, bio, zone de shoot
· Photo de profil et portfolio (optionnels)
· Position géographique approximative (±400m)
· Messages échangés entre utilisateurs

Aucune donnée n'est vendue à des tiers.`,
    },
    {
      title: '🔒 Utilisation des données',
      content: `Tes données sont utilisées uniquement pour :
· Afficher ton profil aux autres créatifs
· Te mettre en contact avec des collaborateurs
· Améliorer l'expérience de l'application

Ta position est volontairement floutée de ~400m pour protéger ta vie privée. Elle n'est jamais partagée avec précision.`,
    },
    {
      title: '🗺 Géolocalisation',
      content: `L'accès à ta position est demandé pour afficher les créatifs autour de toi sur la carte.

Ta position exacte n'est jamais stockée ni partagée. Seule une position approximative (±400m) est enregistrée et visible des autres utilisateurs.

Tu peux refuser la géolocalisation — certaines fonctionnalités de la carte seront alors limitées.`,
    },
    {
      title: '🤝 Responsabilité des rencontres',
      content: `Snappin'Buddy facilite la mise en contact entre créatifs mais n'est pas responsable des rencontres physiques organisées via la plateforme.

Nous recommandons de :
· Se retrouver dans un lieu public
· Partager son itinéraire à un proche
· Utiliser le QR de session avant chaque rencontre

L'utilisation du QR code de session est fortement conseillée pour confirmer l'identité de votre interlocuteur.`,
    },
    {
      title: '🗑 Suppression du compte',
      content: `Tu peux demander la suppression de ton compte et de toutes tes données à tout moment en contactant :

contact@ateliers777.com

La suppression est effective sous 30 jours.`,
    },
    {
      title: '📝 Modification des CGU',
      content: `Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés par email en cas de changement majeur.

Dernière mise à jour : mai 2026`,
    },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>CGU & Mentions légales</h2>
        </div>

        {/* Intro */}
        <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '16px', border: `1px solid ${cardBorder}` }}>
          <p style={{ color: subText, fontSize: '13px', lineHeight: 1.6 }}>
            En utilisant Snappin&apos;Buddy, tu acceptes les conditions suivantes. Ces mentions légales ont été rédigées dans un souci de transparence et de respect de ta vie privée.
          </p>
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <div key={i} style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: `1px solid ${cardBorder}` }}>
            <p style={{ color, fontWeight: '800', fontSize: '14px', marginBottom: '10px' }}>{s.title}</p>
            <p style={{ color: subText, fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.content}</p>
          </div>
        ))}

        {/* Footer */}
        <p style={{ color: subText, fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
          Snappin&apos;Buddy · Ateliers 777 · Paris 🗺
        </p>
      </div>
    </div>
  );
}