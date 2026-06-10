'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../supabase';

function BoostSuccessContent() {
  const searchParams = useSearchParams();
  const offerId = searchParams.get('offer_id');
  const days = parseInt(searchParams.get('days') || '1');
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function activateBoost() {
      if (!offerId) return;
      const boostedUntil = new Date();
      boostedUntil.setDate(boostedUntil.getDate() + days);
      await supabase.from('offers').update({
        boosted_until: boostedUntil.toISOString()
      }).eq('id', offerId);
      setDone(true);
      setTimeout(() => { window.location.href = '/'; }, 3000);
    }
    activateBoost();
  }, [offerId, days]);

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px' }}>🚀</div>
      <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '900' }}>
        {done ? 'Offre boostée !' : 'Activation...'}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
        {done ? `Votre offre est en tête du feed pendant ${days} jour${days > 1 ? 's' : ''} 🎉` : ''}
      </p>
      {done && <p style={{ color: '#2ECC71', fontSize: '13px' }}>Redirection automatique...</p>}
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