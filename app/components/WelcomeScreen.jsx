'use client';
import { useState, useRef } from 'react';
import { useT } from '../i18n';

export default function WelcomeScreen({ onStart }) {
  const t = useT();
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const SLIDES = [
    { emoji: '📸', title: t.slide1Title, subtitle: t.slide1Sub, color: '#2ECC71' },
    { emoji: '🎬', title: t.slide2Title, subtitle: t.slide2Sub, color: '#F0B429' },
    { emoji: '🤝', title: t.slide3Title, subtitle: t.slide3Sub, color: '#4A9EFF' },
    { emoji: '✨', title: t.slide4Title, subtitle: t.slide4Sub, color: '#FF6B6B' },
  ];

  function next() {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1);
    else onStart();
  }

  function prev() {
    if (slide > 0) setSlide(s => s - 1);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Swipe horizontal seulement (pas vertical)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
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
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ height: '100vh', background: '#0A0A0A', color: 'white', display: 'flex', flexDirection: 'column', padding: '0 0 40px', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 24px 0' }}>
        <button onClick={onStart} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          {t.skip}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.png" alt="Snappin'Buddy" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '3px', fontWeight: '700' }}>SNAPPIN&apos;BUDDY</p>
        </div>

        <div style={{
          width: '100px', height: '100px', borderRadius: '28px',
          background: `rgba(${getRgb(current.color)},0.1)`,
          border: `1.5px solid ${current.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px', marginBottom: '32px', transition: 'all 0.4s ease',
        }}>
          {current.emoji}
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '16px', fontFamily: 'var(--font-nunito)', lineHeight: 1.2, color: 'white' }}>
          {current.title}
        </h2>

        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '300px' }}>
          {current.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {SLIDES.map((_, i) => (
          <div key={i} onClick={() => setSlide(i)} style={{
            width: i === slide ? '24px' : '8px', height: '8px', borderRadius: '4px',
            background: i === slide ? current.color : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease', cursor: 'pointer',
          }} />
        ))}
      </div>

      <div style={{ padding: '0 24px' }}>
        <button onClick={next} style={{
          width: '100%', padding: '16px', borderRadius: '24px', border: 'none',
          background: current.color, color: slide === 3 ? 'white' : '#000',
          fontSize: '15px', fontWeight: '800', cursor: 'pointer', transition: 'background 0.3s ease',
        }}>
          {slide < SLIDES.length - 1 ? t.continue : t.join}
        </button>
      </div>
    </div>
  );
}