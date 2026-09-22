'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function BoostSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [days, setDays] = useState(0);

  useEffect(() => {
    async function confirmBoost() {
      if (!sessionId) { setState('error'); return; }
      try {
        // Le serveur vérifie auprès de Stripe que le paiement est bien passé avant d'activer le boost
        const res = await fetch('/api/confirm-boost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { setState('error'); return; }
        setDays(data.days);
        setState('done');
        setTimeout(() => { window.location.href = '/'; }, 3000);
      } catch {
        setState('error');
      }
    }
    confirmBoost();
  }, [sessionId]);

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px' }}>{state === 'error' ? '⚠️' : '🚀'}</div>
      <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '900' }}>
        {state === 'done' ? 'Projet boosté !' : state === 'error' ? 'Boost non activé' : 'Activation...'}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '320px' }}>
        {state === 'done' && `Ton projet est en tête du feed pendant ${days} jour${days > 1 ? 's' : ''} 🎨`}
        {state === 'error' && "Le paiement n'a pas pu être confirmé. Si tu as été débité, écris-nous à contact@snappinbuddy.com."}
      </p>
      {state === 'done' && <p style={{ color: '#2ECC71', fontSize: '13px' }}>Redirection automatique...</p>}
      {state === 'error' && (
        <Link href="/" style={{ color: '#0A0A0A', background: 'white', padding: '12px 20px', borderRadius: '24px', fontWeight: 700, textDecoration: 'none' }}>
          Retour à l&apos;app
        </Link>
      )}
    </div>
  );
}

export default function BoostSuccess() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>🚀</div>
      </div>
    }>
      <BoostSuccessContent />
    </Suspense>
  );
}
