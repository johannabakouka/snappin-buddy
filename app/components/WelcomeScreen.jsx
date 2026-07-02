'use client';
import { useState, useRef } from 'react';
import { useT } from '../i18n';

export default function WelcomeScreen({ onStart }) {
  const t = useT();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);

  const slides = [
    {
      emoji: '✨',
      title: t.slide1Title,
      sub: t.slide1Sub,
    },
    {
      emoji: '🎨',
      title: t.slide2Title,
      sub: t.slide2Sub,
    },
    {
      emoji: '🔒',
      title: t.slide3Title,
      sub: t.slide3Sub,
    },
    {
      emoji: '🤝',
      title: t.slide4Title,
      sub: t.slide4Sub,
    },
  ];

  function next() {
    if (current < slides.length - 1) setCurrent(c => c + 1);
    else onStart();
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    else if (diff < -50 && current > 0) setCurrent(c => c - 1);
    touchStartX.current = null;
  }

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100vh', background: '#0A0A0A', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', color: 'white', position: 'relative',
        userSelect: 'none',
      }}
    >
      <button onClick={onStart} style={{
        position: 'absolute', top: '24px', right: '24px',
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: '14px', cursor: 'pointer', fontWeight: '600',
      }}>
        {t.skip}
      </button>

      <div style={{ fontSize: '72px', marginBottom: '32px', textAlign: 'center' }}>
        {slide.emoji}
      </div>

      <h2 style={{
        fontFamily: 'var(--font-nunito)', fontSize: '26px', fontWeight: '900',
        textAlign: 'center', marginBottom: '16px', lineHeight: 1.2,
        color: 'white',
      }}>
        {slide.title}
      </h2>

      <p style={{
        fontSize: '15px', color: 'rgba(255,255,255,0.55)',
        textAlign: 'center', lineHeight: 1.7, marginBottom: '48px',
        maxWidth: '300px',
      }}>
        {slide.sub}
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {slides.map((_, i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{
            width: i === current ? '24px' : '8px', height: '8px',
            borderRadius: '4px',
            background: i === current ? 'white' : 'rgba(255,255,255,0.25)',
            transition: 'all 0.3s', cursor: 'pointer',
          }} />
        ))}
      </div>

      <button onClick={next} style={{
        background: 'white', color: 'black', border: 'none',
        borderRadius: '24px', padding: '16px 40px',
        fontSize: '15px', fontWeight: '700', cursor: 'pointer',
        width: '100%', maxWidth: '300px',
      }}>
        {isLast ? t.join : t.continue}
      </button>
    </div>
  );
}