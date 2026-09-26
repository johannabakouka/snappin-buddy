'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { tx } from '../tx';

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

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

  // Le QR contient un LIEN, pas un identifiant. L'appareil photo de n'importe
  // quel téléphone sait ouvrir un lien ; aucun ne sait quoi faire d'un
  // identifiant technique. C'est ce qui rend le scan possible sans installer
  // de scanner dans l'app — impossible sur iPhone de toute façon.
  const scanLink = sessionId ? `https://snappinbuddy.com/?scan=${sessionId}` : null;
  const qrUrl = scanLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanLink)}&bgcolor=${darkMode ? '1A1A1A' : 'FFFFFF'}&color=${darkMode ? 'FFFFFF' : '0A0A0A'}`
    : null;

  // L'autre personne de la collab : l'expéditeur si j'ai reçu la proposition, sinon le destinataire
  const buddyProfile = collab.sender_id === user?.id ? collab.receiverProfile : collab.senderProfile;
  const cleanHandle = (p) => (p?.handle || p?.username || '').replace(/^@+/, '').trim();
  const buddyName = buddyProfile?.username || 'Buddy';
  const buddyHandle = cleanHandle(buddyProfile) || 'buddy';
  const myHandle = cleanHandle(myProfile) || user?.email?.split('@')[0] || 'moi';
  // Image générée, affichée pour l'enregistrer (appui long) quand le partage direct n'est pas possible
  const [cardImage, setCardImage] = useState(null);
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
    ctx.arc(540, 320, 360, 0, Math.PI * 2);
    const radial = ctx.createRadialGradient(540, 320, 0, 540, 320, 360);
    radial.addColorStop(0, 'rgba(242,224,80,0.07)');
    radial.addColorStop(1, 'rgba(242,224,80,0)');
    ctx.fillStyle = radial;
    ctx.fill();

    // Logo Snappin'Buddy (même fond noir que la carte)
    const logo = await loadImage('/logo.png');
    if (logo) {
      // « screen » rend le fond noir du logo transparent
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(logo, 290, 70, 500, 500);
      ctx.globalCompositeOperation = 'source-over';
    }
    else {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.fillText("Snappin'Buddy", 540, 380);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#F2E050';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('MATCH AND CREATE', 540, 540);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, 640);
    ctx.lineTo(920, 640);
    ctx.stroke();

    ctx.fillStyle = '#2ECC71';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(tx('✓ Collab done', '✓ Collab réalisée'), 540, 800);

    // Pseudo réduit si trop long pour tenir sur la carte
    const drawName = (text, y) => {
      let size = 76;
      ctx.font = `bold ${size}px Arial`;
      while (ctx.measureText(text).width > 900 && size > 40) {
        size -= 4;
        ctx.font = `bold ${size}px Arial`;
      }
      ctx.fillStyle = 'white';
      ctx.fillText(text, 540, y);
    };
    drawName(`@${myHandle}`, 970);

    ctx.fillStyle = '#F2E050';
    ctx.font = '48px Arial';
    ctx.fillText('×', 540, 1080);

    drawName(`@${buddyHandle}`, 1190);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(160, 1280);
    ctx.lineTo(920, 1280);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '34px Arial';
    ctx.fillText(today, 540, 1360);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '28px Arial';
    ctx.fillText('#snappinbuddy', 540, 1700);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '24px Arial';
    ctx.fillText('snappinbuddy.com', 540, 1760);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const fileName = `snappin-buddy-collab-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // Téléphone : ouvre le menu de partage (Enregistrer l'image, Instagram…)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Snappin'Buddy" });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // partage annulé par l'utilisateur
      }
    }

    // Sinon : on affiche l'image (appui long pour l'enregistrer) et on tente le téléchargement (ordinateur)
    const url = URL.createObjectURL(blob);
    setCardImage(url);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: `calc(env(safe-area-inset-top) + 24px) 16px calc(110px + env(safe-area-inset-bottom))` }}>

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
          <p style={{ color: subText, fontSize: '12px', marginTop: '16px', textAlign: 'center', lineHeight: 1.5 }}>
            Montre ce QR à {buddyName}.<br />
            Il le scanne avec l&apos;appareil photo de son téléphone, et votre
            rencontre est validée tous les deux.
          </p>
        </div>

        <div style={{ background: 'rgba(255,154,61,0.08)', border: '1px solid rgba(255,154,61,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: 'rgba(255,154,61,0.9)', fontWeight: '700', fontSize: '13px', marginBottom: '12px' }}>⚠️ Consignes de sécurité</p>
          {[
            '📍 Retrouvez-vous dans un lieu public',
            '📱 Partagez votre itinéraire à un proche',
            '🚗 Évitez les parkings isolés',
            "✅ Scannez-vous mutuellement avant de commencer",
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
            <img src="/logo.png" alt="Snappin'Buddy" style={{ width: '96px', height: '96px', display: 'block', margin: '0 auto 2px', mixBlendMode: 'screen' }} />
            <p style={{ color: '#F2E050', fontSize: '9px', fontWeight: '700', marginBottom: '10px', letterSpacing: '3px' }}>MATCH AND CREATE</p>
            <p style={{ color: '#2ECC71', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>{tx('✓ Collab done', '✓ Collab réalisée')}</p>
            <p style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>@{myHandle} × @{buddyHandle}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', marginTop: '8px' }}>{today}</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', marginTop: '4px' }}>#snappinbuddy</p>
          </div>

          <button onClick={downloadShareCard} style={{
            width: '100%', padding: '13px', borderRadius: '24px', border: 'none',
            background: 'linear-gradient(135deg, #2ECC71, #00C864)',
            color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer',
            marginBottom: '10px',
          }}>
            ⬇️ {tx('Save the card', 'Enregistrer la carte')}
          </button>

          <p style={{ color: subText, fontSize: '11px', textAlign: 'center', lineHeight: 1.5 }}>
            Poste en story · Tague <strong style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>@snappinbuddy</strong> · Utilise <strong style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>#snappinbuddy</strong>
          </p>
        </div>

      </div>

      {cardImage && (
        <div onClick={() => setCardImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '14px' }}>
          <img src={cardImage} alt="Snappin'Buddy collab" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh', maxWidth: '100%', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
          <p style={{ color: 'white', fontSize: '14px', fontWeight: '700', textAlign: 'center', lineHeight: 1.5 }}>
            {tx('Press and hold the image to save it, then share it on your story!', 'Appuie longuement sur l’image pour l’enregistrer, puis partage-la en story !')}
          </p>
          <button onClick={() => setCardImage(null)} style={{ background: 'white', color: '#000', border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            {tx('Close', 'Fermer')}
          </button>
        </div>
      )}
    </div>
  );
}
