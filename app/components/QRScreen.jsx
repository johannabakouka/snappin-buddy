'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

export default function QRScreen({ collab, user, theme, onBack }) {
  const darkMode = theme?.dark ?? true;
  const bg = darkMode ? '#0A0A0A' : '#F5F5F5';
  const color = darkMode ? 'white' : '#111';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const subText = darkMode ? '#666' : '#888';

  const [sessionId, setSessionId] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef(null);

  useEffect(() => {
    createSession();
  }, []);

  async function createSession() {
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    const { data } = await supabase.from('qr_sessions').insert({
      user_id: user.id,
      collab_id: collab.id,
      expires_at: expires.toISOString(),
      status: 'pending',
    }).select().single();
    if (data) setSessionId(data.id);
  }

  const qrUrl = sessionId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${sessionId}&bgcolor=${darkMode ? '1A1A1A' : 'FFFFFF'}&color=${darkMode ? 'FFFFFF' : '0A0A0A'}`
    : null;

  const buddyName = collab.senderProfile?.username || collab.receiverProfile?.username || 'Buddy';
  const myName = user?.email?.split('@')[0] || 'Moi';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function downloadShareCard() {
    // Génère une image via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Fond dégradé sombre
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#0A0A0A');
    gradient.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Grain effect
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < 5000; i++) {
      ctx.fillRect(Math.random() * 1080, Math.random() * 1920, 1, 1);
    }

    // Logo texte
    ctx.fillStyle = 'white';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Snappin'Buddy", 540, 300);

    // Sous-titre
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '32px Arial';
    ctx.fillText('match and create', 540, 370);

    // Ligne séparatrice
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 450);
    ctx.lineTo(880, 450);
    ctx.stroke();

    // "Collab réalisée"
    ctx.fillStyle = '#3DFF8F';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('✓ Collab réalisée', 540, 600);

    // Usernames
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.fillText(`@${myName}`, 540, 780);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '48px Arial';
    ctx.fillText('×', 540, 900);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.fillText(`@${buddyName}`, 540, 1020);

    // Ligne séparatrice
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(200, 1120);
    ctx.lineTo(880, 1120);
    ctx.stroke();

    // Date
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '36px Arial';
    ctx.fillText(today, 540, 1220);

    // URL
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '28px Arial';
    ctx.fillText('snappin-buddy.vercel.app', 540, 1700);

    // Télécharger
    const link = document.createElement('a');
    link.download = `snappin-buddy-collab-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>QR de session</h2>
        </div>

        {/* Infos session */}
        <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '24px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          <p style={{ color: subText, fontSize: '11px', marginBottom: '4px', letterSpacing: '1px' }}>SESSION AVEC</p>
          <p style={{ color, fontWeight: '800', fontSize: '18px' }}>{buddyName}</p>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            background: darkMode ? '#1A1A1A' : '#FFFFFF',
            borderRadius: '20px', padding: '24px',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" style={{ width: '220px', height: '220px', borderRadius: '8px' }} />
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subText }}>
                Génération...
              </div>
            )}
          </div>
          <p style={{ color: subText, fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
            Montre ce QR à {buddyName} pour qu&apos;il le scanne
          </p>
        </div>

        {/* Consignes de sécurité */}
        <div style={{ background: 'rgba(255,154,61,0.08)', border: '1px solid rgba(255,154,61,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: 'rgba(255,154,61,0.9)', fontWeight: '700', fontSize: '13px', marginBottom: '12px' }}>⚠️ Consignes de sécurité</p>
          {[
            '📍 Retrouvez-vous dans un lieu public',
            '📱 Partagez votre itinéraire à un proche',
            '🚗 Évitez les parkings isolés',
            '✅ Scannez le QR de l\'autre avant de commencer',
          ].map((rule, i) => (
            <p key={i} style={{ color: subText, fontSize: '12px', marginBottom: i < 3 ? '8px' : '0', lineHeight: 1.4 }}>{rule}</p>
          ))}
        </div>

        {/* Expiration */}
        <p style={{ color: subText, fontSize: '11px', textAlign: 'center', marginBottom: '24px' }}>
          Ce QR expire dans 30 minutes
        </p>

        {/* Carte à partager */}
        <div style={{ background: card, borderRadius: '16px', padding: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          <p style={{ color, fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>📸 Partagez votre collab !</p>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
            Télécharge une carte de ta collab avec {buddyName} et poste-la en story Instagram !
          </p>

          {/* Aperçu de la carte */}
          <div style={{
            background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
            borderRadius: '12px', padding: '20px',
            textAlign: 'center', marginBottom: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <p style={{ color: 'white', fontWeight: '900', fontSize: '16px', marginBottom: '2px' }}>Snappin&apos;Buddy</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '12px', letterSpacing: '2px' }}>MATCH AND CREATE</p>
            <p style={{ color: '#3DFF8F', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>✓ Collab réalisée</p>
            <p style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>@{myName} × @{buddyName}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '8px' }}>{today}</p>
          </div>

          <button
            onClick={downloadShareCard}
            style={{
              width: '100%', padding: '12px', borderRadius: '24px', border: 'none',
              background: 'linear-gradient(135deg, #3DFF8F, #00C864)',
              color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer',
            }}
          >
            ⬇️ Télécharger la carte
          </button>
        </div>

      </div>
    </div>
  );
}