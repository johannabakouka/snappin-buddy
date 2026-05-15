'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function QRScreen({ collab, user, theme, onBack }) {
  const darkMode = theme?.dark ?? true;
  const bg = darkMode ? '#0A0A0A' : '#F5F5F5';
  const color = darkMode ? 'white' : '#111';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const subText = darkMode ? '#666' : '#888';

  const [sessionId, setSessionId] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    createSession();
  }, []);

  async function createSession() {
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    const { data } = await supabase.from('qr_sessions').insert({
      user_id: user.id,
      collab_id: collab.id,
      expires_at: expires.toISOString(),
      status: 'pending',
    }).select().single();
    if (data) setSessionId(data.id);
  }

  // Génère un QR code via une API gratuite
  const qrUrl = sessionId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${sessionId}&bgcolor=${darkMode ? '1A1A1A' : 'FFFFFF'}&color=${darkMode ? 'FFFFFF' : '0A0A0A'}`
    : null;

  const buddyName = collab.senderProfile?.username || collab.receiverProfile?.username || 'Buddy';

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
            borderRadius: '20px',
            padding: '24px',
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
        <p style={{ color: subText, fontSize: '11px', textAlign: 'center' }}>
          Ce QR expire dans 30 minutes
        </p>
      </div>
    </div>
  );
}