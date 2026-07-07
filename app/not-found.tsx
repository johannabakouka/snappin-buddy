'use client';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '100vh', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px', textAlign: 'center',
      maxWidth: '390px', margin: '0 auto',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'white', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '28px', fontWeight: '900',
        color: 'black', marginBottom: '24px',
      }}>
        S
      </div>

      <h1 style={{
        fontFamily: 'var(--font-nunito)', fontSize: '28px',
        fontWeight: '900', color: 'white', marginBottom: '12px',
      }}>
        Page introuvable
      </h1>

      <p style={{
        color: 'rgba(255,255,255,0.4)', fontSize: '15px',
        lineHeight: 1.6, marginBottom: '8px',
      }}>
        Cette page n&apos;existe pas{dots}
      </p>

      <p style={{
        color: 'rgba(255,255,255,0.25)', fontSize: '13px',
        marginBottom: '40px',
      }}>
        Mais il y a plein de créatifs qui t&apos;attendent !
      </p>

      <a href="/" style={{
        background: 'white', color: 'black',
        borderRadius: '24px', padding: '14px 32px',
        fontSize: '15px', fontWeight: '700',
        textDecoration: 'none', display: 'inline-block',
      }}>
        Retour à l&apos;app →
      </a>

      <p style={{
        color: 'rgba(255,255,255,0.2)', fontSize: '11px',
        marginTop: '40px',
      }}>
        Snappin&apos;Buddy · créez quelque chose de beau 🎨
      </p>
    </div>
  );
}