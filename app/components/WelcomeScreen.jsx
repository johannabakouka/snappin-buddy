'use client';
import { useState } from 'react';

const SLIDES = [
  {
    emoji: '📸',
    title: 'Les meilleurs projets naissent des meilleures rencontres',
    subtitle: 'Photographes, vidéastes, stylistes, DA... Trouve les créatifs qui partagent ton univers.',
    color: '#2ECC71',
  },
  {
    emoji: '🎬',
    title: 'Ton prochain shooting commence ici',
    subtitle: "Poste une offre, réponds à un projet, construis des collabs qui te ressemblent.",
    color: '#F0B429',
  },
  {
    emoji: '🤝',
    title: 'Des rencontres réelles, en toute sécurité',
    subtitle: "Chaque session est sécurisée par QR code. Ta sécurité, notre priorité.",
    color: '#4A9EFF',
  },
  {
    emoji: '✨',
    title: 'Une app créée par une créative, pour les créatifs',
    subtitle: "On a tous besoin des uns et des autres pour réaliser de beaux projets. Bienvenue dans la communauté Snappin'Buddy.",
    color: '#FF6B6B',
  },
];

export default function WelcomeScreen({ onStart }) {
  const [slide, setSlide] = useState(0);

  function next() {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1);
    else onStart();
  }

  const current = SLIDES[slide];

  const getRgb = (color) => {
    if (color === '#2ECC71') return '46,204,113';
    if (color === '#F0B429') return '240,180,41';
    if (color === '#4A9EFF') return '74,158,255';
    if (color === '#FF6B6B') return '255,107,107';
    return '255,255,255';
  };

  return (
    <div style={{
      height: '100vh', background: '#0A0A0A', color: 'white',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 40px',
    }}>

      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 24px 0' }}>
        <button onClick={onStart} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          Passer →
        </button>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.png" alt="Snappin'Buddy" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '3px', fontWeight: '700' }}>SNAPPIN&apos;BUDDY</p>
        </div>

        {/* Emoji */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '28px',
          background: `rgba(${getRgb(current.color)},0.1)`,
          border: `1.5px solid ${current.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px', marginBottom: '32px',
          transition: 'all 0.4s ease',
        }}>
          {current.emoji}
        </div>

        {/* Titre */}
        <h2 style={{
          fontSize: '24px', fontWeight: '900', marginBottom: '16px',
          fontFamily: 'var(--font-nunito)', lineHeight: 1.2, color: 'white',
        }}>
          {current.title}
        </h2>

        {/* Subtitle */}
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '300px' }}>
          {current.subtitle}
        </p>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {SLIDES.map((_, i) => (
          <div key={i} onClick={() => setSlide(i)} style={{
            width: i === slide ? '24px' : '8px', height: '8px',
            borderRadius: '4px',
            background: i === slide ? current.color : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease', cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Bouton */}
      <div style={{ padding: '0 24px' }}>
        <button onClick={next} style={{
          width: '100%', padding: '16px', borderRadius: '24px', border: 'none',
          background: current.color, color: slide === 3 ? 'white' : '#000',
          fontSize: '15px', fontWeight: '800', cursor: 'pointer',
          transition: 'background 0.3s ease',
        }}>
          {slide < SLIDES.length - 1 ? 'Continuer →' : "🚀 Rejoindre Snappin'Buddy"}
        </button>
      </div>
    </div>
  );
}