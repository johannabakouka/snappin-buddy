'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';

export default function MapComponent({ theme }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const darkMode = theme?.dark ?? true;
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [popupBuddy, setPopupBuddy] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;
    import('leaflet').then(async L => {
      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current).setView([48.8566, 2.3522], 13);
      mapInstance.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: { user } } = await supabase.auth.getUser();

      if (profiles) {
        profiles.forEach(p => {
          if (p.lat && p.lng) {
            const isMe = user && p.user_id === user.id;
            const statusColor = p.status === 'shoot' ? '#FFD700' : p.status === 'indispo' ? '#FF4D4D' : '#3DFF8F';

            const icon = L.divIcon({
              className: '',
              html: isMe
                ? `<div style="width:44px;height:44px;border-radius:50%;background:#FF4D4D;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">👤</div>`
                : `<div style="width:44px;height:44px;border-radius:50%;background:#1A1A1A;border:3px solid ${statusColor};display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);">◉</div>`,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            });

            const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);

            if (!isMe) {
              marker.on('click', () => {
                setPopupBuddy(p);
              });
            }
          }
        });
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);
          if (user) {
            await supabase.from('profiles').update({ lat: latitude, lng: longitude }).eq('user_id', user.id);
          }
        });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const statusColor = popupBuddy?.status === 'shoot' ? '#FFD700' : popupBuddy?.status === 'indispo' ? '#FF4D4D' : '#3DFF8F';
  const statusLabel = popupBuddy?.status === 'shoot' ? 'En shoot' : popupBuddy?.status === 'indispo' ? 'Indisponible' : 'Disponible';

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />

      {/* Header flottant */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '14px 0 24px',
        background: darkMode
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.92) 0%, transparent 100%)'
          : 'linear-gradient(to bottom, rgba(245,245,245,0.92) 0%, transparent 100%)',
      }}>
        <img src={darkMode ? '/logo.png' : '/logo-dark.png'} alt="Snappin'Buddy" style={{ height: '36px', objectFit: 'contain', marginRight: '8px' }} />
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: darkMode ? 'white' : '#111', letterSpacing: '-0.3px' }}>
          Snappin&apos;Buddy
        </span>
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: '90px', left: '16px',
        background: darkMode ? 'rgba(10,10,10,0.8)' : 'rgba(245,245,245,0.8)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
        color: darkMode ? '#666' : '#999', zIndex: 1000,
      }}>
        <span style={{ color: '#3DFF8F' }}>●</span> Dispo · <span style={{ color: '#FFD700' }}>●</span> En shoot · <span style={{ color: '#FF4D4D' }}>●</span> Indispo
      </div>

      {/* Popup buddy */}
      {popupBuddy && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '16px', right: '16px',
          zIndex: 2000,
          background: darkMode ? '#1A1A1A' : 'white',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          {/* Fermer */}
          <button onClick={() => setPopupBuddy(null)} style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none',
            color: darkMode ? '#666' : '#999',
            fontSize: '18px', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: `2px solid ${statusColor}`, flexShrink: 0 }}>◉</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: darkMode ? 'white' : '#111' }}>{popupBuddy.username}</div>
              <div style={{ color: darkMode ? '#666' : '#888', fontSize: '12px' }}>{popupBuddy.handle}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}/>
                <span style={{ color: statusColor, fontSize: '11px' }}>{statusLabel}</span>
              </div>
            </div>
          </div>

          {popupBuddy.bio && (
            <p style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '13px', marginBottom: '12px', fontStyle: 'italic' }}>
              « {popupBuddy.bio} »
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {(popupBuddy.styles || '').split(',').map(s => s.trim()).filter(Boolean).map(s => (
              <span key={s} style={{ fontSize: '11px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`, borderRadius: '20px', padding: '2px 10px' }}>{s}</span>
            ))}
          </div>

          <button
            onClick={() => { setSelectedBuddy(popupBuddy); setPopupBuddy(null); }}
            style={{ width: '100%', padding: '12px', borderRadius: '24px', border: 'none', background: darkMode ? 'white' : '#111', color: darkMode ? 'black' : 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            Voir le profil →
          </button>
        </div>
      )}

      {/* Profil complet */}
      {selectedBuddy && (
        <BuddyProfileScreen
          buddy={selectedBuddy}
          onBack={() => setSelectedBuddy(null)}
          theme={theme}
        />
      )}
    </div>
  );
}