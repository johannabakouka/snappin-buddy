'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function QRScreen({ collab, user, myProfile, theme, onBack }) {
  const darkMode = theme?.dark ?? true;
  const bg = darkMode ? '#0A0A0A' : '#F5F5F5';
  const color = darkMode ? 'white' : '#111';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const subText = darkMode ? '#666' : '#888';

  const [sessionId, setSessionId] = useState(null);

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
  const myHandle = myProfile?.handle || myProfile?.username || user?.email?.split('@')[0] || 'moi';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function downloadShareCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#0A0A0A');
    gradient.addColorStop(1, '#141414');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let i = 0; i < 8000; i++) {
      ctx.fillRect(Math.random() * 1080, Math.random() * 1920, 1, 1);
    }

    ctx.beginPath();
    ctx.arc(540, 200, 300, 0, Math.PI * 2);
    const radial = ctx.createRadialGradient(540, 200, 0, 540, 200, 300);
    radial.addColorStop(0, 'rgba(61,255,143,0.06)');
    radial.addColorStop(1, 'rgba(61,255,143,0)');
    ctx.fillStyle = radial;
    ctx.fill();

    ctx.font = '52px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.fillText('🗺 📸', 540, 280);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 72px Arial';
    ctx.fillText("Snappin'Buddy", 540, 380);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '28px Arial';
    ctx.fillText('MATCH AND CREATE', 540, 440);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, 520);
    ctx.lineTo(920, 520);
    ctx.stroke();

    ctx.fillStyle = '#3DFF8F';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('✓ Collab réalisée', 540, 630);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 76px Arial';
    ctx.fillText(`@${myHandle}`, 540, 820);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '44px Arial';
    ctx.fillText('×', 540, 930);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 76px Arial';
    ctx.fillText(`@${buddyName}`, 540, 1040);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(160, 1120);
    ctx.lineTo(920, 1120);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '34px Arial';
    ctx.fillText(today, 540, 1200);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '28px Arial';
    ctx.fillText('#snappinbuddy', 540, 1700);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '24px Arial';
    ctx.fillText('snappin-buddy.vercel.app', 540, 1760);

    const link = document.createElement('a');
    link.download = `snappin-buddy-collab-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 100px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>QR de session</h2>
        </div>

        <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '24px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          <p style={{ color: subText, fontSize: '11px', marginBottom: '4px', letterSpacing: '1px' }}>SESSION AVEC</p>
          <p style={{ color, fontWeight: '800', fontSize: '18px' }}>{buddyName}</p>
        </div>

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

        <div style={{ background: 'rgba(255,154,61,0.08)', border: '1px solid rgba(255,154,61,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: 'rgba(255,154,61,0.9)', fontWeight: '700', fontSize: '13px', marginBottom: '12px' }}>⚠️ Consignes de sécurité</p>
          {[
            '📍 Retrouvez-vous dans un lieu public',
            '📱 Partagez votre itinéraire à un proche',
            '🚗 Évitez les parkings isolés',
            "✅ Scannez le QR de l'autre avant de commencer",
          ].map((rule, i) => (
            <p key={i} style={{ color: subText, fontSize: '12px', marginBottom: i < 3 ? '8px' : '0', lineHeight: 1.4 }}>{rule}</p>
          ))}
        </div>

        <p style={{ color: subText, fontSize: '11px', textAlign: 'center', marginBottom: '24px' }}>
          Ce QR expire dans 30 minutes
        </p>

        <div style={{ background: card, borderRadius: '16px', padding: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          <p style={{ color, fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>📸 Partagez votre collab !</p>
          <p style={{ color: subText, fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
            Télécharge ta carte et poste-la en story avec <strong style={{ color }}>@snappinbuddy</strong> — les plus belles collabs seront repostées sur notre page ! 🗺 📸
          </p>

          <div style={{
            background: 'linear-gradient(135deg, #0A0A0A 0%, #141414 100%)',
            borderRadius: '12px', padding: '20px',
            textAlign: 'center', marginBottom: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: '18px', marginBottom: '4px' }}>🗺 📸</p>
            <p style={{ color: 'white', fontWeight: '900', fontSize: '16px', marginBottom: '2px' }}>Snappin&apos;Buddy</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', marginBottom: '10px', letterSpacing: '3px' }}>MATCH AND CREATE</p>
            <p style={{ color: '#3DFF8F', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>✓ Collab réalisée</p>
            <p style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>@{myHandle} × @{buddyName}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', marginTop: '8px' }}>{today}</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', marginTop: '4px' }}>#snappinbuddy</p>
          </div>

          <button onClick={downloadShareCard} style={{
            width: '100%', padding: '13px', borderRadius: '24px', border: 'none',
            background: 'linear-gradient(135deg, #3DFF8F, #00C864)',
            color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer',
            marginBottom: '10px',
          }}>
            ⬇️ Télécharger la carte
          </button>

          <p style={{ color: subText, fontSize: '11px', textAlign: 'center', lineHeight: 1.5 }}>
            Poste en story · Tague <strong style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>@snappinbuddy</strong> · Utilise <strong style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>#snappinbuddy</strong>
          </p>
        </div>

      </div>
    </div>
  );
}